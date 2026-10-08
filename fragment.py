import os
import re
import json
import asyncio
import requests
from pytoniq import WalletV4R2, LiteBalancer
from pytoniq_core import Cell


class FragmentService:
    def __init__(self):
        self.session = requests.Session()

        # Render Environment Variable'laridan qiymatlarni o'qiymiz
        self.stel_ssid = os.getenv("STEL_SSID", "")
        self.stel_dt = os.getenv("STEL_DT", "")
        self.stel_token = os.getenv("STEL_TOKEN", "")
        self.stel_ton_token = os.getenv("STEL_TON_TOKEN", "")
        self.fallback_hash = os.getenv("FRAGMENT_HASH", "")
        self.mnemonic = os.getenv("MNEMONIC", "")

        # Cookie sarlavhasini shakllantiramiz
        cookie_parts = []
        if self.stel_ssid:
            cookie_parts.append(f"stel_ssid={self.stel_ssid}")
        if self.stel_dt:
            cookie_parts.append(f"stel_dt={self.stel_dt}")
        if self.stel_token:
            cookie_parts.append(f"stel_token={self.stel_token}")
        if self.stel_ton_token:
            cookie_parts.append(f"stel_ton_token={self.stel_ton_token}")

        cookie_header = "; ".join(cookie_parts)

        # Standart brauzer headers (Access Denied va bloklanishni oldini oladi)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "https://fragment.com",
            "Referer": "https://fragment.com/",
            "Cookie": cookie_header
        }

    def get_dynamic_hash(self) -> str:
        """Fragment.com sahifasidan joriy API hash qiymatini dinamik ravishda oladi"""
        try:
            res = self.session.get("https://fragment.com/stars", headers=self.headers, timeout=10)
            match = re.search(r'Fragment\.apiHash\s*=\s*["\']([a-f0-9]+)["\']', res.text)
            if match:
                return match.group(1)
        except Exception as e:
            print("Hash scraping xatosi:", e)

        # Agar scraper ishlamasa fallback hash ishlatiladi
        return self.fallback_hash

    def search_recipient(self, username: str):
        """'No Telegram users found' xatosini oldini olish uchun foydalanuvchini Fragment sessiyasida qidirish"""
        clean_username = username.replace("@", "").strip()
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"

        payload = {
            'method': 'searchPremiumGiftRecipient',
            'query': clean_username
        }

        try:
            res = self.session.post(url, data=payload, headers=self.headers, timeout=10)
            return res.json()
        except Exception as e:
            print("Recipient search xatosi:", e)
            return None

    def init_gift_request(self, username: str, months: int = 3) -> dict:
        """Telegram Premium so'rovini initsializatsiya qilish"""
        clean_username = username.replace("@", "").strip()

        # 1-Bosqich: Recipient qidiruvi
        self.search_recipient(clean_username)

        # 2-Bosqich: Gift request yuborish
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"

        payload = {
            'mode': 'new',
            'method': 'initGiftPremiumRequest',
            'recipient': clean_username,
            'months': str(months)
        }

        try:
            res = self.session.post(url, data=payload, headers=self.headers, timeout=10)
            data = res.json()
            if not data.get("ok"):
                return {"ok": False, "error": data.get("error", "Gift Premium init xatosi")}
            return {"ok": True, "req_id": data.get("req_id")}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def get_gift_link(self, req_id: str) -> dict:
        """Premium uchun to'lov havolasi va rekvizitlarni olish"""
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"

        payload = {
            'id': req_id,
            'method': 'getGiftPremiumLink'
        }

        try:
            res = self.session.post(url, data=payload, headers=self.headers, timeout=10)
            data = res.json()
            if not data.get("ok"):
                return {"ok": False, "error": data.get("error", "Gift link olishda xatolik")}

            transaction = data.get("transaction", {})
            return {
                "ok": True,
                "transaction": {
                    "address": transaction.get("address"),
                    "amount": transaction.get("amount"),
                    "payload": transaction.get("payload")
                }
            }
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def init_buy_stars(self, username: str, stars_amount: int = 50) -> dict:
        """Telegram Stars so'rovini initsializatsiya qilish"""
        clean_username = username.replace("@", "").strip()

        # 1-Bosqich: Recipient qidiruvi
        self.search_recipient(clean_username)

        # 2-Bosqich: Stars buy request yuborish
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"

        payload = {
            'mode': 'new',
            'method': 'initBuyStarsRequest',
            'recipient': clean_username,
            'quantity': str(stars_amount)
        }

        try:
            res = self.session.post(url, data=payload, headers=self.headers, timeout=10)
            data = res.json()
            if not data.get("ok"):
                return {"ok": False, "error": data.get("error", "Stars init xatosi")}
            return {"ok": True, "req_id": data.get("req_id")}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def get_buy_stars_link(self, req_id: str) -> dict:
        """Stars uchun to'lov havolasi va rekvizitlarni olish"""
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"

        payload = {
            'id': req_id,
            'method': 'getBuyStarsLink'
        }

        try:
            res = self.session.post(url, data=payload, headers=self.headers, timeout=10)
            data = res.json()
            if not data.get("ok"):
                return {"ok": False, "error": data.get("error", "Stars link olishda xatolik")}

            transaction = data.get("transaction", {})
            return {
                "ok": True,
                "transaction": {
                    "address": transaction.get("address"),
                    "amount": transaction.get("amount"),
                    "payload": transaction.get("payload")
                }
            }
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def send_ton_payment(self, destination_address: str, amount_nano: int, payload_boc: str = None):
        """TON Hamyondan pytoniq orqali avtomatik to'lov o'tkazish"""
        if not self.mnemonic:
            raise Exception("MNEMONIC environment variable topilmadi!")

        mnemonics_list = self.mnemonic.strip().split()

        # Pytoniq LiteBalancer orqali TON Mainnet-ga ulanamiz
        provider = LiteBalancer.from_mainnet_config(trust_level=2)
        await provider.start_up()

        try:
            # WalletV4R2 hamyon obyekti
            wallet = await WalletV4R2.from_mnemonic(provider=provider, mnemonics=mnemonics_list)

            # Transaksiya payload (boc) mavjud bo'lsa uni tayyorlaymiz
            body = None
            if payload_boc:
                body = Cell.one_from_boc(payload_boc)

            # O'tkazmani bajaramiz
            await wallet.transfer(
                destination=destination_address,
                amount=int(amount_nano),
                body=body
            )
            print(f"Muvaffaqiyatli to'lov qilindi: {amount_nano} nanoTON -> {destination_address}")
        finally:
            await provider.close_all()
