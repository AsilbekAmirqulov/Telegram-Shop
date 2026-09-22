from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3

app = FastAPI()


class OrderRequest(BaseModel):
    user_id: int
    product: str
    amount: int


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
        "order_id": order_id
    }