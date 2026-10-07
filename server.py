from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import urllib.request
import urllib.error
import re
import secrets
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor

from telethon import TelegramClient
from telethon.tl.functions.contacts import ResolveUsernameRequest


# =========================================================
# APP
# =========================================================

app = FastAPI(title="Telegram Shop API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ENV
# =========================================================

DATABASE_URL = os.getenv("DATABASE_URL")

ADMIN_KEY = os.getenv("ADMIN_KEY", "")

RESELLCODES_API_KEY = os.getenv("RESELLCODES_API_KEY", "")
RESELLCODES_BASE_URL = "https://api.resellcodes.com"

TG_API_ID = os.getenv("TG_API_ID")
TG_API_HASH = os.getenv("TG_API_HASH")
TG_SESSION = os.getenv("TG_SESSION", "telegram_shop")


# =========================================================
# TELEGRAM CLIENT
# =========================================================

telegram_client = None


if TG_API_ID and TG_API_HASH:
    try:
        telegram_client = TelegramClient(
            TG_SESSION,
            int(TG_API_ID),
            TG_API_HASH
        )
    except Exception as e:
        print("Telegram client yaratishda xato:", e)
        telegram_client = None


# =========================================================
# STARTUP / SHUTDOWN
# =========================================================

@app.on_event("startup")
async def startup_event():
    global telegram_client

    print("Telegram Shop server starting...")

    try:
        init_db()
        print("Database initialized.")
    except Exception as e:
        print("Database init xatosi:", e)

    if telegram_client:
        try:
            if not telegram_client.is_connected():
                await telegram_client.connect()

            print("Telegram client connected.")
        except Exception as e:
            print("Telegram client connection xatosi:", e)


@app.on_event("shutdown")
async def shutdown_event():
    global telegram_client

    if telegram_client:
        try:
            await telegram_client.disconnect()
            print("Telegram client disconnected.")
        except Exception as e:
            print("Telegram disconnect xatosi:", e)


# =========================================================
# DATABASE
# =========================================================

def get_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable topilmadi.")

    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor
    )


def init_db():
    conn = get_db()
    cur = conn.cursor()

    try:
        # -------------------------------------------------
        # ORDERS
        # -------------------------------------------------

        cur.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                product TEXT NOT NULL,
                amount INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                telegram_username TEXT,
                months INTEGER,
                stars INTEGER,
                price_usd NUMERIC(12, 4),
                supplier_order_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Eski database uchun kerak bo‘lishi mumkin
        cur.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS stars INTEGER
        """)

        cur.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """)

        # -------------------------------------------------
        # WALLETS
        # -------------------------------------------------

        cur.execute("""
            CREATE TABLE IF NOT EXISTS wallets (
                user_id BIGINT PRIMARY KEY,
                balance INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # -------------------------------------------------
        # WALLET TRANSACTIONS
        # -------------------------------------------------

        cur.execute("""
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                amount INTEGER NOT NULL,
                type TEXT NOT NULL,
                description TEXT,
                order_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # -------------------------------------------------
        # REFERRALS
        # -------------------------------------------------

        cur.execute("""
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                referrer_id BIGINT NOT NULL,
                referred_id BIGINT NOT NULL UNIQUE,
                bonus_amount INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()

    finally:
        cur.close()
        conn.close()


# =========================================================
# MODELS
# =========================================================

class OrderRequest(BaseModel):
    user_id: int
    product: str
    amount: int
    recipient_username: str
    months: int | None = None
    stars: int | None = None


class StatusRequest(BaseModel):
    status: str


class AdminBalanceRequest(BaseModel):
    user_id: int
    amount: int
    description: str | None = None


class ReferralRequest(BaseModel):
    user_id: int
    referrer_id: int


class PremiumTestRequest(BaseModel):
    username: str
    months: int = 3


# =========================================================
# BASIC HELPERS
# =========================================================

def normalize_username(username: str) -> str:
    username = (username or "").strip()

    if username.startswith("@"):
        username = username[1:]

    return username


def get_wallet_balance(cur, user_id: int) -> int:
    cur.execute(
        """
        SELECT balance
        FROM wallets
        WHERE user_id = %s
        """,
        (user_id,)
    )

    row = cur.fetchone()

    if not row:
        cur.execute(
            """
            INSERT INTO wallets (user_id, balance)
            VALUES (%s, 0)
            ON CONFLICT (user_id) DO NOTHING
            """,
            (user_id,)
        )

        return 0

    return int(row["balance"])


def ensure_wallet(cur, user_id: int):
    cur.execute(
        """
        INSERT INTO wallets (user_id, balance)
        VALUES (%s, 0)
        ON CONFLICT (user_id) DO NOTHING
        """,
        (user_id,)
    )


def format_username(username: str) -> str:
    username = normalize_username(username)

    if not username:
        return ""

    return "@" + username


# =========================================================
# TELEGRAM USERNAME CHECK
# =========================================================

async def check_telegram_username(username: str):
    username = normalize_username(username)

    if not username:
        return False, None, "Username kiritilmagan."

    if not re.fullmatch(r"[A-Za-z0-9_]{5,32}", username):
        return False, None, "Username noto‘g‘ri formatda."

    # Telegram client mavjud bo‘lmasa,
    # format tekshiruvidan o‘tkazamiz.
    if not telegram_client:
        return True, username, None

    try:
        if not telegram_client.is_connected():
            await telegram_client.connect()

        result = await telegram_client(
            ResolveUsernameRequest(username)
        )

        if result and result.peer:
            return True, username, None

        return False, None, "Bunday Telegram username topilmadi."

    except Exception as e:
        error_text = str(e).lower()

        if "username not occupied" in error_text:
            return False, None, "Bunday username mavjud emas."

        if "username_invalid" in error_text:
            return False, None, "Username noto‘g‘ri."

        print("Username tekshirish xatosi:", e)

        # Telegram API vaqtincha ishlamasa,
        # foydalanuvchini bloklab qo‘ymaslik uchun
        # format valid bo‘lsa davom etamiz.
        return True, username, None


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "ok": True,
        "message": "Telegram Shop server is running!"
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "telegram-shop"
    }


# =========================================================
# CHECK USERNAME
# =========================================================

@app.get("/check-username")
async def check_username(username: str):
    valid, real_username, error = await check_telegram_username(username)

    if not valid:
        return {
            "ok": False,
            "valid": False,
            "message": error or "Username topilmadi."
        }

    return {
        "ok": True,
        "valid": True,
        "username": real_username,
        "message": "Username topildi."
    }
    # =========================================================
# BALANCE
# =========================================================

@app.get("/balance")
def balance(user_id: int):
    conn = get_db()
    cur = conn.cursor()

    try:
        ensure_wallet(cur, user_id)
        conn.commit()

        current_balance = get_wallet_balance(cur, user_id)

        return {
            "ok": True,
            "user_id": user_id,
            "balance": current_balance
        }

    finally:
        cur.close()
        conn.close()


# =========================================================
# WALLET TRANSACTIONS
# =========================================================

@app.get("/wallet/transactions")
def wallet_transactions(user_id: int):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT
                id,
                amount,
                type,
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

        rows = cur.fetchall()

        transactions = []

        for row in rows:
            transactions.append({
                "id": row["id"],
                "amount": int(row["amount"]),
                "type": row["type"],
                "description": row["description"],
                "order_id": row["order_id"],
                "created_at": (
                    row["created_at"].isoformat()
                    if row["created_at"]
                    else None
                )
            })

        return {
            "ok": True,
            "transactions": transactions
        }

    finally:
        cur.close()
        conn.close()


# =========================================================
# ADMIN - ADD BALANCE
# =========================================================

@app.post("/admin/add-balance")
def admin_add_balance(
    request: AdminBalanceRequest,
    admin_key: str
):
    if not ADMIN_KEY or admin_key != ADMIN_KEY:
        raise HTTPException(
            status_code=403,
            detail="Admin key noto‘g‘ri."
        )

    if request.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Amount 0 dan katta bo‘lishi kerak."
        )

    conn = get_db()
    cur = conn.cursor()

    try:
        ensure_wallet(cur, request.user_id)

        cur.execute(
            """
            UPDATE wallets
            SET
                balance = balance + %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            """,
            (
                request.amount,
                request.user_id
            )
        )

        cur.execute(
            """
            INSERT INTO wallet_transactions
                (user_id, amount, type, description)
            VALUES
                (%s, %s, %s, %s)
            """,
            (
                request.user_id,
                request.amount,
                "deposit",
                request.description or "Admin tomonidan balans qo‘shildi"
            )
        )

        conn.commit()

        new_balance = get_wallet_balance(cur, request.user_id)

        return {
            "ok": True,
            "message": "Balans muvaffaqiyatli to‘ldirildi.",
            "balance": new_balance
        }

    except Exception:
        conn.rollback()
        raise

    finally:
        cur.close()
        conn.close()


# =========================================================
# REFERRAL
# =========================================================

@app.post("/referral")
def referral(request: ReferralRequest):
    if request.user_id == request.referrer_id:
        raise HTTPException(
            status_code=400,
            detail="O‘zingizni referal sifatida ishlata olmaysiz."
        )

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT id
            FROM referrals
            WHERE referred_id = %s
            """,
            (request.user_id,)
        )

        existing = cur.fetchone()

        if existing:
            return {
                "ok": True,
                "message": "Referal allaqachon mavjud."
            }

        # Hozircha bonusni 0 qoldiramiz.
        # Keyinchalik referral shartlariga qarab bonus beramiz.
        cur.execute(
            """
            INSERT INTO referrals
                (referrer_id, referred_id, bonus_amount)
            VALUES
                (%s, %s, 0)
            """,
            (
                request.referrer_id,
                request.user_id
            )
        )

        conn.commit()

        return {
            "ok": True,
            "message": "Referal muvaffaqiyatli saqlandi."
        }

    except Exception:
        conn.rollback()
        raise

    finally:
        cur.close()
        conn.close()


# =========================================================
# CREATE ORDER
# =========================================================

@app.post("/create-order")
async def create_order(order: OrderRequest):

    if order.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Mahsulot narxi noto‘g‘ri."
        )

    username = normalize_username(
        order.recipient_username
    )

    # -----------------------------------------------------
    # TELEGRAM USERNAME CHECK
    # -----------------------------------------------------

    valid_username, real_username, username_error = (
        await check_telegram_username(username)
    )

    if not valid_username:
        raise HTTPException(
            status_code=400,
            detail=username_error or "Username noto‘g‘ri."
        )

    username = real_username

    # -----------------------------------------------------
    # DATABASE
    # -----------------------------------------------------

    conn = get_db()
    cur = conn.cursor()

    try:

        # Wallet mavjudligini ta'minlaymiz
        ensure_wallet(cur, order.user_id)

        # Balans
        balance = get_wallet_balance(
            cur,
            order.user_id
        )

        # -------------------------------------------------
        # BALANCE CHECK
        # -------------------------------------------------

        if balance < order.amount:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Balans yetarli emas. "
                    f"Balansingiz: {balance} so'm"
                )
            )

        # -------------------------------------------------
        # ORDER
        # -------------------------------------------------

        cur.execute(
            """
            INSERT INTO orders
                (
                    user_id,
                    product,
                    amount,
                    status,
                    telegram_username,
                    months,
                    stars
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            RETURNING id
            """,
            (
                order.user_id,
                order.product,
                order.amount,
                "paid",
                username,
                order.months,
                order.stars
            )
        )

        order_row = cur.fetchone()

        if not order_row:
            raise Exception(
                "Buyurtma yaratilmadi."
            )

        order_id = order_row["id"]

        # -------------------------------------------------
        # BALANCE DEDUCT
        # -------------------------------------------------

        cur.execute(
            """
            UPDATE wallets
            SET
                balance = balance - %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
              AND balance >= %s
            """,
            (
                order.amount,
                order.user_id,
                order.amount
            )
        )

        if cur.rowcount != 1:
            raise HTTPException(
                status_code=400,
                detail="Balansdan pul yechib bo‘lmadi."
            )

        # -------------------------------------------------
        # TRANSACTION
        # -------------------------------------------------

        cur.execute(
            """
            INSERT INTO wallet_transactions
                (
                    user_id,
                    amount,
                    type,
                    description,
                    order_id
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            """,
            (
                order.user_id,
                -order.amount,
                "purchase",
                f"{order.product} buyurtmasi",
                order_id
            )
        )

        conn.commit()

        new_balance = get_wallet_balance(
            cur,
            order.user_id
        )

        return {
            "ok": True,
            "message": "Buyurtma muvaffaqiyatli yaratildi.",
            "order_id": order_id,
            "status": "paid",
            "username": username,
            "balance": new_balance
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        print(
            "CREATE ORDER ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Buyurtma yaratishda server xatosi."
        )

    finally:
        cur.close()
        conn.close()


# =========================================================
# MY ORDERS
# =========================================================

@app.get("/my-orders")
def my_orders(user_id: int):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
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
                supplier_order_id,
                created_at
            FROM orders
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 100
            """,
            (user_id,)
        )

        rows = cur.fetchall()

        orders = []

        for row in rows:
            orders.append({
                "id": row["id"],
                "user_id": row["user_id"],
                "product": row["product"],
                "amount": int(row["amount"]),
                "status": row["status"],
                "telegram_username": row["telegram_username"],
                "months": row["months"],
                "stars": row["stars"],
                "price_usd": (
                    float(row["price_usd"])
                    if row["price_usd"] is not None
                    else None
                ),
                "supplier_order_id": row["supplier_order_id"],
                "created_at": (
                    row["created_at"].isoformat()
                    if row["created_at"]
                    else None
                )
            })

        return {
            "ok": True,
            "orders": orders
        }

    finally:
        cur.close()
        conn.close()


# =========================================================
# ADMIN - ALL ORDERS
# =========================================================

@app.get("/orders")
def all_orders(admin_key: str):
    if not ADMIN_KEY or admin_key != ADMIN_KEY:
        raise HTTPException(
            status_code=403,
            detail="Admin key noto‘g‘ri."
        )

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
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
                supplier_order_id,
                created_at
            FROM orders
            ORDER BY id DESC
            LIMIT 500
            """
        )

        rows = cur.fetchall()

        result = []

        for row in rows:
            result.append(dict(row))

        return {
            "ok": True,
            "orders": result
        }

    finally:
        cur.close()
        conn.close()


# =========================================================
# ADMIN - UPDATE ORDER STATUS
# =========================================================

@app.post("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    request: StatusRequest,
    admin_key: str
):
    if not ADMIN_KEY or admin_key != ADMIN_KEY:
        raise HTTPException(
            status_code=403,
            detail="Admin key noto‘g‘ri."
        )

    allowed_statuses = {
        "pending",
        "paid",
        "processing",
        "completed",
        "cancelled"
    }

    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Status noto‘g‘ri."
        )

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
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

        if cur.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Buyurtma topilmadi."
            )

        conn.commit()

        return {
            "ok": True,
            "message": "Buyurtma statusi yangilandi."
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception:
        conn.rollback()
        raise

    finally:
        cur.close()
        conn.close()
        # =========================================================
# RESELLCODES REQUEST HELPER
# =========================================================

def resellcodes_request(
    endpoint: str,
    method: str = "GET",
    payload: dict | None = None
):
    if not RESELLCODES_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="RESELLCODES_API_KEY sozlanmagan."
        )

    url = RESELLCODES_BASE_URL.rstrip("/") + endpoint

    headers = {
        "Authorization": f"Bearer {RESELLCODES_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    data = None

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method=method
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=30
        ) as response:

            raw = response.read().decode(
                "utf-8",
                errors="ignore"
            )

            try:
                return json.loads(raw)

            except json.JSONDecodeError:
                return {
                    "raw": raw
                }

    except urllib.error.HTTPError as e:
        body = e.read().decode(
            "utf-8",
            errors="ignore"
        )

        raise HTTPException(
            status_code=e.code,
            detail=body or "Supplier API xatosi."
        )

    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Supplier API bilan aloqa xatosi: {e}"
        )


# =========================================================
# SUPPLIER ACCOUNT
# =========================================================

@app.get("/supplier-account")
def supplier_account():
    try:
        result = resellcodes_request(
            "/account",
            "GET"
        )

        return {
            "ok": True,
            "data": result
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# SUPPLIER PREMIUM PRICES
# =========================================================

@app.get("/supplier-premium-prices")
def supplier_premium_prices():
    try:
        result = resellcodes_request(
            "/products",
            "GET"
        )

        return {
            "ok": True,
            "data": result
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# TEST PREMIUM BUY
# =========================================================

@app.post("/test-premium-buy")
async def test_premium_buy(
    request: PremiumTestRequest
):
    username = normalize_username(
        request.username
    )

    if not username:
        raise HTTPException(
            status_code=400,
            detail="Username kiritilmagan."
        )

    if request.months not in [1, 3, 6, 12]:
        raise HTTPException(
            status_code=400,
            detail="Premium muddati noto‘g‘ri."
        )

    valid, real_username, error = (
        await check_telegram_username(username)
    )

    if not valid:
        raise HTTPException(
            status_code=400,
            detail=error or "Username noto‘g‘ri."
        )

    # Hozircha supplier orqali haqiqiy xarid qilmaymiz.
    # Bu endpoint faqat username va parametrlarni tekshiradi.

    return {
        "ok": True,
        "test": True,
        "message": "Premium test ma'lumotlari qabul qilindi.",
        "username": real_username,
        "months": request.months
    }


# =========================================================
# DATABASE TEST
# =========================================================

@app.get("/database-test")
def database_test():
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("SELECT NOW() AS current_time")
        row = cur.fetchone()

        return {
            "ok": True,
            "database": "connected",
            "time": (
                row["current_time"].isoformat()
                if row and row["current_time"]
                else None
            )
        }

    finally:
        cur.close()
        conn.close()


# =========================================================
# SERVER INFO
# =========================================================

@app.get("/info")
def server_info():
    return {
        "ok": True,
        "name": "Telegram Shop",
        "version": "wallet-v1",
        "features": [
            "Telegram Premium",
            "Telegram Stars",
            "Wallet",
            "Orders",
            "Referral"
        ]
    }
