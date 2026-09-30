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
    // ============================================================
// AI ASSISTANT
// ============================================================

aiAssistantButton?.addEventListener("click", function () {

    clearProducts();

    productsSection.style.display = "block";

    document
        .querySelectorAll(".category")
        .forEach(button => {
            button.classList.remove("active");
        });

    aiAssistantButton.classList.add("active");

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

                Men Premium Shop bo‘yicha
                savollaringizga yordam beraman.

            </div>


            <div class="ai-quick-questions">

                <button
                    class="ai-quick-button"
                    type="button"
                >
                    💎 Premium narxlari
                </button>

                <button
                    class="ai-quick-button"
                    type="button"
                >
                    ⭐ Stars narxlari
                </button>

                <button
                    class="ai-quick-button"
                    type="button"
                >
                    📦 Buyurtmam haqida
                </button>

                <button
                    class="ai-quick-button"
                    type="button"
                >
                    ❓ Qanday sotib olaman?
                </button>

            </div>


            <div
                class="ai-messages"
                id="aiMessages"
            >
            </div>


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
        document.getElementById("aiInput");

    const aiSendButton =
        document.getElementById("aiSendButton");

    const aiMessages =
        document.getElementById("aiMessages");


    function sendAIMessage(text) {

        text = text.trim();

        if (!text) return;


        aiMessages.insertAdjacentHTML(
            "beforeend",
            `
            <div class="ai-message user">
                ${escapeHtml(text)}
            </div>
            `
        );


        aiInput.value = "";

        aiMessages.insertAdjacentHTML(
            "beforeend",
            `
            <div class="ai-message bot">
                🤖 Hozircha AI Assistant demo rejimida.
                Tez orada sizga javob bera olaman.
            </div>
            `
        );


        aiMessages.scrollTop =
            aiMessages.scrollHeight;
    }


    aiSendButton.addEventListener(
        "click",
        function () {
            sendAIMessage(aiInput.value);
        }
    );


    aiInput.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                sendAIMessage(aiInput.value);
            }
        }
    );


    document
        .querySelectorAll(".ai-quick-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    sendAIMessage(
                        button.textContent.trim()
                    );

                }
            );

        });

});

    const tg =
        window.Telegram?.WebApp;


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
    // PREMIUM PAKETLARI
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
    // MUROJAAT ORQALI PREMIUM
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
    // TELEGRAM STARS
    // =====================================================

    const starsPlans = [

        ["50", 11000],
        ["100", 30000],
        ["150", 40000],
        ["250", 64000],
        ["350", 89000],
        ["500", 125000],
        ["750", 185000],
        ["1000", 244000],
        ["1500", 365000],
        ["2500", 605000],
        ["5000", 1205000]

    ];


    // =====================================================
    // HOLAT
    // =====================================================

    let currentUsername = "";
    let verifiedUsername = "";

    let usernameInput = null;
    let usernameStatus = null;

    let searchTimer = null;


    // =====================================================
    // YORDAMCHI FUNKSIYALAR
    // =====================================================

    function formatPrice(price) {

        return Number(price).toLocaleString("uz-UZ")
            + " so'm";
    }


    function escapeHtml(text) {

        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function clearProducts() {

        products.innerHTML = "";
    }


    // =====================================================
    // ORQAGA TUGMASI
    // =====================================================

    function createBackButton(text) {

        const wrapper =
            document.createElement("div");

        wrapper.style.marginBottom = "12px";


        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "buy-button";

        button.style.width =
            "100%";

        button.style.background =
            "#17212b";

        button.style.border =
            "1px solid rgba(255,255,255,0.08)";

        button.style.textAlign =
            "left";

        button.textContent =
            "← " + text;


        wrapper.appendChild(button);

        products.appendChild(wrapper);

        return button;
    }


    // =====================================================
    // USERNAME STATUS
    // =====================================================

    function showStatus(message, type) {

        if (!usernameStatus || !usernameInput) {
            return;
        }


        usernameStatus.textContent =
            message;

        usernameStatus.style.display =
            "block";


        if (type === "success") {

            usernameStatus.style.background =
                "rgba(50,200,100,0.12)";

            usernameStatus.style.color =
                "#35c759";

            usernameInput.style.borderColor =
                "#35c759";


        } else if (type === "loading") {

            usernameStatus.style.background =
                "rgba(80,150,255,0.12)";

            usernameStatus.style.color =
                "#4d9cff";

            usernameInput.style.borderColor =
                "#4d9cff";


        } else {

            usernameStatus.style.background =
                "rgba(255,70,70,0.12)";

            usernameStatus.style.color =
                "#ff5c5c";

            usernameInput.style.borderColor =
                "#ff5c5c";
        }
    }


    function clearStatus() {

        if (!usernameStatus || !usernameInput) {
            return;
        }


        usernameStatus.style.display =
            "none";

        usernameStatus.textContent =
            "";

        usernameInput.style.borderColor =
            "";

        verifiedUsername =
            "";
    }


    // =====================================================
    // USERNAME TEKSHIRISH
    // =====================================================

    async function checkUsername(username) {

        if (!usernameInput || !usernameStatus) {
            return null;
        }


        showStatus(
            "🔍 Telegram foydalanuvchisi qidirilmoqda...",
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


            if (data.ok) {

                verifiedUsername =
                    data.username;

                currentUsername =
                    data.username;


                showStatus(
                    "👤 Telegram foydalanuvchisi: @" +
                    data.username,
                    "success"
                );


                return data.username;
            }


            verifiedUsername = "";


            showStatus(
                data.message ||
                "❗ Username topilmadi.",
                "error"
            );


            return null;


        } catch (error) {

            console.error(
                "Username check error:",
                error
            );


            verifiedUsername = "";


            showStatus(
                "❗ Username tekshirilmayapti. Qaytadan urinib ko‘ring.",
                "error"
            );


            return null;
        }
    }


    // =====================================================
    // USERNAME FORM
    // =====================================================

    function showRecipientForm(type = "premium") {

        clearProducts();

        productsSection.style.display =
            "block";

        verifiedUsername = "";


        const isPremium =
            type === "premium";


        products.innerHTML = `

            <div class="gift-form">

                <h2>
                    ${
                        isPremium
                            ? "💎 Telegram Premium"
                            : "⭐ Telegram Stars"
                    }
                </h2>

                <p class="gift-description">
                    Kimga yubormoqchisiz?
                </p>

                <p class="gift-description">
                    Telegram username'ini kiriting
                </p>


                <input
                    type="text"
                    id="recipientUsername"
                    class="username-input"
                    placeholder="@username"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="none"
                    spellcheck="false"
                    inputmode="text"
                >


                <div
                    id="usernameStatus"
                    style="
                        display:none;
                        margin-top:8px;
                        padding:8px 10px;
                        border-radius:10px;
                        font-size:13px;
                    "
                ></div>


                <p class="username-hint">
                    Masalan: @qwerty123
                </p>


                <button
                    type="button"
                    class="buy-button"
                    id="continueProduct"
                    style="
                        width:100%;
                        margin-top:14px;
                    "
                >
                    ${
                        isPremium
                            ? "💎 Premium paketlarini ko‘rish"
                            : "⭐ Stars paketlarini ko‘rish"
                    }
                </button>

            </div>

        `;


        usernameInput =
            document.getElementById(
                "recipientUsername"
            );


        usernameStatus =
            document.getElementById(
                "usernameStatus"
            );


        // =================================================
        // OLDINGI USERNAME
        // =================================================

        if (currentUsername) {

            usernameInput.value =
                "@" + currentUsername;
        }


        // =================================================
        // USERNAME INPUT
        // =================================================

        usernameInput.addEventListener(
            "input",
            function () {

                clearTimeout(searchTimer);

                verifiedUsername = "";


                const raw =
                    usernameInput.value.trim();


                if (!raw) {

                    clearStatus();

                    return;
                }


                if (
                    raw.includes("@") &&
                    !raw.startsWith("@")
                ) {

                    showStatus(
                        "❗ Username noto‘g‘ri.",
                        "error"
                    );

                    return;
                }


                const username =
                    raw.replace(/^@/, "");


                if (
                    !/^[a-zA-Z0-9_]*$/.test(
                        username
                    )
                ) {

                    showStatus(
                        "❗ Username noto‘g‘ri.",
                        "error"
                    );

                    return;
                }


                if (
                    username.length > 32
                ) {

                    showStatus(
                        "❗ Username juda uzun.",
                        "error"
                    );

                    return;
                }


                if (
                    username.length < 5
                ) {

                    usernameStatus.style.display =
                        "none";

                    usernameInput.style.borderColor =
                        "";

                    return;
                }


                searchTimer =
                    setTimeout(
                        function () {

                            checkUsername(
                                username
                            );

                        },
                        600
                    );
            }
        );


        // =================================================
        // DAVOM ETISH
        // =================================================

        const continueProduct =
            document.getElementById(
                "continueProduct"
            );


        if (continueProduct) {

            continueProduct.addEventListener(
                "click",
                async function (event) {

                    event.preventDefault();
                    event.stopPropagation();


                    const username =
                        await getUsername();


                    if (!username) {
                        return;
                    }


                    if (isPremium) {

                        showPremium(
                            username
                        );

                    } else {

                        showStars(
                            username
                        );
                    }
                }
            );
        }
    }


    // =====================================================
    // USERNAME OLISH
    // =====================================================

    async function getUsername() {

        if (!usernameInput) {
            return null;
        }


        const raw =
            usernameInput.value.trim();


        if (!raw) {

            showStatus(
                "❗ Avval Telegram username kiriting.",
                "error"
            );

            usernameInput.focus();

            return null;
        }


        if (
            raw.includes("@") &&
            !raw.startsWith("@")
        ) {

            showStatus(
                "❗ Username noto‘g‘ri.",
                "error"
            );

            usernameInput.focus();

            return null;
        }


        const username =
            raw.replace(/^@/, "");


        if (
            !/^[a-zA-Z0-9_]{5,32}$/.test(
                username
            )
        ) {

            showStatus(
                "❗ Username noto‘g‘ri.",
                "error"
            );

            usernameInput.focus();

            return null;
        }


        if (
            verifiedUsername &&
            verifiedUsername.toLowerCase() ===
            username.toLowerCase()
        ) {

            currentUsername =
                verifiedUsername;

            return verifiedUsername;
        }


        const result =
            await checkUsername(
                username
            );


        if (!result) {

            usernameInput.focus();

            return null;
        }


        currentUsername =
            result;

        return result;
    }


    // =====================================================
    // PREMIUM PAKETLARI
    // =====================================================

    function showPremium(username) {

        currentUsername =
            username;

        clearProducts();


        // -------------------------------------------------
        // ORQAGA
        // -------------------------------------------------

        const backButton =
            createBackButton(
                "Username kiritish"
            );


        backButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                showRecipientForm(
                    "premium"
                );
            }
        );


        // -------------------------------------------------
        // HEADER
        // -------------------------------------------------

        products.insertAdjacentHTML(
            "beforeend",
            `

            <div class="gift-form">

                <h2>
                    💎 Telegram Premium
                </h2>

                <p class="gift-description">
                    🎁 @${escapeHtml(username)}
                    uchun Premium
                </p>

            </div>


            <div
                id="premiumPlans"
                style="
                    display:flex;
                    flex-direction:column;
                    gap:10px;
                "
            ></div>


            <div
                style="
                    margin-top:20px;
                    margin-bottom:10px;
                    padding:0 3px;
                "
            >
                <h3 style="
                    font-size:16px;
                    font-weight:700;
                ">
                    💬 Murojaat orqali
                </h3>
            </div>


            <div
                id="contactPlans"
                style="
                    display:flex;
                    flex-direction:column;
                    gap:10px;
                "
            ></div>

            `
        );


        const plans =
            document.getElementById(
                "premiumPlans"
            );

        const contacts =
            document.getElementById(
                "contactPlans"
            );


        // =================================================
        // ODDIY PREMIUM
        // =================================================

        premiumPlans.forEach(
            function (plan) {

                plans.insertAdjacentHTML(
                    "beforeend",
                    `

                    <div class="product-card">

                        <h3>
                            💎 Premium — ${plan.title}
                        </h3>

                        <p>
                            @${escapeHtml(username)}
                            ga sovg‘a
                        </p>

                        <div class="product-price">

                            <span class="price">
                                ${formatPrice(plan.price)}
                            </span>

                            <button
                                type="button"
                                class="buy-button premium-buy"
                                data-months="${plan.months}"
                                data-price="${plan.price}"
                            >
                                🎁 Davom etish
                            </button>

                        </div>

                    </div>

                    `
                );
            }
        );


        // =================================================
        // MUROJAAT PREMIUM
        // =================================================

        contactPlans.forEach(
            function (plan) {

                contacts.insertAdjacentHTML(
                    "beforeend",
                    `

                    <div class="product-card">

                        <h3>
                            💬 Premium — ${plan.title}
                            (murojaat)
                        </h3>

                        <p>
                            @${escapeHtml(username)}
                            uchun
                        </p>

                        <div class="product-price">

                            <span class="price">
                                ${formatPrice(plan.price)}
                            </span>

                            <button
                                type="button"
                                class="buy-button contact-buy"
                                data-months="${plan.months}"
                                data-price="${plan.price}"
                            >
                                💬 Murojaat
                            </button>

                        </div>

                    </div>

                    `
                );
            }
        );


        // =================================================
        // PREMIUM BUTTONLAR
        // =================================================

        plans
            .querySelectorAll(".premium-buy")
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function (event) {

                            event.preventDefault();
                            event.stopPropagation();


                            const months =
                                Number(
                                    button.dataset.months
                                );

                            const price =
                                Number(
                                    button.dataset.price
                                );


                            createOrder(
                                "Telegram Premium",
                                username,
                                months,
                                price
                            );
                        }
                    );
                }
            );


        // =================================================
        // CONTACT BUTTONLAR
        // =================================================

        contacts
            .querySelectorAll(".contact-buy")
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function (event) {

                            event.preventDefault();
                            event.stopPropagation();


                            const months =
                                Number(
                                    button.dataset.months
                                );

                            const price =
                                Number(
                                    button.dataset.price
                                );


                            showContactPage(
                                username,
                                months,
                                price
                            );
                        }
                    );
                }
            );
    }


    // =====================================================
    // MUROJAAT SAHIFASI
    // =====================================================

    function showContactPage(
        username,
        months,
        price
    ) {

        currentUsername =
            username;

        clearProducts();


        const backButton =
            createBackButton(
                "Premium paketlari"
            );


        backButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                showPremium(
                    username
                );
            }
        );


        products.insertAdjacentHTML(
            "beforeend",
            `

            <div class="gift-form">

                <h2>
                    💎 ${months} oylik Premium
                </h2>

                <p class="gift-description">
                    🎁 @${escapeHtml(username)}
                    uchun
                </p>

            </div>


            <div class="product-card">

                <h3>
                    💬 ${months} oylik Premium
                </h3>

                <p>
                    ${formatPrice(price)}
                </p>

                <p style="
                    margin-top:12px;
                    color:#ffffff;
                    opacity:0.85;
                    line-height:1.5;
                ">

                    ${
                        months === 1
                            ? "1 oylik premium obuna olish uchun @AmirquIov ga yozing."
                            : "12 oylik premium obuna olish uchun @AmirquIov ga yozing."
                    }

                </p>


                <button
                    type="button"
                    class="buy-button"
                    id="contactTelegramButton"
                    style="
                        margin-top:14px;
                        width:100%;
                    "
                >
                    💬 @AmirquIov ga murojaat qilish
                </button>

            </div>

            `
        );


        const contactButton =
            document.getElementById(
                "contactTelegramButton"
            );


        if (contactButton) {

            contactButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();
                    event.stopPropagation();


                    const url =
                        "https://t.me/AmirquIov";


                    if (tg) {

                        tg.openTelegramLink(
                            url
                        );

                    } else {

                        window.open(
                            url,
                            "_blank"
                        );
                    }
                }
            );
        }
    }


    // =====================================================
    // TELEGRAM STARS
    // =====================================================

    function showStars(username) {

        currentUsername =
            username;

        clearProducts();


        // -------------------------------------------------
        // ORQAGA
        // -------------------------------------------------

        const backButton =
            createBackButton(
                "Username kiritish"
            );


        backButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                showRecipientForm(
                    "stars"
                );
            }
        );


        // -------------------------------------------------
        // HEADER
        // -------------------------------------------------

        products.insertAdjacentHTML(
            "beforeend",
            `

            <div class="gift-form">

                <h2>
                    ⭐ Telegram Stars
                </h2>

                <p class="gift-description">
                    🎁 @${escapeHtml(username)}
                    uchun Stars
                </p>

            </div>


            <div id="starsPlans"></div>

            `
        );


        const plans =
            document.getElementById(
                "starsPlans"
            );


        // =================================================
        // STARS PAKETLARI
        // =================================================

        starsPlans.forEach(
            function (item) {

                const count =
                    item[0];

                const price =
                    item[1];


                plans.insertAdjacentHTML(
                    "beforeend",
                    `

                    <div class="product-card">

                        <h3>
                            ⭐ ${count}
                            Telegram Stars
                        </h3>

                        <p>
                            @${escapeHtml(username)}
                            ga sovg‘a
                        </p>

                        <div class="product-price">

                            <span class="price">
                                ${formatPrice(price)}
                            </span>

                            <button
                                type="button"
                                class="buy-button stars-buy"
                                data-count="${count}"
                                data-price="${price}"
                            >
                                🎁 Davom etish
                            </button>

                        </div>

                    </div>

                    `
                );
            }
        );


        // =================================================
        // STARS BUTTONLARI
        // =================================================

        plans
            .querySelectorAll(".stars-buy")
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function (event) {

                            event.preventDefault();
                            event.stopPropagation();


                            createOrder(
                                "Telegram Stars",
                                username,
                                Number(
                                    button.dataset.count
                                ),
                                Number(
                                    button.dataset.price
                                )
                            );
                        }
                    );
                }
            );
    }


    // =====================================================
    // MENING BUYURTMALARIM
    // =====================================================

    async function showMyOrders() {

        clearProducts();

        productsSection.style.display =
            "block";


        // -------------------------------------------------
        // ORQAGA
        // -------------------------------------------------

        const backButton =
            createBackButton(
                "Mahsulotlar"
            );


        backButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                clearProducts();

                productsSection.style.display =
                    "none";


                premiumButton?.classList.remove(
                    "active"
                );

                starsButton?.classList.remove(
                    "active"
                );

                myOrdersButton?.classList.remove(
                    "active"
                );
            }
        );


        // -------------------------------------------------
        // HEADER
        // -------------------------------------------------

        products.insertAdjacentHTML(
            "beforeend",
            `

            <div class="gift-form">

                <h2>
                    📦 Mening buyurtmalarim
                </h2>

                <p class="gift-description">
                    Siz yaratgan barcha buyurtmalar shu yerda.
                </p>

            </div>


            <div
                id="ordersContainer"
                class="orders-container"
            >

                <div class="orders-loading">
                    🔄 Buyurtmalar yuklanmoqda...
                </div>

            </div>

            `
        );


        const ordersContainer =
            document.getElementById(
                "ordersContainer"
            );


        // -------------------------------------------------
        // TELEGRAM USER
        // -------------------------------------------------

        if (
            !tg ||
            !tg.initDataUnsafe ||
            !tg.initDataUnsafe.user
        ) {

            ordersContainer.innerHTML = `

                <div class="orders-empty">

                    <div class="orders-empty-icon">
                        ⚠️
                    </div>

                    <h3>
                        Telegram foydalanuvchisi aniqlanmadi
                    </h3>

                    <p>
                        Buyurtmalarni ko‘rish uchun
                        Mini App'ni Telegram ichida oching.
                    </p>

                </div>

            `;

            return;
        }


        const buyer =
            tg.initDataUnsafe.user;


        // -------------------------------------------------
        // SERVER
        // -------------------------------------------------

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

                ordersContainer.innerHTML = `

                    <div class="orders-empty">

                        <div class="orders-empty-icon">
                            ❌
                        </div>

                        <h3>
                            Xatolik yuz berdi
                        </h3>

                        <p>
                            ${
                                escapeHtml(
                                    data.message ||
                                    "Buyurtmalarni olishning imkoni bo‘lmadi."
                                )
                            }
                        </p>

                    </div>

                `;

                return;
            }


            const orders =
                data.orders || [];


            // -------------------------------------------------
            // BUYURTMA YO‘Q
            // -------------------------------------------------

            if (orders.length === 0) {

                ordersContainer.innerHTML = `

                    <div class="orders-empty">

                        <div class="orders-empty-icon">
                            📦
                        </div>

                        <h3>
                            Hali buyurtmalar yo‘q
                        </h3>

                        <p>
                            Siz hali hech qanday mahsulot
                            buyurtma qilmagansiz.
                        </p>

                    </div>

                `;

                return;
            }


            // -------------------------------------------------
            // BUYURTMALAR
            // -------------------------------------------------

            ordersContainer.innerHTML = "";


            orders.forEach(
                function (order) {

                    const product =
                        order.product ||
                        "Noma'lum mahsulot";


                    const username =
                        order.telegram_username ||
                        "";


                    let detail =
                        "";


                    if (
                        product ===
                        "Telegram Premium"
                    ) {

                        detail =
                            order.months
                                ? order.months + " oy"
                                : "Premium";


                    } else if (
                        product ===
                        "Telegram Stars"
                    ) {

                        detail =
                            order.stars
                                ? order.stars + " Stars"
                                : "Stars";
                    }


                    // -------------------------------------------------
                    // STATUS
                    // -------------------------------------------------

                    let statusText =
                        "Kutilmoqda";

                    let statusClass =
                        "status-pending";


                    if (
                        order.status ===
                        "paid"
                    ) {

                        statusText =
                            "To‘langan";

                        statusClass =
                            "status-paid";


                    } else if (
                        order.status ===
                        "processing"
                    ) {

                        statusText =
                            "Jarayonda";

                        statusClass =
                            "status-processing";


                    } else if (
                        order.status ===
                        "completed"
                    ) {

                        statusText =
                            "Yakunlangan";

                        statusClass =
                            "status-completed";


                    } else if (
                        order.status ===
                        "cancelled"
                    ) {

                        statusText =
                            "Bekor qilingan";

                        statusClass =
                            "status-cancelled";
                    }


                    ordersContainer.insertAdjacentHTML(
                        "beforeend",
                        `

                        <div class="order-card">

                            <div class="order-header">

                                <div class="order-title">

                                    ${
                                        product ===
                                        "Telegram Premium"
                                            ? "💎 Telegram Premium"
                                            : "⭐ Telegram Stars"
                                    }

                                </div>


                                <div
                                    class="order-status ${statusClass}"
                                >
                                    ${statusText}
                                </div>

                            </div>


                            <div class="order-recipient">

                                👤 @${escapeHtml(username)}

                            </div>


                            <div class="order-info">

                                <div class="order-row">

                                    <span class="order-row-label">
                                        Buyurtma:
                                    </span>

                                    <span class="order-row-value">
                                        #${order.id}
                                    </span>

                                </div>


                                <div class="order-row">

                                    <span class="order-row-label">
                                        Paket:
                                    </span>

                                    <span class="order-row-value">
                                        ${escapeHtml(detail)}
                                    </span>

                                </div>

                            </div>


                            <div class="order-price">

                                <strong>
                                    ${formatPrice(order.amount)}
                                </strong>

                            </div>

                        </div>

                        `
                    );
                }
            );


        } catch (error) {

            console.error(
                "My orders error:",
                error
            );


            ordersContainer.innerHTML = `

                <div class="orders-empty">

                    <div class="orders-empty-icon">
                        ❌
                    </div>

                    <h3>
                        Server bilan bog‘lanib bo‘lmadi
                    </h3>

                    <p>
                        Internet aloqasini tekshirib,
                        qaytadan urinib ko‘ring.
                    </p>

                </div>

            `;
        }
    }


    // =====================================================
    // BUYURTMA YARATISH
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
                "❗ Telegram foydalanuvchisi aniqlanmadi."
            );

            return;
        }


        const buyer =
            tg.initDataUnsafe.user;


        let detail =
            "";


        if (
            product ===
            "Telegram Premium"
        ) {

            detail =
                option + " oy";

        } else {

            detail =
                option + " Stars";
        }


        const confirmed =
            confirm(

                "🎁 Buyurtma\n\n" +

                "👤 @" +
                username +
                "\n" +

                "📦 " +
                product +
                "\n" +

                "🔹 " +
                detail +
                "\n" +

                "💰 " +
                formatPrice(amount) +
                "\n\n" +

                "Davom etasizmi?"
            );


        if (!confirmed) {
            return;
        }


        let months =
            null;

        let stars =
            null;


        if (
            product ===
            "Telegram Premium"
        ) {

            months =
                option;

        } else {

            stars =
                option;
        }


        try {

            const response =
                await fetch(
                    SERVER_URL +
                    "/create-order",
                    {

                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                user_id:
                                    buyer.id,

                                product:
                                    product,

                                amount:
                                    amount,

                                recipient_username:
                                    username,

                                months:
                                    months,

                                stars:
                                    stars
                            })
                    }
                );


            const data =
                await response.json();


            if (data.ok) {

                alert(
                    "✅ Buyurtma yaratildi!\n\n" +

                    "📦 Buyurtma №: " +
                    data.order_id +
                    "\n\n" +

                    "👤 @" +
                    username +
                    "\n" +

                    "📦 " +
                    product +
                    "\n" +

                    "🔹 " +
                    detail +
                    "\n\n" +

                    "💰 " +
                    formatPrice(amount)
                );


                // Buyurtma yaratilgandan keyin
                // "Mening buyurtmalarim" oynasiga o'tish

                if (myOrdersButton) {

                    premiumButton?.classList.remove(
                        "active"
                    );

                    starsButton?.classList.remove(
                        "active"
                    );

                    myOrdersButton.classList.add(
                        "active"
                    );
                }


                showMyOrders();


            } else {

                alert(
                    "❌ Buyurtma yaratilmadi.\n\n" +

                    (
                        data.message ||
                        "Noma'lum xato"
                    )
                );
            }


        } catch (error) {

            console.error(
                "Create order error:",
                error
            );


            alert(
                "❌ Server bilan bog‘lanib bo‘lmadi."
            );
        }
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


                premiumButton.classList.add(
                    "active"
                );


                if (starsButton) {

                    starsButton.classList.remove(
                        "active"
                    );
                }


                if (myOrdersButton) {

                    myOrdersButton.classList.remove(
                        "active"
                    );
                }


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


                myOrdersButton.classList.add(
                    "active"
                );


                if (premiumButton) {

                    premiumButton.classList.remove(
                        "active"
                    );
                }


                if (starsButton) {

                    starsButton.classList.remove(
                        "active"
                    );
                }


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


                starsButton.classList.add(
                    "active"
                );


                if (premiumButton) {

                    premiumButton.classList.remove(
                        "active"
                    );
                }


                if (myOrdersButton) {

                    myOrdersButton.classList.remove(
                        "active"
                    );
                }


                showRecipientForm(
                    "stars"
                );
            }
        );
    }


    // =====================================================
    // BOSHLANG‘ICH HOLAT
    // =====================================================

    clearProducts();

    productsSection.style.display =
        "none";

});
