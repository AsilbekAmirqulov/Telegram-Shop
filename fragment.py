import os
import asyncio
import inspect
from fragment_api import FragmentAPI

class FragmentService:
    def __init__(self):
        self.mnemonic = os.getenv("MNEMONIC", "")
        self.wallet_address = os.getenv("WALLET_ADDRESS", "UQAOh0qjvQWkLk99DGpUdW-lHbfJeu5TKRFLHIg2v63gWIzm")
        self.api = FragmentAPI()

    async def _call_api_method(self, method_name: str, **kwargs):
        if not hasattr(self.api, method_name):
            return {"ok": False, "error": f"FragmentAPI da {method_name} metodi topilmadi."}

        fn = getattr(self.api, method_name)
        
        try:
            # Funksiya async yoki sync ekanini aniqlab to'g'ri chaqiramiz
            if inspect.iscoroutinefunction(fn):
                res = await fn(**kwargs)
            else:
                raw = fn(**kwargs)
                if inspect.isawaitable(raw):
                    res = await raw
                else:
                    res = raw
        except Exception as call_err:
            print(f"API EXCEPTION ({method_name}):", repr(call_err))
            return {"ok": False, "error": str(call_err)}

        print(f"FRAGMENT API RAW RESPONSE ({method_name}):", res, type(res))

        # Olingan javobni lug'at (dict) ko'rinishiga keltiramiz
        res_dict = {}
        if isinstance(res, dict):
            res_dict = res
        elif hasattr(res, "dict") and callable(res.dict):
            res_dict = res.dict()
        elif hasattr(res, "model_dump") and callable(res.model_dump):
            res_dict = res.model_dump()
        else:
            res_dict = {"raw": str(res)}
            for attr in ["ok", "success", "tx_hash", "hash", "purchase_id", "id", "error", "message"]:
                if hasattr(res, attr):
                    res_dict[attr] = getattr(res, attr)

        # Muvaffaqiyatli tranzaksiyani tekshiramiz
        is_ok = res_dict.get("ok") or res_dict.get("success") or bool(res_dict.get("tx_hash") or res_dict.get("hash"))
        
        if is_ok:
            return {
                "ok": True,
                "tx_hash": res_dict.get("tx_hash") or res_dict.get("hash"),
                "purchase_id": res_dict.get("purchase_id") or res_dict.get("id"),
                "raw": res_dict
            }
        else:
            err_msg = res_dict.get("error") or res_dict.get("message") or str(res_dict)
            return {"ok": False, "error": err_msg}

    async def init_buy_stars(self, username: str, stars_amount: int):
        clean_username = username.strip()
        if not clean_username.startswith("@"):
            clean_username = f"@{clean_username}"

        return await self._call_api_method(
            "buy_stars",
            username=clean_username,
            amount=stars_amount,
            seed=self.mnemonic,
            wallet_address=self.wallet_address,
            account_index=0,
            payment_method="gram"
        )

    async def init_gift_request(self, username: str, months: int):
        clean_username = username.strip()
        if not clean_username.startswith("@"):
            clean_username = f"@{clean_username}"

        return await self._call_api_method(
            "buy_premium",
            username=clean_username,
            months=months,
            seed=self.mnemonic,
            wallet_address=self.wallet_address,
            account_index=0,
            payment_method="gram"
        )
