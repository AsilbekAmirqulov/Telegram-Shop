from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import urllib.request
import psycopg2


app = FastAPI()

ADMIN_KEY = os.getenv("ADMIN_KEY")


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

def get_db():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL topilmadi")

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


class MockPaymentRequest(BaseModel):
    order_id: int
    admin_key: str


class MockDeliveryRequest(BaseModel):
    order_id: int
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

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO orders (
            user_id,
            product,
            amount,
            status
        )
        VALUES (%s, %s, %s, %s)
        RETURNING id
        """,
        (
            order.user_id,
            order.product,
            order.amount,
            "pending"
        )
    )

    order_id = cursor.fetchone()[0]

    conn.commit()
    cursor.close()
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
        "cancelled",
        "mock_pending"
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


# =========================
# RESELLCODES ACCOUNT
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


# =========================
# RESELLCODES PRICES
# =========================

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
# REAL PREMIUM BUY
# =========================

@app.post("/test-premium-buy")
def test_premium_buy(request: PremiumTestRequest):

    if request.admin_key != ADMIN_KEY:
        return {
            "ok": False,
            "message": "Ruxsat yo'q"
        }

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


# =========================
# MOCK PREMIUM BUY
# =========================

@app.post("/mock-premium-buy")
def mock_premium_buy(request: PremiumTestRequest):

    if request.admin_key != ADMIN_KEY:
        return {
            "ok": False,
            "message": "Ruxsat yo'q"
        }

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

    prices = {
        3: "12.1698",
        6: "16.2298",
        12: "29.4248"
    }

    price_usd = prices[request.months]

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
            price_usd,
            supplier_order_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            0,
            "Telegram Premium",
            0,
            "mock_pending",
            username,
            request.months,
            price_usd,
            "MOCK-TEST-001"
        )
    )

    order_id = cursor.fetchone()[0]

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "ok": True,
        "mock": True,
        "supplier": "ReSellCodes",
        "message": "MOCK TEST: haqiqiy buyurtma yuborilmadi",
        "order": {
            "id": order_id,
            "telegram_username": username,
            "months": request.months,
            "price_usd": price_usd,
            "status": "mock_pending",
            "supplier_order_id": "MOCK-TEST-001"
        }
    }


# =========================
# MOCK PAYMENT
# =========================

@app.post("/mock-payment")
def mock_payment(request: MockPaymentRequest):

    if request.admin_key != ADMIN_KEY:
        return {
            "ok": False,
            "message": "Ruxsat yo'q"
        }

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            id,
            telegram_username,
            months,
            price_usd,
            status
        FROM orders
        WHERE id = %s
        """,
        (request.order_id,)
    )

    order = cursor.fetchone()

    if not order:
        cursor.close()
        conn.close()

        return {
            "ok": False,
            "message": "Buyurtma topilmadi"
        }

    if order[4] != "mock_pending":
        cursor.close()
        conn.close()

        return {
            "ok": False,
            "message": f"Buyurtma holati noto'g'ri: {order[4]}"
        }

    cursor.execute(
        """
        UPDATE orders
        SET status = %s
        WHERE id = %s
        """,
        (
            "paid",
            request.order_id
        )
    )

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "ok": True,
        "mock": True,
        "message": "MOCK PAYMENT: to'lov simulyatsiya qilindi",
        "payment": {
            "order_id": order[0],
            "telegram_username": order[1],
            "months": order[2],
            "amount_usd": order[3],
            "status": "paid"
        }
    }


# =========================
# MOCK PREMIUM DELIVERY
# =========================

@app.post("/mock-premium-delivery")
def mock_premium_delivery(request: MockDeliveryRequest):

    if request.admin_key != ADMIN_KEY:
        return {
            "ok": False,
            "message": "Ruxsat yo'q"
        }

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            id,
            telegram_username,
            months,
            price_usd,
            status
        FROM orders
        WHERE id = %s
        """,
        (request.order_id,)
    )

    order = cursor.fetchone()

    if not order:
        cursor.close()
        conn.close()

        return {
            "ok": False,
            "message": "Buyurtma topilmadi"
        }

    if order[4] != "paid":
        cursor.close()
        conn.close()

        return {
            "ok": False,
            "message": f"Buyurtma paid holatida emas: {order[4]}"
        }

    cursor.execute(
        """
        UPDATE orders
        SET status = %s
        WHERE id = %s
        """,
        (
            "processing",
            request.order_id
        )
    )

    conn.commit()

    mock_supplier_order_id = (
        f"MOCK-RESELL-{request.order_id}"
    )

    cursor.execute(
        """
        UPDATE orders
        SET
            status = %s,
            supplier_order_id = %s
        WHERE id = %s
        """,
        (
            "completed",
            mock_supplier_order_id,
            request.order_id
        )
    )

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "ok": True,
        "mock": True,
        "message": "MOCK: Premium yetkazib berish simulyatsiya qilindi",
        "delivery": {
            "order_id": order[0],
            "telegram_username": order[1],
            "months": order[2],
            "status": "completed",
            "supplier_order_id": mock_supplier_order_id
        }
    }
