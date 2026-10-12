import os
import re
import json
import secrets
import logging
import urllib.request
import urllib.error
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor

from fastapi import (
    FastAPI,
    HTTPException,
    Header,
    Depends,
    Query,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.functions.contacts import ResolveUsernameRequest

from fragment import FragmentService


# =========================================================
# 1. LOG VA FASTAPI
# =========================================================

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("telegram_shop")

app = FastAPI(
    title="Telegram Shop API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# 2. ENVIRONMENT SOZLAMALARI
# =========================================================

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
ADMIN_KEY = os.getenv("ADMIN_KEY", "").strip()

RESELLCODES_API_KEY = os.getenv(
    "RESELLCODES_API_KEY", ""
).strip()

RESELLCODES_BASE_URL = os.getenv(
    "RESELLCODES_BASE_URL",
    "https://api.resellcodes.com",
).rstrip("/")

TG_API_ID = os.getenv("TG_API_ID", "").strip()
TG_API_HASH = os.getenv("TG_API_HASH", "").strip()
TG_SESSION = os.getenv("TG_SESSION", "").strip()

FRAGMENT_PURCHASES_ENABLED = (
    os.getenv("FRAGMENT_PURCHASES_ENABLED", "false")
    .strip()
    .lower()
    == "true"
)

fragment_api = FragmentService()

telegram_client = None

if TG_API_ID and TG_API_HASH and TG_SESSION:
    try:
        telegram_client = TelegramClient(
            StringSession(TG_SESSION),
            int(TG_API_ID),
            TG_API_HASH,
        )
    except (ValueError, TypeError):
        logger.exception(
            "Telegram sozlamalarida xatolik"
        )
        telegram_client = None


# =========================================================
# 3. MAHSULOT NARXLARI
# =========================================================

PREMIUM_PRICES = {
    3: 165000,
    6: 220000,
    12: 390000,
}

STARS_PRICES = {
    50: 11000,
    100: 30000,
    150: 40000,
    250: 64000,
    350: 89000,
    500: 125000,
    750: 185000,
    1000: 244000,
    1500: 365000,
    2500: 605000,
    5000: 1205000,
}


# =========================================================
# 4. DATABASE CONNECTION
# =========================================================

def get_db_connection():
    if not DATABASE_URL:
        raise HTTPException(
            status_code=503,
            detail="DATABASE_URL sozlanmagan",
        )

    try:
        return psycopg2.connect(
            DATABASE_URL,
            cursor_factory=RealDictCursor,
        )
    except Exception:
        logger.exception(
            "Ma'lumotlar bazasiga ulanishda xatolik"
        )
        raise HTTPException(
            status_code=503,
            detail="Ma'lumotlar bazasiga ulanib bo'lmadi",
        )


# =========================================================
# 5. DATABASE TABLES
# =========================================================

def init_db():
    if not DATABASE_URL:
        logger.warning(
            "DATABASE_URL yo'q. Database init o'tkazib yuborildi."
        )
        return

    conn = None

    try:
        conn = psycopg2.connect(DATABASE_URL)

        with conn:
            with conn.cursor() as cur:

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS orders (
                        id SERIAL PRIMARY KEY,
                        user_id BIGINT NOT NULL,
                        product TEXT NOT NULL,
                        amount BIGINT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'pending',
                        telegram_username TEXT,
                        months INTEGER,
                        stars INTEGER,
                        price_usd NUMERIC(12,4),
                        supplier_order_id TEXT,
                        created_at TIMESTAMPTZ
                            NOT NULL DEFAULT NOW()
                    )
                """)

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS wallets (
                        user_id BIGINT PRIMARY KEY,
                        balance BIGINT NOT NULL DEFAULT 0,
                        updated_at TIMESTAMPTZ
                            NOT NULL DEFAULT NOW()
                    )
                """)

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS wallet_transactions (
                        id SERIAL PRIMARY KEY,
                        user_id BIGINT NOT NULL,
                        type TEXT NOT NULL,
                        amount BIGINT NOT NULL,
                        description TEXT,
                        created_at TIMESTAMPTZ
                            NOT NULL DEFAULT NOW()
                    )
                """)

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS referrals (
                        id SERIAL PRIMARY KEY,
                        referrer_id BIGINT NOT NULL,
                        referred_id BIGINT NOT NULL UNIQUE,
                        created_at TIMESTAMPTZ
                            NOT NULL DEFAULT NOW(),
                        CHECK (referrer_id <> referred_id)
                    )
                """)

                cur.execute("""
                    CREATE INDEX IF NOT EXISTS
                    idx_orders_user_created
                    ON orders(user_id, created_at DESC)
                """)

                cur.execute("""
                    CREATE INDEX IF NOT EXISTS
                    idx_wallet_tx_user_created
                    ON wallet_transactions(
                        user_id,
                        created_at DESC
                    )
                """)

    except Exception:
        logger.exception(
            "Database jadvallarini yaratishda xatolik"
        )
        raise

    finally:
        if conn:
            conn.close()


# =========================================================
# 6. STARTUP VA SHUTDOWN
# =========================================================

@app.on_event("startup")
async def startup_event():
    try:
        init_db()
    except Exception:
        logger.exception(
            "Server ishga tushganda database xatoligi"
        )

    if telegram_client:
        try:
            await telegram_client.connect()

            if not await telegram_client.is_user_authorized():
                logger.warning(
                    "Telegram sessiyasi avtorizatsiyadan o'tmagan"
                )

        except Exception:
            logger.exception(
                "Telegram client ulanishida xatolik"
            )


@app.on_event("shutdown")
async def shutdown_event():
    if telegram_client:
        try:
            await telegram_client.disconnect()
        except Exception:
            logger.exception(
                "Telegram client uzilishida xatolik"
            )


# =========================================================
# 7. ADMIN TEKSHIRUVI
# =========================================================

def require_admin(
    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),
    admin_key: Optional[str] = Query(default=None),
):
    if not ADMIN_KEY:
        raise HTTPException(
            status_code=503,
            detail="ADMIN_KEY serverda sozlanmagan",
        )

    supplied_key = x_admin_key or admin_key

    if (
        not supplied_key
        or not secrets.compare_digest(
            str(supplied_key),
            ADMIN_KEY,
        )
    ):
        raise HTTPException(
            status_code=403,
            detail="Admin ruxsati talab qilinadi",
        )

    return True


def require_body_admin_key(key: Optional[str]):
    if not ADMIN_KEY:
        raise HTTPException(
            status_code=503,
            detail="ADMIN_KEY serverda sozlanmagan",
        )

    if (
        not key
        or not secrets.compare_digest(
            str(key),
            ADMIN_KEY,
        )
    ):
        raise HTTPException(
            status_code=403,
            detail="Admin kaliti noto'g'ri",
        )


# =========================================================
# 8. USERNAME TEKSHIRISH
# =========================================================

def clean_username(username: str) -> str:
    username = (username or "").strip()

    if username.startswith("@"):
        username = username[1:]

    if not re.fullmatch(
        r"[A-Za-z0-9_]{5,32}",
        username,
    ):
        raise HTTPException(
            status_code=400,
            detail="Telegram username noto'g'ri",
        )

    return username


async def check_telegram_username(
    username: str,
) -> dict:
    username = clean_username(username)

    if not telegram_client:
        return {
            "ok": False,
            "valid": False,
            "message": (
                "Telegram username tekshiruvi "
                "serverda sozlanmagan"
            ),
        }

    try:
        result = await telegram_client(
            ResolveUsernameRequest(username)
        )

        if getattr(result, "users", None):
            return {
                "ok": True,
                "valid": True,
                "username": username,
            }

        return {
            "ok": False,
            "valid": False,
            "message": "Telegram foydalanuvchisi topilmadi",
        }

    except Exception as exc:
        error_name = type(exc).__name__.lower()

        if (
            "usernameinvalid" in error_name
            or "usernamenotoccupied" in error_name
        ):
            return {
                "ok": False,
                "valid": False,
                "message": "Bunday username topilmadi",
            }

        logger.warning(
            "Username tekshiruvi muvaffaqiyatsiz: %s",
            type(exc).__name__,
        )

        return {
            "ok": False,
            "valid": False,
            "message": "Username hozir tekshirilmadi",
        }


# =========================================================
# 9. BALANS YORDAMCHI FUNKSIYALARI
# =========================================================

def get_wallet_row(
    cur,
    user_id: int,
    lock: bool = False,
):
    cur.execute(
        """
        INSERT INTO wallets (user_id, balance)
        VALUES (%s, 0)
        ON CONFLICT (user_id) DO NOTHING
        """,
        (user_id,),
    )

    sql = """
        SELECT user_id, balance
        FROM wallets
        WHERE user_id = %s
    """

    if lock:
        sql += " FOR UPDATE"

    cur.execute(sql, (user_id,))
    return cur.fetchone()


# =========================================================
# 10. MAHSULOTNI ANIQLASH VA NARXNI TEKSHIRISH
# =========================================================

def classify_order(
    product: str,
    months: Optional[int],
    stars: Optional[int],
):
    product_name = (product or "").strip().lower()

    if (
        "star" in product_name
        or "yulduz" in product_name
    ):
        if stars not in STARS_PRICES:
            raise HTTPException(
                status_code=400,
                detail="Stars paketi katalogda mavjud emas",
            )

        return (
            "stars",
            STARS_PRICES[stars],
            None,
            stars,
        )

    if "premium" in product_name:
        if months not in PREMIUM_PRICES:
            raise HTTPException(
                status_code=400,
                detail="Premium muddati katalogda mavjud emas",
            )

        return (
            "premium",
            PREMIUM_PRICES[months],
            months,
            None,
        )

    raise HTTPException(
        status_code=400,
        detail=(
            "Bu mahsulot avtomatik xarid uchun "
            "qo'llab-quvvatlanmaydi"
        ),
    )


# =========================================================
# 11. RESELLCODES API YORDAMCHISI
# =========================================================

def reseller_request(
    path: str,
    method: str = "GET",
    payload: Optional[dict] = None,
):
    if not RESELLCODES_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Supplier API kaliti sozlanmagan",
        )

    url = (
        f"{RESELLCODES_BASE_URL}/"
        f"{path.lstrip('/')}"
    )

    body = (
        json.dumps(payload).encode("utf-8")
        if payload is not None
        else None
    )

    request = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            "Authorization": (
                f"Bearer {RESELLCODES_API_KEY}"
            ),
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=20,
        ) as response:
            raw = response.read().decode(
                "utf-8",
                errors="replace",
            )

            return json.loads(raw) if raw else {}

    except urllib.error.HTTPError as exc:
        logger.warning(
            "Supplier API HTTP xatosi: %s",
            exc.code,
        )
        raise HTTPException(
            status_code=502,
            detail="Supplier API so'rovni rad etdi",
        )

    except Exception:
        logger.exception(
            "Supplier API bilan aloqa xatosi"
        )
        raise HTTPException(
            status_code=502,
            detail="Supplier API bilan aloqa o'rnatilmadi",
        )


# =========================================================
# 12. REQUEST MODELLARI
# =========================================================

class OrderRequest(BaseModel):
    user_id: int = Field(gt=0)
    product: str = Field(min_length=1, max_length=100)
    amount: int = Field(gt=0)
    recipient_username: str = Field(
        min_length=5,
        max_length=33,
    )
    months: Optional[int] = None
    stars: Optional[int] = None


class StatusRequest(BaseModel):
    status: str = Field(
        min_length=1,
        max_length=40,
    )


class AdminBalanceRequest(BaseModel):
    user_id: int = Field(gt=0)
    amount: int = Field(gt=0)
    description: Optional[str] = Field(
        default="Admin tomonidan balans to'ldirildi",
        max_length=250,
    )


class ReferralRequest(BaseModel):
    user_id: int = Field(gt=0)
    referrer_id: int = Field(gt=0)


class PremiumTestRequest(BaseModel):
    username: str = Field(
        min_length=5,
        max_length=33,
    )
    months: int


class BuyPremiumRequest(BaseModel):
    username: str
    months: int
    admin_key: Optional[str] = None


class BuyStarsRequest(BaseModel):
    username: str
    stars_amount: int
    admin_key: Optional[str] = None


# =========================================================
# 13. ASOSIY ENDPOINTLAR
# =========================================================

@app.get("/")
async def root():
    return {
        "ok": True,
        "message": "Telegram Shop server is running!",
    }


@app.get("/health")
async def health():
    return {
        "ok": True,
        "database_configured": bool(DATABASE_URL),
        "telegram_check_configured": telegram_client is not None,
        "fragment_purchases_enabled": FRAGMENT_PURCHASES_ENABLED,
    }


@app.get("/info")
async def info():
    return {
        "ok": True,
        "service": "Telegram Shop",
        "version": app.version,
        "database_configured": bool(DATABASE_URL),
        "telegram_configured": telegram_client is not None,
        "fragment_purchases_enabled": FRAGMENT_PURCHASES_ENABLED,
    }


# =========================================================
# 14. KATALOG VA NARXLAR (SWAGGER VA FRONTEND UCHUN)
# =========================================================

@app.get("/catalog/stars")
async def get_stars_catalog():
    """
    Swagger va Frontend uchun mavjud barcha Stars paketlari va ularning narxlarini qaytaradi.
    """
    return {
        "ok": True,
        "packages": [
            {"stars": stars, "price_sum": price}
            for stars, price in STARS_PRICES.items()
        ],
    }


@app.get("/catalog/premium")
async def get_premium_catalog():
    """
    Swagger va Frontend uchun mavjud barcha Premium muddatlari va ularning narxlarini qaytaradi.
    """
    return {
        "ok": True,
        "packages": [
            {"months": months, "price_sum": price}
            for months, price in PREMIUM_PRICES.items()
        ],
    }


# =========================================================
# 15. TELEGRAM USERNAME TEKSHIRISH
# =========================================================

@app.get("/check-username")
async def check_username(
    username: str = Query(
        min_length=5,
        max_length=33,
    ),
):
    return await check_telegram_username(username)


# =========================================================
# 16. FOYDALANUVCHI BALANSI
# =========================================================

@app.get("/balance")
async def balance(
    user_id: int = Query(gt=0),
):
    conn = get_db_connection()

    try:
        with conn:
            with conn.cursor() as cur:
                wallet = get_wallet_row(
                    cur,
                    user_id,
                )

                return {
                    "ok": True,
                    "user_id": user_id,
                    "balance": int(wallet["balance"]),
                }

    finally:
        conn.close()


# =========================================================
# 17. BALANS TRANZAKSIYALARI
# =========================================================

@app.get("/wallet/transactions")
async def wallet_transactions(
    user_id: int = Query(gt=0),
    limit: int = Query(default=20, ge=1, le=100),
):
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    type,
                    amount,
                    description,
                    created_at
                FROM wallet_transactions
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )

            rows = cur.fetchall()

            return {
                "ok": True,
                "transactions": [
                    dict(row) for row in rows
                ],
            }

    finally:
        conn.close()


# =========================================================
# 18. ADMIN FOYDALANUVCHI BALANSINI TO'LDIRISHI
# =========================================================

@app.post("/admin/add-balance")
async def admin_add_balance(
    data: AdminBalanceRequest,
    _: bool = Depends(require_admin),
):
    conn = get_db_connection()

    try:
        with conn:
            with conn.cursor() as cur:
                get_wallet_row(
                    cur,
                    data.user_id,
                    lock=True,
                )

                cur.execute(
                    """
                    UPDATE wallets
                    SET
                        balance = balance + %s,
                        updated_at = NOW()
                    WHERE user_id = %s
                    RETURNING balance
                    """,
                    (
                        data.amount,
                        data.user_id,
                    ),
                )

                wallet = cur.fetchone()

                cur.execute(
                    """
                    INSERT INTO wallet_transactions
                    (
                        user_id,
                        type,
                        amount,
                        description
                    )
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        data.user_id,
                        "credit",
                        data.amount,
                        data.description,
                    ),
                )

        return {
            "ok": True,
            "user_id": data.user_id,
            "balance": int(wallet["balance"]),
        }

    finally:
        conn.close()


# =========================================================
# 19. REFERAL RO'YXATDAN O'TKAZISH
# =========================================================

@app.post("/referral")
async def add_referral(
    data: ReferralRequest,
):
    if data.user_id == data.referrer_id:
        raise HTTPException(
            status_code=400,
            detail="O'zingizni referral sifatida kirita olmaysiz",
        )

    conn = get_db_connection()

    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO referrals
                    (
                        referrer_id,
                        referred_id
                    )
                    VALUES (%s, %s)
                    ON CONFLICT (referred_id)
                    DO NOTHING
                    RETURNING id
                    """,
                    (
                        data.referrer_id,
                        data.user_id,
                    ),
                )

                created = cur.fetchone()

        return {
            "ok": True,
            "registered": created is not None,
        }

    finally:
        conn.close()


# =========================================================
# 20. YANGI BUYURTMA YARATISH
# =========================================================

@app.post("/create-order")
async def create_order(
    order: OrderRequest,
):
    if not FRAGMENT_PURCHASES_ENABLED:
        raise HTTPException(
            status_code=503,
            detail=(
                "Avtomatik xarid vaqtincha o'chirilgan. "
                "Xarid xavfsizligi tekshirilishi kerak."
            ),
        )

    kind, expected_price, months, stars = classify_order(
        order.product,
        order.months,
        order.stars,
    )

    if order.amount != expected_price:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Mahsulot narxi mos emas",
                "expected_amount": expected_price,
            },
        )

    username = clean_username(
        order.recipient_username,
    )

    username_result = await check_telegram_username(
        username,
    )

    if not username_result.get("valid"):
        raise HTTPException(
            status_code=400,
            detail=username_result.get(
                "message",
                "Username tekshirilmadi",
            ),
        )

    try:
        if kind == "premium":
            available = (
                await fragment_api.check_premium_availability(
                    username,
                    months,
                )
            )
        else:
            available = (
                await fragment_api.check_stars_availability(
                    username,
                    stars,
                )
            )

    except Exception:
        logger.exception(
            "Supplier mavjudligini tekshirishda xatolik"
        )

        raise HTTPException(
            status_code=502,
            detail="Xizmat mavjudligini tekshirishda xatolik",
        )

    if not available:
        raise HTTPException(
            status_code=409,
            detail="Bu xizmat hozir mavjud emas yoki tekshirilmadi",
        )

    conn = get_db_connection()
    order_id = None

    try:
        with conn:
            with conn.cursor() as cur:
                wallet = get_wallet_row(
                    cur,
                    order.user_id,
                    lock=True,
                )

                current_balance = int(
                    wallet["balance"]
                )

                if current_balance < expected_price:
                    raise HTTPException(
                        status_code=400,
                        detail="Balans yetarli emas",
                    )

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
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        order.user_id,
                        kind,
                        expected_price,
                        "processing",
                        username,
                        months,
                        stars,
                    ),
                )

                order_id = cur.fetchone()["id"]

                cur.execute(
                    """
                    UPDATE wallets
                    SET
                        balance = balance - %s,
                        updated_at = NOW()
                    WHERE
                        user_id = %s
                        AND balance >= %s
                    RETURNING balance
                    """,
                    (
                        expected_price,
                        order.user_id,
                        expected_price,
                    ),
                )

                updated_wallet = cur.fetchone()

                if not updated_wallet:
                    raise HTTPException(
                        status_code=400,
                        detail="Balans yetarli emas",
                    )

                cur.execute(
                    """
                    INSERT INTO wallet_transactions
                    (
                        user_id,
                        type,
                        amount,
                        description
                    )
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        order.user_id,
                        "debit",
                        expected_price,
                        f"Buyurtma #{order_id} uchun mablag' yechildi",
                    ),
                )

        try:
            if kind == "premium":
                result = (
                    await fragment_api.init_gift_request(
                        username,
                        months,
                    )
                )
            else:
                result = (
                    await fragment_api.init_buy_stars(
                        username,
                        stars,
                    )
                )

        except Exception:
            logger.exception(
                "Buyurtma #%s supplier xatosi",
                order_id,
            )

            result = {
                "ok": False,
                "status": "reconciliation_required",
            }

        if not isinstance(result, dict):
            result = {
                "ok": False,
                "status": "reconciliation_required",
            }

        supplier_status = str(
            result.get("status", "")
        ).lower()

        supplier_order_id = (
            result.get("purchase_id")
            or result.get("order_id")
        )

        if (
            result.get("ok") is True
            and supplier_status in {
                "completed",
                "success",
                "paid",
            }
        ):
            final_status = "completed"
        else:
            final_status = "reconciliation_required"

        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE orders
                    SET
                        status = %s,
                        supplier_order_id = %s
                    WHERE id = %s
                    """,
                    (
                        final_status,
                        (
                            str(supplier_order_id)
                            if supplier_order_id
                            else None
                        ),
                        order_id,
                    ),
                )

        return {
            "ok": final_status == "completed",
            "order_id": order_id,
            "status": final_status,
            "message": (
                "Buyurtma bajarildi"
                if final_status == "completed"
                else (
                    "Buyurtma tekshiruvda. "
                    "Supplier holati tasdiqlanmaguncha "
                    "avtomatik refund amalga oshirilmaydi."
                )
            ),
        }

    finally:
        conn.close()


# =========================================================
# 21. FOYDALANUVCHINING BUYURTMALARI
# =========================================================

@app.get("/my-orders")
async def my_orders(
    user_id: int = Query(gt=0),
    limit: int = Query(default=50, ge=1, le=100),
):
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
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
                    created_at
                FROM orders
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )

            rows = cur.fetchall()

            return {
                "ok": True,
                "orders": [
                    dict(row) for row in rows
                ],
            }

    finally:
        conn.close()


# =========================================================
# 22. ADMIN BARCHA BUYURTMALARNI KO'RISHI
# =========================================================

@app.get("/orders")
async def all_orders(
    _: bool = Depends(require_admin),
    limit: int = Query(default=100, ge=1, le=500),
):
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
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
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )

            return {
                "ok": True,
                "orders": [
                    dict(row) for row in cur.fetchall()
                ],
            }

    finally:
        conn.close()


# =========================================================
# 23. ADMIN BUYURTMA STATUSINI O'ZGARTIRISHI
# =========================================================

@app.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    data: StatusRequest,
    _: bool = Depends(require_admin),
):
    allowed_statuses = {
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "reconciliation_required",
    }

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Buyurtma statusi noto'g'ri",
        )

    conn = get_db_connection()

    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE orders
                    SET status = %s
                    WHERE id = %s
                    RETURNING id, status
                    """,
                    (
                        data.status,
                        order_id,
                    ),
                )

                row = cur.fetchone()

                if not row:
                    raise HTTPException(
                        status_code=404,
                        detail="Buyurtma topilmadi",
                    )

        return {
            "ok": True,
            "order": dict(row),
        }

    finally:
        conn.close()


# =========================================================
# 24. RESELLCODES HISOBI
# =========================================================

@app.get("/supplier-account")
async def supplier_account(
    _: bool = Depends(require_admin),
):
    return reseller_request("/account")


# =========================================================
# 25. RESELLCODES PREMIUM NARXLARI
# =========================================================

@app.get("/supplier-premium-prices")
async def supplier_premium_prices(
    _: bool = Depends(require_admin),
):
    return reseller_request("/products/premium")


# =========================================================
# 26. PREMIUM TEST — XARID AMALGA OSHIRILMAYDI
# =========================================================

@app.post("/test-premium-buy")
async def test_premium_buy(
    data: PremiumTestRequest,
):
    username = clean_username(data.username)

    if data.months not in (3, 6, 12):
        raise HTTPException(
            status_code=400,
            detail="Faqat 3, 6 yoki 12 oylik Premium qo'llab-quvvatlanadi",
        )

    check = await check_telegram_username(username)

    if not check.get("valid"):
        raise HTTPException(
            status_code=400,
            detail=check.get(
                "message",
                "Username tekshirilmadi",
            ),
        )

    return {
        "ok": True,
        "username": username,
        "months": data.months,
        "message": "Username tekshildi. Test endpoint xarid qilmaydi.",
    }


# =========================================================
# 27. DATABASE TEST
# =========================================================

@app.get("/database-test")
async def database_test(
    _: bool = Depends(require_admin),
):
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 AS test")
            result = cur.fetchone()

        return {
            "ok": result["test"] == 1,
            "database": "connected",
        }

    finally:
        conn.close()


# =========================================================
# 28. TO'G'RIDAN-TO'G'RI PREMIUM XARIDI
# =========================================================

@app.post("/api/buy-premium")
async def api_buy_premium(
    data: BuyPremiumRequest,
):
    require_body_admin_key(data.admin_key)

    if not FRAGMENT_PURCHASES_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Fragment xaridlari xavfsizlik sabab o'chirilgan",
        )

    username = clean_username(data.username)

    if data.months not in (3, 6, 12):
        raise HTTPException(
            status_code=400,
            detail="Faqat 3, 6 yoki 12 oy",
        )

    check = await check_telegram_username(username)

    if not check.get("valid"):
        raise HTTPException(
            status_code=400,
            detail=check.get(
                "message",
                "Username tekshirilmadi",
            ),
        )

    try:
        available = (
            await fragment_api.check_premium_availability(
                username,
                data.months,
            )
        )

        if not available:
            raise HTTPException(
                status_code=409,
                detail="Premium mavjudligi tasdiqlanmadi",
            )

        result = await fragment_api.init_gift_request(
            username,
            data.months,
        )

        return result

    except HTTPException:
        raise

    except Exception:
        logger.exception(
            "To'g'ridan-to'g'ri Premium xaridida xatolik"
        )

        raise HTTPException(
            status_code=502,
            detail="Premium xarid so'rovi xatolik bilan yakunlandi",
        )


# =========================================================
# 29. TO'G'RIDAN-TO'G'RI STARS XARIDI
# =========================================================

@app.post("/api/buy-stars")
async def api_buy_stars(
    data: BuyStarsRequest,
):
    require_body_admin_key(data.admin_key)

    if not FRAGMENT_PURCHASES_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Fragment xaridlari xavfsizlik sabab o'chirilgan",
        )

    username = clean_username(data.username)

    if data.stars_amount not in STARS_PRICES:
        raise HTTPException(
            status_code=400,
            detail="Stars paketi katalogda mavjud emas",
        )

    check = await check_telegram_username(username)

    if not check.get("valid"):
        raise HTTPException(
            status_code=400,
            detail=check.get(
                "message",
                "Username tekshirilmadi",
            ),
        )

    try:
        available = (
            await fragment_api.check_stars_availability(
                username,
                data.stars_amount,
            )
        )

        if not available:
            raise HTTPException(
                status_code=409,
                detail="Stars mavjudligi tasdiqlanmadi",
            )

        result = await fragment_api.init_buy_stars(
            username,
            data.stars_amount,
        )

        return result

    except HTTPException:
        raise

    except Exception:
        logger.exception(
            "To'g'ridan-to'g'ri Stars xaridida xatolik"
        )

        raise HTTPException(
            status_code=502,
            detail="Stars xarid so'rovida xatolik",
        )


# =========================================================
# 30. WALLET HOLATI — FAQAT ADMIN UCHUN
# =========================================================

@app.get("/api/wallet-info")
async def api_wallet_info(
    _: bool = Depends(require_admin),
):
    return {
        "ok": True,
        "wallet_address_configured": bool(
            os.getenv("WALLET_ADDRESS", "").strip()
            or os.getenv("TON_ADDRESS", "").strip()
        ),
        "mnemonic_configured": bool(
            os.getenv("MNEMONIC", "").strip()
        ),
        "purchases_enabled": FRAGMENT_PURCHASES_ENABLED,
    }


# =========================================================
# 31. SDK WALLET TEKSHIRUVI — XAVFSIZLIK SABABLI O'CHIRILGAN
# =========================================================

@app.get("/api/check-sdk-wallet")
async def api_check_sdk_wallet(
    _: bool = Depends(require_admin),
):
    raise HTTPException(
        status_code=410,
        detail=(
            "Bu endpoint xavfsizlik sabab o'chirilgan. "
            "Seed yoki mnemonic uchinchi tomonga yuborilmasin."
        ),
    )


# =========================================================
# 32. WALLET TRANZAKSIYALARI UCHUN MOSLIK ALIASI
# =========================================================

@app.get("/api/wallet-transactions")
async def wallet_transactions_alias(
    user_id: int = Query(gt=0),
    limit: int = Query(default=20, ge=1, le=100),
):
    return await wallet_transactions(
        user_id=user_id,
        limit=limit,
    )
