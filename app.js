document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // ASOSIY SOZLAMALAR
    // =====================================================

    const SERVER_URL =
        "https://telegram-shop-co3o.onrender.com";

    const tg = window.Telegram?.WebApp;

    if (tg) {
        tg.ready();
        tg.expand();

        try {
            tg.setHeaderColor("#0b1118");
            tg.setBackgroundColor("#0b1118");
        } catch (error) {
            console.log("Telegram theme error:", error);
        }
    }


    // =====================================================
    // SAHIFALAR
    // =====================================================

    const homePage =
        document.getElementById("homePage");

    const ordersPage =
        document.getElementById("ordersPage");

    const profilePage =
        document.getElementById("profilePage");

    const productsSection =
        document.getElementById("productsSection");

    const products =
        document.getElementById("products");


    // =====================================================
    // NAVIGATION
    // =====================================================

    const homeNavButton =
        document.getElementById("homeNavButton");

    const ordersNavButton =
        document.getElementById("ordersNavButton");

    const profileNavButton =
        document.getElementById("profileNavButton");


    // =====================================================
    // ASOSIY BUTTONLAR
    // =====================================================

    const premiumButton =
        document.getElementById("premiumButton");

    const starsButton =
        document.getElementById("starsButton");

    const profileOrdersButton =
        document.getElementById("profileOrdersButton");

    const referralButton =
        document.getElementById("referralButton");

    const supportButton =
        document.getElementById("supportButton");

    const addBalanceButton =
        document.getElementById("addBalanceButton");

    const profileAddBalanceButton =
        document.getElementById(
            "profileAddBalanceButton"
        );

    const notificationButton =
        document.getElementById(
            "notificationButton"
        );

    const ordersBackButton =
        document.getElementById(
            "ordersBackButton"
        );


    // =====================================================
    // TELEGRAM USER
    // =====================================================

    const telegramUser =
        tg?.initDataUnsafe?.user || null;


    // =====================================================
    // HOLAT
    // =====================================================

    let currentProductType = "";
    let currentUsername = "";
    let verifiedUsername = "";

    let searchTimer = null;


    // =====================================================
    // PREMIUM PLANLAR
    // =====================================================

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


    // =====================================================
    // PREMIUM MUROJAAT PLANLARI
    // =====================================================

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


    // =====================================================
    // STARS PLANLAR
    // =====================================================

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


    // =====================================================
    // YORDAMCHI FUNKSIYALAR
    // =====================================================

    function getUserId() {

        return telegramUser?.id || null;

    }


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


    function formatPrice(value) {

        return Number(value || 0)
            .toLocaleString("uz-UZ")
            .replace(/\s/g, " ") +
            " so'm";

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


    function normalizeUsername(value) {

        return String(value || "")
            .trim()
            .replace(/^@+/, "");

    }


    function haptic(type = "light") {

        try {

            tg?.HapticFeedback?.impactOccurred(type);

        } catch (error) {}

    }


    function telegramAlert(message) {

        if (tg?.showAlert) {

            tg.showAlert(message);

        } else {

            alert(message);

        }

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


    // =====================================================
    // USER PROFILI
    // =====================================================

    function updateUserProfile() {

        const name =
            getUserDisplayName();

        const username =
            getUserUsername();

        const userName =
            document.getElementById(
                "userName"
            );

        const profileName =
            document.getElementById(
                "profileName"
            );

        const profileUsername =
            document.getElementById(
                "profileUsername"
            );

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


        updateAvatar(
            document.getElementById(
                "userAvatar"
            )
        );

        updateAvatar(
            document.getElementById(
                "profileAvatar"
            )
        );

    }


    function updateAvatar(element) {

        if (!element) return;

        if (telegramUser?.photo_url) {

            element.innerHTML = `
                <img
                    src="${escapeHtml(
                        telegramUser.photo_url
                    )}"
                    alt="Avatar"
                >
            `;

            return;
        }

        const name =
            getUserDisplayName();

        element.textContent =
            name.charAt(0).toUpperCase() ||
            "U";

    }


    // =====================================================
    // BALANS
    // =====================================================

    function setBalance(balance) {

        const value =
            Number(balance || 0);

        const text =
            formatPrice(value);

        const userBalance =
            document.getElementById(
                "userBalance"
            );

        const profileBalance =
            document.getElementById(
                "profileBalance"
            );

        if (userBalance) {
            userBalance.textContent = text;
        }

        if (profileBalance) {
            profileBalance.textContent = text;
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
                    `${SERVER_URL}/balance?user_id=${encodeURIComponent(
                        userId
                    )}`
                );

            if (!response.ok) {
                setBalance(0);
                return;
            }

            const data =
                await response.json();

            setBalance(
                data.balance ||
                data.amount ||
                0
            );

        } catch (error) {

            console.log(
                "Balance endpoint unavailable:",
                error
            );

            setBalance(0);

        }

    }


    // =====================================================
    // SAHIFALAR
    // =====================================================

    function hideAllPages() {

        [
            homePage,
            ordersPage,
            profilePage,
            productsSection
        ].forEach(page => {

            if (!page) return;

            page.style.display = "none";

            page.classList.remove(
                "active-page"
            );

        });

    }


    function clearNavigation() {

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

        clearNavigation();

        if (homePage) {

            homePage.style.display =
                "block";

            homePage.classList.add(
                "active-page"
            );

        }

        if (homeNavButton) {

            homeNavButton.classList.add(
                "active"
            );

        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        haptic("light");

    }


    async function showOrders() {

        hideAllPages();

        clearNavigation();

        if (ordersPage) {

            ordersPage.style.display =
                "block";

            ordersPage.classList.add(
                "active-page"
            );

        }

        if (ordersNavButton) {

            ordersNavButton.classList.add(
                "active"
            );

        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        haptic("light");

        await loadOrders();

    }


    function showProfile() {

        hideAllPages();

        clearNavigation();

        if (profilePage) {

            profilePage.style.display =
                "block";

            profilePage.classList.add(
                "active-page"
            );

        }

        if (profileNavButton) {

            profileNavButton.classList.add(
                "active"
            );

        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        haptic("light");

    }


    function showProductsPage() {

        hideAllPages();

        clearNavigation();

        if (productsSection) {

            productsSection.style.display =
                "block";

        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
        // =====================================================
    // USERNAME TEKSHIRISH
    // =====================================================

    async function checkUsername(username) {

        const cleanUsername =
            normalizeUsername(username);

        const status =
            document.getElementById(
                "usernameStatus"
            );

        if (!cleanUsername) {

            if (status) {

                status.textContent =
                    "Username kiriting.";

                status.className =
                    "username-status error";

            }

            return false;

        }


        if (
            !/^[A-Za-z0-9_]{5,32}$/.test(
                cleanUsername
            )
        ) {

            if (status) {

                status.textContent =
                    "Username 5–32 ta belgidan iborat bo‘lishi kerak.";

                status.className =
                    "username-status error";

            }

            return false;

        }


        if (status) {

            status.textContent =
                "Username tekshirilmoqda...";

            status.className =
                "username-status loading";

        }


        try {

            const response =
                await fetch(
                    `${SERVER_URL}/check-username?username=${encodeURIComponent(
                        cleanUsername
                    )}`
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

                if (status) {

                    status.textContent =
                        "Bu username topilmadi.";

                    status.className =
                        "username-status error";

                }

                verifiedUsername = "";

                return false;

            }


            verifiedUsername =
                cleanUsername;


            if (status) {

                status.textContent =
                    `@${cleanUsername} tasdiqlandi ✓`;

                status.className =
                    "username-status success";

            }


            return true;


        } catch (error) {

            console.error(
                "Username check error:",
                error
            );


            /*
             * Agar backend vaqtincha javob bermasa,
             * username formatini tekshirgan holda
             * davom etishga ruxsat beramiz.
             */

            verifiedUsername =
                cleanUsername;


            if (status) {

                status.textContent =
                    `@${cleanUsername} tayyor ✓`;

                status.className =
                    "username-status success";

            }


            return true;

        }

    }


    // =====================================================
    // USERNAME FORM
    // =====================================================

    function showUsernameForm(type) {

        currentProductType = type;

        showProductsPage();

        if (!products) return;


        const title =
            type === "premium"
                ? "Telegram Premium"
                : "Telegram Stars";


        const icon =
            type === "premium"
                ? "💎"
                : "⭐";


        products.innerHTML = `

            <div class="recipient-page">

                <div class="recipient-hero">

                    <div class="recipient-icon">
                        ${icon}
                    </div>

                    <span class="section-kicker">
                        TELEGRAM XIZMATI
                    </span>

                    <h2>
                        ${title}
                    </h2>

                    <p>
                        Xizmat yuboriladigan
                        Telegram username'ni kiriting.
                    </p>

                </div>


                <div class="recipient-card">

                    <label>
                        Telegram username
                    </label>


                    <div class="username-input-wrapper">

                        <span>@</span>

                        <input
                            type="text"
                            id="usernameInput"
                            placeholder="username"
                            autocomplete="off"
                            maxlength="32"
                        >

                    </div>


                    <div
                        id="usernameStatus"
                        class="username-status"
                    ></div>


                    <button
                        type="button"
                        id="continueUsernameButton"
                        class="continue-button"
                    >
                        Davom etish →
                    </button>

                </div>

            </div>

        `;


        const input =
            document.getElementById(
                "usernameInput"
            );

        const continueButton =
            document.getElementById(
                "continueUsernameButton"
            );


        if (!input || !continueButton) {
            return;
        }


        input.focus();


        input.addEventListener(
            "input",
            () => {

                verifiedUsername = "";

                clearTimeout(searchTimer);

                const value =
                    normalizeUsername(
                        input.value
                    );

                if (!value) return;


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


        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    continueButton.click();

                }

            }
        );


        continueButton.addEventListener(
            "click",
            async () => {

                const username =
                    normalizeUsername(
                        input.value
                    );


                if (!username) {

                    telegramAlert(
                        "Username kiriting."
                    );

                    return;

                }


                const valid =
                    await checkUsername(
                        username
                    );


                if (!valid) {
                    return;
                }


                currentUsername =
                    verifiedUsername ||
                    username;


                haptic("medium");


                if (
                    currentProductType ===
                    "premium"
                ) {

                    showPremiumPlans();

                } else {

                    showStarsPlans();

                }

            }
        );

    }


    // =====================================================
    // PREMIUM
    // =====================================================

    function showPremiumPlans() {

        showProductsPage();

        if (!products) return;


        products.innerHTML = `

            <div class="product-header">

                <div class="product-header-icon">
                    💎
                </div>

                <div>

                    <span class="section-kicker">
                        TELEGRAM PREMIUM
                    </span>

                    <h2>
                        Premium paketini tanlang
                    </h2>

                    <p>
                        Qabul qiluvchi:
                        <strong>
                            @${escapeHtml(
                                currentUsername
                            )}
                        </strong>
                    </p>

                </div>

            </div>


            <div class="plans-grid">

                ${premiumPlans.map(plan => `

                    <div class="product-card-new">

                        <div class="plan-icon">
                            💎
                        </div>

                        <div class="plan-info">

                            <h3>
                                ${plan.title}
                            </h3>

                            <p>
                                Telegram Premium
                            </p>

                        </div>

                        <div class="plan-bottom">

                            <strong>
                                ${formatPrice(
                                    plan.price
                                )}
                            </strong>

                            <button
                                type="button"
                                class="buy-button premium-buy-button"
                                data-months="${plan.months}"
                            >
                                Sotib olish
                            </button>

                        </div>

                    </div>

                `).join("")}

            </div>


            <div class="contact-section">

                <h3>
                    Murojaat orqali
                </h3>

                <p>
                    Boshqa Premium variant kerak
                    bo‘lsa, administrator bilan
                    bog‘lanishingiz mumkin.
                </p>


                <div class="contact-plans">

                    ${contactPlans.map(plan => `

                        <button
                            type="button"
                            class="contact-plan-button"
                            data-months="${plan.months}"
                        >

                            <span>
                                Premium ${plan.title}
                            </span>

                            <strong>
                                ${formatPrice(
                                    plan.price
                                )}
                            </strong>

                        </button>

                    `).join("")}

                </div>

            </div>

        `;


        products
            .querySelectorAll(
                ".premium-buy-button"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const months =
                            Number(
                                button.dataset.months
                            );


                        const plan =
                            premiumPlans.find(
                                item =>
                                    item.months ===
                                    months
                            );


                        if (!plan) return;


                        haptic("medium");


                        createOrder(
                            "Telegram Premium",
                            plan
                        );

                    }
                );

            });


        products
            .querySelectorAll(
                ".contact-plan-button"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        haptic("medium");

                        openContactTelegram();

                    }
                );

            });

    }


    // =====================================================
    // STARS
    // =====================================================

    function showStarsPlans() {

        showProductsPage();

        if (!products) return;


        products.innerHTML = `

            <div class="product-header">

                <div class="product-header-icon">
                    ⭐
                </div>

                <div>

                    <span class="section-kicker">
                        TELEGRAM STARS
                    </span>

                    <h2>
                        Stars miqdorini tanlang
                    </h2>

                    <p>
                        Qabul qiluvchi:
                        <strong>
                            @${escapeHtml(
                                currentUsername
                            )}
                        </strong>
                    </p>

                </div>

            </div>


            <div class="plans-grid">

                ${starsPlans.map(plan => `

                    <div class="product-card-new">

                        <div class="plan-icon">
                            ⭐
                        </div>

                        <div class="plan-info">

                            <h3>
                                ${plan.title}
                            </h3>

                            <p>
                                Telegram Stars
                            </p>

                        </div>

                        <div class="plan-bottom">

                            <strong>
                                ${formatPrice(
                                    plan.price
                                )}
                            </strong>

                            <button
                                type="button"
                                class="buy-button stars-buy-button"
                                data-stars="${plan.stars}"
                            >
                                Sotib olish
                            </button>

                        </div>

                    </div>

                `).join("")}

            </div>

        `;


        products
            .querySelectorAll(
                ".stars-buy-button"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const stars =
                            Number(
                                button.dataset.stars
                            );


                        const plan =
                            starsPlans.find(
                                item =>
                                    item.stars ===
                                    stars
                            );


                        if (!plan) return;


                        haptic("medium");


                        createOrder(
                            "Telegram Stars",
                            plan
                        );

                    }
                );

            });

    }


    // =====================================================
    // TELEGRAM CONTACT
    // =====================================================

    function openContactTelegram() {

        const username =
            "AmirquIov";

        const url =
            `https://t.me/${username}`;


        if (tg?.openTelegramLink) {

            tg.openTelegramLink(url);

        } else {

            window.open(
                url,
                "_blank"
            );

        }

    }
        // =====================================================
    // BUYURTMA YARATISH
    // =====================================================

    async function createOrder(
        product,
        option
    ) {

        const buyerId =
            getUserId();


        if (!buyerId) {

            telegramAlert(
                "Buyurtma berish uchun Mini App'ni Telegram ichida oching."
            );

            return;

        }


        const username =
            currentUsername ||
            verifiedUsername;


        if (!username) {

            telegramAlert(
                "Avval qabul qiluvchi username'ni kiriting."
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


    // =====================================================
    // BUYURTMALAR
    // =====================================================

    async function loadOrders() {

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
                        Mini App'ni Telegram ichida
                        oching.
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
                    `${SERVER_URL}/my-orders?user_id=${encodeURIComponent(
                        userId
                    )}`
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
                        Siz hali hech qanday
                        xizmat sotib olmagansiz.
                    </p>

                </div>

            `;

            return;

        }


        ordersContent.innerHTML =
            orders.map(order => {

                const status =
                    String(
                        order.status ||
                        "pending"
                    ).toLowerCase();


                const product =
                    order.product ||
                    "Noma'lum xizmat";


                const amount =
                    order.amount !==
                    undefined &&
                    order.amount !== null
                        ? formatPrice(
                            order.amount
                        )
                        : "—";


                const username =
                    order.recipient_username
                        ? "@" +
                          String(
                              order.recipient_username
                          ).replace(
                              /^@/,
                              ""
                          )
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
                                    getStatusText(
                                        status
                                    )
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

            }).join("");

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


    // =====================================================
    // REFERRAL
    // =====================================================

    function openReferral() {

        const userId =
            getUserId();


        if (!userId) {

            telegramAlert(
                "Referral uchun Mini App'ni Telegram ichida oching."
            );

            return;

        }


        const botUsername =
            "Tprembot";


        const referralLink =
            `https://t.me/${botUsername}?start=ref_${userId}`;


        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {

            navigator.clipboard
                .writeText(
                    referralLink
                )
                .then(() => {

                    telegramAlert(
                        "Referral link nusxalandi!\n\n" +
                        referralLink
                    );

                })
                .catch(() => {

                    telegramAlert(
                        "Sizning referral linkingiz:\n\n" +
                        referralLink
                    );

                });

        } else {

            telegramAlert(
                "Sizning referral linkingiz:\n\n" +
                referralLink
            );

        }

    }


    // =====================================================
    // BALANS TO‘LDIRISH
    // =====================================================

    function openBalance() {

        telegramAlert(
            "Balansni to‘ldirish tizimi tez orada ishga tushadi."
        );

    }


    // =====================================================
    // SUPPORT
    // =====================================================

    function openSupport() {

        openContactTelegram();

    }


    // =====================================================
    // NOTIFICATION
    // =====================================================

    function openNotifications() {

        showToast(
            "Hozircha yangi bildirishnomalar yo‘q."
        );

    }


    // =====================================================
    // GAMING SERVICES
    // =====================================================

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
                        `${service} — tez orada 🚀`
                    );

                }
            );

        });


    // =====================================================
    // NAVIGATION EVENTS
    // =====================================================

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


    // =====================================================
    // PREMIUM BUTTON
    // =====================================================

    if (premiumButton) {

        premiumButton.addEventListener(
            "click",
            () => {

                haptic("medium");

                showUsernameForm(
                    "premium"
                );

            }
        );

    }


    // =====================================================
    // STARS BUTTON
    // =====================================================

    if (starsButton) {

        starsButton.addEventListener(
            "click",
            () => {

                haptic("medium");

                showUsernameForm(
                    "stars"
                );

            }
        );

    }


    // =====================================================
    // PROFILE ORDERS
    // =====================================================

    if (profileOrdersButton) {

        profileOrdersButton.addEventListener(
            "click",
            showOrders
        );

    }


    // =====================================================
    // REFERRAL
    // =====================================================

    if (referralButton) {

        referralButton.addEventListener(
            "click",
            () => {

                haptic("light");

                openReferral();

            }
        );

    }


    // =====================================================
    // SUPPORT
    // =====================================================

    if (supportButton) {

        supportButton.addEventListener(
            "click",
            () => {

                haptic("light");

                openSupport();

            }
        );

    }


    // =====================================================
    // BALANCE
    // =====================================================

    if (addBalanceButton) {

        addBalanceButton.addEventListener(
            "click",
            () => {

                haptic("medium");

                openBalance();

            }
        );

    }


    if (profileAddBalanceButton) {

        profileAddBalanceButton.addEventListener(
            "click",
            () => {

                haptic("medium");

                openBalance();

            }
        );

    }


    // =====================================================
    // NOTIFICATION
    // =====================================================

    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            () => {

                haptic("light");

                openNotifications();

            }
        );

    }


    // =====================================================
    // ORDERS BACK BUTTON
    // =====================================================

    if (ordersBackButton) {

        ordersBackButton.addEventListener(
            "click",
            showHome
        );

    }


    // =====================================================
    // START
    // =====================================================

    updateUserProfile();

    setBalance(0);

    loadBalance();

    showHome();

});
