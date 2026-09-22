from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://asilbekamirqulov.github.io"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


class StatusRequest(BaseModel):
    status: str


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


@app.get("/orders")
def get_orders():
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


@app.put("/orders/{order_id}/status")
def update_order_status(order_id: int, request: StatusRequest):

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
        (request.status, order_id)
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
