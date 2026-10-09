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

        print(f"FRAGMENT API RAW RESPONSE ({method_name}):", repr(res))

        # Purchase obyekti yoki dict atributlarini ajratib olamiz
        purchase_id = getattr(res, "purchase_id", None)
        status = getattr(res, "status", None)
        tx_hash = getattr(res, "transaction_hash", None) or getattr(res, "tx_hash", None) or getattr(res, "hash", None)
        err = getattr(res, "error", None)

        if isinstance(res, dict):
            purchase_id = purchase_id or res.get("purchase_id") or res.get("id")
            status = status or res.get("status")
            tx_hash = tx_hash or res.get("transaction_hash") or res.get("tx_hash") or res.get("hash")
            err = err or res.get("error")

        # Xarid navbatga olinganini yoki bajarilganini tekshiramiz
        is_success = False
        if purchase_id and not err:
            is_success = True
        elif status in ["queued", "pending", "processing", "completed", "paid", "success"]:
            is_success = True
        elif isinstance(res, dict) and (res.get("ok") or res.get("success")):
            is_success = True

        if is_success:
            return {
                "ok": True,
                "status": status or "queued",
                "purchase_id": purchase_id,
                "tx_hash": tx_hash,
                "message": f"Xarid muvaffaqiyatli navbatga qo'shildi (ID: {purchase_id})"
            }
        else:
            return {
                "ok": False,
                "error": str(err) if err else f"Xatolik yuz berdi (Status: {status})"
            }

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
