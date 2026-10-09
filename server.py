import os
import json
import re
import secrets
import urllib.request
import urllib.error
from datetime import datetime

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import psycopg2
from psycopg2.extras import RealDictCursor

from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.functions.contacts import ResolveUsernameRequest

# Fragment xizmati importi
from fragment import FragmentService

# =========================================================
# APP & MIDDLEWARE
# =========================================================

app = FastAPI(title="Telegram Shop API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fragment_api = FragmentService()

# =========================================================
# ENV
# =========================================================

DATABASE_URL = os.getenv("DATABASE_URL")
ADMIN_KEY = os.getenv("ADMIN_KEY", "")

RESELLCODES_API_KEY = os.getenv("RESELLCODES_API_KEY", "")
RESELLCODES_BASE_URL = "https://api.resellcodes.com"

TG_API_ID = os.getenv("TG_API_ID")
TG_API_HASH = os.getenv("TG_API_HASH")
TG_SESSION = os.getenv("TG_SESSION", "")

# =========================================================
# TELEGRAM CLIENT (StringSession bilan)
# =========================================================

telegram_client = None

if TG_API_ID and TG_API_HASH and TG_SESSION:
    try:
        telegram_client = TelegramClient(
            StringSession(TG_SESSION),
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
        # ORDERS
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

        cur.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS stars INTEGER
        """)

        cur.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """)

        # WALLETS
        cur.execute("""
            CREATE TABLE IF NOT EXISTS wallets (
                user_id BIGINT PRIMARY KEY,
                balance INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # WALLET TRANSACTIONS
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

        # REFERRALS
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


class BuyPremiumRequest(BaseModel):
    username: str
    months: int = 3
    admin_key: str = ""


class BuyStarsRequest(BaseModel):
    username: str
    amount: int = 50
    admin_key: str = ""

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
        return True, username, None

# =========================================================
# ROOT & HEALTH
# =========================================================

@app.get("/")
def root():
    return {
        "ok": True,
        "message": "Telegram Shop server is running!"
    }


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
# BALANCE & TRANSACTIONS
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
# CREATE ORDER (ASOSIY DO'KON + FRAGMENT AVTO-YETKAZISH)
# =========================================================

@app.post("/create-order")
async def create_order(order: OrderRequest):

    if order.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Mahsulot narxi noto‘g‘ri."
        )

    username = normalize_username(order.recipient_username)

    # Username tekshirish
    valid_username, real_username, username_error = (
        await check_telegram_username(username)
    )

    if not valid_username:
        raise HTTPException(
            status_code=400,
            detail=username_error or "Username noto‘g‘ri."
        )

    username = real_username

    conn = get_db()
    cur = conn.cursor()

    try:
        ensure_wallet(cur, order.user_id)
        balance = get_wallet_balance(cur, order.user_id)

        # Balans yetarlimi?
        if balance < order.amount:
            raise HTTPException(
                status_code=400,
                detail=f"Balans yetarli emas. Balansingiz: {balance} so'm"
            )

        # 1. Buyurtmani bazaga yaratamiz (status='paid')
        cur.execute(
            """
            INSERT INTO orders
                (user_id, product, amount, status, telegram_username, months, stars)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s)
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
            raise Exception("Buyurtma yaratilmadi.")

        order_id = order_row["id"]

        # 2. Balansdan yechish
        cur.execute(
            """
            UPDATE wallets
            SET balance = balance - %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND balance >= %s
            """,
            (order.amount, order.user_id, order.amount)
        )

        if cur.rowcount != 1:
            raise HTTPException(
                status_code=400,
                detail="Balansdan pul yechib bo‘lmadi."
            )

        # 3. Tranzaksiya yozish
        cur.execute(
            """
            INSERT INTO wallet_transactions
                (user_id, amount, type, description, order_id)
            VALUES
                (%s, %s, %s, %s, %s)
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

        # 4. FRAGMENT AVTOMATIK YETKAZIB BERISH (SDK orqali)
        prod_lower = (order.product or "").lower()
        is_premium = "premium" in prod_lower or (order.months and order.months > 0)
        is_stars = "stars" in prod_lower or (order.stars and order.stars > 0)

        frag_res = {"ok": False, "error": "Noma'lum mahsulot turi"}

        if is_premium:
            months_cnt = order.months or 3
            frag_res = await fragment_api.init_gift_request(
                username=username, 
                months=int(months_cnt)
            )
        elif is_stars:
            stars_cnt = order.stars or 50
            frag_res = await fragment_api.init_buy_stars(
                username=username, 
                stars_amount=int(stars_cnt)
            )

        # 5. Xarid natijasini tekshirish va kerak bo'lsa ROLLBACK qilish
        if frag_res.get("ok"):
            cur.execute(
                "UPDATE orders SET status = 'completed' WHERE id = %s",
                (order_id,)
            )
            conn.commit()
            new_balance = get_wallet_balance(cur, order.user_id)

            return {
                "ok": True,
                "message": f"@{username} hisobiga mahsulot muvaffaqiyatli yetkazildi!",
                "order_id": order_id,
                "status": "completed",
                "username": username,
                "balance": new_balance,
                "tx_hash": frag_res.get("tx_hash")
            }
        else:
            # XATOLIK: BALANSNI QAYTARISH (ROLLBACK)
            error_msg = frag_res.get("error", "Fragment yetkazib berishda xatolik")
            
            cur.execute(
                "UPDATE wallets SET balance = balance + %s, updated_at = CURRENT_TIMESTAMP WHERE user_id = %s",
                (order.amount, order.user_id)
            )
            cur.execute(
                """
                INSERT INTO wallet_transactions (user_id, amount, type, description, order_id)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (order.user_id, order.amount, "refund", f"Qaytarildi (Xatolik): {error_msg}", order_id)
            )
            cur.execute(
                "UPDATE orders SET status = 'failed' WHERE id = %s",
                (order_id,)
            )
            conn.commit()
            
            new_balance = get_wallet_balance(cur, order.user_id)

            return {
                "ok": False,
                "message": f"Buyurtma bajarilmadi: {error_msg}. Pul balansingizga qaytarildi.",
                "order_id": order_id,
                "status": "failed",
                "balance": new_balance
            }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        print("CREATE ORDER ERROR:", repr(e))
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
# ADMIN - ALL ORDERS & UPDATE STATUS
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
        result = [dict(row) for row in rows]

        return {
            "ok": True,
            "orders": result
        }

    finally:
        cur.close()
        conn.close()


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
        "failed",
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
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8", errors="ignore")
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return {"raw": raw}

    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        raise HTTPException(
            status_code=e.code,
            detail=body or "Supplier API xatosi."
        )

    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Supplier API bilan aloqa xatosi: {e}"
        )


@app.get("/supplier-account")
def supplier_account():
    try:
        result = resellcodes_request("/account", "GET")
        return {"ok": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/supplier-premium-prices")
def supplier_premium_prices():
    try:
        result = resellcodes_request("/products", "GET")
        return {"ok": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/test-premium-buy")
async def test_premium_buy(request: PremiumTestRequest):
    username = normalize_username(request.username)

    if not username:
        raise HTTPException(status_code=400, detail="Username kiritilmagan.")

    if request.months not in [1, 3, 6, 12]:
        raise HTTPException(status_code=400, detail="Premium muddati noto‘g‘ri.")

    valid, real_username, error = await check_telegram_username(username)

    if not valid:
        raise HTTPException(status_code=400, detail=error or "Username noto‘g‘ri.")

    return {
        "ok": True,
        "test": True,
        "message": "Premium test ma'lumotlari qabul qilindi.",
        "username": real_username,
        "months": request.months
    }

# =========================================================
# DATABASE TEST & INFO
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
            "Referral",
            "Fragment Auto Delivery"
        ]
    }

# ==========================================
# FRAGMENT STANDALONE ENDPOINTS
# ==========================================

@app.post("/api/buy-premium")
async def buy_premium(data: BuyPremiumRequest):
    if ADMIN_KEY and data.admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Admin key noto‘g‘ri yoki kiritilmagan!")

    username = data.username
    months = data.months

    if not username:
        raise HTTPException(status_code=400, detail="Foydalanuvchi nomi (username) kiritilmagan!")

    clean_username = normalize_username(username)

    try:
        res = await fragment_api.init_gift_request(
            username=clean_username, 
            months=months
        )

        if not res.get("ok"):
            return {"success": False, "error": res.get("error", "Init request xatoligi")}

        return {
            "success": True,
            "message": f"@{clean_username} foydalanuvchisi uchun {months} oylik Telegram Premium muvaffaqiyatli sotib olindi!",
            "tx_hash": res.get("tx_hash"),
            "purchase_id": res.get("purchase_id")
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/buy-stars")
async def buy_stars(data: BuyStarsRequest):
    if ADMIN_KEY and data.admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Admin key noto‘g‘ri yoki kiritilmagan!")

    username = data.username
    stars_amount = data.amount

    if not username:
        raise HTTPException(status_code=400, detail="Foydalanuvchi nomi (username) kiritilmagan!")

    clean_username = normalize_username(username)

    try:
        res = await fragment_api.init_buy_stars(
            username=clean_username, 
            stars_amount=stars_amount
        )

        if not res.get("ok"):
            return {"success": False, "error": res.get("error", "Stars init request xatoligi")}

        return {
            "success": True,
            "message": f"@{clean_username} foydalanuvchisi uchun {stars_amount} ta Telegram Stars muvaffaqiyatli sotib olindi!",
            "tx_hash": res.get("tx_hash"),
            "purchase_id": res.get("purchase_id")
        }

    except Exception as e:
        return {"success": False, "error": str(e)}
@app.get("/api/wallet-info")
def wallet_info():
    return {
        "ok": True,
        "wallet_address_in_env": os.getenv("WALLET_ADDRESS", ""),
        "mnemonic_status": "Mavjud" if os.getenv("MNEMONIC") else "Yo'q"
    }
# ==========================================
# SDK WALLET CHECK (DEBUG)
# ==========================================
@app.get("/api/check-sdk-wallet")
def check_sdk_wallet():
    try:
        from fragment_api import FragmentAPI
        test_api = FragmentAPI()
        
        resolved_sdk_address = "Aniqlanmadi"
        
        # 1. Seed orqali SDK hosil qilgan manzilni olish
        try:
            res = test_api.resolve_wallet(seed=fragment_api.mnemonic)
            resolved_sdk_address = getattr(res, "address", None) or getattr(res, "wallet_address", None) or str(res)
        except Exception as e1:
            # 2. Agar wallet_address bilan chaqirilsa
            try:
                res = test_api.resolve_wallet(wallet_address=fragment_api.wallet_address)
                resolved_sdk_address = getattr(res, "address", None) or getattr(res, "wallet_address", None) or str(res)
            except Exception as e2:
                resolved_sdk_address = f"E1: {e1} | E2: {e2}"

        return {
            "ok": True,
            "tonkeeper_w5_address": fragment_api.wallet_address,
            "sdk_actual_wallet_address": resolved_sdk_address
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}
