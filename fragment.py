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
            return {"ok": False, "error": f"FragmentAPI da {method_name} me'dodi topilmadi."}

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

        # Purchase obyekti yoki dict ma'lumotlarini ajratib olamiz
        purchase_id = getattr(res, "purchase_id", None)
        status = getattr(res, "status", None)
        tx_hash = getattr(res, "transaction_hash", None) or getattr(res, "tx_hash", None) or getattr(res, "hash", None)
        err = getattr(res, "error", None)

        if isinstance(res, dict):
            purchase_id = purchase_id or res.get("purchase_id") or res.get("id")
            status = status or res.get("status")
            tx_hash = tx_hash or res.get("transaction_hash") or res.get("tx_hash") or res.get("hash")
            err = err or res.get("error")

        # Gar xarid navbatda (queued/pending) bo'lsa, holatni tekshirib (polling) kutamiz
        if purchase_id and (not tx_hash or status in ["queued", "pending", "processing"]):
            print(f"Xarid navbatda ({purchase_id}). Tranzaksiya yakunlanishi kutilmoqda...")
            
            check_fn = getattr(self.api, "get_purchase", None) or getattr(self.api, "get_purchase_status", None)
            
            for _ in range(15):  # Max 45 soniya kutamiz (15 * 3s)
                await asyncio.sleep(3)
                
                if check_fn:
                    try:
                        if inspect.iscoroutinefunction(check_fn):
                            check_res = await check_fn(purchase_id)
                        else:
                            check_res = check_fn(purchase_id)

                        c_status = getattr(check_res, "status", None) or (check_res.get("status") if isinstance(check_res, dict) else None)
                        c_tx = getattr(check_res, "transaction_hash", None) or getattr(check_res, "tx_hash", None) or (check_res.get("tx_hash") if isinstance(check_res, dict) else None)
                        c_err = getattr(check_res, "error", None) or (check_res.get("error") if isinstance(check_res, dict) else None)

                        if c_tx or c_status in ["completed", "paid", "success"]:
                            return {
                                "ok": True,
                                "status": "completed",
                                "purchase_id": purchase_id,
                                "tx_hash": c_tx,
                                "message": "Xarid muvaffaqiyatli amalga oshirildi!"
                            }
                        elif c_err or c_status in ["failed", "cancelled"]:
                            return {
                                "ok": False,
                                "error": f"Xarid bekor qilindi: {c_err or c_status}"
                            }
                    except Exception as poll_e:
                        print("Polling xatosi:", poll_e)

        # Aks holda dastlabki natijani qaytaramiz
        if purchase_id and not err:
            return {
                "ok": True,
                "status": status or "processing",
                "purchase_id": purchase_id,
                "tx_hash": tx_hash,
                "message": f"Xarid qabul qilindi (ID: {purchase_id})"
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
