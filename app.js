document.addEventListener("DOMContentLoaded", function () {

    // =========================================================
    // ELEMENTLAR
    // =========================================================

    const products = document.getElementById("products");
    const premiumButton = document.getElementById("premiumButton");
    const starsButton = document.getElementById("starsButton");

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
            months: 3,
            title: "3 oy",
            price: 165000,
            type: "gift"
        },
        {
            months: 6,
            title: "6 oy",
            price: 220000,
            type: "gift"
        },
        {
            months: 12,
            title: "12 oy",
            price: 390000,
            type: "gift"
        }
    ];


    // =========================================================
    // MAXSUS MUROJAAT PAKETLARI
    // =========================================================

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


    // =========================================================
    // STARS
    // =========================================================

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


    // =========================================================
    // YORDAMCHI FUNKSIYALAR
    // =========================================================

    function setActiveButton(button) {

        if (premiumButton) {
            premiumButton.classList.remove("active");
        }

        if (starsButton) {
            starsButton.classList.remove("active");
        }

        if (button) {
            button.classList.add("active");
        }
    }


    function backButtonHTML() {

        return `
            <button
                type="button"
                class="buy-button back-button"
                id="backButton"
                style="margin-bottom:15px;"
            >
                ← Orqaga
            </button>
        `;
    }


    // =========================================================
    // USERNAME FORM
    // =========================================================

    function showRecipientForm(category = null) {

        products.innerHTML = `

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
        `;


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
        // TELEGRAM USERNAME TEKSHIRISH
        // =====================================================

        async function checkUsername(username) {

            try {

                showStatus(
                    "🔍 Telegram foydalanuvchisi qidirilmoqda...",
                    "loading"
                );


                const response =
                    await fetch(
                        "https://telegram-shop-co3o.onrender.com/check-username?username=" +
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
                    "❗ Username noto‘g‘ri. Masalan: @qwerty123",
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
        // USERNAME INPUT
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
        // USERNAME OLISH
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

                    setActiveButton(premiumButton);

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

                    setActiveButton(starsButton);

                    showStars(username);
                }
            );


        // Agar yuqoridan ma'lum kategoriya bilan kirilgan bo'lsa
        if (category === "premium") {
            setActiveButton(premiumButton);
        }

        if (category === "stars") {
            setActiveButton(starsButton);
        }
    }


    // =========================================================
    // PREMIUM PAKETLARI
    // =========================================================

    function showPremium(username) {

        products.innerHTML = `

            ${backButtonHTML()}

            <div class="gift-form">

                <h2>💎 Telegram Premium</h2>

                <p class="gift-description">
                    🎁 @${username} uchun Premium
                </p>

            </div>

            <div id="premiumPlans"></div>

            <div class="product-card">

                <h3>📩 Maxsus Premium</h3>

                <p>
                    Maxsus muddatdagi Premium uchun murojaat qiling
                </p>

                <button
                    type="button"
                    class="buy-button"
                    id="contactPremium"
                >
                    📩 Murojaat orqali
                </button>

            </div>
        `;


        // =====================================================
        // ORQAGA
        // =====================================================

        document
            .getElementById("backButton")
            .addEventListener(
                "click",
                function () {

                    showRecipientForm("premium");
                }
            );


        const plans =
            document.getElementById("premiumPlans");


        premiumPlans.forEach(
            function (plan) {

                plans.innerHTML += `

                    <div class="product-card">

                        <h3>
                            💎 Premium — ${plan.title}
                        </h3>

                        <p>
                            @${username} ga sovg‘a
                        </p>

                        <div class="product-price">

                            <span class="price">
                                ${plan.price.toLocaleString("uz-UZ")}
                                so'm
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
                `;
            }
        );


        document
            .querySelectorAll(".premium-buy")
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            createOrder(
                                "Telegram Premium",
                                username,
                                Number(button.dataset.months),
                                Number(button.dataset.price)
                            );
                        }
                    );
                }
            );


        // =====================================================
        // MAXSUS MUROJAAT
        // =====================================================

        document
            .getElementById("contactPremium")
            .addEventListener(
                "click",
                function () {

                    showContactPlans(username);
                }
            );
    }


    // =========================================================
    // 1 OY / 12 OY MUROJAAT PAKETLARI
    // =========================================================

    function showContactPlans(username) {

        products.innerHTML = `

            ${backButtonHTML()}

            <div class="gift-form">

                <h2>📩 Premium murojaat</h2>

                <p class="gift-description">
                    🎁 @${username} uchun Premium
                </p>

            </div>

            <div id="contactPlans"></div>
        `;


        document
            .getElementById("backButton")
            .addEventListener(
                "click",
                function () {

                    showPremium(username);
                }
            );


        const container =
            document.getElementById("contactPlans");


        contactPlans.forEach(
            function (plan) {

                container.innerHTML += `

                    <div class="product-card">

                        <h3>
                            💎 ${plan.title} Premium
                        </h3>

                        <p>
                            @${username} uchun
                        </p>

                        <div class="product-price">

                            <span class="price">
                                ${plan.price.toLocaleString("uz-UZ")}
                                so'm
                            </span>

                            <button
                                type="button"
                                class="buy-button contact-buy"
                                data-months="${plan.months}"
                                data-price="${plan.price}"
                            >
                                📩 @Amirquiov ga yozish
                            </button>

                        </div>

                    </div>
                `;
            }
        );


        document
            .querySelectorAll(".contact-buy")
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const months =
                                Number(button.dataset.months);

                            const price =
                                Number(button.dataset.price);

                            const message =
                                encodeURIComponent(
                                    "Salom, Telegram Premium olmoqchiman.\n\n" +
                                    "👤 Qabul qiluvchi: @" +
                                    username +
                                    "\n" +
                                    "📦 Muddat: " +
                                    months +
                                    " oy\n" +
                                    "💰 Narx: " +
                                    price.toLocaleString("uz-UZ") +
                                    " so'm"
                                );


                            window.open(
                                "https://t.me/Amirquiov?text=" +
                                message,
                                "_blank"
                            );
                        }
                    );
                }
            );
    }


    // =========================================================
    // STARS PAKETLARI
    // =========================================================

    function showStars(username) {

        products.innerHTML = `

            ${backButtonHTML()}

            <div class="gift-form">

                <h2>⭐ Telegram Stars</h2>

                <p class="gift-description">
                    🎁 @${username} uchun Stars
                </p>

            </div>

            <div id="starsPlans"></div>
        `;


        document
            .getElementById("backButton")
            .addEventListener(
                "click",
                function () {

                    showRecipientForm("stars");
                }
            );


        const plans =
            document.getElementById("starsPlans");


        starsPlans.forEach(
            function (item) {

                const count = item[0];
                const price = item[1];


                plans.innerHTML += `

                    <div class="product-card">

                        <h3>
                            ⭐ ${count} Telegram Stars
                        </h3>

                        <p>
                            @${username} ga sovg‘a
                        </p>

                        <div class="product-price">

                            <span class="price">
                                ${price.toLocaleString("uz-UZ")}
                                so'm
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
                `;
            }
        );


        document
            .querySelectorAll(".stars-buy")
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            createOrder(
                                "Telegram Stars",
                                username,
                                Number(button.dataset.count),
                                Number(button.dataset.price)
                            );
                        }
                    );
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
            product === "Telegram Premium"
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
                amount.toLocaleString("uz-UZ") +
                " so'm\n\n" +

                "Davom etasizmi?"
            );


        if (!confirmed) {
            return;
        }


        let months = null;
        let stars = null;


        if (
            product === "Telegram Premium"
        ) {

            months = option;

        } else {

            stars = option;
        }


        try {

            const response =
                await fetch(
                    "https://telegram-shop-co3o.onrender.com/create-order",
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
                    amount.toLocaleString("uz-UZ") +
                    " so'm"
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
    // YUQORIDAGI PREMIUM TUGMA
    // =========================================================

    if (premiumButton) {

        premiumButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                setActiveButton(premiumButton);

                showRecipientForm("premium");
            }
        );
    }


    // =========================================================
    // YUQORIDAGI STARS TUGMA
    // =========================================================

    if (starsButton) {

        starsButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                setActiveButton(starsButton);

                showRecipientForm("stars");
            }
        );
    }


    // =========================================================
    // BOSHLANG'ICH HOLAT
    // =========================================================

    // Mahsulot paketlari boshida ko'rinmaydi.
    // Foydalanuvchi yuqoridagi Premium yoki Stars tugmasini
    // bosgandan keyin username oynasi chiqadi.

    products.innerHTML = `
        <div class="product-card">
            <p style="text-align:center;">
                👆 Yuqoridan mahsulotni tanlang
            </p>
        </div>
    `;

});
