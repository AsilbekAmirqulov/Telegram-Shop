import os
from fragment_api import FragmentAPI


class FragmentService:
    def __init__(self):
        self.api = FragmentAPI()
        self.mnemonic = os.getenv("MNEMONIC", "")

    def check_recipient_stars(self, username: str, amount: int = 50) -> dict:
        """To'lovni qabul qilishdan oldin foydalanuvchini tekshirish"""
        try:
            clean_username = username.replace("@", "").strip()
            check = self.api.check_stars_availability(f"@{clean_username}", amount, "gram")
            return {
                "available": check.available,
                "code": check.code,
                "message": getattr(check, "message", "")
            }
        except Exception as e:
            return {"available": False, "error": str(e)}

    async def init_buy_stars(self, username: str, stars_amount: int = 50, telegram_client=None) -> dict:
        """Telegram Stars sotib olish va avtomatik to'lash"""
        if not self.mnemonic:
            return {"ok": False, "error": "MNEMONIC environment variable topilmadi!"}

        clean_username = username.replace("@", "").strip()

        try:
            # 1. Avval mavjudlikni tekshirish
            check = self.check_recipient_stars(clean_username, stars_amount)
            if not check.get("available"):
                return {"ok": False, "error": check.get("message", "Foydalanuvchiga Stars yuborib bo'lmaydi")}

            # 2. Xarid qilish va to'lovni seed orqali avtomatik bajarish
            purchase = self.api.buy_stars(
                username=f"@{clean_username}",
                amount=stars_amount,
                payment_method="gram",
                seed=self.mnemonic
            )

            # 3. Transaksiya TON tarmog'ida yakunlanishini kutish
            result = self.api.wait(purchase.purchase_id)
            if result.status == "COMPLETED":
                return {"ok": True, "tx_hash": result.transaction_hash}
            else:
                return {"ok": False, "error": result.error or "Stars xarid qilinmadi"}

        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def init_gift_request(self, username: str, months: int = 3, telegram_client=None) -> dict:
        """Telegram Premium sotib olish va avtomatik to'lash"""
        if not self.mnemonic:
            return {"ok": False, "error": "MNEMONIC environment variable topilmadi!"}

        clean_username = username.replace("@", "").strip()

        try:
            # 1. Premium xarid so'rovi va avto-to'lov
            purchase = self.api.buy_premium(
                username=f"@{clean_username}",
                months=months,
                payment_method="gram",
                seed=self.mnemonic
            )

            # 2. Transaksiya TON tarmog'ida yakunlanishini kutish
            result = self.api.wait(purchase.purchase_id)
            if result.status == "COMPLETED":
                return {"ok": True, "tx_hash": result.transaction_hash}
            else:
                return {"ok": False, "error": result.error or "Premium xarid qilinmadi"}

        except Exception as e:
            return {"ok": False, "error": str(e)}
