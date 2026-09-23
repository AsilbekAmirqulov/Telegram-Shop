
import asyncio
import sqlite3

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import (
    Message,
    CallbackQuery,
    LabeledPrice,
    PreCheckoutQuery,
    WebAppInfo,
    MenuButtonWebApp,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder


# =========================
# SOZLAMALAR
# =========================

TOKEN = "7922724316:AAFQOTtIUELq0QFE7l8U-c42-8_TtUhqIL0"

WEB_APP_URL = "https://asilbekamirqulov.github.io/Telegram-Shop/"


bot = Bot(token=TOKEN)
dp = Dispatcher()


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
            status TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


# =========================
# START
# =========================

@dp.message(CommandStart())
async def start(message: Message):

    keyboard = InlineKeyboardBuilder()

    keyboard.button(
        text="🛍 Open App",
        web_app=WebAppInfo(url=WEB_APP_URL)
    )

    await message.answer(
        "💎 Premium Shop ga xush kelibsiz!\n\n"
        "Telegram Premium va Stars xizmatlarini qulay tarzda xarid qilishingiz mumkin.\n\n"
        "🛍 Xaridni boshlash uchun Open App tugmasini bosing.",
        reply_markup=keyboard.as_markup()
    )


# =========================
# PREMIUM
# =========================

@dp.callback_query(F.data == "premium")
async def premium_menu(callback: CallbackQuery):

    keyboard = InlineKeyboardBuilder()

    keyboard.button(
        text="🔓 3 oy — 1000 ⭐",
        callback_data="premium_3"
    )

    keyboard.button(
        text="🔓 6 oy — 1500 ⭐",
        callback_data="premium_6"
    )

    keyboard.button(
        text="🔓 1 yil — 2500 ⭐",
        callback_data="premium_12"
    )

    keyboard.button(
        text="⬅️ Orqaga",
        callback_data="back"
    )

    keyboard.adjust(1)

    await callback.message.edit_text(
        "💎 Telegram Premium\n\n"
        "Kerakli muddatni tanlang:",
        reply_markup=keyboard.as_markup()
    )

    await callback.answer()


# =========================
# PREMIUM 3 OY
# =========================

@dp.callback_query(F.data == "premium_3")
async def premium_3(callback: CallbackQuery):

    await bot.send_invoice(
        chat_id=callback.from_user.id,
        title="Telegram Premium — 3 oy",
        description="Telegram Premium 3 oylik sovg'a",
        payload=f"premium_3_{callback.from_user.id}",
        currency="XTR",
        prices=[
            LabeledPrice(
                label="Telegram Premium — 3 oy",
                amount=1000
            )
        ]
    )

    await callback.answer()


# =========================
# PRE-CHECKOUT
# =========================

@dp.pre_checkout_query()
async def process_pre_checkout(query: PreCheckoutQuery):

    await query.answer(ok=True)


# =========================
# MUVAFFAQIYATLI TO'LOV
# =========================

@dp.message(F.successful_payment)
async def successful_payment(message: Message):

    await message.answer(
        "✅ To'lov muvaffaqiyatli amalga oshirildi!\n\n"
        "💎 Premium sovg'asi tayyorlanmoqda..."
    )


# =========================
# STARS
# =========================

@dp.callback_query(F.data == "stars")
async def stars_menu(callback: CallbackQuery):

    await callback.message.edit_text(
        "🌟 Telegram Stars\n\n"
        "Stars bo'limini Mini App orqali xarid qilishingiz mumkin."
    )

    await callback.answer()


# =========================
# ORQAGA
# =========================

@dp.callback_query(F.data == "back")
async def back(callback: CallbackQuery):

    keyboard = InlineKeyboardBuilder()

    keyboard.button(
        text="💎 Telegram Premium",
        callback_data="premium"
    )

    keyboard.button(
        text="🌟 Telegram Stars",
        callback_data="stars"
    )

    keyboard.adjust(1)

    await callback.message.edit_text(
        "🛍 Asosiy menyu\n\n"
        "Kerakli mahsulotni tanlang:",
        reply_markup=keyboard.as_markup()
    )

    await callback.answer()


# =========================
# MENU BUTTON
# =========================

async def setup_menu_button():

    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="🛍 Open App",
            web_app=WebAppInfo(url=WEB_APP_URL)
        )
    )


# =========================
# MAIN
# =========================

async def main():

    init_db()

    await bot.delete_webhook(drop_pending_updates=True)

    await setup_menu_button()

    print("Bot ishga tushdi!")

    await dp.start_polling(bot)


# =========================
# RUN
# =========================

if __name__ == "__main__":
    asyncio.run(main())
