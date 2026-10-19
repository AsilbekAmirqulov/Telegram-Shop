
import os
import asyncio
import inspect
import re
import hashlib

from fragment_api import FragmentAPI


class FragmentService:
    """
    Fragment API bilan xavfsiz ishlash uchun wrapper.

    - Seed va mnemonic logga chiqarilmaydi.
    - Xom API javobi logga chiqarilmaydi.
    - Xaridlar uchun aniq ruxsat talab qilinadi.
    - Mavjudlik tekshiruvi muvaffaqiyatsiz bo'lsa, False qaytariladi.
    - Noaniq xarid avtomatik qayta yuborilmaydi.
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

    SUCCESS_STATUSES = {
        "completed",
        "success",
        "succeeded",
        "paid",
    }

    FAILURE_STATUSES = {
        "failed",
        "cancelled",
        "canceled",
        "reconciliation_required",
    }

    def __init__(self):
        self.mnemonic = os.getenv("MNEMONIC", "").strip()

        self.wallet_address = (
            os.getenv("WALLET_ADDRESS")
            or os.getenv("TON_ADDRESS")
            or ""
        ).strip()

        self.api = FragmentAPI()

    # --------------------------------------------------
    # XAVFSIZ YORDAMCHI METODLAR
    # --------------------------------------------------

    @staticmethod
    def _field(obj, name, default=None):
        if isinstance(obj, dict):
            return obj.get(name, default)

        return getattr(obj, name, default)

    @classmethod
    def _extract_error_code(cls, obj):
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

        if isinstance(obj, str):
            for code in cls.SAFE_ERROR_CODES:
                if code in obj:
                    return code

        return None

    @staticmethod
    def _safe_text(value, max_length=80):
        if not isinstance(value, str):
            return None

        if len(value) > max_length:
            return None

        if not re.fullmatch(r"[A-Za-z0-9_.:-]+", value):
            return None

        return value

    @staticmethod
    def _safe_number(value):
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
                "Hamyon mablag'i yetarli emas. "
                "Xaridni qayta boshlashdan oldin hamyonni tekshiring."
            ),
            "WALLET_SELECTION_REQUIRED": (
                "Wallet manzili yoki account index talab qilinadi."
            ),
            "INVALID_BIP39_SEED": "Mnemonic yaroqsiz deb topildi.",
            "INVALID_WALLET_ADDRESS": "Wallet manzili noto'g'ri.",
            "INVALID_ACCOUNT_INDEX": "Account index noto'g'ri.",
            "WALLET_ADDRESS_MISMATCH": (
                "Tanlangan wallet manzili mos kelmadi."
            ),
            "RECIPIENT_NOT_FOUND": "Telegram recipient topilmadi.",
            "RECIPIENT_INELIGIBLE": (
                "Recipient ushbu xarid uchun mos emas."
            ),
            "PREMIUM_ALREADY_ACTIVE": (
                "Recipientda Premium allaqachon faol bo'lishi mumkin."
            ),
            "PAYMENT_METHOD_UNAVAILABLE": (
                "Ushbu to'lov usuli hozir mavjud emas."
            ),
            "INVALID_AMOUNT": "Xarid miqdori noto'g'ri.",
            "RATE_LIMITED": (
                "So'rovlar limiti oshdi. Keyinroq qayta tekshiring."
            ),
            "SERVICE_UNAVAILABLE": (
                "Xizmat vaqtincha ishlamayapti."
            ),
        }

        return messages.get(
            code,
            "Xarid so'rovi bajarilmadi. Buyurtma holatini tekshiring."
        )

    def _log_safe_response(self, method_name, response):
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

    @staticmethod
    def _normalize_status(value):
        if not isinstance(value, str):
            return ""

        return value.strip().lower()

    @staticmethod
    def _valid_username(username):
        if not isinstance(username, str):
            return None

        clean = username.strip().lstrip("@")

        if not re.fullmatch(r"[A-Za-z0-9_]{5,32}", clean):
            return None

        return f"@{clean}"

    @staticmethod
    def _make_idempotency_key(product, username, quantity, order_id=None):
        """
        Buyurtma ID berilsa, kalit aynan shu buyurtmaga bog'lanadi.
        Order ID bo'lmasa, barqaror hash yaratiladi.

        Muhim: order_id server.py tomonidan berilishi afzal.
        """
        if order_id is not None:
            order_text = str(order_id).strip()

            if not order_text:
                return None

            raw = f"telegram-shop:{product}:{order_text}"
        else:
            raw = (
                f"telegram-shop:{product}:"
                f"{username.strip().lower()}:{quantity}"
            )

        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        return f"tgshop_{digest[:40]}"

    # --------------------------------------------------
    # XARID XAVFSIZLIGI
    # --------------------------------------------------

    def _purchase_guard(self):
        if not self.mnemonic:
            return {
                "ok": False,
                "code": "MNEMONIC_MISSING",
                "error": (
                    "MNEMONIC sozlamasi mavjud emas. "
                    "Xavfsizlik uchun xarid boshlanmadi."
                ),
            }

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
                    "Xarid o'chirilgan. SDK seed ma'lumotini "
                    "tashqi API xizmatiga uzatishi mumkin."
                ),
            }

        words = self.mnemonic.split()

        if len(words) not in (12, 24):
            return {
                "ok": False,
                "code": "INVALID_SEED_WORD_COUNT",
                "error": (
                    "Mnemonic 12 yoki 24 so'zdan iborat bo'lishi kerak."
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
        words = self.mnemonic.split()

        if len(words) == 24:
            return {"seed": self.mnemonic}

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
    # API METODINI CHAQIRISH VA NATIJANI TEKSHIRISH
    # --------------------------------------------------

    async def _call_api_method(self, method_name, **kwargs):
        fn = getattr(self.api, method_name, None)

        if not callable(fn):
            return {
                "ok": False,
                "code": "METHOD_NOT_FOUND",
                "error": (
                    f"FragmentAPI da '{method_name}' metodi topilmadi."
                ),
            }

        try:
            response = await self._run_sync_or_async(fn, **kwargs)

        except Exception as exc:
            error_code = self._extract_error_code(exc)

            print(
                "[SAFE LOG] API exception:",
                {
                    "method": method_name,
                    "exception_type": type(exc).__name__,
                    "error_code": error_code,
                    "retry_after": self._safe_number(
                        getattr(exc, "retry_after", None)
                    ),
                }
            )

            return {
                "ok": False,
                "code": error_code or "API_EXCEPTION",
                "error": self._public_error_message(error_code),
            }

        self._log_safe_response(method_name, response)

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

        purchase_id = (
            self._field(response, "purchase_id")
            or self._field(response, "request_id")
            or self._field(response, "id")
        )

        status = self._normalize_status(
            self._field(response, "status")
        )

        tx_hash = (
            self._field(response, "transaction_hash")
            or self._field(response, "tx_hash")
            or self._field(response, "hash")
        )

        # Faqat aniq yakuniy holat yoki haqiqiy tx hash muvaffaqiyatni
        # ko'rsatishi mumkin. Oddiy purchase ID muvaffaqiyat degani emas.
        if status in self.SUCCESS_STATUSES:
            return {
                "ok": True,
                "status": status,
                "purchase_id": purchase_id,
                "tx_hash": tx_hash,
                "message": "SDK xaridni muvaffaqiyatli deb qaytardi.",
            }

        if status in self.FAILURE_STATUSES:
            return {
                "ok": False,
                "status": status,
                "purchase_id": purchase_id,
                "error": (
                    "Xarid muvaffaqiyatsiz yoki noaniq yakunlandi. "
                    "Holat tekshirilmaguncha qayta xarid qilmang."
                ),
            }

        if not purchase_id:
            return {
                "ok": False,
                "code": "UNKNOWN_API_RESPONSE",
                "error": (
                    "API xarid ID sini bermadi. "
                    "Xarid holatini alohida tekshirish kerak."
                ),
            }

        wait_fn = getattr(self.api, "wait", None)

        if not callable(wait_fn):
            return {
                "ok": False,
                "code": "WAIT_METHOD_MISSING",
                "status": status or "processing",
                "purchase_id": purchase_id,
                "error": (
                    "Xarid ID olindi, lekin yakuniy holatni tekshirish "
                    "metodi mavjud emas. Avtomatik qayta xarid qilmang."
                ),
            }

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
                "status": "reconciliation_required",
                "purchase_id": purchase_id,
                "error": (
                    "Xaridning yakuniy holati aniqlanmadi. "
                    "Qayta xarid qilishdan oldin tekshiring."
                ),
            }

        self._log_safe_response("wait", final_result)

        final_error = self._field(final_result, "error")
        final_error_code = (
            self._extract_error_code(final_error)
            or self._extract_error_code(final_result)
        )

        if final_error_code:
            return {
                "ok": False,
                "code": final_error_code,
                "status": "reconciliation_required",
                "purchase_id": purchase_id,
                "error": self._public_error_message(final_error_code),
            }

        final_status = self._normalize_status(
            self._field(final_result, "status")
        )

        final_tx_hash = (
            self._field(final_result, "transaction_hash")
            or self._field(final_result, "tx_hash")
            or self._field(final_result, "hash")
        )

        if final_status in self.SUCCESS_STATUSES:
            return {
                "ok": True,
                "status": final_status,
                "purchase_id": purchase_id,
                "tx_hash": final_tx_hash,
                "message": (
                    "SDK xaridni muvaffaqiyatli deb qaytardi. "
                    "Telegram natijasini alohida tasdiqlang."
                ),
            }

        if final_status in self.FAILURE_STATUSES:
            return {
                "ok": False,
                "status": final_status,
                "purchase_id": purchase_id,
                "error": (
                    "Xarid muvaffaqiyatsiz yoki noaniq yakunlandi. "
                    "Qayta xaridni avtomatik boshlamang."
                ),
            }

        return {
            "ok": False,
            "code": "PURCHASE_PENDING",
            "status": final_status or "processing",
            "purchase_id": purchase_id,
            "error": (
                "Xarid hali yakuniy holatga yetmagan. "
                "Buyurtma holatini keyinroq tekshiring."
            ),
        }

    # --------------------------------------------------
    # XARIDDAN OLDIN MAVJUDLIK TEKSHIRUVI
    # --------------------------------------------------

    @staticmethod
    def _availability_value(result):
        """
        SDK javobi bool yoki available maydoniga ega obyekt/dict
        bo'lishi mumkin. Noma'lum javob hech qachon True hisoblanmaydi.
        """
        if isinstance(result, bool):
            return result

        value = FragmentService._field(result, "available", None)

        if isinstance(value, bool):
            return value

        return False

    async def check_stars_availability(
        self,
        username: str,
        stars_amount: int,
    ) -> bool:
        clean_username = self._valid_username(username)

        if (
            not clean_username
            or isinstance(stars_amount, bool)
            or not isinstance(stars_amount, int)
            or not 50 <= stars_amount <= 1_000_000
        ):
            return False

        checker = getattr(
            self.api,
            "check_stars_availability",
            None
        )

        if not callable(checker):
            print("[SAFE LOG] Stars availability method missing")
            return False

        try:
            result = await self._run_sync_or_async(
                checker,
                clean_username,
                stars_amount,
                "gram",
            )

            return self._availability_value(result)

        except Exception as exc:
            print(
                "[SAFE LOG] Stars availability failed:",
                {"exception_type": type(exc).__name__},
            )
            return False

    async def check_premium_availability(
        self,
        username: str,
        months: int,
    ) -> bool:
        clean_username = self._valid_username(username)

        if not clean_username or months not in (3, 6, 12):
            return False

        checker = getattr(
            self.api,
            "check_premium_availability",
            None
        )

        if not callable(checker):
            print("[SAFE LOG] Premium availability method missing")
            return False

        try:
            result = await self._run_sync_or_async(
                checker,
                clean_username,
                months,
                "gram",
            )

            return self._availability_value(result)

        except Exception as exc:
            print(
                "[SAFE LOG] Premium availability failed:",
                {"exception_type": type(exc).__name__},
            )
            return False

    # --------------------------------------------------
    # STARS XARIDI
    # --------------------------------------------------

    async def init_buy_stars(
        self,
        username: str,
        stars_amount: int,
        order_id=None,
    ):
        guard_error = self._purchase_guard()

        if guard_error:
            return guard_error

        clean_username = self._valid_username(username)

        if (
            not clean_username
            or isinstance(stars_amount, bool)
            or not isinstance(stars_amount, int)
            or stars_amount < 50
        ):
            return {
                "ok": False,
                "code": "INVALID_AMOUNT",
                "error": "Username yoki Stars miqdori noto'g'ri.",
            }

        idempotency_key = self._make_idempotency_key(
            "stars",
            clean_username,
            stars_amount,
            order_id,
        )

        call_kwargs = {
            "username": clean_username,
            "amount": stars_amount,
            "payment_method": "gram",
            "idempotency_key": idempotency_key,
            **self._get_auth_params(),
        }

        return await self._call_api_method(
            "buy_stars",
            **call_kwargs,
        )

    # --------------------------------------------------
    # PREMIUM XARIDI
    # --------------------------------------------------

    async def init_gift_request(
        self,
        username: str,
        months: int,
        order_id=None,
    ):
        guard_error = self._purchase_guard()

        if guard_error:
            return guard_error

        clean_username = self._valid_username(username)

        if not clean_username or months not in (3, 6, 12):
            return {
                "ok": False,
                "code": "INVALID_DURATION",
                "error": (
                    "Username yoki Premium muddati noto'g'ri. "
                    "Muddati 3, 6 yoki 12 oy bo'lishi kerak."
                ),
            }

        idempotency_key = self._make_idempotency_key(
            "premium",
            clean_username,
            months,
            order_id,
        )

        call_kwargs = {
            "username": clean_username,
            "months": months,
            "payment_method": "gram",
            "idempotency_key": idempotency_key,
            **self._get_auth_params(),
        }

        return await self._call_api_method(
            "buy_premium",
            **call_kwargs,
        )
