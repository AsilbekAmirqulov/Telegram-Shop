document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // SOZLAMALAR
    // =========================================================

    const SERVER_URL = "https://telegram-shop-co3o.onrender.com";

    const tg = window.Telegram?.WebApp;

    if (tg) {
        tg.ready();
        tg.expand();

        try {
            tg.setHeaderColor("#0b1118");
            tg.setBackgroundColor("#0b1118");
        } catch (e) {
            console.log("Telegram theme:", e);
        }
    }


    // =========================================================
    // DOM
    // =========================================================

    const homePage = document.getElementById("homePage");
    const ordersPage = document.getElementById("ordersPage");
    const profilePage = document.getElementById("profilePage");

    const productsSection = document.getElementById("productsSection");
    const products = document.getElementById("products");

    const homeNavButton = document.getElementById("homeNavButton");
    const ordersNavButton = document.getElementById("ordersNavButton");
    const profileNavButton = document.getElementById("profileNavButton");

    const premiumButton = document.getElementById("premiumButton");
    const starsButton = document.getElementById("starsButton");

    const profileOrdersButton =
        document.getElementById("profileOrdersButton");

    const referralButton =
        document.getElementById("referralButton");

    const supportButton =
        document.getElementById("supportButton");

    const addBalanceButton =
        document.getElementById("addBalanceButton");

    const profileAddBalanceButton =
        document.getElementById("profileAddBalanceButton");

    const notificationButton =
        document.getElementById("notificationButton");

    const ordersBackButton =
        document.getElementById("ordersBackButton");

    const userAvatar =
        document.getElementById("userAvatar");

    const userName =
        document.getElementById("userName");

    const profileAvatar =
        document.getElementById("profileAvatar");

    const profileName =
        document.getElementById("profileName");

    const profileUsername =
        document.getElementById("profileUsername");

    const userBalance =
        document.getElementById("userBalance");

    const profileBalance =
        document.getElementById("profileBalance");

    const ordersContent =
        document.getElementById("ordersContent");


    // =========================================================
    // TELEGRAM USER
    // =========================================================

    const telegramUser =
        tg?.initDataUnsafe?.user || null;


    // =========================================================
    // STATE
    // =========================================================

    let currentProductType = null;

    let currentUsername = "";

    let verifiedUsername = "";

    let searchTimer = null;


    // =========================================================
    // NARXLAR
    // =========================================================

    const PREMIUM_PLANS = [
        {
            months: 3,
            price: 165000
        },
        {
            months: 6,
            price: 220000
        },
        {
            months: 12,
            price: 390000
        }
    ];


    const PREMIUM_CONTACT_PLANS = [
        {
            months: 1,
            price: 40000
        },
        {
            months: 12,
            price: 280000
        }
    ];


    const STARS_PLANS = [
        {
            stars: 50,
            price: 11000
        },
        {
            stars: 100,
            price: 30000
        },
        {
            stars: 150,
            price: 40000
        },
        {
            stars: 250,
            price: 64000
        },
        {
            stars: 350,
            price: 89000
        },
        {
            stars: 500,
            price: 125000
        },
        {
            stars: 750,
            price: 185000
        },
        {
            stars: 1000,
            price: 244000
        },
        {
            stars: 1500,
            price: 365000
        },
        {
            stars: 2500,
            price: 605000
        },
        {
            stars: 5000,
            price: 1205000
        }
    ];


    // =========================================================
    // YORDAMCHI FUNKSIYALAR
    // =========================================================

    function getUserId() {

        return telegramUser?.id || 0;

    }


    function getUserDisplayName() {

        if (!telegramUser) {
            return "Telegram foydalanuvchisi";
        }

        const first =
            telegramUser.first_name || "";

        const last =
            telegramUser.last_name || "";

        const full =
            `${first} ${last}`.trim();

        return full ||
            telegramUser.username ||
            "Telegram foydalanuvchisi";

    }


    function getUserUsername() {

        if (
            telegramUser &&
            telegramUser.username
        ) {
            return `@${telegramUser.username}`;
        }

        return "@username";

    }


    function formatPrice(value) {

        return Number(value || 0)
            .toLocaleString("uz-UZ")
            .replace(/,/g, " ");

    }


    function escapeHtml(value) {

        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function normalizeUsername(username) {

        return String(username || "")
            .trim()
            .replace(/^@/, "");

    }


    function haptic(type = "light") {

        try {

            if (
                tg &&
                tg.HapticFeedback
            ) {

                if (
                    type === "success" ||
                    type === "error" ||
                    type === "warning"
                ) {

                    tg.HapticFeedback.notificationOccurred(type);

                } else {

                    tg.HapticFeedback.impactOccurred(type);

                }

            }

        } catch (e) {}

    }


    function telegramAlert(message) {

        if (
            tg &&
            typeof tg.showAlert === "function"
        ) {

            tg.showAlert(message);

        } else {

            alert(message);

        }

    }


    function showToast(message, type = "info") {

        const oldToast =
            document.querySelector(".shop-toast");

        if (oldToast) {
            oldToast.remove();
        }

        const toast =
            document.createElement("div");

        toast.className =
            `shop-toast ${type}`;

        toast.textContent =
            message;

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        setTimeout(() => {

            toast.classList.remove("show");

            setTimeout(() => {
                toast.remove();
            }, 250);

        }, 2600);

    }


    // =========================================================
    // USER PROFILI
    // =========================================================

    function updateUserProfile() {

        const name =
            getUserDisplayName();

        const username =
            getUserUsername();

        if (userName) {
            userName.textContent = name;
        }

        if (profileName) {
            profileName.textContent = name;
        }

        if (profileUsername) {
            profileUsername.textContent = username;
        }

        const initials =
            telegramUser?.first_name
                ?.charAt(0)
                ?.toUpperCase();

        if (initials) {

            if (userAvatar) {
                userAvatar.textContent = initials;
            }

            if (profileAvatar) {
                profileAvatar.textContent = initials;
            }

        }

    }


    // =========================================================
    // BALANS
    // =========================================================

    function setBalance(amount) {

        const formatted =
            `${formatPrice(amount)} so'm`;

        if (userBalance) {
            userBalance.textContent =
                formatted;
        }

        if (profileBalance) {
            profileBalance.textContent =
                formatted;
        }

    }


    async function loadBalance() {

        const userId =
            getUserId();

        if (!userId) {
            setBalance(0);
            return;
        }

        try {

            const response =
                await fetch(
                    `${SERVER_URL}/balance?user_id=${encodeURIComponent(userId)}`
                );

            if (!response.ok) {
                throw new Error("Balance API error");
            }

            const data =
                await response.json();

            const balance =
                Number(
                    data.balance ??
                    data.amount ??
                    0
                );

            setBalance(balance);

        } catch (error) {

            console.log(
                "Balance yuklanmadi:",
                error
            );

            setBalance(0);

        }

    }


    // =========================================================
    // NAVIGATSIYA
    // =========================================================

    function hideAllPages() {

        if (homePage) {
            homePage.style.display = "none";
        }

        if (ordersPage) {
            ordersPage.style.display = "none";
        }

        if (profilePage) {
            profilePage.style.display = "none";
        }

        if (productsSection) {
            productsSection.style.display = "none";
        }

    }


    function setActiveNav(button) {

        document
            .querySelectorAll(".nav-item")
            .forEach(item => {

                item.classList.remove("active");

            });

        if (button) {
            button.classList.add("active");
        }

    }


    function showHome() {

        hideAllPages();

        if (homePage) {
            homePage.style.display = "block";
        }

        setActiveNav(homeNavButton);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    function showOrders() {

        hideAllPages();

        if (ordersPage) {
            ordersPage.style.display = "block";
        }

        setActiveNav(ordersNavButton);

        loadOrders();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    function showProfile() {

        hideAllPages();

        if (profilePage) {
            profilePage.style.display = "block";
        }

        setActiveNav(profileNavButton);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    function showProductsPage() {

        hideAllPages();

        if (productsSection) {
            productsSection.style.display = "block";
        }

        document
            .querySelectorAll(".nav-item")
            .forEach(item => {
                item.classList.remove("active");
            });

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    // =========================================================
    // USERNAME VALIDATSIYA
    // =========================================================

    function isValidUsername(username) {

        const clean =
            normalizeUsername(username);

        return /^[A-Za-z0-9_]{5,32}$/
            .test(clean);

    }


    async function checkUsername(username) {

        const clean =
            normalizeUsername(username);

        if (!isValidUsername(clean)) {

            return {
                ok: false,
                message:
                    "Username 5–32 ta belgidan iborat bo‘lishi kerak."
            };

        }

        try {

            const response =
                await fetch(
                    `${SERVER_URL}/check-username?username=${encodeURIComponent(clean)}`
                );

            if (!response.ok) {
                throw new Error("API error");
            }

            const data =
                await response.json();

            if (
                data.ok === true ||
                data.exists === true ||
                data.valid === true
            ) {

                return {
                    ok: true,
                    username:
                        data.username ||
                        clean
                };

            }

            return {
                ok: false,
                message:
                    data.message ||
                    "Username topilmadi."
            };

        } catch (error) {

            console.log(
                "Username API xatosi:",
                error
            );

            /*
             * Backend vaqtincha javob bermasa,
             * format to‘g‘ri bo‘lsa davom etamiz.
             */

            return {
                ok: true,
                username: clean
            };

        }

    }


    // =========================================================
    // USERNAME OYNASI
    // =========================================================

    function showRecipientForm(productType) {

        currentProductType =
            productType;

        showProductsPage();

        products.innerHTML = `

            <div class="recipient-page">

                <div class="recipient-topbar">

                    <button
                        type="button"
                        class="recipient-back-btn"
                        id="recipientBackBtn"
                    >
                        ←
                    </button>

                    <span>
                        ${productType === "Telegram Premium"
                            ? "Telegram Premium"
                            : "Telegram Stars"}
                    </span>

                </div>


                <div class="recipient-hero">

                    <div class="recipient-icon">
                        ${productType === "Telegram Premium"
                            ? "💎"
                            : "⭐"}
                    </div>

                    <span class="recipient-kicker">
                        ${productType === "Telegram Premium"
                            ? "PREMIUM"
                            : "STARS"}
                    </span>

                    <h1>
                        Kimga yuboramiz?
                    </h1>

                    <p>
                        ${productType === "Telegram Premium"
                            ? "Premium sovg‘a qilmoqchi bo‘lgan Telegram username'ni kiriting."
                            : "Stars yubormoqchi bo‘lgan Telegram username'ni kiriting."}
                    </p>

                </div>


                <div class="recipient-card">

                    <label
                        class="username-label"
                        for="usernameInput"
                    >
                        Telegram username
                    </label>


                    <div class="username-input-wrapper">

                        <span class="username-at">
                            @
                        </span>

                        <input
                            id="usernameInput"
                            class="username-input"
                            type="text"
                            autocomplete="off"
                            autocapitalize="none"
                            spellcheck="false"
                            maxlength="33"
                            placeholder="username"
                        />

                        <div
                            class="username-loading"
                            id="usernameLoading"
                        >
                        </div>

                    </div>


                    <div
                        class="username-status"
                        id="usernameStatus"
                    >
                        Masalan: @qwerty123
                    </div>


                    <button
                        type="button"
                        class="continue-button"
                        id="continueUsernameButton"
                        disabled
                    >
                        <span>
                            Davom etish
                        </span>

                        <strong>
                            →
                        </strong>
                    </button>

                </div>


                <div class="recipient-info-box">

                    <span>🔒</span>

                    <div>
                        <strong>
                            Xavfsiz xizmat
                        </strong>

                        <p>
                            Username faqat buyurtmani
                            tayyorlash uchun ishlatiladi.
                        </p>
                    </div>

                </div>

            </div>
        `;


        const input =
            document.getElementById(
                "usernameInput"
            );

        const status =
            document.getElementById(
                "usernameStatus"
            );

        const loading =
            document.getElementById(
                "usernameLoading"
            );

        const continueButton =
            document.getElementById(
                "continueUsernameButton"
            );

        const backButton =
            document.getElementById(
                "recipientBackBtn"
            );


        if (input) {

            input.focus();

            input.addEventListener(
                "input",
                () => {

                    clearTimeout(
                        searchTimer
                    );

                    let value =
                        input.value
                            .replace(/\s/g, "")
                            .replace(/^@+/, "");

                    input.value =
                        value;

                    verifiedUsername = "";

                    continueButton.disabled =
                        true;

                    if (!value) {

                        status.textContent =
                            "Masalan: @qwerty123";

                        status.className =
                            "username-status";

                        return;

                    }

                    if (!isValidUsername(value)) {

                        status.textContent =
                            "Username noto‘g‘ri formatda.";

                        status.className =
                            "username-status error";

                        return;

                    }

                    status.textContent =
                        "Username tekshirilmoqda...";

                    status.className =
                        "username-status checking";

                    loading.classList.add(
                        "active"
                    );

                    searchTimer =
                        setTimeout(
                            async () => {

                                const result =
                                    await checkUsername(
                                        value
                                    );

                                loading.classList.remove(
                                    "active"
                                );

                                if (result.ok) {

                                    verifiedUsername =
                                        result.username ||
                                        value;

                                    status.textContent =
                                        "✓ Username tayyor";

                                    status.className =
                                        "username-status success";

                                    continueButton.disabled =
                                        false;

                                } else {

                                    status.textContent =
                                        result.message ||
                                        "Username topilmadi.";

                                    status.className =
                                        "username-status error";

                                    continueButton.disabled =
                                        true;

                                }

                            },
                            500
                        );

                }
            );


            input.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter" &&
                        !continueButton.disabled
                    ) {

                        continueButton.click();

                    }

                }
            );

        }


        if (continueButton) {

            continueButton.addEventListener(
                "click",
                () => {

                    if (
                        continueButton.disabled
                    ) {
                        return;
                    }

                    currentUsername =
                        verifiedUsername ||
                        normalizeUsername(
                            input.value
                        );

                    haptic("medium");

                    if (
                        currentProductType ===
                        "Telegram Premium"
                    ) {

                        showPremiumPlans();

                    } else {

                        showStarsPlans();

                    }

                }
            );

        }


        if (backButton) {

            backButton.addEventListener(
                "click",
                () => {

                    showHome();

                }
            );

        }
            // =========================================================
    // PREMIUM MAHSULOTLARI
    // =========================================================

    function showPremiumPlans() {

        currentProductType =
            "Telegram Premium";

        showProductsPage();

        const username =
            verifiedUsername ||
            currentUsername;

        products.innerHTML = `

            <div class="product-page-modern">

                <!-- TOP BAR -->
                <div class="product-topbar">

                    <button
                        type="button"
                        class="product-back-btn"
                        id="productBackBtn"
                    >
                        ←
                    </button>

                    <div class="product-top-title">

                        <span class="product-type-icon">
                            💎
                        </span>

                        <div>
                            <span>TELEGRAM</span>
                            <strong>Premium</strong>
                        </div>

                    </div>

                </div>


                <!-- RECIPIENT -->
                <div class="recipient-mini-card">

                    <div class="recipient-mini-icon">
                        👤
                    </div>

                    <div class="recipient-mini-info">

                        <span>
                            Qabul qiluvchi
                        </span>

                        <strong>
                            @${escapeHtml(username)}
                        </strong>

                    </div>

                    <button
                        type="button"
                        id="changeUsernameBtn"
                    >
                        O‘zgartirish
                    </button>

                </div>


                <!-- HERO -->
                <div class="product-intro premium-intro">

                    <div class="product-intro-glow"></div>

                    <div class="intro-icon">
                        💎
                    </div>

                    <div class="intro-text">

                        <span>
                            TELEGRAM PREMIUM
                        </span>

                        <h1>
                            Premium muddatini tanlang
                        </h1>

                        <p>
                            O‘zingizga mos tarifni tanlang
                            va Premium sovg‘asini yuboring.
                        </p>

                    </div>

                </div>


                <!-- TITLE -->
                <div class="plans-title">

                    <div>
                        <span>
                            PREMIUM TARIFLARI
                        </span>

                        <h2>
                            Muddatni tanlang
                        </h2>
                    </div>

                </div>


                <!-- PREMIUM PLANS -->
                <div class="premium-plans-modern">


                    <!-- 3 OY -->
                    <button
                        type="button"
                        class="premium-plan-card"
                        data-months="3"
                        data-price="165000"
                    >

                        <div class="plan-card-top">

                            <div class="plan-big-icon">
                                💎
                            </div>

                            <div class="plan-badge">
                                3 OY
                            </div>

                        </div>


                        <div class="plan-main">

                            <strong>
                                Premium 3 oy
                            </strong>

                            <span>
                                Qulay boshlang‘ich tarif
                            </span>

                        </div>


                        <div class="plan-card-bottom">

                            <div>

                                <small>
                                    Narxi
                                </small>

                                <strong>
                                    165 000 so‘m
                                </strong>

                            </div>

                            <div class="plan-arrow">
                                →
                            </div>

                        </div>

                    </button>


                    <!-- 6 OY -->
                    <button
                        type="button"
                        class="premium-plan-card popular-plan"
                        data-months="6"
                        data-price="220000"
                    >

                        <div class="popular-label">
                            🔥 ENG OMMABOP
                        </div>


                        <div class="plan-card-top">

                            <div class="plan-big-icon">
                                💎
                            </div>

                            <div class="plan-badge">
                                6 OY
                            </div>

                        </div>


                        <div class="plan-main">

                            <strong>
                                Premium 6 oy
                            </strong>

                            <span>
                                Ko‘proq muddat, qulay narx
                            </span>

                        </div>


                        <div class="plan-card-bottom">

                            <div>

                                <small>
                                    Narxi
                                </small>

                                <strong>
                                    220 000 so‘m
                                </strong>

                            </div>

                            <div class="plan-arrow">
                                →
                            </div>

                        </div>

                    </button>


                    <!-- 12 OY -->
                    <button
                        type="button"
                        class="premium-plan-card best-plan"
                        data-months="12"
                        data-price="390000"
                    >

                        <div class="best-label">
                            👑 ENG YAXSHI TANLOV
                        </div>


                        <div class="plan-card-top">

                            <div class="plan-big-icon">
                                👑
                            </div>

                            <div class="plan-badge">
                                12 OY
                            </div>

                        </div>


                        <div class="plan-main">

                            <strong>
                                Premium 12 oy
                            </strong>

                            <span>
                                Bir yil davomida Premium
                            </span>

                        </div>


                        <div class="plan-card-bottom">

                            <div>

                                <small>
                                    Narxi
                                </small>

                                <strong>
                                    390 000 so‘m
                                </strong>

                            </div>

                            <div class="plan-arrow">
                                →
                            </div>

                        </div>

                    </button>

                </div>


                <!-- CONTACT -->
                <div class="contact-premium-box">

                    <div class="contact-premium-icon">
                        💬
                    </div>

                    <div class="contact-premium-content">

                        <strong>
                            Boshqa tarif kerakmi?
                        </strong>

                        <span>
                            Admin bilan bog‘lanib,
                            boshqa Premium tariflarini
                            so‘rashingiz mumkin.
                        </span>

                    </div>

                    <button
                        type="button"
                        id="contactPremiumBtn"
                    >
                        Bog‘lanish
                    </button>

                </div>

            </div>
        `;


        // =====================================================
        // PREMIUM EVENTLARI
        // =====================================================

        const backButton =
            document.getElementById(
                "productBackBtn"
            );

        const changeUsernameButton =
            document.getElementById(
                "changeUsernameBtn"
            );

        const contactButton =
            document.getElementById(
                "contactPremiumBtn"
            );


        if (backButton) {

            backButton.addEventListener(
                "click",
                () => {

                    showRecipientForm(
                        "Telegram Premium"
                    );

                }
            );

        }


        if (changeUsernameButton) {

            changeUsernameButton.addEventListener(
                "click",
                () => {

                    showRecipientForm(
                        "Telegram Premium"
                    );

                }
            );

        }


        if (contactButton) {

            contactButton.addEventListener(
                "click",
                () => {

                    haptic("light");

                    if (tg?.openTelegramLink) {

                        tg.openTelegramLink(
                            "https://t.me/AmirquIov"
                        );

                    } else {

                        window.open(
                            "https://t.me/AmirquIov",
                            "_blank"
                        );

                    }

                }
            );

        }


        document
            .querySelectorAll(
                ".premium-plan-card"
            )
            .forEach(card => {

                card.addEventListener(
                    "click",
                    async () => {

                        const months =
                            Number(
                                card.dataset.months
                            );

                        const price =
                            Number(
                                card.dataset.price
                            );

                        haptic("medium");

                        await createOrder({
                            product:
                                "Telegram Premium",

                            amount:
                                price,

                            months:
                                months,

                            stars:
                                null,

                            recipient_username:
                                username
                        });

                    }
                );

            });

    }


    // =========================================================
    // STARS MAHSULOTLARI
    // =========================================================

    function showStarsPlans() {

        currentProductType =
            "Telegram Stars";

        showProductsPage();

        const username =
            verifiedUsername ||
            currentUsername;

        products.innerHTML = `

            <div class="product-page-modern">

                <!-- TOP BAR -->
                <div class="product-topbar">

                    <button
                        type="button"
                        class="product-back-btn"
                        id="productBackBtn"
                    >
                        ←
                    </button>

                    <div class="product-top-title stars-title">

                        <span class="product-type-icon">
                            ⭐
                        </span>

                        <div>
                            <span>TELEGRAM</span>
                            <strong>Stars</strong>
                        </div>

                    </div>

                </div>


                <!-- RECIPIENT -->
                <div class="recipient-mini-card stars-recipient">

                    <div class="recipient-mini-icon">
                        👤
                    </div>

                    <div class="recipient-mini-info">

                        <span>
                            Qabul qiluvchi
                        </span>

                        <strong>
                            @${escapeHtml(username)}
                        </strong>

                    </div>

                    <button
                        type="button"
                        id="changeUsernameBtn"
                    >
                        O‘zgartirish
                    </button>

                </div>


                <!-- HERO -->
                <div class="product-intro stars-intro">

                    <div class="product-intro-glow"></div>

                    <div class="intro-icon">
                        ⭐
                    </div>

                    <div class="intro-text">

                        <span>
                            TELEGRAM STARS
                        </span>

                        <h1>
                            Stars miqdorini tanlang
                        </h1>

                        <p>
                            Kerakli Stars paketini tanlang
                            va buyurtmani davom ettiring.
                        </p>

                    </div>

                </div>


                <!-- TITLE -->
                <div class="plans-title">

                    <div>

                        <span>
                            STARS PAKETLARI
                        </span>

                        <h2>
                            Miqdorni tanlang
                        </h2>

                    </div>

                </div>


                <!-- STARS GRID -->
                <div class="stars-plans-modern">


                    <button
                        type="button"
                        class="stars-plan-card"
                        data-stars="50"
                        data-price="11000"
                    >

                        <div class="stars-amount">

                            <span>
                                ⭐
                            </span>

                            <strong>
                                50
                            </strong>

                        </div>

                        <div class="stars-price">

                            <small>
                                Narxi
                            </small>

                            <strong>
                                11 000 so‘m
                            </strong>

                        </div>

                        <div class="stars-arrow">
                            →
                        </div>

                    </button>


                    <button
                        type="button"
                        class="stars-plan-card"
                        data-stars="100"
                        data-price="30000"
                    >

                        <div class="stars-amount">

                            <span>
                                ⭐
                            </span>

                            <strong>
                                100
                            </strong>

                        </div>

                        <div class="stars-price">

                            <small>
                                Narxi
                            </small>

                            <strong>
                                30 000 so‘m
                            </strong>

                        </div>

                        <div class="stars-arrow">
                            →
                        </div>

                    </button>


                    <button
                        type="button"
                        class="stars-plan-card"
                        data-stars="150"
                        data-price="40000"
                    >

                        <div class="stars-amount">

                            <span>
                                ⭐
                            </span>

                            <strong>
                                150
                            </strong>

                        </div>

                        <div class="stars-price">

                            <small>
                                Narxi
                            </small>

                            <strong>
                                40 000 so‘m
                            </strong>

                        </div>

                        <div class="stars-arrow">
                            →
                        </div>

                    </button>


                    <button
                        type="button"
                        class="stars-plan-card"
                        data-stars="250"
                        data-price="64000"
                    >

                        <div class="stars-amount">

                            <span>
                                ⭐
                            </span>

                            <strong>
                                250
                            </strong>

                        </div>

                        <div class="stars-price">

                            <small>
                                Narxi
                            </small>

                            <strong>
                                64 000 so‘m
                            </strong>

                        </div>

                        <div class="stars-arrow">
                            →
                        </div>

                    </button>


                    <button
                        type="button"
                        class="stars-plan-card popular-stars"
                        data-stars="350"
                        data-price="89000"
                    >

                        <div class="stars-popular">
                            🔥 OMMABOP
                        </div>

                        <div class="stars-amount">

                            <span>
                                ⭐
                            </span>

                            <strong>
                                350
                            </strong>

                        </div>

                        <div class="stars-price">

                            <small>
                                Narxi
                            </small>

                            <strong>
                                89 000 so‘m
                            </strong>

                        </div>

                        <div class="stars-arrow">
                            →
                        </div>

                    </button>


                    <button
                        type="button"
                        class="stars-plan-card"
                        data-stars="500"
                        data-price="125000"
                    >

                        <div class="stars-amount">

                            <span>
                                ⭐
                            </span>

                            <strong>
                                500
                            </strong>

                        </div>

                        <div class="stars-price">

                            <small>
                                Narxi
                            </small>

                            <strong>
                                125 000 so‘m
                            </strong>

                        </div>

                        <div class="stars-arrow">
                            →
                        </div>

                    </button>


                    <button
                        type="button"
                        class="stars-plan-card"
                        data-stars="750"
                        data-price="185000"
                    >

                        <div class="stars-amount">

                            <span>
                                ⭐
                            </span>

                            <strong>
                                750
                            </strong>

                        </div>

                        <div class="stars-price">

                            <small>
                                Narxi
                            </small>

                            <strong>
                                185 000 so‘m
                            </strong>

                        </div>

                        <div class="stars-arrow">
                            →
                        </div>

                    </button>


                    <button
                        type="button"
                        class="stars-plan-card popular-stars"
                        data-stars="1000"
                        data-price="244000"
                    >

                        <div class="stars-popular">
                            👑 KO‘P TANLANADI
                        </div>

                        <div class="stars-amount">

                            <span>
                                ⭐
                            </span>

                            <strong>
                                1 000
                            </strong>

                        </div>

                        <div class="stars-price">

                            <small>
                                Narxi
                            </small>

                            <strong>
                                244 000 so‘m
                            </strong>

                        </div>

                        <div class="stars-arrow">
                            →
                        </div>

                    </button>


                    <button
                        type="button"
                        class="stars-plan-card"
                        data-stars="1500"
                        data-price="365000"
                    >

                        <div class="stars-amount">

                            <span>
                                ⭐
                            </span>

                            <strong>
                                1 500
                            </strong>

                        </div>

                        <div class="stars-price">

                            <small>
                                Narxi
                            </small>

                            <strong>
                                365 000 so‘m
                            </strong>

                        </div>

                        <div class="stars-arrow">
                            →
                        </div>

                    </button>


                    <button
                        type="button"
                        class="stars-plan-card"
                        data-stars="2500"
                        data-price="605000"
                    >

                        <div class="stars-amount">

                            <span>
                                ⭐
                            </span>

                            <strong>
                                2 500
                            </strong>

                        </div>

                        <div class="stars-price">

                            <small>
                                Narxi
                            </small>

                            <strong>
                                605 000 so‘m
                            </strong>

                        </div>

                        <div class="stars-arrow">
                            →
                        </div>

                    </button>


                    <button
                        type="button"
                        class="stars-plan-card mega-stars"
                        data-stars="5000"
                        data-price="1205000"
                    >

                        <div class="stars-amount">

                            <span>
                                ⭐
                            </span>

                            <strong>
                                5 000
                            </strong>

                        </div>

                        <div class="stars-price">

                            <small>
                                Narxi
                            </small>

                            <strong>
                                1 205 000 so‘m
                            </strong>

                        </div>

                        <div class="stars-arrow">
                            →
                        </div>

                    </button>

                </div>

            </div>
        `;


        // =====================================================
        // STARS EVENTLARI
        // =====================================================

        const backButton =
            document.getElementById(
                "productBackBtn"
            );

        const changeUsernameButton =
            document.getElementById(
                "changeUsernameBtn"
            );


        if (backButton) {

            backButton.addEventListener(
                "click",
                () => {

                    showRecipientForm(
                        "Telegram Stars"
                    );

                }
            );

        }


        if (changeUsernameButton) {

            changeUsernameButton.addEventListener(
                "click",
                () => {

                    showRecipientForm(
                        "Telegram Stars"
                    );

                }
            );

        }


        document
            .querySelectorAll(
                ".stars-plan-card"
            )
            .forEach(card => {

                card.addEventListener(
                    "click",
                    async () => {

                        const stars =
                            Number(
                                card.dataset.stars
                            );

                        const price =
                            Number(
                                card.dataset.price
                            );

                        haptic("medium");

                        await createOrder({
                            product:
                                "Telegram Stars",

                            amount:
                                price,

                            months:
                                null,

                            stars:
                                stars,

                            recipient_username:
                                username
                        });

                    }
                );

            });

    }


    // =========================================================
    // BUYURTMA YARATISH
    // =========================================================

    async function createOrder({
        product,
        amount,
        recipient_username,
        months = null,
        stars = null
    }) {

        const userId =
            getUserId();

        if (!userId) {

            telegramAlert(
                "Telegram foydalanuvchisi aniqlanmadi."
            );

            return;

        }


        if (!recipient_username) {

            telegramAlert(
                "Qabul qiluvchi username kiritilmagan."
            );

            return;

        }


        const cleanUsername =
            normalizeUsername(
                recipient_username
            );


        const confirmText =
            product === "Telegram Premium"

                ? `${months} oylik Telegram Premium\n\nQabul qiluvchi: @${cleanUsername}\nNarxi: ${formatPrice(amount)} so'm`

                : `${formatPrice(stars)} Stars\n\nQabul qiluvchi: @${cleanUsername}\nNarxi: ${formatPrice(amount)} so'm`;


        const confirmed =
            confirm(
                `${confirmText}\n\nBuyurtmani davom ettirasizmi?`
            );


        if (!confirmed) {
            return;
        }


        const button =
            event?.currentTarget;


        if (button) {
            button.disabled = true;
        }


        try {

            showToast(
                "Buyurtma tayyorlanmoqda...",
                "info"
            );


            const response =
                await fetch(
                    `${SERVER_URL}/create-order`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            user_id:
                                userId,

                            product:
                                product,

                            amount:
                                amount,

                            recipient_username:
                                cleanUsername,

                            months:
                                months,

                            stars:
                                stars

                        })

                    }
                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            const data =
                await response.json();


            if (
                data.ok === false
            ) {

                throw new Error(
                    data.message ||
                    "Buyurtma yaratilmadi."
                );

            }


            haptic("success");


            showToast(
                "✓ Buyurtma yaratildi",
                "success"
            );


            setTimeout(() => {

                showOrders();

            }, 700);


        } catch (error) {

            console.error(
                "Create order error:",
                error
            );


            haptic("error");


            telegramAlert(
                error.message ||
                "Buyurtma yaratishda xatolik yuz berdi."
            );


        } finally {

            if (button) {
                button.disabled = false;
            }

        }

    }


    // =========================================================
    // BUYURTMALAR
    // =========================================================

    async function loadOrders() {

        if (!ordersContent) {
            return;
        }


        const userId =
            getUserId();


        if (!userId) {

            ordersContent.innerHTML = `

                <div class="empty-orders">

                    <div>
                        📦
                    </div>

                    <h3>
                        Buyurtmalar topilmadi
                    </h3>

                    <p>
                        Telegram foydalanuvchisi
                        aniqlanmadi.
                    </p>

                </div>

            `;

            return;

        }


        ordersContent.innerHTML = `

            <div class="orders-loading">
                ⏳ Buyurtmalar yuklanmoqda...
            </div>

        `;


        try {

            const response =
                await fetch(
                    `${SERVER_URL}/my-orders?user_id=${encodeURIComponent(userId)}`
                );


            if (!response.ok) {

                throw new Error(
                    "Orders API error"
                );

            }


            const data =
                await response.json();


            const orders =
                Array.isArray(data)
                    ? data
                    : (
                        data.orders ||
                        []
                    );


            if (!orders.length) {

                ordersContent.innerHTML = `

                    <div class="empty-orders">

                        <div class="empty-orders-icon">
                            📦
                        </div>

                        <h3>
                            Hali buyurtmalar yo‘q
                        </h3>

                        <p>
                            Birinchi buyurtmangizni
                            hoziroq berishingiz mumkin.
                        </p>

                        <button
                            type="button"
                            class="empty-order-button"
                            id="emptyOrderButton"
                        >
                            Xizmatlarni ko‘rish
                        </button>

                    </div>

                `;


                const emptyButton =
                    document.getElementById(
                        "emptyOrderButton"
                    );


                if (emptyButton) {

                    emptyButton.addEventListener(
                        "click",
                        showHome
                    );

                }


                return;

            }


            ordersContent.innerHTML =
                orders.map(
                    order =>
                        renderOrderCard(order)
                ).join("");


        } catch (error) {

            console.error(
                "Orders error:",
                error
            );


            ordersContent.innerHTML = `

                <div class="empty-orders">

                    <div class="empty-orders-icon">
                        ⚠️
                    </div>

                    <h3>
                        Yuklashda xatolik
                    </h3>

                    <p>
                        Buyurtmalarni yuklab bo‘lmadi.
                        Keyinroq qayta urinib ko‘ring.
                    </p>

                    <button
                        type="button"
                        class="empty-order-button"
                        id="retryOrdersButton"
                    >
                        Qayta urinish
                    </button>

                </div>

            `;


            const retryButton =
                document.getElementById(
                    "retryOrdersButton"
                );


            if (retryButton) {

                retryButton.addEventListener(
                    "click",
                    loadOrders
                );

            }

        }

    }


    function renderOrderCard(order) {

        const product =
            order.product ||
            "Xizmat";


        const amount =
            Number(
                order.amount || 0
            );


        const status =
            String(
                order.status ||
                "pending"
            ).toLowerCase();


        const statusMap = {

            pending: {
                text: "Kutilmoqda",
                icon: "⏳",
                className: "pending"
            },

            paid: {
                text: "To‘langan",
                icon: "💳",
                className: "paid"
            },

            processing: {
                text: "Jarayonda",
                icon: "⚙️",
                className: "processing"
            },

            completed: {
                text: "Bajarildi",
                icon: "✅",
                className: "completed"
            },

            cancelled: {
                text: "Bekor qilingan",
                icon: "❌",
                className: "cancelled"
            }

        };


        const statusInfo =
            statusMap[status] ||
            {
                text: status,
                icon: "📋",
                className: "pending"
            };


        const recipient =
            order.recipient_username
                ? `@${normalizeUsername(order.recipient_username)}`
                : "—";


        const orderId =
            order.id ||
            order.order_id ||
            "—";


        const date =
            order.created_at
                ? formatOrderDate(
                    order.created_at
                )
                : "";


        let serviceIcon =
            "📦";


        if (
            product
                .toLowerCase()
                .includes("premium")
        ) {

            serviceIcon =
                "💎";

        } else if (
            product
                .toLowerCase()
                .includes("stars")
        ) {

            serviceIcon =
                "⭐";

        }


        return `

            <div class="order-card">

                <div class="order-card-top">

                    <div class="order-service-icon">
                        ${serviceIcon}
                    </div>

                    <div class="order-service-info">

                        <strong>
                            ${escapeHtml(product)}
                        </strong>

                        <span>
                            Buyurtma #${escapeHtml(orderId)}
                        </span>

                    </div>

                    <div
                        class="order-status ${statusInfo.className}"
                    >
                        ${statusInfo.icon}
                        ${statusInfo.text}
                    </div>

                </div>


                <div class="order-details">

                    <div>

                        <span>
                            Qabul qiluvchi
                        </span>

                        <strong>
                            ${escapeHtml(recipient)}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Summa
                        </span>

                        <strong>
                            ${formatPrice(amount)} so‘m
                        </strong>

                    </div>

                </div>


                ${
                    date
                        ? `
                            <div class="order-date">
                                🕐 ${escapeHtml(date)}
                            </div>
                          `
                        : ""
                }

            </div>

        `;

    }


    function formatOrderDate(dateValue) {

        try {

            const date =
                new Date(dateValue);


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return String(
                    dateValue
                );

            }


            return date.toLocaleString(
                "uz-UZ",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        } catch (e) {

            return String(
                dateValue
            );

        }

    }
            // =========================================================
    // REFERAL
    // =========================================================

    function openReferral() {

        const userId =
            getUserId();


        const botUsername =
            "Tprembot";


        const referralLink =
            `https://t.me/${botUsername}?start=ref_${userId}`;


        const message = `

🎁 REFERAL DASTURI

Do‘stlaringizni Premium Shop'ga taklif qiling.

Sizning referral linkingiz:

${referralLink}

Linkni do‘stlaringizga yuboring.
        `.trim();


        if (
            tg &&
            typeof tg.showPopup === "function"
        ) {

            tg.showPopup(
                {
                    title:
                        "🎁 Referal dasturi",

                    message:
                        message,

                    buttons: [
                        {
                            id: "share",
                            type: "default",
                            text: "Ulashish"
                        },
                        {
                            type: "cancel"
                        }
                    ]
                },

                id => {

                    if (id === "share") {

                        shareReferralLink(
                            referralLink
                        );

                    }

                }
            );

        } else {

            shareReferralLink(
                referralLink
            );

        }

    }


    function shareReferralLink(link) {

        const text =
            `🎁 Premium Shop'ga qo‘shiling!\n\n${link}`;


        if (
            tg &&
            typeof tg.openTelegramLink ===
                "function"
        ) {

            const shareUrl =
                `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("🎁 Premium Shop'ga qo‘shiling!")}`;

            tg.openTelegramLink(
                shareUrl
            );

        } else {

            navigator.clipboard
                ?.writeText(text)
                .then(() => {

                    showToast(
                        "Referral link nusxalandi",
                        "success"
                    );

                })
                .catch(() => {

                    telegramAlert(
                        text
                    );

                });

        }

    }


    // =========================================================
    // SUPPORT
    // =========================================================

    function openSupport() {

        const username =
            "AmirquIov";


        if (
            tg &&
            typeof tg.openTelegramLink ===
                "function"
        ) {

            tg.openTelegramLink(
                `https://t.me/${username}`
            );

        } else {

            window.open(
                `https://t.me/${username}`,
                "_blank"
            );

        }

    }


    // =========================================================
    // BALANSNI TO‘LDIRISH
    // =========================================================

    function openAddBalance() {

        haptic("light");


        telegramAlert(
            "Balansni to‘ldirish funksiyasi tez orada ishga tushadi."
        );

    }


    // =========================================================
    // BILDIRISHNOMA
    // =========================================================

    function openNotifications() {

        haptic("light");


        telegramAlert(
            "Hozircha yangi bildirishnomalar yo‘q."
        );

    }


    // =========================================================
    // GAMING SERVICES
    // =========================================================

    function setupGamingCards() {

        document
            .querySelectorAll(
                ".gaming-card.coming-soon"
            )
            .forEach(card => {

                card.addEventListener(
                    "click",
                    () => {

                        haptic("light");


                        const service =
                            card.dataset.service ||
                            "Bu xizmat";


                        showToast(
                            `${service} — tez orada 🚀`,
                            "info"
                        );

                    }
                );

            });

    }


    // =========================================================
    // NAVIGATION EVENTLARI
    // =========================================================

    if (homeNavButton) {

        homeNavButton.addEventListener(
            "click",
            showHome
        );

    }


    if (ordersNavButton) {

        ordersNavButton.addEventListener(
            "click",
            showOrders
        );

    }


    if (profileNavButton) {

        profileNavButton.addEventListener(
            "click",
            showProfile
        );

    }


    if (premiumButton) {

        premiumButton.addEventListener(
            "click",
            () => {

                haptic("light");

                showRecipientForm(
                    "Telegram Premium"
                );

            }
        );

    }


    if (starsButton) {

        starsButton.addEventListener(
            "click",
            () => {

                haptic("light");

                showRecipientForm(
                    "Telegram Stars"
                );

            }
        );

    }


    if (profileOrdersButton) {

        profileOrdersButton.addEventListener(
            "click",
            showOrders
        );

    }


    if (ordersBackButton) {

        ordersBackButton.addEventListener(
            "click",
            showProfile
        );

    }


    if (referralButton) {

        referralButton.addEventListener(
            "click",
            openReferral
        );

    }


    if (supportButton) {

        supportButton.addEventListener(
            "click",
            openSupport
        );

    }


    if (addBalanceButton) {

        addBalanceButton.addEventListener(
            "click",
            openAddBalance
        );

    }


    if (profileAddBalanceButton) {

        profileAddBalanceButton.addEventListener(
            "click",
            openAddBalance
        );

    }


    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            openNotifications
        );

    }


    // =========================================================
    // START
    // =========================================================

    updateUserProfile();

    setBalance(0);

    loadBalance();

    setupGamingCards();

    showHome();

});

    }
