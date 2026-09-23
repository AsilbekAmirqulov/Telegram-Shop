document.addEventListener("DOMContentLoaded", function () {

    const products = document.getElementById("products");
    const premiumButton = document.getElementById("premiumButton");
    const starsButton = document.getElementById("starsButton");

    const tg = window.Telegram?.WebApp;

    if (tg) {
        tg.ready();
        tg.expand();
    }


    // =========================
    // PREMIUM PAKETLARI
    // =========================

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
            title: "1 yil",
            price: 390000
        }
    ];


    // =========================
    // STARS PAKETLARI
    // =========================

    const starsPlans = [
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


    // =========================
    // USERNAME FORM
    // =========================

    function showRecipientForm() {

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

                <p class="username-hint">
                    Masalan: @amirquiov
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


        // =========================
        // INPUTNI AKTIVLASHTIRISH
        // =========================

        const input =
            document.getElementById("recipientUsername");


        if (input) {

            input.disabled = false;
            input.readOnly = false;

            input.addEventListener(
                "click",
                function () {
                    this.focus();
                }
            );

            input.addEventListener(
                "touchstart",
                function () {
                    this.focus();
                },
                { passive: true }
            );

            input.addEventListener(
                "focus",
                function () {
                    this.style.cursor = "text";
                }
            );
        }


        // =========================
        // PREMIUM TANLASH
        // =========================

        document
            .getElementById("choosePremium")
            .addEventListener(
                "click",
                function () {

                    const username =
                        getUsername();

                    if (!username) {
                        return;
                    }

                    showPremium(username);
                }
            );


        // =========================
        // STARS TANLASH
        // =========================

        document
            .getElementById("chooseStars")
            .addEventListener(
                "click",
                function () {

                    const username =
                        getUsername();

                    if (!username) {
                        return;
                    }

                    showStars(username);
                }
            );
    }


    // =========================
    // USERNAME OLISH
    // =========================

    function getUsername() {

        const input =
            document.getElementById(
                "recipientUsername"
            );


        if (!input) {

            alert(
                "Username maydoni topilmadi."
            );

            return null;
        }


        let username =
            input.value.trim();


        if (!username) {

            alert(
                "❗ Telegram username kiriting."
            );

            input.focus();

            return null;
        }


        username =
            username.replace(/^@/, "");


        if (
            !/^[a-zA-Z0-9_]{5,32}$/.test(
                username
            )
        ) {

            alert(
                "❗ Telegram username noto‘g‘ri.\n\n" +
                "Masalan: @amirquiov"
            );

            input.focus();

            return null;
        }


        return username;
    }


    // =========================
    // PREMIUM
    // =========================

    function showPremium(username) {

        products.innerHTML = `

            <div class="gift-form">

                <h2>💎 Telegram Premium</h2>

                <p class="gift-description">
                    🎁 @${username} uchun Premium
                </p>

            </div>

            <div id="premiumPlans"></div>
        `;


        const plans =
            document.getElementById(
                "premiumPlans"
            );


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
    }


    // =========================
    // STARS
    // =========================

    function showStars(username) {

        products.innerHTML = `

            <div class="gift-form">

                <h2>⭐ Telegram Stars</h2>

                <p class="gift-description">
                    🎁 @${username} uchun Stars
                </p>

            </div>

            <div id="starsPlans"></div>
        `;


        const plans =
            document.getElementById(
                "starsPlans"
            );


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

                            const count =
                                button.dataset.count;

                            const price =
                                Number(
                                    button.dataset.price
                                );


                            createOrder(
                                "Telegram Stars",
                                username,
                                count,
                                price
                            );
                        }
                    );
                }
            );
    }


    // =========================
    // BUYURTMA YARATISH
    // =========================

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
                "❗ Telegram foydalanuvchisi aniqlanmadi.\n\n" +
                "Mini App'ni Telegram ichidan oching."
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

                "👤 Qabul qiluvchi: @" +
                username +
                "\n\n" +

                "📦 Mahsulot: " +
                product +
                "\n" +

                "🔹 Miqdor: " +
                detail +
                "\n" +

                "💰 Narx: " +
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
            product ===
            "Telegram Premium"
        ) {

            months =
                Number(option);

        } else {

            stars =
                Number(option);
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


            if (!response.ok) {

                throw new Error(
                    "Server xatosi: " +
                    response.status
                );
            }


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


    // =========================
    // PREMIUM BUTTON
    // =========================

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


    // =========================
    // STARS BUTTON
    // =========================

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


    // =========================
    // BOSHLANG‘ICH OYNA
    // =========================

    showRecipientForm();

});
