import os
import asyncio
import inspect
import re

from fragment_api import FragmentAPI


class FragmentService:
    """
    Fragment API bilan xavfsiz ishlash uchun wrapper.

    Xavfsizlik:
    - Seed/mnemonic hech qachon logga chiqarilmaydi.
    - Xom API javobi logga chiqarilmaydi.
    - MNEMONIC bo'lmasa, xarid boshlanmaydi.
    - Xaridlar standart holatda o'chirilgan.
    """

    SAFE_ERROR_CODES = {
        "TOP_UP_REQUIRED",
        "WALLET_SELECTION_REQUIRED",
        "INVALID_BIP39_SEED",
        "INVALID_WALLET_ADDRESS",
        "INVALID_ACCOUNT_INDEX",
        "WALLET_ADDRESS_MISMATCH",
        "WALLET_INDEX_NOT_FOUND",
        "WALLET_RESOLVER_BUSY",
        "RECIPIENT_NOT_FOUND",
        "RECIPIENT_INELIGIBLE",
        "PREMIUM_ALREADY_ACTIVE",
        "PAYMENT_METHOD_UNAVAILABLE",
        "PURCHASE_FAILED",
        "INVALID_AMOUNT",
        "RATE_LIMITED",
        "SERVICE_UNAVAILABLE",
    }

    def __init__(self):
        self.mnemonic = os.getenv("MNEMONIC", "").strip()

        # Zaxira yoki tasodifiy hardcoded manzil ishlatilmaydi.
        self.wallet_address = (
            os.getenv("WALLET_ADDRESS")
            or os.getenv("TON_ADDRESS")
            or ""
        ).strip()

        self.api = FragmentAPI()

    # --------------------------------------------------
    # XAVFSIZ YORDAMCHI FUNKSIYALAR
    # --------------------------------------------------

    @staticmethod
    def _field(obj, name, default=None):
        if isinstance(obj, dict):
            return obj.get(name, default)

        return getattr(obj, name, default)

    @classmethod
    def _extract_error_code(cls, obj):
        """
        Faqat tanilgan xato kodlarini ajratadi.
        Xato matnini to'liq logga chiqarmaydi.
        """
        if obj is None:
            return None

        if isinstance(obj, dict):
            candidate = obj.get("code")
        else:
            candidate = getattr(obj, "code", None)

        if (
            isinstance(candidate, str)
            and candidate in cls.SAFE_ERROR_CODES
        ):
            return candidate

        # Ba'zi SDK xatoni dict o'rniga satr ko'rinishida qaytarishi mumkin.
        if isinstance(obj, str):
            for code in cls.SAFE_ERROR_CODES:
                if code in obj:
                    return code

        return None

    @staticmethod
    def _safe_text(value, max_length=80):
        """
        Log uchun faqat sodda identifikator/statuslarni qabul qiladi.
        Arbitrary obyekt repr() qilinmaydi.
        """
        if not isinstance(value, str):
            return None

        if len(value) > max_length:
            return None

        if not re.fullmatch(r"[A-Za-z0-9_.:-]+", value):
            return None

        return value

    @staticmethod
    def _safe_number(value):
        """
        Faqat oddiy raqam yoki raqam ko'rinishidagi satr.
        """
        if isinstance(value, bool):
            return None

        if isinstance(value, (int, float)):
            return value

        if isinstance(value, str):
            if re.fullmatch(r"\d{1,18}(?:\.\d{1,18})?", value):
                return value

        return None

    @classmethod
    def _public_error_message(cls, code):
        messages = {
            "TOP_UP_REQUIRED": (
                "Hamyon mablag'i xarid va tarmoq xarajatlari uchun "
                "yetarli emas deb topildi. Aniq yetishmayotgan summa "
                "API javobida mavjud emas."
            ),
            "WALLET_SELECTION_REQUIRED": (
                "Wallet manzili yoki account index talab qilinadi."
            ),
            "INVALID_WALLET_ADDRESS": "Wallet manzili noto'g'ri.",
            "INVALID_ACCOUNT_INDEX": "Account index noto'g'ri.",
            "WALLET_ADDRESS_MISMATCH": (
                "Tanlangan wallet manzili mos kelmadi."
            ),
            "RECIPIENT_NOT_FOUND": "Telegram recipient topilmadi.",
            "RECIPIENT_INELIGIBLE": (
                "Recipient ushbu xarid uchun mos emas."
            ),
            "PAYMENT_METHOD_UNAVAILABLE": (
                "Ushbu to'lov usuli hozir mavjud emas."
            ),
        }

        return messages.get(
            code,
            "Xarid so'rovi bajarilmadi. Xavfsiz logdagi kodni tekshiring."
        )

    def _log_safe_response(self, method_name, response):
        """
        Faqat ruxsat etilgan xavfsiz maydonlarni chiqaradi.
        Seed, mnemonic, username va xom response chiqarilmaydi.
        """
        error_obj = self._field(response, "error")
        error_code = (
            self._extract_error_code(error_obj)
            or self._extract_error_code(response)
        )

        summary = {
            "method": method_name,
            "status": self._safe_text(
                self._field(response, "status")
            ),
            "purchase_id": self._safe_text(
                self._field(response, "purchase_id")
                or self._field(response, "request_id")
                or self._field(response, "id")
            ),
            "amount": self._safe_number(
                self._field(response, "amount")
            ),
            "price": self._safe_number(
                self._field(response, "price")
            ),
            "fee": self._safe_number(
                self._field(response, "fee")
            ),
            "error_code": error_code,
        }

        print("[SAFE LOG] Fragment response:", summary)

        return summary

    # --------------------------------------------------
    # XARIDNI XAVFSIZLIK NUQTAYI NAZARIDAN TEKSHIRISH
    # --------------------------------------------------

    def _purchase_guard(self):
        """
        Standart holatda xaridni bloklaydi.

        Uchinchi tomon SDK xizmatiga seed uzatilishini anglagan,
        alohida ruxsat bermagan foydalanuvchi uchun xarid ochilmaydi.
        """
        if not self.mnemonic:
            return {
                "ok": False,
                "code": "MNEMONIC_MISSING",
                "error": (
                    "MNEMONIC sozlamasi mavjud emas. "
                    "Xavfsizlik uchun xarid boshlanmadi."
                ),
            }

        # Faqat ongli ravishda yoqilsa davom etadi.
        allow_external_seed = (
            os.getenv(
                "ALLOW_THIRD_PARTY_SEED_SUBMISSION",
                "false"
            ).strip().lower() == "true"
        )

        if not allow_external_seed:
            return {
                "ok": False,
                "code": "PURCHASE_DISABLED",
                "error": (
                    "Xarid vaqtincha o'chirilgan. "
                    "SDK seed ma'lumotini tashqi API xizmatiga uzatishi "
                    "mumkin; xavfsizlik tekshiruvisiz davom etilmadi."
                ),
            }

        words = self.mnemonic.split()

        if len(words) not in (12, 24):
            return {
                "ok": False,
                "code": "INVALID_SEED_WORD_COUNT",
                "error": (
                    "Mnemonic uzunligi 12 yoki 24 so'z bo'lishi kerak."
                ),
            }

        if len(words) == 12 and not self.wallet_address:
            return {
                "ok": False,
                "code": "WALLET_ADDRESS_MISSING",
                "error": (
                    "12 so'zli wallet uchun WALLET_ADDRESS "
                    "yoki TON_ADDRESS talab qilinadi."
                ),
            }

        return None

    def _get_auth_params(self):
        """
        12 so'zli seed uchun wallet_address orqali wallet tanlanadi.
        Account index oldindan tasdiqlanmagan bo'lsa, 0 deb taxmin qilinmaydi.
        """
        words = self.mnemonic.split()

        if len(words) == 24:
            return {
                "seed": self.mnemonic,
            }

        if len(words) == 12:
            return {
                "seed": self.mnemonic,
                "wallet_address": self.wallet_address,
            }

        raise ValueError("INVALID_SEED_WORD_COUNT")

    async def _run_sync_or_async(self, fn, *args, **kwargs):
        if inspect.iscoroutinefunction(fn):
            return await fn(*args, **kwargs)

        loop = asyncio.get_running_loop()

        return await loop.run_in_executor(
            None,
            lambda: fn(*args, **kwargs)
        )

    # --------------------------------------------------
    # FRAGMENT API CHAQIRISHI
    # --------------------------------------------------

    async def _call_api_method(self, method_name: str, **kwargs):
        if not hasattr(self.api, method_name):
            return {
                "ok": False,
                "code": "METHOD_NOT_FOUND",
                "error": (
                    f"FragmentAPI da '{method_name}' metodi topilmadi."
                ),
            }

        fn = getattr(self.api, method_name)

        try:
            response = await self._run_sync_or_async(
                fn,
                **kwargs
            )

        except Exception as exc:
            # Exception matni yoki repr(exc) chiqarilmaydi.
            error_code = self._extract_error_code(exc)

            retry_after = self._safe_number(
                getattr(exc, "retry_after", None)
            )

            print(
                "[SAFE LOG] API exception:",
                {
                    "method": method_name,
                    "exception_type": type(exc).__name__,
                    "error_code": error_code,
                    "retry_after": retry_after,
                }
            )

            return {
                "ok": False,
                "code": error_code or "API_EXCEPTION",
                "error": self._public_error_message(error_code),
            }

        summary = self._log_safe_response(
            method_name,
            response
        )

        purchase_id = (
            self._field(response, "purchase_id")
            or self._field(response, "request_id")
            or self._field(response, "id")
        )

        status = self._field(response, "status")

        tx_hash = (
            self._field(response, "transaction_hash")
            or self._field(response, "tx_hash")
            or self._field(response, "hash")
        )

        error_obj = self._field(response, "error")

        error_code = (
            self._extract_error_code(error_obj)
            or self._extract_error_code(response)
        )

        if error_code:
            return {
                "ok": False,
                "code": error_code,
                "error": self._public_error_message(error_code),
            }

        # SDK taqdim etsa, rasmiy wait() metodidan foydalanamiz.
        terminal_success = {
            "completed",
            "success",
            "paid",
        }

        terminal_failure = {
            "failed",
            "cancelled",
            "reconciliation_required",
        }

        status_text = (
            status.lower()
            if isinstance(status, str)
            else ""
        )

        if (
            purchase_id
            and not tx_hash
            and status_text not in terminal_success
            and status_text not in terminal_failure
        ):
            wait_fn = getattr(self.api, "wait", None)

            if wait_fn:
                try:
                    final_result = await self._run_sync_or_async(
                        wait_fn,
                        purchase_id
                    )

                except Exception as exc:
                    error_code = self._extract_error_code(exc)

                    print(
                        "[SAFE LOG] Purchase wait exception:",
                        {
                            "exception_type": type(exc).__name__,
                            "error_code": error_code,
                        }
                    )

                    return {
                        "ok": False,
                        "code": error_code or "WAIT_EXCEPTION",
                        "purchase_id": purchase_id,
                        "error": self._public_error_message(error_code),
                    }

                self._log_safe_response(
                    "wait",
                    final_result
                )

                final_status = self._field(
                    final_result,
                    "status"
                )

                final_status_text = (
                    final_status.lower()
                    if isinstance(final_status, str)
                    else ""
                )

                final_tx_hash = (
                    self._field(final_result, "transaction_hash")
                    or self._field(final_result, "tx_hash")
                    or self._field(final_result, "hash")
                )

                final_error_obj = self._field(
                    final_result,
                    "error"
                )

                final_error_code = (
                    self._extract_error_code(final_error_obj)
                    or self._extract_error_code(final_result)
                )

                if final_error_code:
                    return {
                        "ok": False,
                        "code": final_error_code,
                        "purchase_id": purchase_id,
                        "error": self._public_error_message(
                            final_error_code
                        ),
                    }

                if (
                    final_status_text in terminal_success
                    or final_tx_hash
                ):
                    return {
                        "ok": True,
                        "status": final_status_text or "completed",
                        "purchase_id": purchase_id,
                        "tx_hash": final_tx_hash,
                        "message": (
                            "SDK xaridni muvaffaqiyatli deb qaytardi. "
                            "Telegram balansini alohida tasdiqlang."
                        ),
                    }

                if final_status_text in terminal_failure:
                    return {
                        "ok": False,
                        "status": final_status_text,
                        "purchase_id": purchase_id,
                        "error": (
                            "Xarid muvaffaqiyatsiz yakunlandi. "
                            "Qo'shimcha xaridni qayta boshlamang; "
                            "avval holatni tekshiring."
                        ),
                    }

                return {
                    "ok": True,
                    "status": final_status_text or "processing",
                    "purchase_id": purchase_id,
                    "message": (
                        "Xarid hali yakuniy holatga yetmagan."
                    ),
                }

        if status_text in terminal_success or tx_hash:
            return {
                "ok": True,
                "status": status_text or "completed",
                "purchase_id": purchase_id,
                "tx_hash": tx_hash,
                "message": (
                    "SDK xaridni muvaffaqiyatli deb qaytardi. "
                    "Telegram balansini alohida tasdiqlang."
                ),
            }

        if status_text in terminal_failure:
            return {
                "ok": False,
                "status": status_text,
                "error": "Xarid muvaffaqiyatsiz yakunlandi.",
            }

        if purchase_id:
            return {
                "ok": True,
                "status": status_text or "processing",
                "purchase_id": purchase_id,
                "message": "Xarid so'rovi qabul qilindi.",
            }

        return {
            "ok": False,
            "code": "UNKNOWN_API_RESPONSE",
            "error": (
                "API yakuniy natijani yoki purchase ID ni bermadi."
            ),
        }

    # --------------------------------------------------
    # STARS
    # --------------------------------------------------

    async def init_buy_stars(
        self,
        username: str,
        stars_amount: int
    ):
        guard_error = self._purchase_guard()

        if guard_error:
            return guard_error

        clean_username = username.strip()

        if not clean_username.startswith("@"):
            clean_username = f"@{clean_username}"

        if (
            isinstance(stars_amount, bool)
            or not isinstance(stars_amount, int)
            or stars_amount < 50
        ):
            return {
                "ok": False,
                "code": "INVALID_AMOUNT",
                "error": "Stars miqdori kamida 50 bo'lishi kerak.",
            }

        call_kwargs = {
            "username": clean_username,
            "amount": stars_amount,
            "payment_method": "gram",
            **self._get_auth_params(),
        }

        return await self._call_api_method(
            "buy_stars",
            **call_kwargs
        )

    # --------------------------------------------------
    # PREMIUM
    # --------------------------------------------------

    async def init_gift_request(
        self,
        username: str,
        months: int
    ):
        guard_error = self._purchase_guard()

        if guard_error:
            return guard_error

        clean_username = username.strip()

        if not clean_username.startswith("@"):
            clean_username = f"@{clean_username}"

        if months not in (3, 6, 12):
            return {
                "ok": False,
                "code": "INVALID_DURATION",
                "error": "Premium muddati 3, 6 yoki 12 oy bo'lishi kerak.",
            }

        call_kwargs = {
            "username": clean_username,
            "months": months,
            "payment_method": "gram",
            **self._get_auth_params(),
        }

        return await self._call_api_method(
            "buy_premium",
            **call_kwargs
        )
