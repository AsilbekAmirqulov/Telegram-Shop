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

        # Fallback environment variable'lar
        self.stel_ssid = os.getenv("STEL_SSID", "")
        self.stel_dt = os.getenv("STEL_DT", "")
        self.stel_token = os.getenv("STEL_TOKEN", "")
        self.stel_ton_token = os.getenv("STEL_TON_TOKEN", "")
        self.fallback_hash = os.getenv("FRAGMENT_HASH", "")
        self.mnemonic = os.getenv("MNEMONIC", "")

        self._init_session_cookies()
        self._update_headers()

    def _init_session_cookies(self):
        """Cookielarni requests.Session obyektiga to'g'ri joylash"""
        self.session.cookies.clear()
        if self.stel_ssid:
            self.session.cookies.set("stel_ssid", self.stel_ssid, domain="fragment.com")
        if self.stel_dt:
            self.session.cookies.set("stel_dt", self.stel_dt, domain="fragment.com")
        if self.stel_token:
            self.session.cookies.set("stel_token", self.stel_token, domain="fragment.com")
        if self.stel_ton_token:
            self.session.cookies.set("stel_ton_token", self.stel_ton_token, domain="fragment.com")

    def _update_headers(self):
        """Sessiya sarlavhalarini yangilash (Cookie hardcode qilmasdan)"""
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "https://fragment.com",
            "Referer": "https://fragment.com/"
        }

    async def refresh_cookies_via_telethon(self, telegram_client):
        """Telethon va Telegram OAuth orqali Fragment cookielarini avtomatik yangilash"""
        if not telegram_client or not telegram_client.is_connected():
            print("Telegram client ulangan emas, avto-login bajarilmadi.")
            return False

        try:
            print("Telethon orqali Fragment Telegram OAuth boshlandi...")
            self.session.cookies.clear()

            oauth_req_url = "https://oauth.telegram.org/auth/request?bot_id=5444323279&origin=https%3A%2F%2Ffragment.com&embed=1"
            res = self.session.post(oauth_req_url, headers={"X-Requested-With": "XMLHttpRequest"}, timeout=10)
            
            if res.status_code != 200 or not res.text:
                self.session.get("https://oauth.telegram.org/auth?bot_id=5444323279&origin=https%3A%2F%2Ffragment.com&embed=1", timeout=10)
                res = self.session.post(oauth_req_url, headers={"X-Requested-With": "XMLHttpRequest"}, timeout=10)

            try:
                data = res.json()
            except Exception:
                data = {}

            token_b64 = data.get("token") or data.get("req_id")
            if token_b64:
                try:
                    padded = token_b64 + "=" * (-len(token_b64) % 4)
                    token_bytes = base64.b64decode(padded)
                    await telegram_client(AcceptLoginTokenRequest(token=token_bytes))
                    print("Telethon: Login token tasdiqlandi!")
                except Exception as t_err:
                    print("Telethon AcceptLoginToken xatosi:", t_err)

            req_id = data.get("req_id")
            if req_id:
                status_url = f"https://oauth.telegram.org/auth/status?req_id={req_id}"
                for _ in range(5):
                    await asyncio.sleep(1)
                    s_res = self.session.post(status_url, headers={"X-Requested-With": "XMLHttpRequest"}, timeout=10)
                    try:
                        s_data = s_res.json()
                        if s_data.get("status") == "grant":
                            auth_data = s_data.get("user", {})
                            self.session.post("https://fragment.com/auth/login", data=auth_data, timeout=10)
                            print("Fragment OAuth login yakunlandi!")
                            break
                    except Exception:
                        pass

            sess_cookies = self.session.cookies.get_dict()
            if "stel_token" in sess_cookies and sess_cookies["stel_token"]:
                self.stel_ssid = sess_cookies.get("stel_ssid", self.stel_ssid)
                self.stel_token = sess_cookies.get("stel_token")
                self.stel_dt = sess_cookies.get("stel_dt", self.stel_dt)
                print("Fragment cookielari (stel_token) muvaffaqiyatli olindi!")
                return True

            print("Telegram OAuth muvaffaqiyatsiz bo'ldi (stel_token olinmadi). Eski cookielar yuklanmoqda...")
            self._init_session_cookies()
            return False

        except Exception as e:
            print("Telethon Fragment auto-login xatosi:", e)
            self._init_session_cookies()
            return False

    def get_dynamic_hash(self) -> str:
        """Fragment.com sahifasidan joriy API hash qiymatini olish"""
        try:
            res = self.session.get("https://fragment.com/stars", headers=self.headers, timeout=10)
            match = re.search(r'Fragment\.apiHash\s*=\s*["\']([a-f0-9]+)["\']', res.text)
            if match:
                return match.group(1)
        except Exception as e:
            print("Hash scraping xatosi:", e)

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
            res = self.session.post(url, data=payload, headers=self.headers, timeout=10)
            print("Search Recipient Javobi:", res.text)
            return res.json()
        except Exception as e:
            print("Recipient search xatosi:", e)
            return None

    def init_gift_request(self, username: str, months: int = 3) -> dict:
        """Telegram Premium so'rovini yuborish"""
        clean_username = username.replace("@", "").strip()

        # Oldin recipient qidiramiz
        search_res = self.search_recipient(clean_username)

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
        """Telegram Stars so'rovini yuborish"""
        clean_username = username.replace("@", "").strip()

        self.search_recipient(clean_username)

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
        """Stars to'lov havolasi va rekvizitlarini olish"""
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
            print(f"Muvaffaqiyatli to'lov qilindi: {amount_nano} nanoTON -> {destination_address}")
        finally:
            await provider.close_all()
