document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // CONFIG
    // =========================================================

    const SERVER_URL = "https://telegram-shop-co3o.onrender.com";

    const tg = window.Telegram?.WebApp;

    if (tg) {
        tg.ready();
        tg.expand();

        try {
            tg.setHeaderColor("#0b1118");
            tg.setBackgroundColor("#0b1118");
        } catch (error) {
            console.log("Telegram theme config error:", error);
        }
    }


    // =========================================================
    // DOM ELEMENTS
    // =========================================================

    const homePage = document.getElementById("homePage");
    const ordersPage = document.getElementById("ordersPage");
    const profilePage = document.getElementById("profilePage");
    const productsSection = document.getElementById("productsSection");

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

    const products =
        document.getElementById("products");


    // =========================================================
    // TELEGRAM USER
    // =========================================================

    const telegramUser =
        tg?.initDataUnsafe?.user || null;


    // =========================================================
    // STATE
    // =========================================================

    let currentUsername = "";
    let verifiedUsername = "";
    let currentProductType = "";

    let usernameInput = null;
    let usernameStatus = null;

    let searchTimer = null;


    // =========================================================
    // PRODUCT DATA
    // =========================================================

    const premiumPlans = [
        {
            title: "3 oy",
            months: 3,
            price: 165000
        },
        {
            title: "6 oy",
            months: 6,
            price: 220000
        },
        {
            title: "12 oy",
            months: 12,
            price: 390000
        }
    ];


    const contactPlans = [
        {
            title: "1 oy",
            months: 1,
            price: 40000
        },
        {
            title: "12 oy",
            months: 12,
            price: 280000
        }
    ];


    const starsPlans = [
        {
            title: "50 Stars",
            stars: 50,
            price: 11000
        },
        {
            title: "100 Stars",
            stars: 100,
            price: 30000
        },
        {
            title: "150 Stars",
            stars: 150,
            price: 40000
        },
        {
            title: "250 Stars",
            stars: 250,
            price: 64000
        },
        {
            title: "350 Stars",
            stars: 350,
            price: 89000
        },
        {
            title: "500 Stars",
            stars: 500,
            price: 125000
        },
        {
            title: "750 Stars",
            stars: 750,
            price: 185000
        },
        {
            title: "1000 Stars",
            stars: 1000,
            price: 244000
        },
        {
            title: "1500 Stars",
            stars: 1500,
            price: 365000
        },
        {
            title: "2500 Stars",
            stars: 2500,
            price: 605000
        },
        {
            title: "5000 Stars",
            stars: 5000,
            price: 1205000
        }
    ];


    // =========================================================
    // HELPERS
    // =========================================================

    function formatPrice(value) {

        return Number(value || 0)
            .toLocaleString("uz-UZ")
            .replace(/\s/g, " ") + " so'm";
    }


    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function getUserId() {

        return telegramUser?.id || null;
    }


    function showToast(message) {

        let toast =
            document.querySelector(".toast");

        if (!toast) {

            toast =
                document.createElement("div");

            toast.className = "toast";

            document.body.appendChild(toast);
        }

        toast.textContent = message;

        toast.classList.add("show");

        setTimeout(() => {

            toast.classList.remove("show");

        }, 2500);
    }


    function telegramAlert(message) {

        if (tg?.showAlert) {

            tg.showAlert(message);

        } else {

            alert(message);
        }
    }


    function haptic(type = "light") {

        try {

            tg?.HapticFeedback?.impactOccurred(type);

        } catch (error) {
            // Telegram Haptic ishlamasa davom etadi
        }
    }


    // =========================================================
    // USER PROFILE
    // =========================================================

    function getUserDisplayName() {

        if (!telegramUser) {
            return "Telegram foydalanuvchisi";
        }

        const first =
            telegramUser.first_name || "";

        const last =
            telegramUser.last_name || "";

        const fullName =
            `${first} ${last}`.trim();

        return (
            fullName ||
            telegramUser.username ||
            "Foydalanuvchi"
        );
    }


    function getUserUsername() {

        if (!telegramUser?.username) {
            return "";
        }

        return "@" + telegramUser.username;
    }


    function setAvatar(element) {

        if (!element) {
            return;
        }

        if (telegramUser?.photo_url) {

            element.innerHTML = `
                <img
                    src="${escapeHtml(telegramUser.photo_url)}"
                    alt="Avatar"
                >
            `;

            return;
        }

        const name =
            getUserDisplayName();

        const letter =
            name.charAt(0).toUpperCase() || "U";

        element.textContent = letter;
    }


    function loadUserProfile() {

        const userName =
            document.getElementById("userName");

        const userAvatar =
            document.getElementById("userAvatar");

        const profileName =
            document.getElementById("profileName");

        const profileUsername =
            document.getElementById("profileUsername");

        const profileAvatar =
            document.getElementById("profileAvatar");

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
            profileUsername.textContent =
                username ||
                "Telegram username mavjud emas";
        }

        setAvatar(userAvatar);
        setAvatar(profileAvatar);
    }


    // =========================================================
    // BALANCE
    // =========================================================

    function setBalance(balance = 0) {

        const balanceText =
            formatPrice(balance);

        const userBalance =
            document.getElementById("userBalance");

        const profileBalance =
            document.getElementById("profileBalance");

        if (userBalance) {
            userBalance.textContent =
                balanceText;
        }

        if (profileBalance) {
            profileBalance.textContent =
                balanceText;
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

            // Keyinchalik real balance endpointi shu yerga ulanadi.

            setBalance(0);

        } catch (error) {

            console.error(
                "Balance error:",
                error
            );

            setBalance(0);
        }
    }


    // =========================================================
    // PAGE NAVIGATION
    // =========================================================

    function hideAllPages() {

        [
            homePage,
            ordersPage,
            profilePage,
            productsSection
        ].forEach(page => {

            if (page) {

                page.classList.remove(
                    "active-page"
                );

                page.style.display = "none";
            }
        });
    }


    function clearNavActive() {

        [
            homeNavButton,
            ordersNavButton,
            profileNavButton
        ].forEach(button => {

            if (button) {

                button.classList.remove(
                    "active"
                );
            }
        });
    }


    function showHome() {

        hideAllPages();
        clearNavActive();

        if (homePage) {

            homePage.style.display = "block";

            homePage.classList.add(
                "active-page"
            );
        }

        if (homeNavButton) {

            homeNavButton.classList.add(
                "active"
            );
        }

        haptic("light");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    async function showOrders() {

        hideAllPages();
        clearNavActive();

        if (ordersPage) {

            ordersPage.style.display = "block";

            ordersPage.classList.add(
                "active-page"
            );
        }

        if (ordersNavButton) {

            ordersNavButton.classList.add(
                "active"
            );
        }

        haptic("light");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        await showMyOrders();
    }


    function showProfile() {

        hideAllPages();
        clearNavActive();

        if (profilePage) {

            profilePage.style.display = "block";

            profilePage.classList.add(
                "active-page"
            );
        }

        if (profileNavButton) {

            profileNavButton.classList.add(
                "active"
            );
        }

        haptic("light");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    // =========================================================
    // PRODUCTS PAGE
    // =========================================================

    function showProductsPage() {

        hideAllPages();
        clearNavActive();

        if (productsSection) {

            productsSection.style.display =
                "block";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    function clearProducts() {

        if (products) {
            products.innerHTML = "";
        }
    }


    function createBackButton() {

        const oldButton =
            document.querySelector(
                ".back-button"
            );

        if (oldButton) {
            oldButton.remove();
        }

        const button =
            document.createElement("button");

        button.className =
            "back-button";

        button.type =
            "button";

        button.innerHTML = `
            <span class="back-icon">‹</span>
            <span>Bosh sahifa</span>
        `;

        button.addEventListener(
            "click",
            showHome
        );

        if (productsSection) {

            productsSection.insertBefore(
                button,
                productsSection.firstChild
            );
        }
    }


    // =========================================================
    // USERNAME
    // =========================================================

    function showUsernameStatus(
        message = "",
        type = ""
    ) {

        if (!usernameStatus) {
            return;
        }

        usernameStatus.textContent =
            message;

        usernameStatus.className =
            "username-status";

        if (type) {

            usernameStatus.classList.add(
                type
            );
        }
    }


    function normalizeUsername(value) {

        return String(value || "")
            .trim()
            .replace(/^@+/, "");
    }


    async function checkUsername(username) {

        const cleanUsername =
            normalizeUsername(username);

        if (!cleanUsername) {

            showUsernameStatus(
                "Username kiriting.",
                "error"
            );

            return false;
        }

        if (
            !/^[A-Za-z0-9_]{5,32}$/
                .test(cleanUsername)
        ) {

            showUsernameStatus(
                "Username 5–32 ta belgidan iborat bo‘lishi kerak.",
                "error"
            );

            return false;
        }

        showUsernameStatus(
            "Username tekshirilmoqda...",
            "loading"
        );

        try {

            const response =
                await fetch(
                    `${SERVER_URL}/check-username?username=${encodeURIComponent(cleanUsername)}`
                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data?.detail ||
                    "Username tekshirishda xatolik."
                );
            }

            const exists =
                data?.exists ??
                data?.valid ??
                data?.available ??
                data?.ok;

            if (exists === false) {

                showUsernameStatus(
                    "Bu username topilmadi.",
                    "error"
                );

                verifiedUsername = "";

                return false;
            }

            verifiedUsername =
                cleanUsername;

            showUsernameStatus(
                `@${cleanUsername} tasdiqlandi ✓`,
                "success"
            );

            return true;

        } catch (error) {

            console.error(
                "Username check error:",
                error
            );

            showUsernameStatus(
                "Username tekshirishda xatolik yuz berdi.",
                "error"
            );

            verifiedUsername = "";

            return false;
        }
    }


    // =========================================================
    // RECIPIENT FORM
    // =========================================================

    function showRecipientForm(type) {

        currentProductType =
            type;

        currentUsername = "";
        verifiedUsername = "";

        showProductsPage();

        clearProducts();

        const form =
            document.createElement("div");

        form.className =
            "gift-form";

        const isPremium =
            type === "premium";

        const title =
            isPremium
                ? "Telegram Premium"
                : "Telegram Stars";

        form.innerHTML = `
            <div class="
                product-hero
                ${isPremium
                    ? "premium-hero"
                    : "stars-hero"}
            ">

                <div class="product-hero-icon">
                    ${isPremium ? "💎" : "⭐"}
                </div>

                <div class="product-hero-content">

                    <span class="product-hero-label">
                        ${isPremium
                            ? "TELEGRAM PREMIUM"
                            : "TELEGRAM STARS"}
                    </span>

                    <h2>
                        ${title}
                    </h2>

                    <p>
                        ${isPremium
                            ? "Premium xizmatini o‘zingiz yoki boshqa foydalanuvchiga yuboring."
                            : "Telegram hisobiga Stars yuborish uchun miqdorni tanlang."
                        }
                    </p>

                </div>

            </div>


            <div class="recipient-card">

                <div class="recipient-header">

                    <div class="recipient-icon">
                        👤
                    </div>

                    <div>
                        <strong>
                            Qabul qiluvchi
                        </strong>

                        <span>
                            Telegram username kiriting
                        </span>
                    </div>

                </div>


                <div class="username-input-wrapper">

                    <span class="username-prefix">
                        @
                    </span>

                    <input
                        type="text"
                        id="usernameInput"
                        class="username-input"
                        placeholder="username"
                        autocomplete="off"
                        maxlength="33"
                        inputmode="text"
                    >

                </div>


                <div
                    id="usernameStatus"
                    class="username-status"
                ></div>


                <div class="form-hint">
                    💡 Masalan: qwerty123
                </div>

            </div>


            <button
                id="continueUsernameButton"
                class="continue-button"
                type="button"
            >
                <span>
                    Davom etish
                </span>

                <span>
                    →
                </span>
            </button>
        `;


        products.appendChild(form);


        usernameInput =
            document.getElementById(
                "usernameInput"
            );

        usernameStatus =
            document.getElementById(
                "usernameStatus"
            );

        const continueButton =
            document.getElementById(
                "continueUsernameButton"
            );


        usernameInput.addEventListener(
            "input",
            () => {

                verifiedUsername = "";

                showUsernameStatus("");

                clearTimeout(searchTimer);

                const value =
                    normalizeUsername(
                        usernameInput.value
                    );

                if (!value) {
                    return;
                }

                searchTimer =
                    setTimeout(
                        () => {

                            checkUsername(
                                value
                            );

                        },
                        700
                    );
            }
        );


        usernameInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    continueButton.click();
                }
            }
        );


        continueButton.addEventListener(
            "click",
            async () => {

                const username =
                    normalizeUsername(
                        usernameInput.value
                    );

                if (!username) {

                    showUsernameStatus(
                        "Username kiriting.",
                        "error"
                    );

                    usernameInput.focus();

                    return;
                }

                continueButton.disabled =
                    true;

                continueButton.classList.add(
                    "loading"
                );

                const valid =
                    await checkUsername(
                        username
                    );

                if (!valid) {

                    continueButton.disabled =
                        false;

                    continueButton.classList.remove(
                        "loading"
                    );

                    return;
                }

                currentUsername =
                    verifiedUsername;

                haptic("medium");

                if (
                    currentProductType ===
                    "premium"
                ) {

                    showPremium(
                        currentUsername
                    );

                } else {

                    showStars(
                        currentUsername
                    );
                }

                continueButton.disabled =
                    false;

                continueButton.classList.remove(
                    "loading"
                );
            }
        );


        createBackButton();

        setTimeout(() => {

            usernameInput?.focus();

        }, 150);
    }


    // =========================================================
    // PREMIUM PAGE
    // =========================================================

    function showPremium(username) {

        showProductsPage();

        clearProducts();

        createBackButton();

        const container =
            document.createElement("div");

        container.className =
            "product-selection-page premium-page";

        container.innerHTML = `
            <div class="selection-header">

                <div class="
                    selection-icon
                    premium-selection-icon
                ">
                    💎
                </div>

                <div>

                    <span class="selection-kicker">
                        TELEGRAM PREMIUM
                    </span>

                    <h2>
                        Paketni tanlang
                    </h2>

                    <p>
                        <strong>
                            @${escapeHtml(username)}
                        </strong>

                        uchun Premium muddatini
                        tanlang.
                    </p>

                </div>

            </div>


            <div class="package-section">

                <div class="package-section-title">
                    <span>💎</span>
                    Premium paketlari
                </div>

                <div class="premium-plans-grid"></div>

            </div>


            <div class="contact-section">

                <div class="contact-header">

                    <div class="contact-icon">
                        💬
                    </div>

                    <div>
                        <strong>
                            Boshqa variant kerakmi?
                        </strong>

                        <span>
                            Administrator bilan bog‘laning
                        </span>
                    </div>

                </div>

                <div class="contact-plans-grid"></div>

            </div>
        `;


        products.appendChild(
            container
        );


        const plansGrid =
            container.querySelector(
                ".premium-plans-grid"
            );


        premiumPlans.forEach(
            (plan, index) => {

                const card =
                    document.createElement(
                        "button"
                    );

                card.type = "button";

                card.className =
                    "premium-plan-card";

                if (index === 2) {

                    card.classList.add(
                        "featured-plan"
                    );
                }

                card.innerHTML = `
                    <div class="plan-top">

                        <span class="plan-badge">
                            ${
                                plan.months === 12
                                    ? "ENG FOYDALI"
                                    : "PREMIUM"
                            }
                        </span>

                        <span class="plan-check">
                            ✓
                        </span>

                    </div>


                    <div class="plan-duration">
                        ${plan.months}
                        <span>oy</span>
                    </div>


                    <div class="plan-name">
                        Telegram Premium
                    </div>


                    <div class="plan-price">
                        ${formatPrice(plan.price)}
                    </div>


                    <div class="plan-action">
                        <span>
                            Tanlash
                        </span>

                        <span>
                            →
                        </span>
                    </div>
                `;


                card.addEventListener(
                    "click",
                    () => {

                        haptic("medium");

                        createOrder(
                            "Telegram Premium",
                            plan
                        );
                    }
                );


                plansGrid.appendChild(
                    card
                );
            }
        );


        const contactGrid =
            container.querySelector(
                ".contact-plans-grid"
            );


        contactPlans.forEach(
            plan => {

                const card =
                    document.createElement(
                        "button"
                    );

                card.type = "button";

                card.className =
                    "contact-plan-card";

                card.innerHTML = `
                    <div>

                        <strong>
                            ${escapeHtml(
                                plan.title
                            )}
                        </strong>

                        <span>
                            ${formatPrice(
                                plan.price
                            )}
                        </span>

                    </div>

                    <span class="contact-arrow">
                        →
                    </span>
                `;


                card.addEventListener(
                    "click",
                    () => {

                        haptic("medium");

                        openContactTelegram();
                    }
                );


                contactGrid.appendChild(
                    card
                );
            }
        );
    }


    // =========================================================
    // STARS PAGE
    // =========================================================

    function showStars(username) {

        showProductsPage();

        clearProducts();

        createBackButton();

        const container =
            document.createElement("div");

        container.className =
            "product-selection-page stars-page";

        container.innerHTML = `
            <div class="selection-header">

                <div class="
                    selection-icon
                    stars-selection-icon
                ">
                    ⭐
                </div>

                <div>

                    <span class="selection-kicker">
                        TELEGRAM STARS
                    </span>

                    <h2>
                        Stars miqdorini tanlang
                    </h2>

                    <p>
                        <strong>
                            @${escapeHtml(username)}
                        </strong>

                        uchun Stars paketini
                        tanlang.
                    </p>

                </div>

            </div>


            <div class="package-section">

                <div class="package-section-title">
                    <span>⭐</span>
                    Stars paketlari
                </div>

                <div class="stars-plans-grid"></div>

            </div>
        `;


        products.appendChild(
            container
        );


        const plansGrid =
            container.querySelector(
                ".stars-plans-grid"
            );


        starsPlans.forEach(
            plan => {

                const card =
                    document.createElement(
                        "button"
                    );

                card.type = "button";

                card.className =
                    "stars-plan-card";

                card.innerHTML = `
                    <div class="stars-plan-icon">
                        ⭐
                    </div>


                    <div class="stars-plan-info">

                        <strong>
                            ${plan.stars.toLocaleString(
                                "en-US"
                            )}
                        </strong>

                        <span>
                            Stars
                        </span>

                    </div>


                    <div class="stars-plan-bottom">

                        <span>
                            ${formatPrice(
                                plan.price
                            )}
                        </span>

                        <div class="stars-plan-arrow">
                            →
                        </div>

                    </div>
                `;


                card.addEventListener(
                    "click",
                    () => {

                        haptic("medium");

                        createOrder(
                            "Telegram Stars",
                            plan
                        );
                    }
                );


                plansGrid.appendChild(
                    card
                );
            }
        );
    }


    // =========================================================
    // CONTACT
    // =========================================================

    function openContactTelegram() {

        const username =
            "AmirquIov";

        const url =
            `https://t.me/${username}`;

        haptic("medium");

        if (tg?.openTelegramLink) {

            tg.openTelegramLink(url);

        } else {

            window.open(
                url,
                "_blank"
            );
        }
    }


    // =========================================================
    // CREATE ORDER
    // =========================================================

    async function createOrder(
        product,
        option
    ) {

        const buyerId =
            getUserId();

        if (!buyerId) {

            telegramAlert(
                "Buyurtma berish uchun Telegram orqali oching."
            );

            return;
        }


        const username =
            currentUsername ||
            verifiedUsername;


        if (!username) {

            telegramAlert(
                "Avval username tanlang."
            );

            return;
        }


        const orderData = {

            user_id:
                buyerId,

            product:
                product,

            amount:
                option.price,

            recipient_username:
                username,

            months:
                product ===
                "Telegram Premium"
                    ? option.months
                    : null,

            stars:
                product ===
                "Telegram Stars"
                    ? option.stars
                    : null
        };


        try {

            showToast(
                "Buyurtma yaratilmoqda..."
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

                        body:
                            JSON.stringify(
                                orderData
                            )
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data?.detail ||
                    data?.message ||
                    "Buyurtma yaratilmadi."
                );
            }


            haptic("heavy");


            telegramAlert(
                "Buyurtma muvaffaqiyatli yaratildi!"
            );


            await showOrders();

        } catch (error) {

            console.error(
                "Create order error:",
                error
            );


            telegramAlert(
                error.message ||
                "Buyurtma yaratishda xatolik yuz berdi."
            );
        }
    }


    // =========================================================
    // MY ORDERS
    // =========================================================

    async function showMyOrders() {

        const ordersContent =
            document.getElementById(
                "ordersContent"
            );

        if (!ordersContent) {
            return;
        }


        const userId =
            getUserId();


        if (!userId) {

            ordersContent.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        🔐
                    </div>

                    <h3>
                        Telegram orqali kiring
                    </h3>

                    <p>
                        Buyurtmalarni ko‘rish uchun
                        Mini App'ni Telegram ichida oching.
                    </p>

                </div>
            `;

            return;
        }


        ordersContent.innerHTML = `
            <div class="loading">

                <div class="spinner"></div>

                Buyurtmalar yuklanmoqda...

            </div>
        `;


        try {

            const response =
                await fetch(
                    `${SERVER_URL}/my-orders?user_id=${encodeURIComponent(userId)}`
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data?.detail ||
                    "Buyurtmalarni olishda xatolik."
                );
            }


            const orders =
                Array.isArray(data)
                    ? data
                    : (
                        data.orders ||
                        []
                    );


            renderOrders(
                orders
            );

        } catch (error) {

            console.error(
                "Orders error:",
                error
            );


            ordersContent.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        ⚠️
                    </div>

                    <h3>
                        Xatolik yuz berdi
                    </h3>

                    <p>
                        Buyurtmalarni yuklab bo‘lmadi.
                        Keyinroq qayta urinib ko‘ring.
                    </p>

                </div>
            `;
        }
    }


    // =========================================================
    // RENDER ORDERS
    // =========================================================

    function renderOrders(orders) {

        const ordersContent =
            document.getElementById(
                "ordersContent"
            );

        if (!ordersContent) {
            return;
        }


        if (!orders.length) {

            ordersContent.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        📦
                    </div>

                    <h3>
                        Hozircha buyurtmalar yo‘q
                    </h3>

                    <p>
                        Siz hali hech qanday xizmat
                        sotib olmagansiz.
                    </p>

                </div>
            `;

            return;
        }


        ordersContent.innerHTML =
            orders
                .map(order => {

                    const status =
                        String(
                            order.status ||
                            "pending"
                        ).toLowerCase();


                    const statusText =
                        getStatusText(
                            status
                        );


                    const product =
                        order.product ||
                        "Noma'lum xizmat";


                    const amount =
                        order.amount
                            ? formatPrice(
                                order.amount
                            )
                            : "—";


                    const username =
                        order.recipient_username
                            ? "@" +
                              String(
                                order.recipient_username
                              ).replace(/^@/, "")
                            : "—";


                    const date =
                        order.created_at ||
                        order.date ||
                        "—";


                    let packageInfo = "";


                    if (
                        product ===
                        "Telegram Premium" &&
                        order.months
                    ) {

                        packageInfo =
                            `${order.months} oy Premium`;

                    } else if (
                        product ===
                        "Telegram Stars" &&
                        order.stars
                    ) {

                        packageInfo =
                            `${order.stars} Stars`;
                    }


                    return `
                        <div class="order-card">

                            <div class="order-top">

                                <div class="order-product">
                                    ${escapeHtml(
                                        product
                                    )}
                                </div>

                                <div
                                    class="
                                        order-status
                                        status-${escapeHtml(
                                            status
                                        )}
                                    "
                                >
                                    ${escapeHtml(
                                        statusText
                                    )}
                                </div>

                            </div>


                            <div class="order-info">

                                <div class="order-row">

                                    <span>
                                        Qabul qiluvchi
                                    </span>

                                    <span>
                                        ${escapeHtml(
                                            username
                                        )}
                                    </span>

                                </div>


                                ${
                                    packageInfo
                                    ? `
                                        <div class="order-row">

                                            <span>
                                                Paket
                                            </span>

                                            <span>
                                                ${escapeHtml(
                                                    packageInfo
                                                )}
                                            </span>

                                        </div>
                                    `
                                    : ""
                                }


                                <div class="order-row">

                                    <span>
                                        Summa
                                    </span>

                                    <span>
                                        ${escapeHtml(
                                            amount
                                        )}
                                    </span>

                                </div>


                                <div class="order-row">

                                    <span>
                                        Sana
                                    </span>

                                    <span>
                                        ${escapeHtml(
                                            formatDate(
                                                date
                                            )
                                        )}
                                    </span>

                                </div>

                            </div>

                        </div>
                    `;

                })
                .join("");
    }


    function getStatusText(status) {

        const statuses = {

            pending:
                "Kutilmoqda",

            paid:
                "To‘langan",

            processing:
                "Jarayonda",

            completed:
                "Bajarildi",

            cancelled:
                "Bekor qilindi"
        };

        return (
            statuses[status] ||
            "Kutilmoqda"
        );
    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(value);
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
    }


    // =========================================================
    // REFERRAL
    // =========================================================

    function openReferral() {

        const userId =
            getUserId();

        if (!userId) {

            telegramAlert(
                "Referral uchun Telegram orqali kiring."
            );

            return;
        }


        const botUsername =
            "Tprembot";


        const referralLink =
            `https://t.me/${botUsername}?start=ref_${userId}`;


        telegramAlert(
            `Sizning referral linkingiz:\n\n${referralLink}`
        );
    }


    // =========================================================
    // SUPPORT
    // =========================================================

    function openSupport() {

        openContactTelegram();
    }


    // =========================================================
    // BALANCE
    // =========================================================

    function openBalance() {

        telegramAlert(
            "Balans to‘ldirish tizimi tez orada ishga tushadi."
        );
    }


    // =========================================================
    // NAVIGATION EVENTS
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


    // =========================================================
    // HOME SERVICES
    // =========================================================

    if (premiumButton) {

        premiumButton.addEventListener(
            "click",
            () => {

                haptic("medium");

                showRecipientForm(
                    "premium"
                );
            }
        );
    }


    if (starsButton) {

        starsButton.addEventListener(
            "click",
            () => {

                haptic("medium");

                showRecipientForm(
                    "stars"
                );
            }
        );
    }


    // =========================================================
    // PROFILE EVENTS
    // =========================================================

    if (profileOrdersButton) {

        profileOrdersButton.addEventListener(
            "click",
            showOrders
        );
    }


    if (referralButton) {

        referralButton.addEventListener(
            "click",
            () => {

                haptic("light");

                openReferral();
            }
        );
    }


    if (supportButton) {

        supportButton.addEventListener(
            "click",
            () => {

                haptic("light");

                openSupport();
            }
        );
    }


    if (addBalanceButton) {

        addBalanceButton.addEventListener(
            "click",
            () => {

                haptic("medium");

                openBalance();
            }
        );
    }


    // =========================================================
    // GAMING SERVICES
    // =========================================================

    document
        .querySelectorAll(
            ".service-card.disabled"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    haptic("light");

                    showToast(
                        "Bu xizmat tez orada qo‘shiladi 🚀"
                    );
                }
            );
        });


    // =========================================================
    // INITIALIZATION
    // =========================================================

    loadUserProfile();

    setBalance(0);

    loadBalance();

    showHome();

});
