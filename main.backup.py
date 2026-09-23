import asyncio

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import (
    Message,
    CallbackQuery,
    LabeledPrice,
    PreCheckoutQuery,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder


# =========================
# BOT TOKEN
# =========================

TOKEN = "7922724316:AAFxMkCds7Mlr52nqX_OEHm7XE8CIpmZedw"

bot = Bot(token=TOKEN)
dp = Dispatcher()


# =========================
# /start
# =========================

@dp.message(CommandStart())
async def start(message: Message):
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

    await message.answer(
        "🛍 Assalomu alaykum!\n\n"
        "Kerakli mahsulotni tanlang:",
        reply_markup=keyboard.as_markup()
    )


# =========================
# PREMIUM MENU
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
# TO'LOV MUVAFFAQIYATLI
# =========================

@dp.message(F.successful_payment)
async def successful_payment(message: Message):

    payment = message.successful_payment

    await message.answer(
        "✅ To'lov muvaffaqiyatli amalga oshirildi!\n\n"
        "💎 Premium sovg'asi tayyorlanmoqda..."
    )

    # Hozircha faqat to'lovni tekshiryapmiz.
    # Keyingi bosqichda shu yerga Premium gift yuborishni qo'shamiz.


# =========================
# STARS MENU
# =========================

@dp.callback_query(F.data == "stars")
async def stars_menu(callback: CallbackQuery):

    await callback.message.edit_text(
        "🌟 Telegram Stars\n\n"
        "Stars bo'limini keyingi bosqichda ulaymiz.",
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
# ISHGA TUSHIRISH
# =========================

async def main():
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())