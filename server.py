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

        # Base64 session faylni ochamiz
        session_bytes = base64.b64decode(TG_SESSION)

        session_file = tempfile.NamedTemporaryFile(
            prefix="telegram_shop_",
            suffix=".session",
            delete=False
        )

        session_file.write(session_bytes)
        session_file.close()

        telegram_session_path = session_file.name

        # ASYNC TELETHON CLIENT
        telegram_client = TelegramClient(
            telegram_session_path,
            int(TG_API_ID),
            TG_API_HASH
        )

        # FastAPI startup event loop ichida ulanadi
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

    """
    Telegram username'ni Telegram serveri orqali tekshiradi.

    Natija:

    (True, real_username, None)

    yoki

    (False, None, error_message)
    """

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

        # Telegram serveriga async so'rov
        result = await telegram_client(
            ResolveUsernameRequest(username)
        )

        # Telegram qaytargan userlarni tekshiramiz
        for entity in result.users:

            if not isinstance(entity, User):

                continue

            # Botlarni qabul qilmaymiz
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

        print(
            f"USERNAME_CHECK NOT_FOUND: @{username}"
        )

        return (
            False,
            None,
            "Bunday username mavjud emas"
        )

    except UsernameNotOccupiedError:

        print(
            f"USERNAME_CHECK NOT_FOUND: @{username}"
        )

        return (
            False,
            None,
            "Bunday username mavjud emas"
        )

    except UsernameInvalidError:

        print(
            f"USERNAME_CHECK INVALID: @{username}"
        )

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


def init_db():

    conn = get_db()
    cursor = conn.cursor()

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
            supplier_order_id TEXT
        )
    """)

    conn.commit()

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
    months: int


class StatusRequest(BaseModel):

    status: str


class PremiumTestRequest(BaseModel):

    telegram_username: str
    months: int
    admin_key: str


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

    # Telegram username format
    if not re.fullmatch(
        r"[A-Za-z0-9_]{5,32}",
        username
    ):

        return {
            "ok": False,
            "message":
            "❗ Username noto'g'ri. Masalan: @qwerty123"
        }

    # Telegram serverida mavjudligini tekshirish
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
# CREATE ORDER
# ============================================================

@app.post("/create-order")
async def create_order(order: OrderRequest):

    # --------------------------------------------------------
    # PRODUCT
    # --------------------------------------------------------

    if order.product != "Telegram Premium":

        return {
            "ok": False,
            "message":
            "Hozircha faqat Telegram Premium mavjud"
        }

    # --------------------------------------------------------
    # MONTHS
    # --------------------------------------------------------

    if order.months not in [3, 6, 12]:

        return {
            "ok": False,
            "message":
            "Premium muddati 3, 6 yoki 12 oy bo'lishi kerak"
        }

    # --------------------------------------------------------
    # AMOUNT
    # --------------------------------------------------------

    if order.amount <= 0:

        return {
            "ok": False,
            "message":
            "Narx noto'g'ri"
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

    if len(username) < 5 or len(username) > 32:

        return {
            "ok": False,
            "message":
            "Telegram username noto'g'ri"
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

    valid_username, real_username, username_error = (
        await check_telegram_username(username)
    )

    if not valid_username:

        return {
            "ok": False,
            "message": username_error
        }

    username = real_username

    # --------------------------------------------------------
    # DATABASE
    # --------------------------------------------------------

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO orders (
            user_id,
            product,
            amount,
            status,
            telegram_username,
            months
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            order.user_id,
            order.product,
            order.amount,
            "pending",
            username,
            order.months
        )
    )

    order_id = cursor.fetchone()[0]

    conn.commit()

    cursor.close()
    conn.close()

    return {

        "ok": True,

        "order_id": order_id,

        "status": "pending",

        "buyer_user_id": order.user_id,

        "recipient_username": username,

        "product": order.product,

        "months": order.months,

        "amount": order.amount
    }


# ============================================================
# GET ORDERS
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

    cursor.execute("""
        SELECT
            id,
            user_id,
            product,
            amount,
            status,
            telegram_username,
            months,
            price_usd,
            supplier_order_id
        FROM orders
        ORDER BY id DESC
    """)

    orders = cursor.fetchall()

    cursor.close()
    conn.close()

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
                "price_usd": order[7],
                "supplier_order_id": order[8]
            }

            for order in orders
        ]
    }


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
            "message":
            "Noto'g'ri status"
        }

    conn = get_db()
    cursor = conn.cursor()

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

        cursor.close()
        conn.close()

        return {
            "ok": False,
            "message":
            "Buyurtma topilmadi"
        }

    conn.commit()

    cursor.close()
    conn.close()

    return {

        "ok": True,

        "order_id": order_id,

        "status": request.status
    }


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
# REAL PREMIUM BUY
# ============================================================
#
# Hozircha admin/test endpoint.
# To'lov API tayyor bo'lgach,
# shu jarayonni paid order bilan bog'laymiz.
# ============================================================

@app.post("/test-premium-buy")
async def test_premium_buy(
    request: PremiumTestRequest
):

    if request.admin_key != ADMIN_KEY:

        return {
            "ok": False,
            "message":
            "Ruxsat yo'q"
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

    # Premium berishdan oldin username mavjudligini tekshirish
    valid_username, real_username, username_error = (
        await check_telegram_username(username)
    )

    if not valid_username:

        return {
            "ok": False,
            "message": username_error
        }

    username = real_username

    # --------------------------------------------------------
    # RESELLCODES API KEY
    # --------------------------------------------------------

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
