import os
import logging
from fragment_api import FragmentAPI

logger = logging.getLogger(__name__)


class FragmentService:
    def __init__(self):
        self.api = FragmentAPI()
        # Seed kalitini MNEMONIC, TON_WALLET_SEED yoki SEED o'zgaruvchilaridan qidiradi
        self.mnemonic = (
            os.getenv("MNEMONIC") or 
            os.getenv("TON_WALLET_SEED") or 
            os.getenv("SEED") or ""
        ).strip()

    def check_recipient_stars(self, username: str, amount: int = 50) -> dict:
        """To'lovni qabul qilishdan oldin foydalanuvchini tekshirish"""
        clean_username = username.replace("@", "").strip()
        formatted_username = f"@{clean_username}"

        try:
            check = self.api.check_stars_availability(formatted_username, amount, "gram")
            return {
                "available": getattr(check, "available", False),
                "code": getattr(check, "code", "UNKNOWN"),
                "message": getattr(check, "message", ""),
                "action": getattr(check, "action", "")
            }
        except Exception as e:
            logger.error(f"Availability check error for {formatted_username}: {e}")
            return {
                "available": False,
                "code": "ERROR",
                "error": str(e)
            }

    async def init_buy_stars(self, username: str, stars_amount: int = 50, telegram_client=None) -> dict:
        """Telegram Stars sotib olish va avtomatik to'lash"""
        if not self.mnemonic:
            return {"ok": False, "error": "MNEMONIC (yoki TON_WALLET_SEED) environment variable topilmadi!"}

        clean_username = username.replace("@", "").strip()
        formatted_username = f"@{clean_username}"

        try:
            # 1. Avval mavjudlikni tekshirish
            check = self.check_recipient_stars(clean_username, stars_amount)
            if not check.get("available"):
                err_msg = check.get("message") or check.get("error") or "Foydalanuvchiga Stars yuborib bo'lmaydi"
                return {"ok": False, "error": f"Mavjud emas: {err_msg}"}

            # 2. Xarid so'rovini yuborish (buy_stars avtomatik seed orqali hamyondan to'laydi)
            purchase = self.api.buy_stars(
                username=formatted_username,
                amount=stars_amount,
                payment_method="gram",
                seed=self.mnemonic
            )

            # 3. Transaksiya TON tarmog'ida yakunlanishini kutish
            result = self.api.wait(purchase.purchase_id)
            status = getattr(result, "status", "")

            if status == "COMPLETED":
                tx_hash = getattr(result, "transaction_hash", "")
                return {"ok": True, "tx_hash": tx_hash, "purchase_id": purchase.purchase_id}
            else:
                err_detail = getattr(result, "error", None) or f"Status: {status}"
                return {"ok": False, "error": f"Stars xarid qilinmadi ({err_detail})"}

        except Exception as e:
            logger.error(f"init_buy_stars error for {formatted_username}: {e}")
            return {"ok": False, "error": str(e)}

    async def init_gift_request(self, username: str, months: int = 3, telegram_client=None) -> dict:
        """Telegram Premium sotib olish va avtomatik to'lash"""
        if not self.mnemonic:
            return {"ok": False, "error": "MNEMONIC (yoki TON_WALLET_SEED) environment variable topilmadi!"}

        clean_username = username.replace("@", "").strip()
        formatted_username = f"@{clean_username}"

        try:
            # 1. Premium xarid qilish (buy_premium avtomatik seed orqali hamyondan to'laydi)
            purchase = self.api.buy_premium(
                username=formatted_username,
                months=months,
                payment_method="gram",
                seed=self.mnemonic
            )

            # 2. Transaksiya TON tarmog'ida yakunlanishini kutish
            result = self.api.wait(purchase.purchase_id)
            status = getattr(result, "status", "")

            if status == "COMPLETED":
                tx_hash = getattr(result, "transaction_hash", "")
                return {"ok": True, "tx_hash": tx_hash, "purchase_id": purchase.purchase_id}
            else:
                err_detail = getattr(result, "error", None) or f"Status: {status}"
                return {"ok": False, "error": f"Premium xarid qilinmadi ({err_detail})"}

        except Exception as e:
            logger.error(f"init_gift_request error for {formatted_username}: {e}")
            return {"ok": False, "error": str(e)}
