import os
import re
import json
import asyncio
from curl_cffi import requests
from pytoniq import WalletV4R2, LiteBalancer
from pytoniq_core import Cell


class FragmentService:
    def __init__(self):
        # Requests o'rniga Chrome 124 TLS barmoq izini soxtalashtiruvchi curl_cffi sessiyasi
        self.session = requests.Session(impersonate="chrome124")

        # Render Environment Variable'lardan yuklash
        self.stel_ssid = os.getenv("STEL_SSID", "")
        self.stel_dt = os.getenv("STEL_DT", "")
        self.stel_token = os.getenv("STEL_TOKEN", "")
        self.stel_ton_token = os.getenv("STEL_TON_TOKEN", "")
        self.fallback_hash = os.getenv("FRAGMENT_HASH", "")
        self.mnemonic = os.getenv("MNEMONIC", "")
        
        # Proxy qo'llab-quvvatlash (agar Render IP bloki bo'lsa)
        self.proxy = os.getenv("FRAGMENT_PROXY", "")
        if self.proxy:
            self.session.proxies = {
                "http": self.proxy,
                "https": self.proxy
            }
            print("FragmentService: Proxy yoqildi ->", self.proxy.split("@")[-1])

        self._apply_cookies()

    def _apply_cookies(self):
        """Sessiyaga Fragment cookie-fayllarini biriktirish"""
        self.session.cookies.clear()
        cookies_dict = {
            "stel_ssid": self.stel_ssid,
            "stel_dt": self.stel_dt,
            "stel_token": self.stel_token,
            "stel_ton_token": self.stel_ton_token,
        }
        for k, v in cookies_dict.items():
            if v:
                self.session.cookies.set(k, v, domain="fragment.com")
                self.session.cookies.set(k, v, domain=".fragment.com")

    def get_headers(self) -> dict:
        """Haqiqiy Chrome 124 brauzerining HTTP sarlavhalari"""
        headers = {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "https://fragment.com",
            "Referer": "https://fragment.com/premium",
            "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin"
        }
        
        cookie_parts = []
        if self.stel_ssid:
            cookie_parts.append(f"stel_ssid={self.stel_ssid}")
        if self.stel_dt:
            cookie_parts.append(f"stel_dt={self.stel_dt}")
        if self.stel_token:
            cookie_parts.append(f"stel_token={self.stel_token}")
        if self.stel_ton_token:
            cookie_parts.append(f"stel_ton_token={self.stel_ton_token}")

        if cookie_parts:
            headers["Cookie"] = "; ".join(cookie_parts)

        return headers

    def get_dynamic_hash(self) -> str:
        """Fragment.com sahifasidan dinamik apiHash qiymatini ajratib olish"""
        urls_to_try = [
            "https://fragment.com/premium",
            "https://fragment.com/stars",
            "https://fragment.com/"
        ]

        for url in urls_to_try:
            try:
                res = self.session.get(url, headers=self.get_headers(), timeout=10)
                patterns = [
                    r'Fragment\.apiHash\s*=\s*["\']([a-f0-9]+)["\']',
                    r'api_hash["\']?\s*:\s*["\']([a-f0-9]+)["\']',
                    r'ajInit\s*\(\s*\{[^}]*["\']hash["\']\s*:\s*["\']([a-f0-9]+)["\']'
                ]
                for pat in patterns:
                    match = re.search(pat, res.text, re.IGNORECASE)
                    if match:
                        extracted_hash = match.group(1)
                        print(f"curl_cffi bilan scraped hash ({url}):", extracted_hash)
                        return extracted_hash
            except Exception as e:
                print(f"Hash scraping xatosi ({url}):", e)

        print("Fallback Hash ishlatilmoqda:", self.fallback_hash)
        return self.fallback_hash

    def search_recipient(self, username: str):
        """Foydalanuvchini Fragment sessiyasida qidirish"""
        clean_username = username.replace("@", "").strip()
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"

        payload = {
            'method': 'searchPremiumGiftRecipient',
            'query': clean_username
        }

        try:
            res = self.session.post(url, data=payload, headers=self.get_headers(), timeout=10)
            print("Search Recipient Javobi:", res.text)
            return res.json()
        except Exception as e:
            print("Recipient search xatosi:", e)
            return None

    async def init_gift_request(self, username: str, months: int = 3, telegram_client=None) -> dict:
        """Telegram Premium xarid so'rovini boshlash"""
        clean_username = username.replace("@", "").strip()

        search_res = self.search_recipient(clean_username)
        if not search_res or not search_res.get("ok"):
            err_msg = search_res.get("error") if search_res else "Foydalanuvchi topilmadi"
            return {"ok": False, "error": f"Search error: {err_msg}"}

        recipient_token = search_res.get("found", {}).get("recipient")
        if not recipient_token:
            return {"ok": False, "error": "Recipient token topilmadi"}

        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"

        payload = {
            'mode': 'new',
            'method': 'initGiftPremiumRequest',
            'recipient': recipient_token,
            'months': str(months),
            'show_sender': '1'
        }

        try:
            res = self.session.post(url, data=payload, headers=self.get_headers(), timeout=10)
            print("Init Gift Request Javobi:", res.text)

            try:
                data = res.json()
            except Exception:
                return {"ok": False, "error": f"JSON bo'lmagan javob: {res.text}"}

            if not data.get("ok"):
                return {"ok": False, "error": data.get("error", "Gift Premium init xatosi")}
            return {"ok": True, "req_id": data.get("req_id")}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def get_gift_link(self, req_id: str) -> dict:
        """Premium to'lov rekvizitlari va payload olib berish"""
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"

        payload = {
            'id': req_id,
            'method': 'getGiftPremiumLink'
        }

        try:
            res = self.session.post(url, data=payload, headers=self.get_headers(), timeout=10)
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

    async def init_buy_stars(self, username: str, stars_amount: int = 50, telegram_client=None) -> dict:
        """Telegram Stars xarid so'rovini boshlash"""
        clean_username = username.replace("@", "").strip()

        search_res = self.search_recipient(clean_username)
        if not search_res or not search_res.get("ok"):
            err_msg = search_res.get("error") if search_res else "Foydalanuvchi topilmadi"
            return {"ok": False, "error": f"Search error: {err_msg}"}

        recipient_token = search_res.get("found", {}).get("recipient")
        if not recipient_token:
            return {"ok": False, "error": "Recipient token topilmadi"}

        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"

        payload = {
            'mode': 'new',
            'method': 'initBuyStarsRequest',
            'recipient': recipient_token,
            'quantity': str(stars_amount),
            'show_sender': '1'
        }

        try:
            res = self.session.post(url, data=payload, headers=self.get_headers(), timeout=10)
            data = res.json()
            if not data.get("ok"):
                return {"ok": False, "error": data.get("error", "Stars init xatosi")}
            return {"ok": True, "req_id": data.get("req_id")}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def get_buy_stars_link(self, req_id: str) -> dict:
        """Stars to'lov rekvizitlarini olib berish"""
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"

        payload = {
            'id': req_id,
            'method': 'getBuyStarsLink'
        }

        try:
            res = self.session.post(url, data=payload, headers=self.get_headers(), timeout=10)
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

        provider = LiteBalancer.from_mainnet_config(trust_level=2)
        await provider.start_up()

        try:
            wallet = await WalletV4R2.from_mnemonic(provider=provider, mnemonics=mnemonics_list)

            body = None
            if payload_boc:
                body = Cell.one_from_boc(payload_boc)

            await wallet.transfer(
                destination=destination_address,
                amount=int(amount_nano),
                body=body
            )
            print(f"MUVAFFAQIYATLI TO'LOV: {amount_nano} nanoTON -> {destination_address}")
        finally:
            await provider.close_all()
