
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

from google import genai

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
# GEMINI AI
# ============================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

gemini_client = None

if GEMINI_API_KEY:
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY
    )


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

    cursor.execute("""
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS stars INTEGER
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

    months: int | None = None

    stars: int | None = None


class StatusRequest(BaseModel):

    status: str


class PremiumTestRequest(BaseModel):

    telegram_username: str
    months: int
    admin_key: str


class AIChatRequest(BaseModel):

    message: str
    user_id: int


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
    # PREMIUM
    # --------------------------------------------------------

    if order.product == "Telegram Premium":

        if order.months not in [3, 6, 12]:

            return {
                "ok": False,
                "message":
                "Premium muddati 3, 6 yoki 12 oy bo'lishi kerak"
            }

        stars = None


    # --------------------------------------------------------
    # STARS
    # --------------------------------------------------------

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
            "pending",
            username,
            order.months,
            stars
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

        "stars": stars,

        "amount": order.amount
    }


# ============================================================
# MY ORDERS
# ============================================================

@app.get("/my-orders")
def get_my_orders(user_id: int):

    if not user_id:

        return {
            "ok": False,
            "message": "Telegram foydalanuvchisi aniqlanmadi"
        }


    conn = get_db()
    cursor = conn.cursor()

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

    cursor.close()
    conn.close()


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


# ============================================================
# AI ASSISTANT
# ============================================================

@app.post("/ai-chat")
def ai_chat(data: AIChatRequest):

    if not gemini_client:

        return {
            "ok": False,
            "message": "AI hozircha sozlanmagan."
        }


    if not data.message.strip():

        return {
            "ok": False,
            "message": "Savol yuboring."
        }


    try:

        # ----------------------------------------------------
        # USERNING BUYURTMALARINI OLISH
        # ----------------------------------------------------

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                id,
                product,
                amount,
                status,
                telegram_username,
                months,
                stars
            FROM orders
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 10
            """,
            (data.user_id,)
        )

        rows = cursor.fetchall()

        cursor.close()
        conn.close()


        user_orders = []

        for row in rows:

            user_orders.append({
                "id": row[0],
                "product": row[1],
                "amount": row[2],
                "status": row[3],
                "recipient_username": row[4],
                "months": row[5],
                "stars": row[6]
            })


        orders_text = json.dumps(
            user_orders,
            ensure_ascii=False
        )


        # ----------------------------------------------------
        # GEMINI PROMPT
        # ----------------------------------------------------

        prompt = f"""
Siz Telegram Shop ichidagi AI Assistant'siz.

Siz foydalanuvchiga Telegram Shop haqida
oddiy, tushunarli va o'zbek tilida yordam berasiz.

Sizning vazifangiz:
- Telegram Premium haqida tushuntirish
- Telegram Stars paketlari haqida tushuntirish
- Narxlarni aytish
- Buyurtma berish jarayonini tushuntirish
- Foydalanuvchining buyurtmalari haqida ma'lumot berish
- Telegram Shop bo'yicha oddiy savollarga javob berish

MUHIM:
- To'lov amalga oshgan deb yolg'on aytmang.
- Buyurtma completed bo'lmasa, tugallangan deb aytmang.
- Foydalanuvchining buyurtmasi haqidagi ma'lumotni faqat berilgan
  buyurtmalar ro'yxatidan foydalanib ayting.
- API, database yoki ichki maxfiy ma'lumotlarni oshkor qilmang.
- Javoblarni qisqa va tushunarli yozing.
- Asosan o'zbek tilida javob bering.

TELEGRAM PREMIUM NARXLARI:

3 oy — 165 000 so'm
6 oy — 220 000 so'm
12 oy — 390 000 so'm

TELEGRAM STARS NARXLARI:

50 — 11 000 so'm
100 — 30 000 so'm
150 — 40 000 so'm
250 — 64 000 so'm
350 — 89 000 so'm
500 — 125 000 so'm
750 — 185 000 so'm
1000 — 244 000 so'm
1500 — 365 000 so'm
2500 — 605 000 so'm
5000 — 1 205 000 so'm

FOYDALANUVCHINING OXIRGI BUYURTMALARI:

{orders_text}

FOYDALANUVCHI SAVOLI:

{data.message}

Endi foydalanuvchiga javob bering.
"""


        # ----------------------------------------------------
        # GEMINI REQUEST
        # ----------------------------------------------------

        response = gemini_client.models.generate_content(

            model="gemini-3.8-flash",

            contents=prompt
        )


        reply = response.text

        if not reply:

            reply = "Kechirasiz, hozircha javob bera olmadim."


        return {

            "ok": True,

            "reply": reply
        }


    except Exception as e:

        print(
            f"Gemini error: {type(e).__name__}: {e}"
        )

        return {

            "ok": False,

            "message":
            "AI bilan bog'lanishda xatolik yuz berdi."
        }


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
                "stars": order[7],
                "price_usd": order[8],
                "supplier_order_id": order[9]
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
            "message": "Noto'g'ri status"
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
            "message": "Buyurtma topilmadi"
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
