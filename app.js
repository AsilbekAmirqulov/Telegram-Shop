
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =========================================================
    // 1. SOZLAMALAR VA TELEGRAM WEB APP
    // =========================================================
    const SERVER_URL = "https://telegram-shop-9liy.onrender.com";
    const tg = window.Telegram?.WebApp || null;

    if (tg) {
        try {
            tg.ready();
            tg.expand();
            tg.setHeaderColor("#0b1118");
            tg.setBackgroundColor("#0b1118");
        } catch (error) {
            console.warn("Telegram WebApp sozlamasi:", error);
        }
    }

    // =========================================================
    // 2. HTML ELEMENTLARI (index.html bilan mos ID'lar)
    // =========================================================
    const $ = (id) => document.getElementById(id);

    const homePage = $("homePage");
    const ordersPage = $("ordersPage");
    const profilePage = $("profilePage");
    const productsSection = $("productsSection");
    const products = $("products");

    const bottomNavigation = $("bottomNavigation");
    const navIndicator = $("navIndicator");
    const homeNavButton = $("homeNavButton");
    const ordersNavButton = $("ordersNavButton");
    const profileNavButton = $("profileNavButton");

    const premiumButton = $("premiumButton");
    const starsButton = $("starsButton");
    const profileOrdersButton = $("profileOrdersButton");
    const referralButton = $("referralButton");
    const supportButton = $("supportButton");
    const addBalanceButton = $("addBalanceButton");
    const profileAddBalanceButton = $("profileAddBalanceButton");
    const notificationButton = $("notificationButton");
    const ordersBackButton = $("ordersBackButton");

    const userAvatar = $("userAvatar");
    const userName = $("userName");
    const profileAvatar = $("profileAvatar");
    const profileName = $("profileName");
    const profileUsername = $("profileUsername");
    const userBalance = $("userBalance");
    const profileBalance = $("profileBalance");
    const ordersContent = $("ordersContent");

    // =========================================================
    // 3. HOLAT VA NARXLAR
    // =========================================================
    const telegramUser = tg?.initDataUnsafe?.user || null;
    let currentProductType = "";
    let currentUsername = "";
    let verifiedUsername = "";
    let searchTimer = null;
    let usernameRequestId = 0;
    let currentBalance = null;
    let balanceLoaded = false;
    let walletModalOpen = false;
    let currentPage = "home";
    let previousPage = "home";
    let orderInProgress = false;

    const PREMIUM_PLANS = [
        { months: 3, price: 165000 },
        { months: 6, price: 220000 },
        { months: 12, price: 390000 }
    ];

    // Boshqa Premium tariflari hozircha admin orqali rasmiylashtiriladi.
    const PREMIUM_CONTACT_PLANS = [
        { months: 1, price: 40000 },
        { months: 12, price: 280000 }
    ];

    const STARS_PLANS = [
        { stars: 50, price: 11000 },
        { stars: 100, price: 30000 },
        { stars: 150, price: 40000 },
        { stars: 250, price: 64000 },
        { stars: 350, price: 89000 },
        { stars: 500, price: 125000 },
        { stars: 750, price: 185000 },
        { stars: 1000, price: 244000 },
        { stars: 1500, price: 365000 },
        { stars: 2500, price: 605000 },
        { stars: 5000, price: 1205000 }
    ];

    // =========================================================
    // 4. YORDAMCHI FUNKSIYALAR
    // =========================================================
    function getUserId() {
        const id = Number(telegramUser?.id || 0);
        return Number.isSafeInteger(id) && id > 0 ? id : 0;
    }

    function getUserDisplayName() {
        if (!telegramUser) return "Telegram foydalanuvchisi";
        const first = telegramUser.first_name || "";
        const last = telegramUser.last_name || "";
        return `${first} ${last}`.trim() || telegramUser.username || "Telegram foydalanuvchisi";
    }

    function getUserUsername() {
        return telegramUser?.username ? `@${telegramUser.username}` : "Telegram foydalanuvchisi";
    }

    function formatPrice(value) {
        const amount = Number(value);
        if (!Number.isFinite(amount)) return "0";
        return Math.floor(amount).toLocaleString("uz-UZ").replace(/[\u00a0,]/g, " ");
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function normalizeUsername(value) {
        return String(value ?? "").trim().replace(/^@+/, "").replace(/\s+/g, "");
    }

    function isValidUsername(value) {
        return /^[A-Za-z0-9_]{5,32}$/.test(normalizeUsername(value));
    }

    function haptic(type = "light") {
        try {
            const feedback = tg?.HapticFeedback;
            if (!feedback) return;
            if (["success", "error", "warning"].includes(type)) {
                feedback.notificationOccurred(type);
            } else {
                feedback.impactOccurred(type);
            }
        } catch (_) {
            // Qurilma vibratsiyani qo'llab-quvvatlamasa ham ilova ishlashda davom etadi.
        }
    }

    function telegramAlert(message) {
        const text = String(message ?? "");
        if (typeof tg?.showAlert === "function") tg.showAlert(text);
        else window.alert(text);
    }

    function showToast(message, type = "info") {
        const oldToast = $("shopToast");
        if (oldToast) oldToast.remove();

        const toast = document.createElement("div");
        toast.id = "shopToast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        toast.textContent = String(message ?? "");

        const background = type === "success"
            ? "rgba(18, 82, 50, .97)"
            : type === "error"
                ? "rgba(100, 31, 38, .97)"
                : "rgba(15, 25, 37, .98)";

        Object.assign(toast.style, {
            position: "fixed",
            left: "50%",
            bottom: "calc(88px + env(safe-area-inset-bottom))",
            transform: "translate(-50%, 8px)",
            opacity: "0",
            zIndex: "100000",
            width: "max-content",
            maxWidth: "calc(100vw - 32px)",
            boxSizing: "border-box",
            padding: "12px 16px",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,.12)",
            background,
            color: "#fff",
            boxShadow: "0 12px 35px rgba(0,0,0,.38)",
            fontSize: "13px",
            fontWeight: "600",
            lineHeight: "1.4",
            textAlign: "center",
            transition: "opacity .2s ease, transform .2s ease",
            pointerEvents: "none"
        });

        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translate(-50%, 0)";
        });

        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translate(-50%, 8px)";
            window.setTimeout(() => toast.remove(), 220);
        }, 2800);
    }

    function explainApiError(data, fallback = "Server bilan bog'lanib bo'lmadi.") {
        if (typeof data?.detail === "string") return data.detail;
        if (data?.detail && typeof data.detail === "object") {
            if (data.detail.message) return String(data.detail.message);
            try { return JSON.stringify(data.detail); } catch (_) { /* davom etamiz */ }
        }
        if (typeof data?.message === "string" && data.message) return data.message;
        return fallback;
    }

    async function fetchJson(url, options = {}) {
        let response;
        try {
            response = await fetch(url, options);
        } catch (error) {
            throw new Error("Serverga ulanib bo'lmadi. Internet yoki server holatini tekshiring.");
        }

        let data = {};
        try {
            data = await response.json();
        } catch (_) {
            // Server ba'zan JSON bo'lmagan javob qaytarishi mumkin.
        }

        if (!response.ok) {
            const error = new Error(explainApiError(data, `Server xatosi (HTTP ${response.status}).`));
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    async function apiFetch(path, options = {}) {
        return fetchJson(`${SERVER_URL}${path}`, {
            ...options,
            headers: {
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(options.headers || {})
            }
        });
    }

    // =========================================================
    // 5. FOYDALANUVCHI PROFILI
    // =========================================================
    function updateUserProfile() {
        const name = getUserDisplayName();
        const username = getUserUsername();
        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2)
            .map((part) => part.charAt(0)).join("").toUpperCase() || "U";

        if (userName) userName.textContent = name;
        if (profileName) profileName.textContent = name;
        if (profileUsername) profileUsername.textContent = username;

        [userAvatar, profileAvatar].forEach((avatar) => {
            if (!avatar) return;
            if (telegramUser?.photo_url) {
                const img = document.createElement("img");
                img.src = telegramUser.photo_url;
                img.alt = "Profil rasmi";
                img.referrerPolicy = "no-referrer";
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "cover";
                avatar.replaceChildren(img);
            } else {
                avatar.textContent = initials;
            }
        });
    }

    // =========================================================
    // 6. BALANS
    // =========================================================
    function setBalance(amount) {
        const parsed = Number(amount);
        if (!Number.isFinite(parsed) || parsed < 0) return false;

        currentBalance = Math.floor(parsed);
        balanceLoaded = true;
        const formatted = `${formatPrice(currentBalance)} so'm`;
        if (userBalance) userBalance.textContent = formatted;
        if (profileBalance) profileBalance.textContent = formatted;
        return true;
    }

    function setBalanceUnavailable() {
        if (currentBalance !== null) return; // Oxirgi ma'lum balansni xato sababli 0 ga tushirmaymiz.
        if (userBalance) userBalance.textContent = "Aniqlanmadi";
        if (profileBalance) profileBalance.textContent = "Aniqlanmadi";
    }

    async function loadBalance({ quiet = true } = {}) {
        const userId = getUserId();
        if (!userId) {
            balanceLoaded = false;
            if (userBalance) userBalance.textContent = "Telegram ichida oching";
            if (profileBalance) profileBalance.textContent = "Telegram ichida oching";
            if (!quiet) telegramAlert("Balansni tekshirish uchun Mini App'ni Telegram ichida oching.");
            return null;
        }

        try {
            const data = await apiFetch(`/balance?user_id=${encodeURIComponent(userId)}`);
            const balance = Number(data?.balance ?? data?.amount);
            if (data?.ok !== true || !Number.isFinite(balance) || balance < 0) {
                throw new Error("Server balansni to'g'ri qaytarmadi.");
            }
            setBalance(balance);
            return currentBalance;
        } catch (error) {
            balanceLoaded = false;
            console.error("Balans yuklanmadi:", error);
            setBalanceUnavailable();
            if (!quiet) showToast("Balansni tekshirib bo'lmadi. Keyinroq qayta urinib ko'ring.", "error");
            return null;
        }
    }

    // =========================================================
    // 7. SAHIFALAR VA PUSHTI NAVIGATSIYA INDIKATORI
    // =========================================================
    function hideAllPages() {
        [homePage, ordersPage, profilePage, productsSection].forEach((page) => {
            if (page) page.style.display = "none";
        });
    }

    function moveNavIndicator(button) {
        if (!bottomNavigation || !navIndicator || !button) return;
        const navRect = bottomNavigation.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        if (!navRect.width || !buttonRect.width) return;

        const size = Math.min(44, Math.max(36, buttonRect.height - 5));
        const x = buttonRect.left - navRect.left + (buttonRect.width - size) / 2;
        navIndicator.style.width = `${size}px`;
        navIndicator.style.height = `${size}px`;
        navIndicator.style.transform = `translate(${x}px, -50%)`;
        navIndicator.style.opacity = "1";
    }

    function setActiveNav(button) {
        [homeNavButton, ordersNavButton, profileNavButton].forEach((item) => {
            if (!item) return;
            const active = item === button;
            item.classList.toggle("active", active);
            if (active) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");
        });
        requestAnimationFrame(() => moveNavIndicator(button));
    }

    function showHome() {
        hideAllPages();
        if (homePage) homePage.style.display = "block";
        setActiveNav(homeNavButton);
        currentPage = "home";
        haptic("light");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function showOrders(backTo = currentPage) {
        if (currentPage !== "orders") previousPage = backTo === "profile" ? "profile" : "home";
        hideAllPages();
        if (ordersPage) ordersPage.style.display = "block";
        setActiveNav(ordersNavButton);
        currentPage = "orders";
        haptic("light");
        window.scrollTo({ top: 0, behavior: "smooth" });
        await loadOrders();
    }

    async function showProfile() {
        hideAllPages();
        if (profilePage) profilePage.style.display = "block";
        setActiveNav(profileNavButton);
        currentPage = "profile";
        haptic("light");
        window.scrollTo({ top: 0, behavior: "smooth" });
        await loadBalance({ quiet: true });
    }

    function showProductsPage() {
        hideAllPages();
        if (productsSection) productsSection.style.display = "block";
        // Mahsulot sahifasida pastki nav indikatorini so'nggi joyida qoldiramiz.
        [homeNavButton, ordersNavButton, profileNavButton].forEach((item) => {
            if (item) {
                item.classList.remove("active");
                item.removeAttribute("aria-current");
            }
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // =========================================================
    // 8. USERNAME TEKSHIRUVI — API ISHLAMASA TASDIQLANMAYDI
    // =========================================================
    function showUsernameStatus(message, type = "error") {
        const status = $("usernameStatus");
        if (!status) return;

        status.textContent = message;
        status.style.display = "block";
        status.classList.remove("loading", "success", "error");
        status.classList.add(type);
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
    }

    function clearUsernameStatus() {
        const status = $("usernameStatus");
        if (status) {
            status.textContent = "Masalan: @qwerty123";
            status.style.display = "block";
            status.classList.remove("loading", "success", "error");
        }
        verifiedUsername = "";
    }

    async function checkUsername(username, requestId) {
        const clean = normalizeUsername(username);
        const continueButton = $("continueUsernameButton");

        if (!isValidUsername(clean)) {
            if (requestId === usernameRequestId) {
                showUsernameStatus("Username 5–32 ta belgidan iborat bo'lishi kerak.", "error");
                if (continueButton) continueButton.disabled = true;
            }
            return null;
        }

        showUsernameStatus("Telegram foydalanuvchisi tekshirilmoqda...", "loading");
        if (continueButton) continueButton.disabled = true;

        try {
            const data = await apiFetch(`/check-username?username=${encodeURIComponent(clean)}`);
            if (requestId !== usernameRequestId) return null; // Eski so'rov natijasini e'tiborsiz qoldiramiz.

            // Backend kontrakti: faqat ok=true, valid=true va username bo'lsa tasdiqlash.
            if (data?.ok === true && data?.valid === true && typeof data.username === "string" && isValidUsername(data.username)) {
                verifiedUsername = normalizeUsername(data.username);
                currentUsername = verifiedUsername;
                showUsernameStatus(`✓ Telegram foydalanuvchisi topildi: @${verifiedUsername}`, "success");
                if (continueButton) continueButton.disabled = false;
                haptic("success");
                return verifiedUsername;
            }

            verifiedUsername = "";
            showUsernameStatus(data?.message || "Bu username tasdiqlanmadi. Qaytadan tekshiring.", "error");
            return null;
        } catch (error) {
            if (requestId !== usernameRequestId) return null;
            verifiedUsername = "";
            console.warn("Username API xatosi:", error);
            showUsernameStatus("Username'ni server orqali tekshirib bo'lmadi. Internet/serverni tekshirib, qayta urinib ko'ring.", "error");
            return null;
        }
    }

    // =========================================================
    // 9. USERNAME KIRITISH OYNASI (mavjud style.css selektorlariga mos)
    // =========================================================
    function showRecipientForm(productType) {
        currentProductType = productType === "Telegram Stars" ? "Telegram Stars" : "Telegram Premium";
        verifiedUsername = "";
        usernameRequestId += 1;
        clearTimeout(searchTimer);
        showProductsPage();
        if (!products) return;

        const isStars = currentProductType === "Telegram Stars";
        const icon = isStars ? "⭐" : "💎";
        const serviceName = isStars ? "TELEGRAM STARS" : "TELEGRAM PREMIUM";
        const description = isStars
            ? "Stars yubormoqchi bo'lgan foydalanuvchining username'ini kiriting."
            : "Premium sovg'a qilmoqchi bo'lgan foydalanuvchining username'ini kiriting.";

        products.innerHTML = `
            <section class="gift-form recipient-form">
                <button type="button" class="back-button" id="recipientBackBtn">‹ Orqaga</button>

                <div class="product-intro ${isStars ? "stars-intro" : "premium-intro"}">
                    <div class="product-intro-glow"></div>
                    <div class="intro-icon">${icon}</div>
                    <div class="intro-text">
                        <span>${serviceName}</span>
                        <strong>Kimga yuboramiz?</strong>
                        <p>${description}</p>
                    </div>
                </div>

                <h2 class="section-title">Telegram username</h2>
                <p class="section-subtitle">Username'ni kiriting. Masalan: <strong>@qwerty123</strong></p>

                <div class="username-input-wrapper">
                    <input
                        id="usernameInput"
                        class="username-input"
                        type="text"
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="none"
                        spellcheck="false"
                        maxlength="33"
                        placeholder="@username"
                        aria-label="Telegram username"
                    />
                </div>

                <div id="usernameStatus" class="username-status" role="status" aria-live="polite">Masalan: @qwerty123</div>

                <button type="button" id="continueUsernameButton" class="continue-button" disabled>Davom etish →</button>
                <p class="form-description">Username faqat qabul qiluvchini aniqlash va buyurtmani tayyorlash uchun ishlatiladi.</p>
            </section>
        `;

        const input = $("usernameInput");
        const continueButton = $("continueUsernameButton");
        const backButton = $("recipientBackBtn");

        input?.addEventListener("input", () => {
            const cleaned = normalizeUsername(input.value);
            if (input.value !== cleaned) input.value = cleaned;

            verifiedUsername = "";
            if (continueButton) continueButton.disabled = true;
            clearTimeout(searchTimer);
            const requestId = ++usernameRequestId;

            if (!cleaned) {
                clearUsernameStatus();
                return;
            }

            if (!isValidUsername(cleaned)) {
                showUsernameStatus("Username 5–32 ta belgi bo'lishi kerak; faqat harf, raqam va _ ishlatiladi.", "error");
                return;
            }

            showUsernameStatus("Username tekshirishga tayyorlanmoqda...", "loading");
            searchTimer = window.setTimeout(() => {
                checkUsername(cleaned, requestId);
            }, 450);
        });

        input?.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && continueButton && !continueButton.disabled) {
                event.preventDefault();
                continueButton.click();
            }
        });

        continueButton?.addEventListener("click", () => {
            if (!verifiedUsername || !isValidUsername(verifiedUsername)) {
                showUsernameStatus("Davom etishdan oldin username'ni tekshiring.", "error");
                return;
            }
            currentUsername = verifiedUsername;
            haptic("medium");
            if (currentProductType === "Telegram Stars") showStarsPlans();
            else showPremiumPlans();
        });

        backButton?.addEventListener("click", showHome);
        window.setTimeout(() => input?.focus({ preventScroll: true }), 80);
    }

    // =========================================================
    // 10. TELEGRAM PREMIUM TARIFLARI
    // =========================================================
    function showPremiumPlans() {
        currentProductType = "Telegram Premium";
        const username = verifiedUsername || currentUsername;
        if (!username) return showRecipientForm("Telegram Premium");
        showProductsPage();
        if (!products) return;

        products.innerHTML = `
            <div class="product-page-modern">
                <div class="product-topbar">
                    <button type="button" class="product-back-btn" id="productBackBtn" aria-label="Orqaga">←</button>
                    <div class="product-top-title">
                        <span class="product-type-icon">💎</span>
                        <div><span>TELEGRAM</span><strong>Premium</strong></div>
                    </div>
                </div>

                <div class="recipient-mini-card">
                    <div class="recipient-mini-icon">👤</div>
                    <div class="recipient-mini-info"><span>Qabul qiluvchi</span><strong>@${escapeHtml(username)}</strong></div>
                    <button type="button" id="changeUsernameBtn">O'zgartirish</button>
                </div>

                <div class="product-intro premium-intro">
                    <div class="product-intro-glow"></div>
                    <div class="intro-icon">💎</div>
                    <div class="intro-text">
                        <span>TELEGRAM PREMIUM</span>
                        <h1>Premium muddatini tanlang</h1>
                        <p>O'zingizga mos tarifni tanlang va Premium sovg'asini yuboring.</p>
                    </div>
                </div>

                <div class="plans-title"><div><span>PREMIUM TARIFLARI</span><h2>Muddatni tanlang</h2></div></div>

                <div class="premium-plans-modern">
                    ${PREMIUM_PLANS.map((plan) => {
                        const isPopular = plan.months === 6;
                        const isBest = plan.months === 12;
                        return `
                            <button type="button" class="premium-plan-card ${isPopular ? "popular-plan" : ""} ${isBest ? "best-plan" : ""}" data-months="${plan.months}" data-price="${plan.price}">
                                ${isPopular ? '<div class="popular-label">🔥 ENG OMMABOP</div>' : ""}
                                ${isBest ? '<div class="best-label">👑 ENG YAXSHI TANLOV</div>' : ""}
                                <div class="plan-card-top"><div class="plan-big-icon">${isBest ? "👑" : "💎"}</div><div class="plan-badge">${plan.months} OY</div></div>
                                <div class="plan-main"><strong>Premium ${plan.months} oy</strong><span>${plan.months === 3 ? "Qulay boshlang'ich tarif" : plan.months === 6 ? "Ko'proq muddat, qulay narx" : "Bir yil davomida Premium"}</span></div>
                                <div class="plan-card-bottom"><div><small>Narxi</small><strong>${formatPrice(plan.price)} so'm</strong></div><div class="plan-arrow">→</div></div>
                            </button>`;
                    }).join("")}
                </div>

                <div class="contact-premium-box">
                    <div class="contact-premium-icon">💬</div>
                    <div class="contact-premium-content"><strong>Boshqa tarif kerakmi?</strong><span>1 oylik va boshqa Premium tariflarini admin bilan kelishishingiz mumkin.</span></div>
                    <button type="button" id="contactPremiumBtn">Bog'lanish</button>
                </div>
            </div>
        `;

        $("productBackBtn")?.addEventListener("click", () => showRecipientForm("Telegram Premium"));
        $("changeUsernameBtn")?.addEventListener("click", () => showRecipientForm("Telegram Premium"));
        $("contactPremiumBtn")?.addEventListener("click", openSupport);

        products.querySelectorAll(".premium-plan-card").forEach((card) => {
            card.addEventListener("click", () => {
                createOrder({
                    product: "Telegram Premium",
                    amount: Number(card.dataset.price),
                    months: Number(card.dataset.months),
                    stars: null,
                    recipient_username: username,
                    button: card,
                    detail: `${Number(card.dataset.months)} oy`
                });
            });
        });
    }

    // =========================================================
    // 11. TELEGRAM STARS PAKETLARI
    // =========================================================
    function showStarsPlans() {
        currentProductType = "Telegram Stars";
        const username = verifiedUsername || currentUsername;
        if (!username) return showRecipientForm("Telegram Stars");
        showProductsPage();
        if (!products) return;

        products.innerHTML = `
            <div class="product-page-modern">
                <div class="product-topbar">
                    <button type="button" class="product-back-btn" id="productBackBtn" aria-label="Orqaga">←</button>
                    <div class="product-top-title stars-title">
                        <span class="product-type-icon">⭐</span>
                        <div><span>TELEGRAM</span><strong>Stars</strong></div>
                    </div>
                </div>

                <div class="recipient-mini-card stars-recipient">
                    <div class="recipient-mini-icon">👤</div>
                    <div class="recipient-mini-info"><span>Qabul qiluvchi</span><strong>@${escapeHtml(username)}</strong></div>
                    <button type="button" id="changeUsernameBtn">O'zgartirish</button>
                </div>

                <div class="product-intro stars-intro">
                    <div class="product-intro-glow"></div>
                    <div class="intro-icon">⭐</div>
                    <div class="intro-text">
                        <span>TELEGRAM STARS</span>
                        <h1>Stars miqdorini tanlang</h1>
                        <p>Kerakli Stars paketini tanlang va buyurtmani davom ettiring.</p>
                    </div>
                </div>

                <div class="plans-title"><div><span>STARS PAKETLARI</span><h2>Miqdorni tanlang</h2></div></div>

                <div class="stars-plans-modern">
                    ${STARS_PLANS.map((plan) => {
                        const isPopular = plan.stars === 350 || plan.stars === 1000;
                        const isMega = plan.stars === 5000;
                        let badge = "";
                        if (plan.stars === 350) badge = "🔥 OMMABOP";
                        if (plan.stars === 1000) badge = "👑 KO'P TANLANADI";
                        return `
                            <button type="button" class="stars-plan-card ${isPopular ? "popular-stars" : ""} ${isMega ? "mega-stars" : ""}" data-stars="${plan.stars}" data-price="${plan.price}">
                                ${badge ? `<div class="stars-popular">${badge}</div>` : ""}
                                <div class="stars-amount"><span>⭐</span><strong>${formatPrice(plan.stars)}</strong></div>
                                <div class="stars-price"><small>Narxi</small><strong>${formatPrice(plan.price)} so'm</strong></div>
                                <div class="stars-arrow">→</div>
                            </button>`;
                    }).join("")}
                </div>
            </div>
        `;

        $("productBackBtn")?.addEventListener("click", () => showRecipientForm("Telegram Stars"));
        $("changeUsernameBtn")?.addEventListener("click", () => showRecipientForm("Telegram Stars"));

        products.querySelectorAll(".stars-plan-card").forEach((card) => {
            card.addEventListener("click", () => {
                createOrder({
                    product: "Telegram Stars",
                    amount: Number(card.dataset.price),
                    months: null,
                    stars: Number(card.dataset.stars),
                    recipient_username: username,
                    button: card,
                    detail: `${Number(card.dataset.stars).toLocaleString("uz-UZ")} Stars`
                });
            });
        });
    }

    // =========================================================
    // 12. BUYURTMA YARATISH
    // =========================================================
    async function createOrder({ product, amount, recipient_username, months = null, stars = null, button = null, detail = "" }) {
        if (orderInProgress) {
            showToast("Buyurtmangiz tekshirilmoqda. Iltimos, kuting.", "info");
            return;
        }

        const userId = getUserId();
        if (!userId) {
            telegramAlert("Telegram foydalanuvchisi aniqlanmadi. Mini App'ni Telegram ichida oching.");
            return;
        }

        const username = normalizeUsername(recipient_username);
        if (!isValidUsername(username) || username !== normalizeUsername(verifiedUsername)) {
            telegramAlert("Username tasdig'i eskirgan yoki mavjud emas. Username'ni qayta tekshiring.");
            showRecipientForm(product);
            return;
        }

        const safeAmount = Number(amount);
        if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
            telegramAlert("Mahsulot narxi noto'g'ri. Buyurtma yuborilmadi.");
            return;
        }

        // Balansni serverdan qayta tekshiramiz. Server xatosida 0 deb faraz qilmaymiz.
        const balance = await loadBalance({ quiet: true });
        if (balance === null) {
            telegramAlert("Balansni tekshirib bo'lmadi. Iltimos, internet/serverni tekshirib, qayta urinib ko'ring.");
            return;
        }

        if (balance < safeAmount) {
            haptic("warning");
            openAddBalance(safeAmount);
            return;
        }

        const orderDetail = detail || (months ? `${months} oy` : `${stars} Stars`);
        const confirmation = window.confirm(
            `🎁 Buyurtmani tasdiqlaysizmi?\n\n` +
            `👤 @${username}\n` +
            `📦 ${product}\n` +
            `🔹 ${orderDetail}\n` +
            `💰 ${formatPrice(safeAmount)} so'm\n\n` +
            `Balansingiz: ${formatPrice(balance)} so'm`
        );
        if (!confirmation) return;

        orderInProgress = true;
        const originalHtml = button?.innerHTML;
        const planButtons = Array.from(document.querySelectorAll(".premium-plan-card, .stars-plan-card"));
        planButtons.forEach((planButton) => { planButton.disabled = true; });
        if (button) {
            button.classList.add("is-loading");
            button.setAttribute("aria-busy", "true");
            button.textContent = "⏳ Tekshirilmoqda...";
        }

        let requestWasSent = false;
        try {
            showToast("Buyurtma yuborilmoqda...", "info");
            requestWasSent = true;
            const response = await fetch(`${SERVER_URL}/create-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    product,
                    amount: safeAmount,
                    recipient_username: username,
                    months,
                    stars
                })
            });

            let data = {};
            try {
                data = await response.json();
            } catch (_) {
                // Pastdagi ehtiyotkor xabar serverdan JSON kelmagan holatni qamrab oladi.
            }

            const status = String(data?.status || "").toLowerCase();
            const hasOrderId = data?.order_id !== undefined && data?.order_id !== null && data?.order_id !== "";
            const isReconciliation = status === "reconciliation_required" || status === "reconciliation-required" || data?.needs_review === true;

            // Muhim: ayrim supplier javoblarida ok=false bo'lsa ham order_id qaytadi va pul yechilgan bo'lishi mumkin.
            if (isReconciliation || (hasOrderId && data?.ok === false && !["failed", "cancelled"].includes(status))) {
                await loadBalance({ quiet: true });
                showToast(`Buyurtma #${data.order_id} tekshiruvda`, "info");
                telegramAlert(
                    `⚠️ Buyurtma #${data.order_id} tekshiruvda.\n\n` +
                    `${explainApiError(data, "Supplier natijasi hali tasdiqlanmadi.")}\n\n` +
                    `Hozircha qayta buyurtma bermang. Buyurtmalar bo'limida holatini tekshiring.`
                );
                await showOrders(currentPage);
                return;
            }

            if (["failed", "cancelled", "supplier_failed"].includes(status)) {
                await loadBalance({ quiet: true });
                showToast("Buyurtma bajarilmadi", "error");
                telegramAlert(`Buyurtma #${data.order_id || "—"} bajarilmadi.\n\n${explainApiError(data, "Buyurtmalar bo'limida holatini tekshiring.")}`);
                await showOrders(currentPage);
                return;
            }

            if (!response.ok || data?.ok !== true) {
                await loadBalance({ quiet: true });
                haptic("error");
                telegramAlert(
                    `Server buyurtma muvaffaqiyatli yaratilganini tasdiqlamadi.\n\n` +
                    `${explainApiError(data, `Server xatosi (HTTP ${response.status}).`)}\n\n` +
                    `Takror buyurtma berishdan oldin "Buyurtmalar" bo'limini tekshiring.`
                );
                await showOrders(currentPage);
                return;
            }

            await loadBalance({ quiet: true });
            haptic("success");
            showToast(hasOrderId ? `Buyurtma #${data.order_id} qabul qilindi` : "Buyurtma qabul qilindi", "success");
            window.setTimeout(() => {
                showOrders(currentPage);
            }, 700);
        } catch (error) {
            console.error("Buyurtma yaratish xatosi:", error);
            haptic("error");
            await loadBalance({ quiet: true });

            // Tarmoq uzilganda buyurtma serverda yaratilgan-yaratilmagani noma'lum bo'lishi mumkin.
            if (requestWasSent) {
                telegramAlert(
                    `Serverdan yakuniy javob kelmadi.\n\n${error.message || "Noma'lum xatolik"}\n\n` +
                    `Buyurtma yaratilgan bo'lishi ham mumkin. Takror bosishdan oldin "Buyurtmalar" bo'limini tekshiring.`
                );
                await showOrders(currentPage);
            } else {
                telegramAlert(error.message || "Buyurtma yaratishda xatolik yuz berdi.");
            }
        } finally {
            orderInProgress = false;
            planButtons.forEach((planButton) => { planButton.disabled = false; });
            if (button && document.body.contains(button)) {
                button.classList.remove("is-loading");
                button.removeAttribute("aria-busy");
                if (originalHtml !== undefined) button.innerHTML = originalHtml;
            }
        }
    }

    // =========================================================
    // 13. BUYURTMALAR TARIXI
    // =========================================================
    async function loadOrders() {
        if (!ordersContent) return;
        const userId = getUserId();

        if (!userId) {
            ordersContent.innerHTML = `
                <article class="order-card">
                    <div class="order-title">Telegram foydalanuvchisi aniqlanmadi</div>
                    <div class="order-meta">Buyurtmalarni ko'rish uchun Mini App'ni Telegram ichida oching.</div>
                </article>`;
            return;
        }

        ordersContent.innerHTML = '<div class="orders-loading">⏳ Buyurtmalar yuklanmoqda...</div>';

        try {
            const data = await apiFetch(`/my-orders?user_id=${encodeURIComponent(userId)}`);
            const orders = Array.isArray(data)
                ? data
                : (Array.isArray(data?.orders) ? data.orders : []);

            if (data?.ok === false) throw new Error(explainApiError(data, "Buyurtmalarni olib bo'lmadi."));

            if (!orders.length) {
                ordersContent.innerHTML = `
                    <article class="order-card">
                        <div class="order-title">📦 Hali buyurtmalar yo'q</div>
                        <div class="order-meta">Birinchi buyurtmangizni asosiy sahifadagi xizmatlardan tanlashingiz mumkin.</div>
                        <button type="button" class="primary-button" id="emptyOrderButton" style="margin-top:14px">Xizmatlarni ko'rish</button>
                    </article>`;
                $("emptyOrderButton")?.addEventListener("click", showHome);
                return;
            }

            ordersContent.innerHTML = orders.map(renderOrderCard).join("");
        } catch (error) {
            console.error("Buyurtmalarni yuklash xatosi:", error);
            ordersContent.innerHTML = `
                <article class="order-card">
                    <div class="order-title">⚠️ Buyurtmalarni yuklab bo'lmadi</div>
                    <div class="order-meta">${escapeHtml(error.message || "Server bilan bog'lanib bo'lmadi.")}</div>
                    <button type="button" class="primary-button" id="retryOrdersButton" style="margin-top:14px">Qayta urinish</button>
                </article>`;
            $("retryOrdersButton")?.addEventListener("click", loadOrders);
        }
    }

    function renderOrderCard(order) {
        const productRaw = String(order?.product || "Xizmat");
        const productLower = productRaw.toLowerCase();
        const isStars = productLower.includes("star") || Number(order?.stars) > 0;
        const product = productLower === "premium" ? "Telegram Premium"
            : productLower === "stars" ? "Telegram Stars" : productRaw;
        const icon = isStars ? "⭐" : productLower.includes("premium") ? "💎" : "📦";
        const recipientRaw = normalizeUsername(order?.telegram_username || order?.recipient_username || "");
        const recipient = recipientRaw ? `@${recipientRaw}` : "—";
        const orderId = order?.id ?? order?.order_id ?? "—";
        const amount = Number(order?.amount || 0);
        const status = String(order?.status || "pending").toLowerCase();
        const statusMap = {
            pending: { label: "Kutilmoqda", css: "" },
            created: { label: "Yaratildi", css: "" },
            paid: { label: "To'langan", css: "status-success" },
            processing: { label: "Jarayonda", css: "" },
            completed: { label: "Bajarildi", css: "status-success" },
            success: { label: "Bajarildi", css: "status-success" },
            failed: { label: "Xatolik", css: "status-error" },
            supplier_failed: { label: "Supplier xatosi", css: "status-error" },
            cancelled: { label: "Bekor qilingan", css: "status-error" },
            reconciliation_required: { label: "Tekshiruvda", css: "" }
        };
        const statusInfo = statusMap[status] || { label: status.replace(/_/g, " "), css: "" };
        const detail = isStars
            ? `${Number(order?.stars || 0).toLocaleString("uz-UZ")} Stars`
            : order?.months ? `${Number(order.months)} oy` : "Telegram Premium";
        const date = formatOrderDate(order?.created_at || order?.createdAt);

        return `
            <article class="order-card">
                <div class="order-title">${icon} ${escapeHtml(product)} <span style="opacity:.6">#${escapeHtml(orderId)}</span></div>
                <div class="order-meta">Holati: <strong>${escapeHtml(statusInfo.label)}</strong></div>
                <div class="order-meta">Qabul qiluvchi: <strong>${escapeHtml(recipient)}</strong></div>
                <div class="order-meta">Paket: <strong>${escapeHtml(detail)}</strong></div>
                <div class="order-meta">Summa: <strong>${escapeHtml(formatPrice(amount))} so'm</strong></div>
                ${date ? `<div class="order-meta">Sana: ${escapeHtml(date)}</div>` : ""}
                ${statusInfo.css ? `<div class="status-message ${statusInfo.css}" style="margin-top:10px">${escapeHtml(statusInfo.label)}</div>` : ""}
            </article>`;
    }

    function formatOrderDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString("uz-UZ", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    // =========================================================
    // 14. BALANSNI TO'LDIRISH OYNASI
    // =========================================================
    function openAddBalance(requiredAmount = 0) {
        if (walletModalOpen) return;
        walletModalOpen = true;

        const oldModal = $("walletModalOverlay");
        if (oldModal) oldModal.remove();

        const overlay = document.createElement("div");
        overlay.className = "wallet-modal-overlay";
        overlay.id = "walletModalOverlay";
        overlay.innerHTML = `
            <section class="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="walletModalTitle">
                <div class="wallet-modal-header">
                    <div class="wallet-modal-title">
                        <strong id="walletModalTitle">Balansni to'ldirish</strong>
                        <span>WALLET</span>
                    </div>
                    <button type="button" class="wallet-modal-close" id="walletModalClose" aria-label="Yopish">×</button>
                </div>

                <div class="wallet-current-balance">
                    <span>Joriy balans</span>
                    <strong>${currentBalance === null ? "Aniqlanmadi" : `${formatPrice(currentBalance)} so'm`}</strong>
                </div>

                ${requiredAmount > 0 ? `
                    <div class="wallet-required">
                        Xarid uchun <strong>${formatPrice(requiredAmount)} so'm</strong> kerak.
                    </div>` : ""}

                <div class="wallet-methods">
                    <button type="button" class="wallet-method" data-method="Click">
                        <span class="wallet-method-icon">💳</span>
                        <span class="wallet-method-content"><strong>Click</strong><span>Tez orada</span></span>
                        <span class="wallet-method-arrow">›</span>
                    </button>
                    <button type="button" class="wallet-method" data-method="Payme">
                        <span class="wallet-method-icon">💳</span>
                        <span class="wallet-method-content"><strong>Payme</strong><span>Tez orada</span></span>
                        <span class="wallet-method-arrow">›</span>
                    </button>
                    <button type="button" class="wallet-method" data-method="Uzcard / Humo">
                        <span class="wallet-method-icon">💳</span>
                        <span class="wallet-method-content"><strong>Uzcard / Humo</strong><span>Tez orada</span></span>
                        <span class="wallet-method-arrow">›</span>
                    </button>
                </div>

                <p class="wallet-modal-note">To'lov tizimlari hali ulanmagan. Ushbu oynada hozircha haqiqiy to'lov amalga oshirilmaydi.</p>
            </section>`;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add("show"));

        const close = () => closeWalletModal();
        $("walletModalClose")?.addEventListener("click", close);
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) close();
        });
        overlay.querySelectorAll("[data-method]").forEach((button) => {
            button.addEventListener("click", () => {
                haptic("light");
                showToast(`${button.dataset.method}: to'lov tizimi hali ulanmagan.`, "info");
            });
        });
        haptic("light");
    }

    function closeWalletModal() {
        const modal = $("walletModalOverlay");
        if (!modal) {
            walletModalOpen = false;
            return;
        }
        modal.classList.remove("show");
        window.setTimeout(() => {
            modal.remove();
            walletModalOpen = false;
        }, 250);
    }

    // =========================================================
    // 15. REFERAL VA QO'LLAB-QUVVATLASH
    // =========================================================
    function openReferral() {
        const userId = getUserId();
        if (!userId) {
            telegramAlert("Referal havola uchun Mini App'ni Telegram ichida oching.");
            return;
        }

        const referralLink = `https://t.me/Tprembot?start=ref_${userId}`;
        if (typeof tg?.showPopup === "function") {
            tg.showPopup({
                title: "🎁 Referal dasturi",
                message: `Do'stlaringizni Premium Shop'ga taklif qiling:\n\n${referralLink}`,
                buttons: [
                    { id: "share", type: "default", text: "Ulashish" },
                    { id: "copy", type: "default", text: "Havolani ko'rish" },
                    { type: "cancel" }
                ]
            }, (buttonId) => {
                if (buttonId === "share") shareReferralLink(referralLink);
                else if (buttonId === "copy") copyText(referralLink);
            });
        } else {
            shareReferralLink(referralLink);
        }
    }

    function shareReferralLink(link) {
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("🎁 Premium Shop orqali xizmatlardan foydalaning!")}`;
        if (typeof tg?.openTelegramLink === "function") {
            tg.openTelegramLink(shareUrl);
        } else if (typeof navigator.share === "function") {
            navigator.share({ title: "Premium Shop", text: "Premium Shop referal havolasi", url: link })
                .catch(() => copyText(link));
        } else {
            copyText(link);
        }
    }

    async function copyText(value) {
        try {
            if (!navigator.clipboard?.writeText) throw new Error("Clipboard qo'llab-quvvatlanmaydi");
            await navigator.clipboard.writeText(value);
            showToast("Referal havola nusxalandi", "success");
        } catch (_) {
            telegramAlert(`Referal havola:\n${value}`);
        }
    }

    function openSupport() {
        const url = "https://t.me/AmirquIov";
        if (typeof tg?.openTelegramLink === "function") tg.openTelegramLink(url);
        else window.open(url, "_blank", "noopener,noreferrer");
    }

    function openNotifications() {
        haptic("light");
        telegramAlert("Hozircha yangi bildirishnomalar yo'q.");
    }

    // =========================================================
    // 16. GAMING XIZMATLARI — HOZIRCHA TEZ ORADA
    // =========================================================
    function setupGamingCards() {
        document.querySelectorAll(".gaming-card.coming-soon, [data-coming-soon='true']").forEach((card) => {
            if (card.dataset.shopHandlerBound === "true") return;
            card.dataset.shopHandlerBound = "true";
            card.addEventListener("click", (event) => {
                event.preventDefault();
                haptic("light");
                const service = card.dataset.service || card.querySelector("strong")?.textContent?.trim() || "Bu xizmat";
                showToast(`${service} — tez orada qo'shiladi.`, "info");
            });
        });
    }

    // =========================================================
    // 17. TUGMALAR VA NAVIGATSIYA
    // =========================================================
    homeNavButton?.addEventListener("click", showHome);
    ordersNavButton?.addEventListener("click", () => showOrders(currentPage));
    profileNavButton?.addEventListener("click", showProfile);

    premiumButton?.addEventListener("click", () => {
        haptic("light");
        showRecipientForm("Telegram Premium");
    });

    starsButton?.addEventListener("click", () => {
        haptic("light");
        showRecipientForm("Telegram Stars");
    });

    profileOrdersButton?.addEventListener("click", () => showOrders("profile"));
    ordersBackButton?.addEventListener("click", () => {
        if (previousPage === "profile") showProfile();
        else showHome();
    });

    referralButton?.addEventListener("click", openReferral);
    supportButton?.addEventListener("click", openSupport);
    addBalanceButton?.addEventListener("click", () => openAddBalance());
    profileAddBalanceButton?.addEventListener("click", () => openAddBalance());

    // Headerdagi notification tugmasi CSS orqali yashiriladi; mavjud handler saqlanadi.
    notificationButton?.addEventListener("click", openNotifications);

    window.addEventListener("resize", () => {
        const activeButton = bottomNavigation?.querySelector(".nav-item.active");
        if (activeButton) moveNavIndicator(activeButton);
    });

    window.addEventListener("pageshow", () => {
        const activeButton = bottomNavigation?.querySelector(".nav-item.active");
        if (activeButton) moveNavIndicator(activeButton);
    });

    // =========================================================
    // 18. BOSHLANG'ICH HOLAT
    // =========================================================
    updateUserProfile();
    if (userBalance) userBalance.textContent = getUserId() ? "Yuklanmoqda..." : "Telegram ichida oching";
    if (profileBalance) profileBalance.textContent = getUserId() ? "Yuklanmoqda..." : "Telegram ichida oching";
    loadBalance({ quiet: true });
    setupGamingCards();
    showHome();
});
