import os
import asyncio
from fragment_api import FragmentAPI

class FragmentService:
    def __init__(self):
        self.mnemonic = os.getenv("MNEMONIC", "")
        self.wallet_address = os.getenv("WALLET_ADDRESS", "UQAOh0qjvQWkLk99DGpUdW-lHbfJeu5TKRFLHIg2v63gWIzm")
        self.api = FragmentAPI()

    async def init_buy_stars(self, username: str, stars_amount: int):
        try:
            loop = asyncio.get_event_loop()
            
            # slightbasebo/fragment-api-dev talabi: 
            # 12-so'zli seed + wallet_address + account_index=0
            res = await loop.run_in_executor(
                None,
                lambda: self.api.buy_stars(
                    username=username,
                    amount=stars_amount,
                    seed=self.mnemonic,
                    wallet_address=self.wallet_address,
                    account_index=0,
                    payment_method="gram"
                )
            )

            if isinstance(res, dict):
                if res.get("ok") or res.get("success"):
                    return {
                        "ok": True,
                        "tx_hash": res.get("tx_hash") or res.get("hash"),
                        "purchase_id": res.get("purchase_id") or res.get("id")
                    }
                else:
                    err_msg = res.get("error") or res.get("message") or str(res)
                    return {"ok": False, "error": err_msg}
            
            return {"ok": True, "result": str(res)}

        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def init_gift_request(self, username: str, months: int):
        try:
            loop = asyncio.get_event_loop()
            res = await loop.run_in_executor(
                None,
                lambda: self.api.buy_premium(
                    username=username,
                    months=months,
                    seed=self.mnemonic,
                    wallet_address=self.wallet_address,
                    account_index=0,
                    payment_method="gram"
                )
            )

            if isinstance(res, dict):
                if res.get("ok") or res.get("success"):
                    return {
                        "ok": True,
                        "tx_hash": res.get("tx_hash") or res.get("hash"),
                        "purchase_id": res.get("purchase_id") or res.get("id")
                    }
                else:
                    err_msg = res.get("error") or res.get("message") or str(res)
                    return {"ok": False, "error": err_msg}

            return {"ok": True, "result": str(res)}

        except Exception as e:
            return {"ok": False, "error": str(e)}
