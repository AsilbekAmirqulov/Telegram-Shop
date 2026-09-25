document.addEventListener("DOMContentLoaded", function () {

    const products = document.getElementById("products");
    const premiumButton = document.getElementById("premiumButton");
    const starsButton = document.getElementById("starsButton");

    const API_URL =
        "https://telegram-shop-co3o.onrender.com";

    const tg = window.Telegram?.WebApp;

    if (tg) {
        tg.ready();
        tg.expand();
    }


    // =========================================================
    // PREMIUM PAKETLARI
    // =========================================================

    const premiumPlans = [
        {
            type: "contact",
            months: 1,
            title: "1 oy",
            price: 40000
        },
        {
            type: "gift",
            months: 3,
            title: "3 oy",
            price: 165000
        },
        {
            type: "gift",
            months: 6,
            title: "6 oy",
            price: 220000
        },
        {
            type: "gift",
            months: 12,
            title: "12 oy",
            price: 390000
        },
        {
            type: "contact",
            months: 12,
            title: "12 oy",
            price: 280000
        }
    ];


    // =========================================================
    // STARS PAKETLARI
    // =========================================================

    const starsPlans = [
        ["50", 16000],
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


    // =========================================================
    // YORDAMCHI FUNKSIYALAR
    // =========================================================

    function formatPrice(price) {
        return Number(price).toLocaleString("uz-UZ") + " so'm";
    }


    function setProducts(html) {
        products.innerHTML = html;
        products.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    // =========================================================
    // USERNAME FORM
    // =========================================================

    function showRecipientForm() {

        setProducts(`
            <div class="gift-form">

                <h2>🎁 Kimga yubormoqchisiz?</h2>

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

            </div>

            <div class="product-card">

                <h3>💎 Telegram Premium</h3>

                <p>
                    Telegram Premium sovg‘a qiling
                </p>

                <button
                    type="button"
                    class="buy-button"
                    id="choosePremium"
                >
                    💎 Premium
                </button>

            </div>

            <div class="product-card">

                <h3>⭐ Telegram Stars</h3>

                <p>
                    Telegram Stars sovg‘a qiling
                </p>

                <button
                    type="button"
                    class="buy-button"
                    id="chooseStars"
                >
                    ⭐ Stars
                </button>

            </div>
        `);


        const input =
            document.getElementById("recipientUsername");

        const status =
            document.getElementById("usernameStatus");


        let verifiedUsername = "";
        let searchTimer = null;


        // =====================================================
        // STATUS
        // =====================================================

        function showStatus(message, type) {

            if (!status || !input) {
                return;
            }

            status.textContent = message;
            status.style.display = "block";

            if (type === "success") {

                status.style.background =
                    "rgba(50,200,100,0.12)";

                status.style.color =
                    "#35c759";

                input.style.borderColor =
                    "#35c759";

            } else if (type === "loading") {

                status.style.background =
                    "rgba(80,150,255,0.12)";

                status.style.color =
                    "#4d9cff";

                input.style.borderColor =
                    "#4d9cff";

            } else {

                status.style.background =
                    "rgba(255,70,70,0.12)";

                status.style.color =
                    "#ff5c5c";

                input.style.borderColor =
                    "#ff5c5c";
            }
        }


        function clearStatus() {

            if (!status || !input) {
                return;
            }

            status.style.display = "none";
            status.textContent = "";
            input.style.borderColor = "";
            verifiedUsername = "";
        }


        // =====================================================
        // USERNAME TEKSHIRISH
        // =====================================================

        async function checkUsername(username) {

            try {

                showStatus(
                    "🔍 Telegram foydalanuvchisi qidirilmoqda...",
                    "loading"
                );


                const response =
                    await fetch(
                        API_URL +
                        "/check-username?username=" +
                        encodeURIComponent(username)
                    );


                const data =
                    await response.json();


                if (data.ok) {

                    verifiedUsername =
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
                    "❗ Username mavjud emas",
                    "error"
                );

                return null;


            } catch (error) {

                console.error(error);

                verifiedUsername = "";

                showStatus(
                    "❗ Username tekshirilmadi. Qaytadan urinib ko‘ring.",
                    "error"
                );

                return null;
            }
        }


        // =====================================================
        // INPUT
        // =====================================================

        input.addEventListener(
            "input",
            function () {

                clearTimeout(searchTimer);

                verifiedUsername = "";

                const raw =
                    input.value.trim();


                if (!raw) {

                    clearStatus();

                    return;
                }


                if (
                    raw.includes("@") &&
                    !raw.startsWith("@")
                ) {

                    showStatus(
                        "❗ Username noto‘g‘ri. Masalan: @qwerty123",
                        "error"
                    );

                    return;
                }


                const username =
                    raw.replace(/^@/, "");


                if (
                    !/^[a-zA-Z0-9_]*$/.test(username)
                ) {

                    showStatus(
                        "❗ Username noto‘g‘ri. Masalan: @qwerty123",
                        "error"
                    );

                    return;
                }


                if (username.length > 32) {

                    showStatus(
                        "❗ Username noto‘g‘ri. Masalan: @qwerty123",
                        "error"
                    );

                    return;
                }


                if (username.length < 5) {

                    status.style.display = "none";
                    input.style.borderColor = "";

                    return;
                }


                searchTimer =
                    setTimeout(
                        function () {

                            checkUsername(username);

                        },
                        600
                    );
            }
        );


        // =====================================================
        // GET USERNAME
        // =====================================================

        async function getUsername() {

            const raw =
                input.value.trim();


            if (!raw) {

                showStatus(
                    "❗ Avval Telegram username kiriting.",
                    "error"
                );

                input.focus();

                return null;
            }


            if (
                raw.includes("@") &&
                !raw.startsWith("@")
            ) {

                showStatus(
                    "❗ Username noto‘g‘ri. Masalan: @qwerty123",
                    "error"
                );

                input.focus();

                return null;
            }


            const username =
                raw.replace(/^@/, "");


            if (
                !/^[a-zA-Z0-9_]{5,32}$/.test(username)
            ) {

                showStatus(
                    "❗ Username noto‘g‘ri. Masalan: @qwerty123",
                    "error"
                );

                input.focus();

                return null;
            }


            if (
                verifiedUsername &&
                verifiedUsername.toLowerCase() ===
                username.toLowerCase()
            ) {

                return verifiedUsername;
            }


            const result =
                await checkUsername(username);


            if (!result) {

                input.focus();

                return null;
            }


            return result;
        }


        // =====================================================
        // PREMIUM TANLASH
        // =====================================================

        document
            .getElementById("choosePremium")
            .addEventListener(
                "click",
                async function () {

                    const username =
                        await getUsername();

                    if (!username) {
                        return;
                    }

                    showPremium(username);
                }
            );


        // =====================================================
        // STARS TANLASH
        // =====================================================

        document
            .getElementById("chooseStars")
            .addEventListener(
                "click",
                async function () {

                    const username =
                        await getUsername();

                    if (!username) {
                        return;
                    }

                    showStars(username);
                }
            );
    }


    // =========================================================
    // BACK BUTTON
    // =========================================================

    function createBackButton(callback) {

        const wrapper =
            document.createElement("div");

        wrapper.style.marginBottom = "12px";

        wrapper.innerHTML = `
            <button
                type="button"
                class="buy-button back-button"
                style="
                    width:100%;
                    margin-bottom:12px;
                "
            >
                ← Orqaga
            </button>
        `;

        const button =
            wrapper.querySelector(".back-button");

        button.addEventListener(
            "click",
            function () {

                callback();
            }
        );

        return wrapper;
    }


    // =========================================================
    // PREMIUM PAKETLARI
    // =========================================================

    function showPremium(username) {

        setProducts(`
            <div class="gift-form">

                <h2>💎 Telegram Premium</h2>

                <p class="gift-description">
                    🎁 @${username} uchun Premium
                </p>

            </div>

            <div id="premiumPlans"></div>
        `);


        const plans =
            document.getElementById("premiumPlans");


        // Back
        plans.appendChild(
            createBackButton(
                function () {

                    showRecipientForm();

                }
            )
        );


        premiumPlans.forEach(
            function (plan) {

                const card =
                    document.createElement("div");

                card.className =
                    "product-card";


                let buttonText;

                if (plan.type === "contact") {

                    buttonText =
                        "📩 Murojaat qilish";

                } else {

                    buttonText =
                        "🎁 Davom etish";
                }


                let description;

                if (
                    plan.type === "contact" &&
                    plan.months === 1
                ) {

                    description =
                        "1 oylik Premium obuna";

                } else if (
                    plan.type === "contact" &&
                    plan.months === 12
                ) {

                    description =
                        "12 oylik Premium obuna";

                } else {

                    description =
                        `@${username} ga sovg‘a`;
                }


                card.innerHTML = `

                    <h3>
                        💎 Premium — ${plan.title}
                    </h3>

                    <p>
                        ${description}
                    </p>

                    <div class="product-price">

                        <span class="price">
                            ${formatPrice(plan.price)}
                        </span>

                        <button
                            type="button"
                            class="buy-button premium-plan-button"
                        >
                            ${buttonText}
                        </button>

                    </div>
                `;


                const button =
                    card.querySelector(
                        ".premium-plan-button"
                    );


                button.addEventListener(
                    "click",
                    function () {

                        if (
                            plan.type === "contact"
                        ) {

                            showContactPage(
                                username,
                                plan.months,
                                plan.price
                            );

                        } else {

                            createOrder(
                                "Telegram Premium",
                                username,
                                plan.months,
                                plan.price
                            );
                        }
                    }
                );


                plans.appendChild(card);
            }
        );
    }


    // =========================================================
    // STARS PAKETLARI
    // =========================================================

    function showStars(username) {

        setProducts(`
            <div class="gift-form">

                <h2>⭐ Telegram Stars</h2>

                <p class="gift-description">
                    🎁 @${username} uchun Stars
                </p>

            </div>

            <div id="starsPlans"></div>
        `);


        const plans =
            document.getElementById("starsPlans");


        // Back
        plans.appendChild(
            createBackButton(
                function () {

                    showRecipientForm();

                }
            )
        );


        starsPlans.forEach(
            function (item) {

                const count = item[0];
                const price = item[1];


                const card =
                    document.createElement("div");

                card.className =
                    "product-card";


                card.innerHTML = `

                    <h3>
                        ⭐ ${count} Telegram Stars
                    </h3>

                    <p>
                        @${username} ga sovg‘a
                    </p>

                    <div class="product-price">

                        <span class="price">
                            ${formatPrice(price)}
                        </span>

                        <button
                            type="button"
                            class="buy-button stars-buy"
                        >
                            🎁 Davom etish
                        </button>

                    </div>
                `;


                const button =
                    card.querySelector(
                        ".stars-buy"
                    );


                button.addEventListener(
                    "click",
                    function () {

                        createOrder(
                            "Telegram Stars",
                            username,
                            Number(count),
                            price
                        );
                    }
                );


                plans.appendChild(card);
            }
        );
    }


    // =========================================================
    // MUROJAAT OYNASI
    // =========================================================

    function showContactPage(
        username,
        months,
        price
    ) {

        setProducts(`
            <div class="gift-form">

                <h2>📩 Premium obuna</h2>

                <p class="gift-description">
                    👤 @${username}
                </p>

            </div>

            <div class="product-card">

                <h3>
                    💎 ${months} oylik Premium
                </h3>

                <p>
                    ${formatPrice(price)}
                </p>

                <p>
                    1 oylik Premium obuna olish uchun
                    <strong>@Amirquiov</strong> ga yozing.
                </p>

                <button
                    type="button"
                    class="buy-button"
                    id="contactButton"
                >
                    📩 @Amirquiov ga yozish
                </button>

            </div>

            <div id="contactBack"></div>
        `);


        // =====================================================
        // BACK
        // =====================================================

        const backContainer =
            document.getElementById("contactBack");


        backContainer.appendChild(
            createBackButton(
                function () {

                    showPremium(username);

                }
            )
        );


        // =====================================================
        // TELEGRAM CONTACT
        // =====================================================

        const contactButton =
            document.getElementById("contactButton");


        contactButton.addEventListener(
            "click",
            function () {

                const telegramUrl =
                    "https://t.me/Amirquiov";


                if (tg && tg.openTelegramLink) {

                    tg.openTelegramLink(
                        telegramUrl
                    );

                } else {

                    window.open(
                        telegramUrl,
                        "_blank"
                    );
                }
            }
        );
    }


    // =========================================================
    // BUYURTMA YARATISH
    // =========================================================

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


        let detail;


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


        let months = null;
        let stars = null;


        if (
            product ===
            "Telegram Premium"
        ) {

            months = option;

        } else {

            stars = option;
        }


        try {

            const response =
                await fetch(
                    API_URL +
                    "/create-order",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

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

            console.error(error);

            alert(
                "❌ Server bilan bog‘lanib bo‘lmadi."
            );
        }
    }


    // =========================================================
    // PREMIUM BUTTON
    // =========================================================

    premiumButton.addEventListener(
        "click",
        function () {

            premiumButton.classList.add(
                "active"
            );

            starsButton.classList.remove(
                "active"
            );

            showRecipientForm();
        }
    );


    // =========================================================
    // STARS BUTTON
    // =========================================================

    starsButton.addEventListener(
        "click",
        function () {

            starsButton.classList.add(
                "active"
            );

            premiumButton.classList.remove(
                "active"
            );

            showRecipientForm();
        }
    );


    // =========================================================
    // BOSHLANG'ICH HOLAT
    // =========================================================

    showRecipientForm();

});
