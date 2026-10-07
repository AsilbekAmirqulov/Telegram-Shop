from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import os
import json
import urllib.request
import psycopg2
import base64
import tempfile
import re

from telethon import TelegramClient
from telethon.tl.types import User
from telethon.tl.functions.contacts import ResolveUsernameRequest
from telethon.errors import (
    UsernameInvalidError,
    UsernameNotOccupiedError,
    RPCError
)


# ============================================================
# TELEGRAM SETTINGS
# ============================================================

TG_API_ID = os.getenv("TG_API_ID")
TG_API_HASH = os.getenv("TG_API_HASH")
TG_SESSION = os.getenv("TG_SESSION")

telegram_client = None
telegram_session_path = None


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI()

ADMIN_KEY = os.getenv("ADMIN_KEY")


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://asilbekamirqulov.github.io"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# TELEGRAM CLIENT STARTUP
# ============================================================

@app.on_event("startup")
async def startup_telegram():

    global telegram_client
    global telegram_session_path

    if not TG_API_ID or not TG_API_HASH or not TG_SESSION:

        print(
            "WARNING: TG_API_ID, TG_API_HASH yoki TG_SESSION topilmadi."
        )

        return

    try:

        session_bytes = base64.b64decode(TG_SESSION)

        session_file = tempfile.NamedTemporaryFile(
            prefix="telegram_shop_",
            suffix=".session",
            delete=False
        )

        session_file.write(session_bytes)
        session_file.close()

        telegram_session_path = session_file.name

        telegram_client = TelegramClient(
            telegram_session_path,
            int(TG_API_ID),
            TG_API_HASH
        )

        await telegram_client.connect()

        if not await telegram_client.is_user_authorized():

            print(
                "WARNING: Telegram session is not authorized."
            )

            await telegram_client.disconnect()

            telegram_client = None

            return

        print(
            "Telegram session is authorized."
        )

        print(
            "Telegram username checker is ready."
        )

    except Exception as e:

        print(
            f"WARNING: Telegram client ishga tushmadi: {e}"
        )

        telegram_client = None


# ============================================================
# TELEGRAM CLIENT SHUTDOWN
# ============================================================

@app.on_event("shutdown")
async def shutdown_telegram():

    global telegram_client

    if telegram_client is not None:

        try:

            await telegram_client.disconnect()

            print(
                "Telegram client disconnected."
            )

        except Exception as e:

            print(
                f"Telegram disconnect error: {e}"
            )


# ============================================================
# TELEGRAM USERNAME CHECK
# ============================================================

async def check_telegram_username(username: str):

    if telegram_client is None:

        print(
            "USERNAME_CHECK ERROR: Telegram client mavjud emas"
        )

        return (
            False,
            None,
            "Telegram username tekshiruvi hozircha ishlamayapti"
        )

    try:

        username = (
            username
            .strip()
            .lstrip("@")
        )

        print(
            f"USERNAME_CHECK: @{username}"
        )

        result = await telegram_client(
            ResolveUsernameRequest(username)
        )

        for entity in result.users:

            if not isinstance(entity, User):
                continue

            if getattr(entity, "bot", False):

                print(
                    f"USERNAME_CHECK BOT: @{username}"
                )

                return (
                    False,
                    None,
                    "Bot username'iga Premium sovg'a qilib bo'lmaydi"
                )

            real_username = getattr(
                entity,
                "username",
                None
            )

            if real_username:

                print(
                    f"USERNAME_CHECK OK: @{real_username}"
                )

                return (
                    True,
                    real_username,
                    None
                )

        return (
            False,
            None,
            "Bunday username mavjud emas"
        )

    except UsernameNotOccupiedError:

        return (
            False,
            None,
            "Bunday username mavjud emas"
        )

    except UsernameInvalidError:

        return (
            False,
            None,
            "Telegram username noto'g'ri"
        )

    except RPCError as e:

        print(
            f"USERNAME_CHECK RPC_ERROR: {e}"
        )

        return (
            False,
            None,
            "Telegram username'ni tekshirib bo'lmadi"
        )

    except Exception as e:

        print(
            f"USERNAME_CHECK ERROR: {type(e).__name__}: {e}"
        )

        return (
            False,
            None,
            "Telegram username'ni tekshirib bo'lmadi"
        )


# ============================================================
# DATABASE
# ============================================================

def get_db():

    database_url = os.getenv("DATABASE_URL")

    if not database_url:

        raise RuntimeError(
            "DATABASE_URL topilmadi"
        )

    return psycopg2.connect(
        database_url,
        sslmode="require"
    )


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_db():

    conn = get_db()
    cursor = conn.cursor()

    try:

        # ----------------------------------------------------
        # ORDERS
        # ----------------------------------------------------

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                product TEXT NOT NULL,
                amount INTEGER NOT NULL,
                status TEXT NOT NULL,
                telegram_username TEXT,
                months INTEGER,
                price_usd TEXT,
                supplier_order_id TEXT,
                stars INTEGER
            )
        """)

        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS stars INTEGER
        """)

        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS price_usd TEXT
        """)

        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS supplier_order_id TEXT
        """)


        # ----------------------------------------------------
        # WALLETS
        # ----------------------------------------------------

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS wallets (
                user_id BIGINT PRIMARY KEY,
                balance BIGINT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


        # ----------------------------------------------------
        # WALLET TRANSACTIONS
        # ----------------------------------------------------

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                amount BIGINT NOT NULL,
                transaction_type TEXT NOT NULL,
                description TEXT,
                order_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


        # ----------------------------------------------------
        # REFERRALS
        # ----------------------------------------------------

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                referrer_id BIGINT NOT NULL,
                referred_id BIGINT NOT NULL UNIQUE,
                bonus_paid BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


        conn.commit()

        print("Database initialization completed.")

    except Exception:

        conn.rollback()

        raise

    finally:

        cursor.close()
        conn.close()


init_db()


# ============================================================
# MODELS
# ============================================================

class OrderRequest(BaseModel):

    user_id: int
    product: str
    amount: int
    recipient_username: str

    months: int | None = None

    stars: int | None = None


class StatusRequest(BaseModel):

    status: str


class PremiumTestRequest(BaseModel):

    telegram_username: str
    months: int
    admin_key: str


class AdminBalanceRequest(BaseModel):

    user_id: int
    amount: int
    description: str | None = None


class ReferralRequest(BaseModel):

    user_id: int
    referral_code: str


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "ok": True,
        "message": "Telegram Shop server is running!"
    }


# ============================================================
# CHECK USERNAME
# ============================================================

@app.get("/check-username")
async def check_username(username: str):

    username = (
        username
        .strip()
        .lstrip("@")
    )

    if not username:

        return {
            "ok": False,
            "message": "❗ Username kiriting"
        }

    if not re.fullmatch(
        r"[A-Za-z0-9_]{5,32}",
        username
    ):

        return {
            "ok": False,
            "message":
            "❗ Username noto'g'ri. Masalan: @qwerty123"
        }

    valid, real_username, error = (
        await check_telegram_username(username)
    )

    if not valid:

        return {
            "ok": False,
            "message": error
        }

    return {
        "ok": True,
        "username": real_username,
        "message":
        f"👤 Telegram foydalanuvchisi: @{real_username}"
    }
    # ============================================================
# WALLET HELPERS
# ============================================================

def ensure_wallet(cursor, user_id: int):

    cursor.execute(
        """
        INSERT INTO wallets (
            user_id,
            balance
        )
        VALUES (%s, 0)
        ON CONFLICT (user_id)
        DO NOTHING
        """,
        (user_id,)
    )


def get_wallet_balance(cursor, user_id: int):

    ensure_wallet(
        cursor,
        user_id
    )

    cursor.execute(
        """
        SELECT balance
        FROM wallets
        WHERE user_id = %s
        FOR UPDATE
        """,
        (user_id,)
    )

    row = cursor.fetchone()

    if not row:
        return 0

    return int(row[0])


# ============================================================
# GET BALANCE
# ============================================================

@app.get("/balance")
def get_balance(user_id: int):

    if not user_id:

        return {
            "ok": False,
            "message":
            "Telegram foydalanuvchisi aniqlanmadi"
        }

    conn = get_db()
    cursor = conn.cursor()

    try:

        ensure_wallet(
            cursor,
            user_id
        )

        cursor.execute(
            """
            SELECT balance
            FROM wallets
            WHERE user_id = %s
            """,
            (user_id,)
        )

        row = cursor.fetchone()

        balance = int(row[0]) if row else 0

        conn.commit()

        return {
            "ok": True,
            "user_id": user_id,
            "balance": balance,
            "currency": "UZS"
        }

    except Exception as e:

        conn.rollback()

        print(
            f"BALANCE ERROR: {type(e).__name__}: {e}"
        )

        return {
            "ok": False,
            "message":
            "Balansni olishda xatolik yuz berdi"
        }

    finally:

        cursor.close()
        conn.close()


# ============================================================
# WALLET TRANSACTIONS
# ============================================================

@app.get("/wallet/transactions")
def wallet_transactions(user_id: int):

    if not user_id:

        return {
            "ok": False,
            "message":
            "Telegram foydalanuvchisi aniqlanmadi"
        }

    conn = get_db()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            SELECT
                id,
                amount,
                transaction_type,
                description,
                order_id,
                created_at
            FROM wallet_transactions
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 100
            """,
            (user_id,)
        )

        rows = cursor.fetchall()

        transactions = []

        for row in rows:

            transactions.append({

                "id": row[0],

                "amount": row[1],

                "type": row[2],

                "description": row[3],

                "order_id": row[4],

                "created_at":
                    row[5].isoformat()
                    if row[5]
                    else None
            })

        return {
            "ok": True,
            "transactions": transactions
        }

    except Exception as e:

        print(
            f"WALLET TRANSACTIONS ERROR: "
            f"{type(e).__name__}: {e}"
        )

        return {
            "ok": False,
            "message":
            "Tranzaksiyalarni olishda xatolik yuz berdi"
        }

    finally:

        cursor.close()
        conn.close()


# ============================================================
# ADMIN ADD BALANCE
# ============================================================

@app.post("/admin/add-balance")
def admin_add_balance(
    request: AdminBalanceRequest,
    admin_key: str
):

    if admin_key != ADMIN_KEY:

        return {
            "ok": False,
            "message": "Ruxsat yo'q"
        }

    if request.user_id <= 0:

        return {
            "ok": False,
            "message": "user_id noto'g'ri"
        }

    if request.amount <= 0:

        return {
            "ok": False,
            "message": "Summa 0 dan katta bo'lishi kerak"
        }

    conn = get_db()
    cursor = conn.cursor()

    try:

        ensure_wallet(
            cursor,
            request.user_id
        )

        cursor.execute(
            """
            UPDATE wallets
            SET
                balance = balance + %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            RETURNING balance
            """,
            (
                request.amount,
                request.user_id
            )
        )

        row = cursor.fetchone()

        new_balance = int(row[0])

        cursor.execute(
            """
            INSERT INTO wallet_transactions (
                user_id,
                amount,
                transaction_type,
                description
            )
            VALUES (%s, %s, %s, %s)
            """,
            (
                request.user_id,
                request.amount,
                "deposit",
                request.description
                or "Admin tomonidan balans to'ldirildi"
            )
        )

        conn.commit()

        return {
            "ok": True,
            "user_id": request.user_id,
            "added": request.amount,
            "balance": new_balance
        }

    except Exception as e:

        conn.rollback()

        print(
            f"ADMIN BALANCE ERROR: "
            f"{type(e).__name__}: {e}"
        )

        return {
            "ok": False,
            "message":
            "Balansni to'ldirishda xatolik yuz berdi"
        }

    finally:

        cursor.close()
        conn.close()


# ============================================================
# CREATE ORDER
# ============================================================

@app.post("/create-order")
async def create_order(order: OrderRequest):
    allowed_products = [
        "Telegram Premium",
        "Telegram Stars"
    ]

    if order.product not in allowed_products:

        return {
            "ok": False,
            "message": "Noma'lum mahsulot"
        }


    # --------------------------------------------------------
    # AMOUNT
    # --------------------------------------------------------

    if order.amount <= 0:

        return {
            "ok": False,
            "message": "Narx noto'g'ri"
        }


    # --------------------------------------------------------
    # USER ID
    # --------------------------------------------------------

    if order.user_id <= 0:

        return {
            "ok": False,
            "message":
            "Telegram foydalanuvchisi aniqlanmadi"
        }


    # --------------------------------------------------------
    # USERNAME
    # --------------------------------------------------------

    username = (
        order.recipient_username
        .strip()
        .lstrip("@")
    )

    if not username:

        return {
            "ok": False,
            "message":
            "Qabul qiluvchi username kiritilmagan"
        }

    if not re.fullmatch(
        r"[A-Za-z0-9_]{5,32}",
        username
    ):

        return {
            "ok": False,
            "message":
            "Telegram username noto'g'ri"
        }


    # --------------------------------------------------------
    # TELEGRAM USERNAME CHECK
    # --------------------------------------------------------

    # Username allaqachon frontendda tekshirilgan bo'lishi
    # mumkin, lekin backend ham tekshiradi.
    #
    # Agar Telegram client vaqtincha mavjud bo'lmasa,
    # buyurtmani yaratmaymiz.

valid_username, real_username, username_error = (
    await check_telegram_username(username)
)

    if not valid_username:

        return {
            "ok": False,
            "message": username_error
        }

    username = real_username or username


    # --------------------------------------------------------
    # PRODUCT VALIDATION
    # --------------------------------------------------------

    stars = None

    if order.product == "Telegram Premium":

        if order.months not in [3, 6, 12]:

            return {
                "ok": False,
                "message":
                "Premium muddati 3, 6 yoki 12 oy bo'lishi kerak"
            }


    elif order.product == "Telegram Stars":

        allowed_stars = [
            50,
            100,
            150,
            250,
            350,
            500,
            750,
            1000,
            1500,
            2500,
            5000
        ]

        if order.stars not in allowed_stars:

            return {
                "ok": False,
                "message":
                "Stars paketi noto'g'ri"
            }

        stars = order.stars


    # --------------------------------------------------------
    # DATABASE TRANSACTION
    # --------------------------------------------------------

    conn = get_db()
    cursor = conn.cursor()

    try:

        # ----------------------------------------------------
        # WALLET
        # ----------------------------------------------------

        balance = get_wallet_balance(
            cursor,
            order.user_id
        )

        if balance < order.amount:

            conn.rollback()

            return {
                "ok": False,
                "message":
                "Balansingiz yetarli emas",
                "balance": balance,
                "required": order.amount,
                "shortage":
                    order.amount - balance
            }


        # ----------------------------------------------------
        # CREATE ORDER
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO orders (
                user_id,
                product,
                amount,
                status,
                telegram_username,
                months,
                stars
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                order.user_id,
                order.product,
                order.amount,
                "paid",
                username,
                order.months,
                stars
            )
        )

        order_id = cursor.fetchone()[0]


        # ----------------------------------------------------
        # DEDUCT BALANCE
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE wallets
            SET
                balance = balance - %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            RETURNING balance
            """,
            (
                order.amount,
                order.user_id
            )
        )

        new_balance = int(
            cursor.fetchone()[0]
        )


        # ----------------------------------------------------
        # TRANSACTION RECORD
        # ----------------------------------------------------

        description = (
            f"{order.product} uchun to'lov"
        )

        cursor.execute(
            """
            INSERT INTO wallet_transactions (
                user_id,
                amount,
                transaction_type,
                description,
                order_id
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                order.user_id,
                -order.amount,
                "purchase",
                description,
                order_id
            )
        )


        # ----------------------------------------------------
        # COMMIT
        # ----------------------------------------------------

        conn.commit()


        return {

            "ok": True,

            "order_id": order_id,

            "status": "paid",

            "buyer_user_id": order.user_id,

            "recipient_username": username,

            "product": order.product,

            "months": order.months,

            "stars": stars,

            "amount": order.amount,

            "remaining_balance": new_balance
        }

    except Exception as e:

        conn.rollback()

        print(
            f"CREATE ORDER ERROR: "
            f"{type(e).__name__}: {e}"
        )

        return {
            "ok": False,
            "message":
            "Buyurtma yaratishda xatolik yuz berdi"
        }

    finally:

        cursor.close()
        conn.close()


# ============================================================
# MY ORDERS
# ============================================================

@app.get("/my-orders")
def get_my_orders(user_id: int):

    if not user_id:

        return {
            "ok": False,
            "message":
            "Telegram foydalanuvchisi aniqlanmadi"
        }

    conn = get_db()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            SELECT
                id,
                user_id,
                product,
                amount,
                status,
                telegram_username,
                months,
                stars,
                price_usd,
                supplier_order_id
            FROM orders
            WHERE user_id = %s
            ORDER BY id DESC
            """,
            (user_id,)
        )

        rows = cursor.fetchall()

        orders = []

        for row in rows:

            orders.append({

                "id": row[0],

                "user_id": row[1],

                "product": row[2],

                "amount": row[3],

                "status": row[4],

                "telegram_username": row[5],

                "months": row[6],

                "stars": row[7],

                "price_usd": row[8],

                "supplier_order_id": row[9]
            })


        return {

            "ok": True,

            "orders": orders
        }

    finally:

        cursor.close()
        conn.close()
        # ============================================================
# REFERRAL
# ============================================================

@app.post("/referral")
def add_referral(request: ReferralRequest):

    if request.user_id <= 0:

        return {
            "ok": False,
            "message": "user_id noto'g'ri"
        }

    referral_code = (
        request.referral_code
        .strip()
        .replace("ref_", "")
    )

    if not referral_code.isdigit():

        return {
            "ok": False,
            "message":
            "Referral kodi noto'g'ri"
        }

    referrer_id = int(referral_code)

    if referrer_id == request.user_id:

        return {
            "ok": False,
            "message":
            "O'zingizni referral qilishingiz mumkin emas"
        }

    conn = get_db()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            SELECT id
            FROM referrals
            WHERE referred_id = %s
            """,
            (request.user_id,)
        )

        if cursor.fetchone():

            return {
                "ok": False,
                "message":
                "Referral allaqachon mavjud"
            }


        cursor.execute(
            """
            INSERT INTO referrals (
                referrer_id,
                referred_id
            )
            VALUES (%s, %s)
            RETURNING id
            """,
            (
                referrer_id,
                request.user_id
            )
        )

        referral_id = cursor.fetchone()[0]

        conn.commit()

        return {

            "ok": True,

            "referral_id":
                referral_id,

            "referrer_id":
                referrer_id,

            "referred_id":
                request.user_id
        }

    except psycopg2.errors.UniqueViolation:

        conn.rollback()

        return {
            "ok": False,
            "message":
            "Referral allaqachon mavjud"
        }

    except Exception as e:

        conn.rollback()

        print(
            f"REFERRAL ERROR: "
            f"{type(e).__name__}: {e}"
        )

        return {
            "ok": False,
            "message":
            "Referralni saqlashda xatolik"
        }

    finally:

        cursor.close()
        conn.close()


# ============================================================
# ADMIN — ALL ORDERS
# ============================================================

@app.get("/orders")
def get_orders(admin_key: str):

    if admin_key != ADMIN_KEY:

        return {
            "ok": False,
            "message": "Ruxsat yo'q"
        }

    conn = get_db()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            SELECT
                id,
                user_id,
                product,
                amount,
                status,
                telegram_username,
                months,
                stars,
                price_usd,
                supplier_order_id
            FROM orders
            ORDER BY id DESC
        """)

        orders = cursor.fetchall()

        return {

            "ok": True,

            "orders": [

                {
                    "id": order[0],
                    "user_id": order[1],
                    "product": order[2],
                    "amount": order[3],
                    "status": order[4],
                    "telegram_username": order[5],
                    "months": order[6],
                    "stars": order[7],
                    "price_usd": order[8],
                    "supplier_order_id": order[9]
                }

                for order in orders
            ]
        }

    finally:

        cursor.close()
        conn.close()


# ============================================================
# UPDATE ORDER STATUS
# ============================================================

@app.put("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    request: StatusRequest
):

    allowed_statuses = [
        "pending",
        "paid",
        "processing",
        "completed",
        "cancelled"
    ]

    if request.status not in allowed_statuses:

        return {
            "ok": False,
            "message": "Noto'g'ri status"
        }

    conn = get_db()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            UPDATE orders
            SET status = %s
            WHERE id = %s
            """,
            (
                request.status,
                order_id
            )
        )

        if cursor.rowcount == 0:

            conn.rollback()

            return {
                "ok": False,
                "message": "Buyurtma topilmadi"
            }

        conn.commit()

        return {

            "ok": True,

            "order_id": order_id,

            "status": request.status
        }

    finally:

        cursor.close()
        conn.close()


# ============================================================
# RESELLCODES ACCOUNT
# ============================================================

@app.get("/supplier-account")
def supplier_account():

    api_key = os.getenv(
        "RESELLCODES_API_KEY"
    )

    if not api_key:

        return {
            "ok": False,
            "message":
            "RESELLCODES_API_KEY topilmadi"
        }

    try:

        request = urllib.request.Request(

            "https://resell.codes/api/v1/me",

            headers={
                "Authorization":
                f"Bearer {api_key}"
            },

            method="GET"
        )

        with urllib.request.urlopen(
            request,
            timeout=15
        ) as response:

            data = json.loads(
                response.read().decode()
            )

        return {

            "ok": True,

            "supplier":
            "ReSellCodes",

            "data": data
        }

    except Exception as e:

        return {

            "ok": False,

            "message": str(e)
        }


# ============================================================
# RESELLCODES PREMIUM PRICES
# ============================================================

@app.get("/supplier-premium-prices")
def supplier_premium_prices():

    api_key = os.getenv(
        "RESELLCODES_API_KEY"
    )

    if not api_key:

        return {
            "ok": False,
            "message":
            "RESELLCODES_API_KEY topilmadi"
        }

    try:

        request = urllib.request.Request(

            "https://resell.codes/api/v1/telegram/premium",

            headers={
                "Authorization":
                f"Bearer {api_key}"
            },

            method="GET"
        )

        with urllib.request.urlopen(
            request,
            timeout=15
        ) as response:

            data = json.loads(
                response.read().decode()
            )

        return {

            "ok": True,

            "supplier":
            "ReSellCodes",

            "data": data
        }

    except Exception as e:

        return {

            "ok": False,

            "message": str(e)
        }


# ============================================================
# REAL PREMIUM BUY / ADMIN TEST
# ============================================================

@app.post("/test-premium-buy")
async def test_premium_buy(
    request: PremiumTestRequest
):

    if request.admin_key != ADMIN_KEY:

        return {
            "ok": False,
            "message": "Ruxsat yo'q"
        }

    if request.months not in [3, 6, 12]:

        return {
            "ok": False,
            "message":
            "months faqat 3, 6 yoki 12 bo'lishi mumkin"
        }

    username = (
        request.telegram_username
        .strip()
        .lstrip("@")
    )

    if not username:

        return {
            "ok": False,
            "message":
            "Telegram username kiritilmagan"
        }

    if not re.fullmatch(
        r"[A-Za-z0-9_]{5,32}",
        username
    ):

        return {
            "ok": False,
            "message":
            "Telegram username noto'g'ri"
        }

    valid_username, real_username, username_error = (
        await check_telegram_username(username)
    )

    if not valid_username:

        return {
            "ok": False,
            "message": username_error
        }

    username = real_username

    api_key = os.getenv(
        "RESELLCODES_API_KEY"
    )

    if not api_key:

        return {
            "ok": False,
            "message":
            "RESELLCODES_API_KEY topilmadi"
        }

    try:

        payload = json.dumps({

            "telegram_username":
            username,

            "months":
            request.months

        }).encode("utf-8")

        api_request = urllib.request.Request(

            "https://resell.codes/api/v1/telegram/premium/buy",

            data=payload,

            headers={

                "Authorization":
                f"Bearer {api_key}",

                "Content-Type":
                "application/json"
            },

            method="POST"
        )

        with urllib.request.urlopen(
            api_request,
            timeout=30
        ) as response:

            data = json.loads(
                response.read().decode()
            )

        return {

            "ok": True,

            "supplier":
            "ReSellCodes",

            "order":
            data
        }

    except Exception as e:

        return {

            "ok": False,

            "message":
            str(e)
        }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    try:

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT 1"
        )

        cursor.fetchone()

        cursor.close()
        conn.close()

        return {
            "ok": True,
            "database": "connected",
            "telegram":
                "connected"
                if telegram_client
                else "not_connected"
        }

    except Exception as e:

        return {
            "ok": False,
            "database": "error",
            "message": str(e)
        }
