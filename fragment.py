import os
import re
import json
import asyncio
import base64
import requests
from pytoniq import WalletV4R2, LiteBalancer
from pytoniq_core import Cell
from telethon.tl.functions.auth import AcceptLoginTokenRequest


class FragmentService:
    def __init__(self):
        self.session = requests.Session()

        # Environment variable'lar
        self.stel_ssid = os.getenv("STEL_SSID", "")
        self.stel_dt = os.getenv("STEL_DT", "")
        self.stel_token = os.getenv("STEL_TOKEN", "")
        self.stel_ton_token = os.getenv("STEL_TON_TOKEN", "")
        self.fallback_hash = os.getenv("FRAGMENT_HASH", "")
        self.mnemonic = os.getenv("MNEMONIC", "")

        self._apply_cookies()

    def _apply_cookies(self):
        """Sessiyaga cookielarni biriktirish"""
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
        """Fragment API uchun HTTP sarlavhalarni shakllantirish"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "https://fragment.com",
            "Referer": "https://fragment.com/"
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

    async def refresh_cookies_via_telethon(self, telegram_client):
        """Telethon va Telegram OAuth orqali Render IP-manzilidan yangi stel_token olish"""
        if not telegram_client or not telegram_client.is_connected():
            print("TELETHON: Client ulangan emas, avto-login bajarilmadi.")
            return False

        try:
            print("--- TELETHON FRAGMENT OAUTH AUTO-LOGIN BOSHCHLANDI ---")
            oauth_sess = requests.Session()
            ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

            # 1. Direct GET to initialize oauth.telegram.org session
            embed_url = "https://oauth.telegram.org/auth?bot_id=5444323279&origin=https%3A%2F%2Ffragment.com&embed=1"
            r1 = oauth_sess.get(embed_url, headers={"User-Agent": ua, "Referer": "https://fragment.com/"}, timeout=10)
            print(f"1. OAuth embed GET status: {r1.status_code}")

            # 2. Request login token from OAuth
            req_url = "https://oauth.telegram.org/auth/request?bot_id=5444323279&origin=https%3A%2F%2Ffragment.com&embed=1"
            r2 = oauth_sess.post(req_url, headers={
                "User-Agent": ua,
                "X-Requested-With": "XMLHttpRequest",
                "Referer": embed_url
            }, timeout=10)
            print(f"2. OAuth request javobi: {r2.text}")

            try:
                req_data = r2.json()
            except Exception:
                req_data = {}

            token_str = req_data.get("token") or req_data.get("req_id")
            req_id = req_data.get("req_id")

            if not token_str:
                print("XATO: OAuth login token olinmadi!")
                return False

            # 3. Telethon bilan login tokenini tasdiqlash
            try:
                clean_token = token_str.replace('-', '+').replace('_', '/')
                padded_token = clean_token + '=' * (-len(clean_token) % 4)
                token_bytes = base64.b64decode(padded_token)
                await telegram_client(AcceptLoginTokenRequest(token=token_bytes))
                print("3. Telethon: AcceptLoginTokenRequest muvaffaqiyatli tasdiqlandi!")
            except Exception as t_err:
                print(f"XATO: Telethon AcceptLoginToken xatosi: {t_err}")
                return False

            # 4. Statusni poylash (GRANT holatigacha)
            status_url = f"https://oauth.telegram.org/auth/status?req_id={req_id}"
            auth_user = None

            for attempt in range(1, 8):
                await asyncio.sleep(1)
                s_res = oauth_sess.post(status_url, headers={
                    "User-Agent": ua,
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": embed_url
                }, timeout=10)
                print(f"4. Status tekshiruv #{attempt}: {s_res.text}")

                try:
                    s_data = s_res.json()
                    if s_data.get("status") == "grant":
                        auth_user = s_data.get("user")
                        print("4. OAuth status: GRANT olindi!")
                        break
                except Exception:
                    pass

            if not auth_user:
                print("XATO: OAuth login tasdiqlanmadi (GRANT olinmadi).")
                return False

            # 5. Fragment /auth/login POST qilish va yangi cookie olish
            login_res = self.session.post("https://fragment.com/auth/login", data=auth_user, headers={
                "User-Agent": ua,
                "X-Requested-With": "XMLHttpRequest",
                "Origin": "https://fragment.com",
                "Referer": "https://fragment.com/"
            }, timeout=10)
            print(f"5. Fragment auth/login javobi: {login_res.text}")

            # Cookielarni yangilash
            new_stel_token = None
            for c in self.session.cookies:
                if c.name == "stel_token":
                    new_stel_token = c.value
                    self.stel_token = c.value
                elif c.name == "stel_ssid":
                    self.stel_ssid = c.value
                elif c.name == "stel_dt":
                    self.stel_dt = c.value

            if new_stel_token:
                print(f"MUVAFFAQIYAT! Render IP-manzili uchun yangi stel_token olindi: {new_stel_token[:12]}...")
                self._apply_cookies()
                return True

            print("XATO: Fragment auth/login yakunlandi, lekin stel_token saqlanmadi.")
            self._apply_cookies()
            return False

        except Exception as e:
            print(f"XATO: refresh_cookies_via_telethon xatosi: {e}")
            self._apply_cookies()
            return False

    def get_dynamic_hash(self) -> str:
        """Fragment.com sahifasidan API hash qiymatini olish"""
        try:
            res = self.session.get("https://fragment.com/stars", headers=self.get_headers(), timeout=10)
            match = re.search(r'Fragment\.apiHash\s*=\s*["\']([a-f0-9]+)["\']', res.text)
            if match:
                extracted_hash = match.group(1)
                print("Scraped Dynamic Hash:", extracted_hash)
                return extracted_hash
        except Exception as e:
            print("Hash scraping xatosi:", e)

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
        """Telegram Premium so'rovini yuborish (Avto-retry bilan)"""
        res = await self._send_init_gift(username, months)

        if not res.get("ok") and res.get("error") in ["Access denied", "Bad request"] and telegram_client:
            print(f"Fragment'dan {res.get('error')} olindi. Telethon orqali session yangilanmoqda...")
            refreshed = await self.refresh_cookies_via_telethon(telegram_client)
            if refreshed:
                print("Session yangilandi. Gift request qayta yuborilmoqda...")
                res = await self._send_init_gift(username, months)

        return res

    async def _send_init_gift(self, username: str, months: int) -> dict:
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
        """Premium to'lov havolasi va rekvizitlarini olish"""
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
        """Telegram Stars so'rovini yuborish (Avto-retry bilan)"""
        res = await self._send_init_stars(username, stars_amount)

        if not res.get("ok") and res.get("error") in ["Access denied", "Bad request"] and telegram_client:
            print(f"Fragment'dan {res.get('error')} olindi. Telethon orqali session yangilanmoqda...")
            refreshed = await self.refresh_cookies_via_telethon(telegram_client)
            if refreshed:
                print("Session yangilandi. Stars request qayta yuborilmoqda...")
                res = await self._send_init_stars(username, stars_amount)

        return res

    async def _send_init_stars(self, username: str, stars_amount: int) -> dict:
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
        """Stars to'lov havolasi va rekvizitlarini olish"""
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
