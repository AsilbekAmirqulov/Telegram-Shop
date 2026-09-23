from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel
import sqlite3

app = FastAPI()


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
# ORDER MODEL
# =========================

class OrderRequest(BaseModel):
    user_id: int
    product: str
    amount: int


# =========================
# MAIN PAGE
# =========================

@app.get("/")
def home():
    return FileResponse("index.html")


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