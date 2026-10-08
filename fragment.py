import os
import re
import requests
import asyncio
from pytoniq import WalletV4R2, LiteBalancer

class FragmentService:
    def __init__(self):
        self.session = requests.Session()
        self.session.cookies.update({
            'stel_ssid': os.getenv('STEL_SSID'),
            'stel_dt': os.getenv('STEL_DT', '-300'),
            'stel_token': os.getenv('STEL_TOKEN'),
            'stel_ton_token': os.getenv('STEL_TON_TOKEN')
        })
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://fragment.com',
            'Referer': 'https://fragment.com/stars',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }

    def get_dynamic_hash(self):
        """Fragment sahifasidan amaldagi API Hash'ni olish"""
        try:
            res = self.session.get('https://fragment.com/stars', headers=self.headers)
            match = re.search(r'hash=([a-f0-9]+)', res.text)
            if match:
                return match.group(1)
        except Exception as e:
            print("Dinamik hash olishda xatolik:", e)
        return os.getenv('FRAGMENT_HASH', '539af978ec4fd126e2')

    # ================= PREMIUM METODLARI =================
    def init_gift_request(self, username, months=3):
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"
        payload = {
            'mode': 'new',
            'method': 'initGiftPremiumRequest',
            'recipient': username,
            'months': str(months)
        }
        res = self.session.post(url, data=payload, headers=self.headers)
        return res.json()

    def get_gift_link(self, req_id):
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"
        payload = {
            'method': 'getGiftPremiumLink',
            'id': req_id
        }
        res = self.session.post(url, data=payload, headers=self.headers)
        return res.json()

    # ================= STARS METODLARI =================
    def init_buy_stars(self, username, stars_amount):
        """Telegram Stars sotib olish so'rovi"""
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"
        payload = {
            'mode': 'new',
            'method': 'initBuyStarsRequest',
            'recipient': username,
            'quantity': str(stars_amount)
        }
        res = self.session.post(url, data=payload, headers=self.headers)
        return res.json()

    def get_buy_stars_link(self, req_id):
        """Stars to'lov rekvizitlarini olish"""
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"
        payload = {
            'method': 'getBuyStarsLink',
            'id': req_id
        }
        res = self.session.post(url, data=payload, headers=self.headers)
        return res.json()

    # ================= TON TO'LOV METODI =================
    async def send_ton_payment(self, destination_address, amount_nano, payload_boc=None):
        mnemonic_raw = os.getenv("MNEMONIC", "")
        mnemonic = [w.strip() for w in mnemonic_raw.split(",") if w.strip()]
        
        if not mnemonic or len(mnemonic) < 24:
            raise Exception("MNEMONIC kalitlari topilmadi yoki 24 ta so'z to'liq emas!")

        provider = LiteBalancer.from_mainnet_config(trust_level=2)
        await provider.start_up()

        wallet = await WalletV4R2.from_mnemonic(provider, mnemonic)

        await wallet.transfer(
            destination=destination_address,
            amount=int(amount_nano),
            body=payload_boc if payload_boc else ""
        )

        await provider.close_all()
        return True
