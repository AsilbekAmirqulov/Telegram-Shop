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
    // PREMIUM
    // =========================

    function showPremium() {

        products.innerHTML = `
            <div class="gift-form">

                <h2>🎁 Premium sovg‘asi</h2>

                <p class="gift-description">
                    Premiumni kimga yubormoqchisiz?
                </p>

                <input
                    type="text"
                    id="recipientUsername"
                    class="username-input"
                    placeholder="@username"
                    autocomplete="off"
                >

                <p class="username-hint">
                    Masalan: @amirquiov
                </p>

            </div>

            <div id="premiumPlans"></div>
        `;

        const plans = document.getElementById("premiumPlans");

        premiumPlans.forEach(function (plan) {

            plans.innerHTML += `
                <div class="product-card">

                    <h3>💎 Telegram Premium — ${plan.title}</h3>

                    <p>
                        Premium ${plan.title} uchun sovg‘a
                    </p>

                    <div class="product-price">

                        <span class="price">
                            ${plan.price.toLocaleString("uz-UZ")} so'm
                        </span>

                        <button
                            class="buy-button"
                            data-months="${plan.months}"
                            data-price="${plan.price}"
                        >
                            🎁 Davom etish
                        </button>

                    </div>

                </div>
            `;
        });

        document
            .querySelectorAll(".buy-button")
            .forEach(function (button) {

                button.addEventListener("click", function () {

                    const usernameInput =
                        document.getElementById("recipientUsername");

                    let username =
                        usernameInput.value.trim();

                    if (!username) {
                        alert(
                            "❗ Avval Premium kimga yuborilishini kiriting."
                        );
                        usernameInput.focus();
                        return;
                    }

                    username = username.replace(/^@/, "");

                    if (!/^[a-zA-Z0-9_]{5,32}$/.test(username)) {
                        alert(
                            "❗ Telegram username noto‘g‘ri.\n\n" +
                            "Masalan: @amirquiov"
                        );
                        usernameInput.focus();
                        return;
                    }

                    const months =
                        Number(button.dataset.months);

                    const price =
                        Number(button.dataset.price);

                    createOrder(
                        username,
                        months,
                        price
                    );
                });
            });
    }


    // =========================
    // BUYURTMA YARATISH
    // =========================

    async function createOrder(
        recipientUsername,
        months,
        amount
    ) {

        if (!tg || !tg.initDataUnsafe?.user) {

            alert(
                "❗ Telegram foydalanuvchisi aniqlanmadi.\n\n" +
                "Mini App'ni Telegram ichidan oching."
            );

            return;
        }

        const buyer = tg.initDataUnsafe.user;

        const confirmed = confirm(
            "🎁 Premium sovg‘asi\n\n" +
            "👤 Qabul qiluvchi: @" +
            recipientUsername +
            "\n" +
            "💎 Muddat: " +
            months +
            " oy\n" +
            "💰 Narx: " +
            amount.toLocaleString("uz-UZ") +
            " so'm\n\n" +
            "Buyurtmani davom ettirasizmi?"
        );

        if (!confirmed) {
            return;
        }

        try {

            const response = await fetch(
                "https://telegram-shop-co3o.onrender.com/create-order",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        user_id: buyer.id,

                        product: "Telegram Premium",

                        amount: amount,

                        recipient_username: recipientUsername,

                        months: months
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
                    "Buyurtma №: " +
                    data.order_id +
                    "\n\n" +
                    "🎁 @" +
                    recipientUsername +
                    "\n" +
                    "💎 Premium: " +
                    months +
                    " oy\n\n" +
                    "To‘lov tizimi keyingi bosqichda ulanadi."
                );

            } else {

                alert(
                    "❌ Buyurtma yaratilmadi.\n\n" +
                    (data.message || "")
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
    // STARS
    // =========================

    function showStars() {

        const stars = [
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

        products.innerHTML = "";

        stars.forEach(function (item) {

            const count = item[0];
            const price = item[1];

            products.innerHTML += `
                <div class="product-card">

                    <h3>⭐ ${count} Telegram Stars</h3>

                    <p>
                        Telegram Stars
                    </p>

                    <div class="product-price">

                        <span class="price">
                            ${price.toLocaleString("uz-UZ")} so'm
                        </span>

                        <button
                            class="buy-button"
                            onclick="alert('⭐ Stars bo‘limi keyingi bosqichda ulanadi.')"
                        >
                            Sotib olish
                        </button>

                    </div>

                </div>
            `;
        });
    }


    // =========================
    // TUGMALAR
    // =========================

    premiumButton.addEventListener(
        "click",
        function () {

            premiumButton.classList.add("active");

            starsButton.classList.remove("active");

            showPremium();
        }
    );


    starsButton.addEventListener(
        "click",
        function () {

            starsButton.classList.add("active");

            premiumButton.classList.remove("active");

            showStars();
        }
    );


    // =========================
    // BOSHLANG‘ICH HOLAT
    // =========================

    showPremium();

});
