import os
import re
import requests

class FragmentService:
    def __init__(self):
        self.session = requests.Session()
        # Cookie-fayllarni Render Environment Variables'dan yuklaydi
        self.session.cookies.update({
            'stel_ssid': os.getenv('STEL_SSID'),
            'stel_dt': os.getenv('STEL_DT', '-300'),
            'stel_token': os.getenv('STEL_TOKEN'),
            'stel_ton_token': os.getenv('STEL_TON_TOKEN')
        })
        # Access Denied xatosini oldini oluvchi zaruriy sarlavhalar
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://fragment.com',
            'Referer': 'https://fragment.com/premium',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }

    def get_dynamic_hash(self):
        """Fragment sahifasidan eng so'nggi dinamik Hash qiymatini sug'urib olish"""
        try:
            res = self.session.get('https://fragment.com/premium', headers=self.headers)
            match = re.search(r'hash=([a-f0-9]+)', res.text)
            if match:
                return match.group(1)
        except Exception as e:
            print("Dinamik hash olishda xatolik:", e)
        return os.getenv('FRAGMENT_HASH', '539af978ec4fd126e2')

    def search_recipient(self, username):
        """Foydalanuvchini Fragment-dan qidirish"""
        current_hash = self.get_dynamic_hash()
        url = f"https://fragment.com/api?hash={current_hash}"
        payload = {
            'method': 'searchPremiumGiftRecipient',
            'query': username
        }
        res = self.session.post(url, data=payload, headers=self.headers)
        return res.json()

    def init_gift_request(self, username, months=3):
        """Access Denied bermaydigan xavfsiz initGiftPremiumRequest so'rovi"""
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
