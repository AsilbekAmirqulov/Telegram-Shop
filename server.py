from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import os
import urllib.request
import json

app = FastAPI()

ADMIN_KEY = os.getenv("ADMIN_KEY")


# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://asilbekamirqulov.github.io"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# DATABASE
# =========================

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


# =========================
# MODELS
# =========================

class OrderRequest(BaseModel):
    user_id: int
    product: str
    amount: int


class StatusRequest(BaseModel):
    status: str


class PremiumTestRequest(BaseModel):
    telegram_username: str
    months: int
    admin_key: str


# =========================
# HOME
# =========================

@app.get("/")
def home():
    return {
        "ok": True,
        "message": "Telegram Shop server is running!"
    }


# =========================
# CREATE ORDER
# =========================

@app.post("/create-order")
def create_order(order: OrderRequest):

    conn = sqlite3.connect("shop.db")
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO orders (user_id, product, amount, status)
        VALUES (?, ?, ?, ?)
        """,
        (
            order.user_id,
            order.product,
            order.amount,
            "pending"
        )
    )

    order_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return {
        "ok": True,
        "order_id": order_id,
        "status": "pending"
    }


# =========================
# GET ORDERS
# =========================

@app.get("/orders")
def get_orders(admin_key: str):

    if admin_key != ADMIN_KEY:
        return {
            "ok": False,
            "message": "Ruxsat yo'q"
        }

    conn = sqlite3.connect("shop.db")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, user_id, product, amount, status
        FROM orders
        ORDER BY id DESC
    """)

    orders = cursor.fetchall()

    conn.close()

    return {
        "ok": True,
        "orders": [
            {
                "id": order[0],
                "user_id": order[1],
                "product": order[2],
                "amount": order[3],
                "status": order[4]
            }
            for order in orders
        ]
    }


# =========================
# UPDATE ORDER STATUS
# =========================

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

    conn = sqlite3.connect("shop.db")
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE orders
        SET status = ?
        WHERE id = ?
        """,
        (
            request.status,
            order_id
        )
    )

    conn.commit()

    if cursor.rowcount == 0:
        conn.close()

        return {
            "ok": False,
            "message": "Buyurtma topilmadi"
        }

    conn.close()

    return {
        "ok": True,
        "order_id": order_id,
        "status": request.status
    }


# =========================
# RESELLCODES - CHECK PRICES
# =========================
# =========================
# RESELLCODES - CHECK ACCOUNT
# =========================

@app.get("/supplier-account")
def supplier_account():

    api_key = os.getenv("RESELLCODES_API_KEY")

    if not api_key:
        return {
            "ok": False,
            "message": "RESELLCODES_API_KEY topilmadi"
        }

    try:

        request = urllib.request.Request(
            "https://resell.codes/api/v1/me",
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


# =========================
# RESELLCODES - TEST BUY
# =========================

@app.post("/test-premium-buy")
def test_premium_buy(request: PremiumTestRequest):

    # Admin tekshirish
    if request.admin_key != ADMIN_KEY:
        return {
            "ok": False,
            "message": "Ruxsat yo'q"
        }

    # Oylar tekshiruvi
    if request.months not in [3, 6, 12]:
        return {
            "ok": False,
            "message": "months faqat 3, 6 yoki 12 bo'lishi mumkin"
        }

    # Username tozalash
    username = request.telegram_username.strip().lstrip("@")

    if not username:
        return {
            "ok": False,
            "message": "Telegram username kiritilmagan"
        }

    # API key
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
# =========================
# RESELLCODES - MOCK TEST BUY
# =========================

@app.post("/mock-premium-buy")
def mock_premium_buy(request: PremiumTestRequest):

    # Admin tekshirish
    if request.admin_key != ADMIN_KEY:
        return {
            "ok": False,
            "message": "Ruxsat yo'q"
        }

    # Oylar tekshiruvi
    if request.months not in [3, 6, 12]:
        return {
            "ok": False,
            "message": "months faqat 3, 6 yoki 12 bo'lishi mumkin"
        }

    # Username tozalash
    username = request.telegram_username.strip().lstrip("@")

    if not username:
        return {
            "ok": False,
            "message": "Telegram username kiritilmagan"
        }

    # Mock narxlar
    prices = {
        3: "12.1698",
        6: "16.2298",
        12: "29.4248"
    }

    return {
        "ok": True,
        "mock": True,
        "supplier": "ReSellCodes",
        "message": "MOCK TEST: haqiqiy buyurtma yuborilmadi",
        "order": {
            "telegram_username": username,
            "months": request.months,
            "price_usd": prices[request.months],
            "status": "mock_completed",
            "supplier_order_id": "MOCK-TEST-001"
        }
    }
