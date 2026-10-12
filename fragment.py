
import os
import asyncio
import inspect
import re
from decimal import Decimal, InvalidOperation

from fragment_api import FragmentAPI


class FragmentService:
    """
    Telegram Shop uchun Fragment API wrapper.

    Xavfsizlik:
    - Availability tekshiruvlariga mnemonic uzatilmaydi.
    - Xom API javoblari va maxfiy ma'lumotlar log qilinmaydi.
    - Xaridlar standart holatda o'chirilgan.
    - Xaridni yoqishdan oldin tashqi API seed xavfsizligi tekshirilishi kerak.
    """

    USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{5,32}$")

    TERMINAL_SUCCESS = {"completed", "success", "paid"}
    TERMINAL_FAILURE = {
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
    # YORDAMCHI FUNKSIYALAR
    # --------------------------------------------------

    @staticmethod
    def _field(obj, name, default=None):
        if isinstance(obj, dict):
            return obj.get(name, default)
        return getattr(obj, name, default)

    @staticmethod
    def _safe_text(value, limit=120):
        if not isinstance(value, str):
            return None

        value = value.strip()
        if not value or len(value) > limit:
            return None

        if not re.fullmatch(r"[A-Za-z0-9_.:-]+", value):
            return None

        return value

    @staticmethod
    def _safe_decimal(value):
        if isinstance(value, bool) or value is None:
            return None

        try:
            number = Decimal(str(value))
            if not number.is_finite() or number < 0:
                return None
            return str(number)
        except (InvalidOperation, ValueError, TypeError):
            return None

    @staticmethod
    def _normalize_username(username):
        if not isinstance(username, str):
            return None

        username = username.strip()
        if username.startswith("@"):
            username = username[1:]

        if not FragmentService.USERNAME_RE.fullmatch(username):
            return None

        return "@" + username

    @staticmethod
    async def _run_sync_or_async(fn, *args, **kwargs):
        if inspect.iscoroutinefunction(fn):
            return await fn(*args, **kwargs)

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: fn(*args, **kwargs),
        )

        # Ba'zi wrapperlar oddiy funksiya ichidan coroutine qaytarishi mumkin.
        if inspect.isawaitable(result):
            return await result

        return result

    @staticmethod
    def _safe_error_code(exc):
        """
        Exception matni log qilinmaydi.
        Faqat oddiy, oldindan cheklangan kod qaytariladi.
        """
        code = getattr(exc, "code", None)

        if isinstance(code, str) and re.fullmatch(
            r"[A-Z][A-Z0-9_]{1,60}", code
        ):
            return code

        return "API_REQUEST_FAILED"

    # --------------------------------------------------
    # SDK METODINI XAVFSIZ CHAQRISH
    # --------------------------------------------------

    async def _invoke_checked(self, method_name, values):
        """
        SDK metodining parametrlarini inspect orqali aniqlaydi.
        Parametrlar noma'lum bo'lsa, taxminiy positional argument
        yubormaydi.
        """
        method = getattr(self.api, method_name, None)

        if not callable(method):
            return {
                "ok": False,
                "available": False,
                "code": "METHOD_NOT_FOUND",
                "error": "SDK da mavjudlik tekshiruv metodi topilmadi.",
            }

        try:
            signature = inspect.signature(method)
            parameters = signature.parameters

            kwargs = {}
            unresolved = []

            for name, parameter in parameters.items():
                if parameter.kind in (
                    inspect.Parameter.VAR_POSITIONAL,
                    inspect.Parameter.VAR_KEYWORD,
                ):
                    continue

                if name in values:
                    kwargs[name] = values[name]
                elif parameter.default is inspect.Parameter.empty:
                    unresolved.append(name)

            if unresolved:
                return {
                    "ok": False,
                    "available": False,
                    "code": "SDK_SIGNATURE_UNSUPPORTED",
                    "error": (
                        "SDK parametrlari kutilgan shaklda emas. "
                        "SDK metod imzosini tekshirish kerak."
                    ),
                }

            result = await self._run_sync_or_async(
                method,
                **kwargs,
            )

            return self._parse_availability(result)

        except Exception as exc:
            print(
                "[Fragment] Availability request failed:",
                {
                    "method": method_name,
                    "exception_type": type(exc).__name__,
                    "code": self._safe_error_code(exc),
                },
            )

            return {
                "ok": False,
                "available": False,
                "code": "AVAILABILITY_CHECK_FAILED",
                "error": (
                    "Mavjudlikni tekshirish bajarilmadi. "
                    "To'lovni hozircha davom ettirmang."
                ),
            }

    def _parse_availability(self, result):
        """
        SDK javobidan faqat kerakli maydonlarni oladi.
        Noma'lum javobni avtomatik ravishda available deb qabul qilmaydi.
        """
        available = self._field(result, "available")

        if not isinstance(available, bool):
            available = self._field(result, "is_available")

        if not isinstance(available, bool):
            available = self._field(result, "eligible")

        if not isinstance(available, bool):
            available = None

        status = self._field(result, "status")
        code = self._field(result, "code")
        price = self._field(result, "price")

        safe_status = self._safe_text(status)
        safe_code = self._safe_text(code)
        safe_price = self._safe_decimal(price)

        if available is None:
            return {
                "ok": False,
                "available": False,
                "code": "UNKNOWN_AVAILABILITY_RESPONSE",
                "status": safe_status,
                "error": (
                    "SDK javobida mavjudlik aniq tasdiqlanmadi. "
                    "Xaridga ruxsat berilmadi."
                ),
            }

        return {
            "ok": True,
            "available": available,
            "code": safe_code,
            "status": safe_status,
            "price": safe_price,
            "message": (
                "Xizmat mavjud."
                if available
                else "Xizmat hozir mavjud emas."
            ),
        }

    # --------------------------------------------------
    # STARS MAVJUDLIGINI TEKSHIRISH
    # MNEMONIC BU METODGA UZATILMAYDI
    # --------------------------------------------------

    async def check_stars_availability(
        self,
        username: str,
        stars_amount: int,
    ):
        clean_username = self._normalize_username(username)

        if not clean_username:
            return {
                "ok": False,
                "available": False,
                "code": "INVALID_USERNAME",
                "error": "Telegram username noto'g'ri.",
            }

        if (
            isinstance(stars_amount, bool)
            or not isinstance(stars_amount, int)
            or not 50 <= stars_amount <= 1_000_000
        ):
            return {
                "ok": False,
                "available": False,
                "code": "INVALID_AMOUNT",
                "error": "Stars miqdori noto'g'ri.",
            }

        return await self._invoke_checked(
            "check_stars_availability",
            {
                "username": clean_username,
                "amount": stars_amount,
                "stars_amount": stars_amount,
                "payment_method": "gram",
            },
        )

    # --------------------------------------------------
    # PREMIUM MAVJUDLIGINI TEKSHIRISH
    # MNEMONIC BU METODGA UZATILMAYDI
    # --------------------------------------------------

    async def check_premium_availability(
        self,
        username: str,
        months: int,
    ):
        clean_username = self._normalize_username(username)

        if not clean_username:
            return {
                "ok": False,
                "available": False,
                "code": "INVALID_USERNAME",
                "error": "Telegram username noto'g'ri.",
            }

        if (
            isinstance(months, bool)
            or not isinstance(months, int)
            or months not in (3, 6, 12)
        ):
            return {
                "ok": False,
                "available": False,
                "code": "INVALID_DURATION",
                "error": "Premium muddati 3, 6 yoki 12 oy bo'lishi kerak.",
            }

        return await self._invoke_checked(
            "check_premium_availability",
            {
                "username": clean_username,
                "months": months,
                "payment_method": "gram",
            },
        )

    # --------------------------------------------------
    # XARID UCHUN XAVFSIZLIK TEKSHIRUVI
    # STANDART HOLATDA XARID O'CHIRILGAN
    # --------------------------------------------------

    def _purchase_guard(self):
        purchases_enabled = (
            os.getenv("FRAGMENT_PURCHASES_ENABLED", "false")
            .strip()
            .lower()
            == "true"
        )

        seed_submission_allowed = (
            os.getenv("ALLOW_THIRD_PARTY_SEED_SUBMISSION", "false")
            .strip()
            .lower()
            == "true"
        )

        if not purchases_enabled:
            return {
                "ok": False,
                "code": "PURCHASES_DISABLED",
                "error": (
                    "Fragment xaridlari vaqtincha o'chirilgan. "
                    "Avval integratsiya tekshirilishi kerak."
                ),
            }

        if not seed_submission_allowed:
            return {
                "ok": False,
                "code": "EXTERNAL_SEED_SUBMISSION_DISABLED",
                "error": (
                    "SDK seed ma'lumotini tashqi API ga yuborishi "
                    "mumkin. Xavfsizlik tasdiqlanmagani uchun "
                    "xarid boshlanmadi."
                ),
            }

        if not self.mnemonic:
            return {
                "ok": False,
                "code": "MNEMONIC_MISSING",
                "error": "MNEMONIC sozlanmagan. Xarid boshlanmadi.",
            }

        words = self.mnemonic.split()

        if len(words) not in (12, 24):
            return {
                "ok": False,
                "code": "INVALID_SEED_WORD_COUNT",
                "error": "Mnemonic uzunligi noto'g'ri.",
            }

        if len(words) == 12 and not self.wallet_address:
            return {
                "ok": False,
                "code": "WALLET_ADDRESS_MISSING",
                "error": "Wallet manzili sozlanmagan.",
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

    # --------------------------------------------------
    # XARID API METODINI CHAQRISH
    # --------------------------------------------------

    async def _purchase(self, method_name, **kwargs):
        guard_error = self._purchase_guard()

        if guard_error:
            return guard_error

        method = getattr(self.api, method_name, None)

        if not callable(method):
            return {
                "ok": False,
                "code": "METHOD_NOT_FOUND",
                "error": "SDK xarid metodi topilmadi.",
            }

        try:
            # Diqqat: SDK seedni tashqi serverga yuborishi mumkin.
            result = await self._run_sync_or_async(
                method,
                **kwargs,
            )

            status = self._field(result, "status")
            purchase_id = (
                self._field(result, "purchase_id")
                or self._field(result, "request_id")
                or self._field(result, "id")
            )
            tx_hash = (
                self._field(result, "transaction_hash")
                or self._field(result, "tx_hash")
                or self._field(result, "hash")
            )

            safe_status = self._safe_text(status)
            safe_purchase_id = self._safe_text(purchase_id)
            safe_tx_hash = self._safe_text(tx_hash, 180)

            print(
                "[Fragment] Purchase response:",
                {
                    "method": method_name,
                    "status": safe_status,
                    "purchase_id": safe_purchase_id,
                    "has_tx_hash": bool(safe_tx_hash),
                },
            )

            if safe_status and safe_status.lower() in self.TERMINAL_FAILURE:
                return {
                    "ok": False,
                    "code": "PURCHASE_FAILED",
                    "status": safe_status,
                    "purchase_id": safe_purchase_id,
                    "error": "Xarid muvaffaqiyatsiz yakunlandi.",
                }

            if (
                safe_status
                and safe_status.lower() in self.TERMINAL_SUCCESS
            ) or safe_tx_hash:
                return {
                    "ok": True,
                    "status": safe_status or "completed",
                    "purchase_id": safe_purchase_id,
                    "tx_hash": safe_tx_hash,
                    "message": (
                        "SDK muvaffaqiyat holatini qaytardi. "
                        "Yetkazib berishni alohida tasdiqlash kerak."
                    ),
                }

            if safe_purchase_id:
                return {
                    "ok": True,
                    "status": safe_status or "processing",
                    "purchase_id": safe_purchase_id,
                    "message": (
                        "So'rov qabul qilindi; yakuniy natija "
                        "hali tasdiqlanmagan."
                    ),
                }

            return {
                "ok": False,
                "code": "UNKNOWN_PURCHASE_RESPONSE",
                "error": (
                    "SDK xaridning yakuniy holatini bermadi. "
                    "Takroriy xarid boshlamang; holatni tekshiring."
                ),
            }

        except Exception as exc:
            print(
                "[Fragment] Purchase request failed:",
                {
                    "method": method_name,
                    "exception_type": type(exc).__name__,
                    "code": self._safe_error_code(exc),
                },
            )

            return {
                "ok": False,
                "code": self._safe_error_code(exc),
                "error": (
                    "Xarid natijasini aniqlab bo'lmadi. "
                    "Balansdan pul yechish yoki qayta urinishdan "
                    "oldin buyurtma holatini tekshiring."
                ),
            }

    # --------------------------------------------------
    # STARS XARIDI
    # --------------------------------------------------

    async def init_buy_stars(
        self,
        username: str,
        stars_amount: int,
    ):
        clean_username = self._normalize_username(username)

        if not clean_username:
            return {
                "ok": False,
                "code": "INVALID_USERNAME",
                "error": "Telegram username noto'g'ri.",
            }

        if (
            isinstance(stars_amount, bool)
            or not isinstance(stars_amount, int)
            or not 50 <= stars_amount <= 1_000_000
        ):
            return {
                "ok": False,
                "code": "INVALID_AMOUNT",
                "error": "Stars miqdori noto'g'ri.",
            }

        return await self._purchase(
            "buy_stars",
            username=clean_username,
            amount=stars_amount,
            payment_method="gram",
            **self._get_auth_params(),
        )

    # --------------------------------------------------
    # PREMIUM XARIDI
    # --------------------------------------------------

    async def init_gift_request(
        self,
        username: str,
        months: int,
    ):
        clean_username = self._normalize_username(username)

        if not clean_username:
            return {
                "ok": False,
                "code": "INVALID_USERNAME",
                "error": "Telegram username noto'g'ri.",
            }

        if (
            isinstance(months, bool)
            or not isinstance(months, int)
            or months not in (3, 6, 12)
        ):
            return {
                "ok": False,
                "code": "INVALID_DURATION",
                "error": "Premium muddati 3, 6 yoki 12 oy bo'lishi kerak.",
            }

        return await self._purchase(
            "buy_premium",
            username=clean_username,
            months=months,
            payment_method="gram",
            **self._get_auth_params(),
        )
