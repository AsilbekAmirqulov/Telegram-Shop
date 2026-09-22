from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3
import os
import urllib.request
import json

app = FastAPI()


# Ma'lumotlar bazasini yaratish
def init_db():
    conn = sqlite3.connect("shop.db")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product TEXT NOT NULL,
            amount INTEGER NOT NULL,
            status TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


init_db()


class OrderRequest(BaseModel):
    user_id: int
    product: str
    amount: int


@app.get("/")
def home():
    return {
        "ok": True,
        "message": "Telegram Shop server is running!"
    }


@app.post("/create-order")
def create_order(order: OrderRequest):
    conn = sqlite3.connect("shop.db")
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO orders (user_id, product, amount, status)
        VALUES (?, ?, ?, ?)
        """,
        (order.user_id, order.product, order.amount, "pending")
    )

    order_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return {
        "ok": True,
        "order_id": order_id,
        "status": "pending"
    }


# =====================================================
# ReSellCodes Premium narxlarini tekshirish
# =====================================================

@app.get("/supplier-premium-prices")
def supplier_premium_prices():

    api_key = os.getenv("RESELLCODES_API_KEY")

    if not api_key:
        return {
            "ok": False,
            "message": "RESELLCODES_API_KEY topilmadi"
        }

    try:

        request = urllib.request.Request(
            "https://resell.codes/api/v1/telegram/premium",
            headers={
                "Authorization": f"Bearer {api_key}"
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
            "supplier": "ReSellCodes",
            "data": data
        }

    except Exception as e:

        return {
            "ok": False,
            "message": str(e)
        }
        class PremiumTestRequest(BaseModel):
    telegram_username: str
    months: int
    admin_key: str


@app.post("/test-premium-buy")
def test_premium_buy(request: PremiumTestRequest):

    # Admin tekshirish
    if request.admin_key != ADMIN_KEY:
        return {
            "ok": False,
            "message": "Ruxsat yo'q"
        }

    # Faqat 3, 6 yoki 12 oy
    if request.months not in [3, 6, 12]:
        return {
            "ok": False,
            "message": "months faqat 3, 6 yoki 12 bo'lishi mumkin"
        }

    username = request.telegram_username.strip().lstrip("@")

    if not username:
        return {
            "ok": False,
            "message": "Telegram username kiritilmagan"
        }

    api_key = os.getenv("RESELLCODES_API_KEY")

    if not api_key:
        return {
            "ok": False,
            "message": "RESELLCODES_API_KEY topilmadi"
        }

    try:

        payload = json.dumps({
            "telegram_username": username,
            "months": request.months
        }).encode("utf-8")

        api_request = urllib.request.Request(
            "https://resell.codes/api/v1/telegram/premium/buy",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
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
            "supplier": "ReSellCodes",
            "order": data
        }

    except Exception as e:

        return {
            "ok": False,
            "message": str(e)
        }
