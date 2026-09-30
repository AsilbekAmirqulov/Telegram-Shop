document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // ASOSIY ELEMENTLAR
    // =====================================================

    const products =
        document.getElementById("products");

    const productsSection =
        document.getElementById("productsSection");

    const premiumButton =
        document.getElementById("premiumButton");

    const starsButton =
        document.getElementById("starsButton");

    const myOrdersButton =
        document.getElementById("myOrdersButton");

    const aiAssistantButton =
        document.getElementById("aiAssistantButton");

    const tg =
        window.Telegram?.WebApp;


    // =====================================================
    // TELEGRAM WEB APP
    // =====================================================

    if (tg) {
        tg.ready();
        tg.expand();
    }


    // =====================================================
    // SERVER
    // =====================================================

    const SERVER_URL =
        "https://telegram-shop-co3o.onrender.com";


    // =====================================================
    // PREMIUM SOVG'A PAKETLARI
    // =====================================================

    const premiumPlans = [
        {
            months: 3,
            title: "3 oy",
            price: 165000
        },
        {
            months: 6,
            title: "6 oy",
            price: 220000
        },
        {
            months: 12,
            title: "12 oy",
            price: 390000
        }
    ];


    // =====================================================
    // PREMIUM MUROJAAT ORQALI
    // =====================================================

    const contactPlans = [
        {
            months: 1,
            title: "1 oy",
            price: 40000
        },
        {
            months: 12,
            title: "12 oy",
            price: 280000
        }
    ];


    // =====================================================
    // STARS PACKAGES
    // =====================================================

    const starsPlans = [
        {
            stars: 50,
            title: "50 Stars",
            price: 11000
        },
        {
            stars: 100,
            title: "100 Stars",
            price: 30000
        },
        {
            stars: 150,
            title: "150 Stars",
            price: 40000
        },
        {
            stars: 250,
            title: "250 Stars",
            price: 64000
        },
        {
            stars: 350,
            title: "350 Stars",
            price: 89000
        },
        {
            stars: 500,
            title: "500 Stars",
            price: 125000
        },
        {
            stars: 750,
            title: "750 Stars",
            price: 185000
        },
        {
            stars: 1000,
            title: "1000 Stars",
            price: 244000
        },
        {
            stars: 1500,
            title: "1500 Stars",
            price: 365000
        },
        {
            stars: 2500,
            title: "2500 Stars",
            price: 605000
        },
        {
            stars: 5000,
            title: "5000 Stars",
            price: 1205000
        }
    ];


    // =====================================================
    // STATE
    // =====================================================

    let currentUsername = "";
    let verifiedUsername = "";
    let usernameInput = null;
    let usernameStatus = null;
    let searchTimer = null;


    // =====================================================
    // PRICE FORMAT
    // =====================================================

    function formatPrice(price) {

        return new Intl.NumberFormat(
            "uz-UZ"
        ).format(price) + " so'm";

    }


    // =====================================================
    // HTML ESCAPE
    // =====================================================

    function escapeHtml(text) {

        const div =
            document.createElement("div");

        div.textContent =
            String(text ?? "");

        return div.innerHTML;

    }


    // =====================================================
    // PRODUCTS CLEAR
    // =====================================================

    function clearProducts() {

        if (!products) {
            return;
        }

        products.innerHTML = "";

    }


    // =====================================================
    // ACTIVE BUTTONS
    // =====================================================

    function clearCategoryActive() {

        document
            .querySelectorAll(".category")
            .forEach(function (item) {

                item.classList.remove("active");

            });

    }


    // =====================================================
    // BACK BUTTON
    // =====================================================

    function createBackButton() {

        const oldButton =
            document.getElementById(
                "shopBackButton"
            );

        if (oldButton) {
            oldButton.remove();
        }


        const button =
            document.createElement("button");

        button.id =
            "shopBackButton";

        button.type =
            "button";

        button.innerHTML =
            "‹ Orqaga";


        button.style.cssText = `
            width: 100%;
            margin-bottom: 12px;
            padding: 11px 14px;
            border: none;
            border-radius: 13px;
            background: #17212b;
            color: #d8e1e8;
            font-size: 14px;
            text-align: left;
            cursor: pointer;
        `;


        button.addEventListener(
            "click",
            function () {

                if (searchTimer) {
                    clearTimeout(searchTimer);
                    searchTimer = null;
                }

                usernameInput = null;
                usernameStatus = null;
                verifiedUsername = "";
                currentUsername = "";

                clearProducts();

                productsSection.style.display =
                    "none";

                clearCategoryActive();

                button.remove();

            }
        );


        productsSection.prepend(button);

    }


    // =====================================================
    // USERNAME STATUS
    // =====================================================

    function showUsernameStatus(
        message,
        type
    ) {

        if (!usernameStatus) {
            return;
        }

        usernameStatus.textContent =
            message;

        usernameStatus.className =
            "username-status " + type;

    }


    // =====================================================
    // CHECK USERNAME
    // =====================================================

    async function checkUsername(
        username
    ) {

        username =
            username
                .trim()
                .replace(/^@/, "");


        if (!username) {

            showUsernameStatus(
                "❗ Username kiriting",
                "error"
            );

            verifiedUsername = "";

            return;

        }


        if (
            !/^[A-Za-z0-9_]{5,32}$/.test(
                username
            )
        ) {

            showUsernameStatus(
                "❗ Username noto'g'ri. Masalan: @qwerty123",
                "error"
            );

            verifiedUsername = "";

            return;

        }


        showUsernameStatus(
            "⏳ Tekshirilmoqda...",
            "loading"
        );


        try {

            const response =
                await fetch(
                    SERVER_URL +
                    "/check-username?username=" +
                    encodeURIComponent(username)
                );


            const data =
                await response.json();


            if (!data.ok) {

                verifiedUsername = "";

                showUsernameStatus(
                    data.message ||
                    "❌ Username topilmadi",
                    "error"
                );

                return;

            }


            verifiedUsername =
                data.username;


            currentUsername =
                data.username;


            showUsernameStatus(
                data.message ||
                "👤 Telegram foydalanuvchisi: @" +
                verifiedUsername,
                "success"
            );

        }

        catch (error) {

            console.error(
                "Username check error:",
                error
            );

            verifiedUsername = "";

            showUsernameStatus(
                "❌ Username tekshirib bo'lmadi",
                "error"
            );

        }

    }


    // =====================================================
    // RECIPIENT FORM
    // =====================================================

    function showRecipientForm(
        type = "premium"
    ) {

        // Eski timerlarni to'xtatish
        if (searchTimer) {
            clearTimeout(searchTimer);
            searchTimer = null;
        }

        // Eski state'ni to'liq tozalash
        currentUsername = "";
        verifiedUsername = "";
        usernameInput = null;
        usernameStatus = null;


        clearProducts();

        productsSection.style.display =
            "block";

        createBackButton();


        products.innerHTML = `

            <div class="gift-form">

                <div class="form-title">
                    ${
                        type === "premium"
                            ? "💎 Premium oluvchi"
                            : "⭐ Stars oluvchi"
                    }
                </div>

                <div class="form-description">
                    ${
                        type === "premium"
                            ? "Premium yubormoqchi bo'lgan Telegram foydalanuvchisining username'ini kiriting."
                            : "Stars yubormoqchi bo'lgan Telegram foydalanuvchisining username'ini kiriting."
                    }
                </div>

                <input
                    type="text"
                    id="usernameInput"
                    class="username-input"
                    placeholder="@qwerty123"
                    autocomplete="off"
                    autocapitalize="none"
                    spellcheck="false"
                >

                <div
                    id="usernameStatus"
                    class="username-status"
                ></div>

                <button
                    type="button"
                    id="continueUsernameButton"
                    class="continue-button"
                    style="
                        display: block;
                        width: 100%;
                        margin-top: 12px;
                        padding: 13px 16px;
                        border: none;
                        border-radius: 13px;
                        background: #2aabee;
                        color: #ffffff;
                        font-size: 15px;
                        font-weight: 700;
                        cursor: pointer;
                        opacity: 1;
                        visibility: visible;
                    "
                >
                    Davom etish →
                </button>

            </div>

        `;


        // YANGI DOM elementlarni olish
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


        // Inputni to'liq tozalash
        usernameInput.value = "";

        usernameInput.focus();


        // =================================================
        // USERNAME INPUT
        // =================================================

        usernameInput.addEventListener(
            "input",
            function () {

                if (searchTimer) {
                    clearTimeout(searchTimer);
                    searchTimer = null;
                }

                verifiedUsername = "";
                currentUsername = "";


                const value =
                    usernameInput.value.trim();


                if (!value) {

                    showUsernameStatus(
                        "",
                        ""
                    );

                    return;

                }


                searchTimer =
                    setTimeout(
                        function () {

                            checkUsername(
                                value
                            );

                        },
                        500
                    );

            }
        );


        // =================================================
        // DAVOM ETISH
        // =================================================

        continueButton.addEventListener(
            "click",
            async function () {

                const username =
                    usernameInput.value.trim();


                if (!username) {

                    showUsernameStatus(
                        "❗ Username kiriting",
                        "error"
                    );

                    usernameInput.focus();

                    return;

                }


                // Inputdagi eski tekshiruvni to'xtatish
                if (searchTimer) {
                    clearTimeout(searchTimer);
                    searchTimer = null;
                }


                // Har safar tugma bosilganda yangi tekshiruv
                verifiedUsername = "";


                continueButton.disabled = true;

                continueButton.style.opacity =
                    "0.6";

                continueButton.textContent =
                    "⏳ Tekshirilmoqda...";


                await checkUsername(
                    username
                );


                continueButton.disabled = false;

                continueButton.style.opacity =
                    "1";

                continueButton.textContent =
                    "Davom etish →";


                if (!verifiedUsername) {
                    return;
                }


                const finalUsername =
                    verifiedUsername;


                // Formani yopib, keyingi bosqichga o'tamiz
                usernameInput = null;
                usernameStatus = null;


                if (type === "premium") {

                    showPremium(
                        finalUsername
                    );

                }

                else {

                    showStars(
                        finalUsername
                    );

                }

            }
        );

    }


    // =====================================================
    // GET USERNAME
    // =====================================================

    function getUsername() {

        return (
            verifiedUsername ||
            currentUsername
        );

    }


    // =====================================================
    // PREMIUM PACKAGES
    // =====================================================

    function showPremium(
        username
    ) {

        // Eski input state'larini tozalash
        if (searchTimer) {
            clearTimeout(searchTimer);
            searchTimer = null;
        }

        usernameInput = null;
        usernameStatus = null;


        clearProducts();

        productsSection.style.display =
            "block";

        createBackButton();


        products.innerHTML = `

            <div class="section-title">
                💎 Telegram Premium
            </div>

            <div class="section-subtitle">
                👤 @${escapeHtml(username)}
            </div>

            <div class="form-description"
                 style="margin-bottom: 12px;">
                🎁 Premium sovg'a paketlari
            </div>

        `;


        // =================================================
        // 3 / 6 / 12 OY SOVG'A
        // =================================================

        premiumPlans.forEach(
            function (plan) {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "product-card";


                card.innerHTML = `

                    <div class="product-info">

                        <strong>
                            🎁 Premium ${plan.title}
                        </strong>

                        <span>
                            Telegram Premium sovg'a
                        </span>

                    </div>

                    <div class="product-price">
                        ${formatPrice(plan.price)}
                    </div>

                    <button
                        type="button"
                        class="buy-button"
                    >
                        Sotib olish
                    </button>

                `;


                const button =
                    card.querySelector(
                        ".buy-button"
                    );


                button.addEventListener(
                    "click",
                    function () {

                        createOrder(
                            "Telegram Premium",
                            username,
                            plan,
                            plan.price
                        );

                    }
                );


                products.appendChild(card);

            }
        );


        // =================================================
        // MUROJAAT ORQALI
        // =================================================

        const contactTitle =
            document.createElement("div");

        contactTitle.className =
            "section-title";

        contactTitle.style.marginTop =
            "22px";

        contactTitle.textContent =
            "📞 Murojaat orqali Premium";

        products.appendChild(
            contactTitle
        );


        const contactDescription =
            document.createElement("div");

        contactDescription.className =
            "form-description";

        contactDescription.style.marginBottom =
            "12px";

        contactDescription.textContent =
            "Ushbu paketlar bo'yicha @AmirquIov ga murojaat qiling.";

        products.appendChild(
            contactDescription
        );


        // 1 OY va 12 OY — ALOHIDA
        contactPlans.forEach(
            function (plan) {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "product-card";


                card.innerHTML = `

                    <div class="product-info">

                        <strong>
                            📞 Premium ${plan.title}
                        </strong>

                        <span>
                            Murojaat orqali
                        </span>

                    </div>

                    <div class="product-price">
                        ${formatPrice(plan.price)}
                    </div>

                    <button
                        type="button"
                        class="buy-button"
                    >
                        @AmirquIov ga murojaat qilish
                    </button>

                `;


                const button =
                    card.querySelector(
                        ".buy-button"
                    );


                button.addEventListener(
                    "click",
                    function () {

                        openContactTelegram();

                    }
                );


                products.appendChild(card);

            }
        );

    }


    // =====================================================
    // TELEGRAM CONTACT
    // =====================================================

    function openContactTelegram() {

        const username =
            "AmirquIov";


        const telegramUrl =
            "https://t.me/" + username;


        if (tg && typeof tg.openTelegramLink === "function") {

            tg.openTelegramLink(
                telegramUrl
            );

        }

        else {

            window.open(
                telegramUrl,
                "_blank"
            );

        }

    }


    // =====================================================
    // STARS PACKAGES
    // =====================================================

    function showStars(
        username
    ) {

        // Eski input state'larini tozalash
        if (searchTimer) {
            clearTimeout(searchTimer);
            searchTimer = null;
        }

        usernameInput = null;
        usernameStatus = null;


        clearProducts();

        productsSection.style.display =
            "block";

        createBackButton();


        products.innerHTML = `

            <div class="section-title">
                ⭐ Telegram Stars
            </div>

            <div class="section-subtitle">
                👤 @${escapeHtml(username)}
            </div>

        `;


        starsPlans.forEach(
            function (plan) {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "product-card";


                card.innerHTML = `

                    <div class="product-info">

                        <strong>
                            ⭐ ${plan.title}
                        </strong>

                        <span>
                            Telegram Stars
                        </span>

                    </div>

                    <div class="product-price">
                        ${formatPrice(plan.price)}
                    </div>

                    <button
                        type="button"
                        class="buy-button"
                    >
                        Sotib olish
                    </button>

                `;


                const button =
                    card.querySelector(
                        ".buy-button"
                    );


                button.addEventListener(
                    "click",
                    function () {

                        createOrder(
                            "Telegram Stars",
                            username,
                            plan,
                            plan.price
                        );

                    }
                );


                products.appendChild(card);

            }
        );

    }


    // =====================================================
    // CREATE ORDER
    // =====================================================

    async function createOrder(
        product,
        username,
        option,
        amount
    ) {

        if (
            !tg ||
            !tg.initDataUnsafe ||
            !tg.initDataUnsafe.user
        ) {

            alert(
                "Telegram foydalanuvchisi aniqlanmadi."
            );

            return;

        }


        const buyer =
            tg.initDataUnsafe.user;


        const confirmed =
            confirm(
                "Buyurtmani yaratmoqchimisiz?"
            );


        if (!confirmed) {
            return;
        }


        const payload = {

            user_id:
                buyer.id,

            product:
                product,

            amount:
                amount,

            recipient_username:
                username,

            months:
                product === "Telegram Premium"
                    ? option.months
                    : null,

            stars:
                product === "Telegram Stars"
                    ? option.stars
                    : null

        };


        try {

            const response =
                await fetch(
                    SERVER_URL +
                    "/create-order",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(payload)

                    }
                );


            const data =
                await response.json();


            if (!data.ok) {

                alert(
                    data.message ||
                    "Buyurtma yaratilmadi."
                );

                return;

            }


            alert(
                "✅ Buyurtma yaratildi!\n\n" +
                "Buyurtma #" +
                data.order_id
            );


            showMyOrders();

        }

        catch (error) {

            console.error(
                "Create order error:",
                error
            );

            alert(
                "❌ Server bilan bog'lanib bo'lmadi."
            );

        }

    }


    // =====================================================
    // MY ORDERS
    // =====================================================

    async function showMyOrders() {

        clearProducts();

        productsSection.style.display =
            "block";

        createBackButton();


        products.innerHTML = `
            <div class="orders-loading">
                ⏳ Buyurtmalar yuklanmoqda...
            </div>
        `;


        if (
            !tg ||
            !tg.initDataUnsafe ||
            !tg.initDataUnsafe.user
        ) {

            products.innerHTML = `

                <div class="orders-empty">

                    <div class="orders-empty-icon">
                        ⚠️
                    </div>

                    <h3>
                        Foydalanuvchi aniqlanmadi
                    </h3>

                    <p>
                        Buyurtmalarni ko'rish uchun
                        Telegram orqali oching.
                    </p>

                </div>

            `;

            return;

        }


        const buyer =
            tg.initDataUnsafe.user;


        try {

            const response =
                await fetch(
                    SERVER_URL +
                    "/my-orders?user_id=" +
                    encodeURIComponent(
                        buyer.id
                    )
                );


            const data =
                await response.json();


            if (!data.ok) {

                products.innerHTML = `

                    <div class="orders-empty">

                        <div class="orders-empty-icon">
                            ⚠️
                        </div>

                        <h3>
                            Xatolik
                        </h3>

                        <p>
                            ${
                                escapeHtml(
                                    data.message ||
                                    "Buyurtmalarni yuklab bo'lmadi."
                                )
                            }
                        </p>

                    </div>

                `;

                return;

            }


            if (
                !data.orders ||
                data.orders.length === 0
            ) {

                products.innerHTML = `

                    <div class="orders-empty">

                        <div class="orders-empty-icon">
                            📦
                        </div>

                        <h3>
                            Hozircha buyurtmalar yo'q
                        </h3>

                        <p>
                            Buyurtma berganingizdan
                            keyin ular shu yerda ko'rinadi.
                        </p>

                    </div>

                `;

                return;

            }


            products.innerHTML = `

                <div class="section-title">
                    📦 Mening buyurtmalarim
                </div>

                <div class="orders-container"></div>

            `;


            const ordersContainer =
                products.querySelector(
                    ".orders-container"
                );


            data.orders.forEach(
                function (order) {

                    let statusText =
                        "Noma'lum";

                    let statusClass =
                        "";


                    if (
                        order.status === "pending"
                    ) {

                        statusText =
                            "Kutilmoqda";

                        statusClass =
                            "status-pending";

                    }

                    else if (
                        order.status === "paid"
                    ) {

                        statusText =
                            "To'langan";

                        statusClass =
                            "status-paid";

                    }

                    else if (
                        order.status === "processing"
                    ) {

                        statusText =
                            "Jarayonda";

                        statusClass =
                            "status-processing";

                    }

                    else if (
                        order.status === "completed"
                    ) {

                        statusText =
                            "Yakunlangan";

                        statusClass =
                            "status-completed";

                    }

                    else if (
                        order.status === "cancelled"
                    ) {

                        statusText =
                            "Bekor qilingan";

                        statusClass =
                            "status-cancelled";

                    }


                    let packageText =
                        "";


                    if (
                        order.product ===
                        "Telegram Premium"
                    ) {

                        packageText =
                            order.months
                                ? order.months + " oy"
                                : "Premium";

                    }

                    else if (
                        order.product ===
                        "Telegram Stars"
                    ) {

                        packageText =
                            order.stars
                                ? order.stars + " Stars"
                                : "Stars";

                    }


                    const card =
                        document.createElement(
                            "div"
                        );


                    card.className =
                        "order-card";


                    card.innerHTML = `

                        <div class="order-header">

                            <div class="order-title">
                                ${escapeHtml(
                                    order.product
                                )}
                            </div>

                            <div class="order-id">
                                #${order.id}
                            </div>

                        </div>

                        <div class="order-recipient">
                            👤 @${escapeHtml(
                                order.telegram_username ||
                                "Noma'lum"
                            )}
                        </div>

                        <div class="order-info">

                            <div class="order-row">

                                <span class="order-row-label">
                                    Paket
                                </span>

                                <span class="order-row-value">
                                    ${escapeHtml(
                                        packageText
                                    )}
                                </span>

                            </div>

                            <div class="order-row">

                                <span class="order-row-label">
                                    Holati
                                </span>

                                <span
                                    class="order-status ${statusClass}"
                                >
                                    ${statusText}
                                </span>

                            </div>

                        </div>

                        <div class="order-price">

                            <span>
                                Jami
                            </span>

                            <strong>
                                ${formatPrice(
                                    order.amount
                                )}
                            </strong>

                        </div>

                    `;


                    ordersContainer.appendChild(
                        card
                    );

                }
            );

        }

        catch (error) {

            console.error(
                "My orders error:",
                error
            );


            products.innerHTML = `

                <div class="orders-empty">

                    <div class="orders-empty-icon">
                        ⚠️
                    </div>

                    <h3>
                        Xatolik yuz berdi
                    </h3>

                    <p>
                        Buyurtmalarni yuklashda
                        server bilan bog'lanib bo'lmadi.
                    </p>

                </div>

            `;

        }

    }


    // =====================================================
    // AI ASSISTANT
    // =====================================================

    function showAIAssistant() {

        clearProducts();

        productsSection.style.display =
            "block";

        createBackButton();


        products.innerHTML = `

            <div class="ai-assistant-container">

                <div class="ai-chat-header">

                    <div class="ai-chat-avatar">
                        🤖
                    </div>

                    <div class="ai-chat-info">

                        <strong>
                            AI Assistant
                        </strong>

                        <span>
                            ● Online
                        </span>

                    </div>

                </div>


                <div class="ai-welcome">

                    <strong>
                        👋 Assalomu alaykum!
                    </strong>

                    Men Premium Shop bo'yicha
                    savollaringizga yordam beraman.

                </div>


                <div class="ai-quick-questions">

                    <button
                        class="ai-quick-button"
                        type="button"
                        data-question="Premium narxlari qancha?"
                    >
                        💎 Premium narxlari
                    </button>

                    <button
                        class="ai-quick-button"
                        type="button"
                        data-question="Stars narxlari qanday?"
                    >
                        ⭐ Stars narxlari
                    </button>

                    <button
                        class="ai-quick-button"
                        type="button"
                        data-question="Buyurtmam haqida ma'lumot ber"
                    >
                        📦 Buyurtmam haqida
                    </button>

                    <button
                        class="ai-quick-button"
                        type="button"
                        data-question="Qanday qilib sotib olaman?"
                    >
                        ❓ Qanday sotib olaman?
                    </button>

                </div>


                <div
                    class="ai-messages"
                    id="aiMessages"
                ></div>


                <div class="ai-input-area">

                    <input
                        type="text"
                        class="ai-input"
                        id="aiInput"
                        placeholder="Savolingizni yozing..."
                        autocomplete="off"
                    >

                    <button
                        type="button"
                        class="ai-send-button"
                        id="aiSendButton"
                    >
                        ➤
                    </button>

                </div>

            </div>

        `;


        const aiInput =
            document.getElementById(
                "aiInput"
            );

        const aiSendButton =
            document.getElementById(
                "aiSendButton"
            );

        const aiMessages =
            document.getElementById(
                "aiMessages"
            );


        const userId =
            tg?.initDataUnsafe?.user?.id || 0;


        function addAIMessage(
            text,
            type
        ) {

            const message =
                document.createElement(
                    "div"
                );

            message.className =
                "ai-message " + type;

            message.textContent =
                text;

            aiMessages.appendChild(
                message
            );

            aiMessages.scrollTop =
                aiMessages.scrollHeight;

        }


        async function sendAIMessage(
            text
        ) {

            text =
                text.trim();


            if (!text) {
                return;
            }


            addAIMessage(
                text,
                "user"
            );


            aiInput.value = "";

            aiInput.disabled = true;
            aiSendButton.disabled = true;


            const loadingMessage =
                document.createElement(
                    "div"
                );

            loadingMessage.className =
                "ai-message bot";

            loadingMessage.textContent =
                "🤔 O‘ylayapman...";


            aiMessages.appendChild(
                loadingMessage
            );


            aiMessages.scrollTop =
                aiMessages.scrollHeight;


            try {

                const response =
                    await fetch(
                        SERVER_URL +
                        "/ai-chat",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    message: text,
                                    user_id: userId
                                })

                        }
                    );


                const data =
                    await response.json();


                loadingMessage.remove();


                if (
                    data.ok &&
                    data.reply
                ) {

                    addAIMessage(
                        data.reply,
                        "bot"
                    );

                }

                else {

                    addAIMessage(
                        "❌ AI javob bera olmadi. Iltimos, qaytadan urinib ko‘ring.",
                        "bot"
                    );

                }

            }

            catch (error) {

                console.error(
                    "AI Chat Error:",
                    error
                );


                loadingMessage.remove();


                addAIMessage(
                    "❌ Server bilan bog‘lanishda xatolik yuz berdi.",
                    "bot"
                );

            }


            aiInput.disabled = false;
            aiSendButton.disabled = false;

            aiInput.focus();

        }


        aiSendButton.addEventListener(
            "click",
            function () {

                sendAIMessage(
                    aiInput.value
                );

            }
        );


        aiInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    sendAIMessage(
                        aiInput.value
                    );

                }

            }
        );


        const quickButtons =
            document.querySelectorAll(
                ".ai-quick-button"
            );


        quickButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        sendAIMessage(
                            button.dataset.question
                        );

                    }
                );

            }
        );

    }


    // =====================================================
    // PREMIUM CATEGORY
    // =====================================================

    if (premiumButton) {

        premiumButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                clearCategoryActive();

                premiumButton.classList.add(
                    "active"
                );


                showRecipientForm(
                    "premium"
                );

            }
        );

    }


    // =====================================================
    // MY ORDERS CATEGORY
    // =====================================================

    if (myOrdersButton) {

        myOrdersButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                clearCategoryActive();

                myOrdersButton.classList.add(
                    "active"
                );


                showMyOrders();

            }
        );

    }


    // =====================================================
    // STARS CATEGORY
    // =====================================================

    if (starsButton) {

        starsButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                clearCategoryActive();

                starsButton.classList.add(
                    "active"
                );


                showRecipientForm(
                    "stars"
                );

            }
        );

    }


    // =====================================================
    // AI ASSISTANT CATEGORY
    // =====================================================

    if (aiAssistantButton) {

        aiAssistantButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                clearCategoryActive();

                aiAssistantButton.classList.add(
                    "active"
                );


                showAIAssistant();

            }
        );

    }


    // =====================================================
    // BOSHLANG'ICH HOLAT
    // =====================================================

    clearProducts();

    productsSection.style.display =
        "none";

});
