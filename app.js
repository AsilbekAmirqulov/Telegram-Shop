document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // ELEMENTS
    // =====================================================

    const products = document.getElementById("products");
    const premiumButton = document.getElementById("premiumButton");
    const starsButton = document.getElementById("starsButton");

    const productsSection =
        document.getElementById("productsSection");

    const productsTitle =
        document.getElementById("productsTitle");

    const tg = window.Telegram?.WebApp;


    // =====================================================
    // TELEGRAM
    // =====================================================

    if (tg) {
        tg.ready();
        tg.expand();
    }


    // =====================================================
    // PREMIUM PLANS
    // =====================================================

    const premiumPlans = [

        {
            months: 1,
            title: "1 oy",
            price: 40000,
            contact: true
        },

        {
            months: 3,
            title: "3 oy",
            price: 165000,
            contact: false
        },

        {
            months: 6,
            title: "6 oy",
            price: 220000,
            contact: false
        },

        {
            months: 12,
            title: "1 yil",
            price: 390000,
            contact: false
        },

        {
            months: 12,
            title: "1 yil — Murojaat orqali",
            price: 280000,
            contact: true
        }
    ];


    // =====================================================
    // STARS PLANS
    // =====================================================

    const starsPlans = [
        ["50", 15000],
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
    // OPEN PRODUCTS SECTION
    // =====================================================

    function openProducts(title) {

        if (productsSection) {
            productsSection.style.display = "block";
        }

        if (productsTitle) {
            productsTitle.textContent = title;
        }
    }


    // =====================================================
    // USERNAME FORM
    // =====================================================

    function createRecipientForm() {

        return `

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

            <div
                id="selectedPlans"
                style="margin-top:12px;"
            ></div>
        `;
    }


    // =====================================================
    // USERNAME CHECKER
    // =====================================================

    function setupUsernameChecker(
        onVerified
    ) {

        const input =
            document.getElementById(
                "recipientUsername"
            );

        const status =
            document.getElementById(
                "usernameStatus"
            );


        if (!input || !status) {
            return null;
        }


        let verifiedUsername = "";
        let searchTimer = null;


        // =================================================
        // STATUS
        // =================================================

        function showStatus(
            message,
            type
        ) {

            status.textContent =
                message;

            status.style.display =
                "block";


            if (type === "success") {

                status.style.background =
                    "rgba(50,200,100,0.12)";

                status.style.color =
                    "#35c759";

                input.style.borderColor =
                    "#35c759";
            }

            else if (type === "loading") {

                status.style.background =
                    "rgba(80,150,255,0.12)";

                status.style.color =
                    "#4d9cff";

                input.style.borderColor =
                    "#4d9cff";
            }

            else {

                status.style.background =
                    "rgba(255,70,70,0.12)";

                status.style.color =
                    "#ff5c5c";

                input.style.borderColor =
                    "#ff5c5c";
            }
        }


        // =================================================
        // CLEAR STATUS
        // =================================================

        function clearStatus() {

            status.style.display =
                "none";

            status.textContent =
                "";

            input.style.borderColor =
                "";

            verifiedUsername =
                "";
        }


        // =================================================
        // CHECK TELEGRAM USERNAME
        // =================================================

        async function checkUsername(
            username
        ) {

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


                    if (
                        typeof onVerified ===
                        "function"
                    ) {

                        onVerified(
                            data.username
                        );
                    }


                    return data.username;
                }


                verifiedUsername =
                    "";


                showStatus(
                    data.message ||
                    "❗ Username mavjud emas.",
                    "error"
                );


                return null;

            }

            catch (error) {

                console.error(error);

                verifiedUsername =
                    "";


                showStatus(
                    "❗ Username tekshirilmadi. Qaytadan urinib ko‘ring.",
                    "error"
                );


                return null;
            }
        }


        // =================================================
        // INPUT
        // =================================================

        input.addEventListener(
            "input",
            function () {

                clearTimeout(
                    searchTimer
                );


                verifiedUsername =
                    "";


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
                    raw.replace(
                        /^@/,
                        ""
                    );


                if (
                    !/^[a-zA-Z0-9_]*$/.test(
                        username
                    )
                ) {

                    showStatus(
                        "❗ Username noto‘g‘ri. Masalan: @qwerty123",
                        "error"
                    );

                    return;
                }


                if (
                    username.length > 32
                ) {

                    showStatus(
                        "❗ Username noto‘g‘ri. Masalan: @qwerty123",
                        "error"
                    );

                    return;
                }


                if (
                    username.length < 5
                ) {

                    status.style.display =
                        "none";

                    input.style.borderColor =
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
        // GET USERNAME
        // =================================================

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
                raw.replace(
                    /^@/,
                    ""
                );


            if (
                !/^[a-zA-Z0-9_]{5,32}$/.test(
                    username
                )
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
                await checkUsername(
                    username
                );


            if (!result) {

                input.focus();

                return null;
            }


            return result;
        }


        return {
            getUsername: getUsername,
            getVerifiedUsername: function () {
                return verifiedUsername;
            }
        };
    }


    // =====================================================
    // CLEAR SELECTED PLANS
    // MUHIM: USERNAME INPUT O'CHMAYDI
    // =====================================================

    function clearSelectedPlans() {

        const selectedPlans =
            document.getElementById(
                "selectedPlans"
            );


        if (selectedPlans) {

            selectedPlans.innerHTML =
                "";
        }


        const input =
            document.getElementById(
                "recipientUsername"
            );


        if (input) {

            input.focus();

            input.setSelectionRange(
                input.value.length,
                input.value.length
            );
        }
    }


    // =====================================================
    // BACK BUTTON HTML
    // =====================================================

    function backButtonHTML(
        id
    ) {

        return `

            <button
                type="button"
                id="${id}"
                style="
                    display:block;
                    width:100%;
                    margin-bottom:12px;
                    padding:11px 14px;
                    border:none;
                    border-radius:12px;
                    background:rgba(128,128,128,0.12);
                    color:inherit;
                    font-size:14px;
                    font-weight:600;
                    cursor:pointer;
                "
            >
                ← Orqaga
            </button>

        `;
    }


    // =====================================================
    // SHOW CONTACT MESSAGE
    // =====================================================

    function showContactMessage(
        username,
        months,
        price,
        title
    ) {

        const selectedPlans =
            document.getElementById(
                "selectedPlans"
            );


        if (!selectedPlans) {
            return;
        }


        selectedPlans.innerHTML =

            backButtonHTML(
                "backFromContact"
            )

            +

            `

            <div class="gift-form">

                <h2>
                    💎 ${title}
                </h2>

                <p class="gift-description">
                    🎁 @${username} uchun
                </p>

            </div>


            <div class="product-card">

                <h3>
                    💎 ${title}
                </h3>

                <p>
                    @${username} uchun Premium
                </p>

                <div class="product-price">

                    <span class="price">
                        ${price.toLocaleString("uz-UZ")}
                        so'm
                    </span>

                    <button
                        type="button"
                        class="buy-button"
                        id="contactAdminButton"
                    >
                        ✉️ @AmirquIov ga yozish
                    </button>

                </div>

            </div>
        `;


        // =================================================
        // BACK
        // =================================================

        const back =
            document.getElementById(
                "backFromContact"
            );


        if (back) {

            back.addEventListener(
                "click",
                function () {

                    // Faqat paket qismini tozalaymiz.
                    // Username input joyida qoladi.
                    clearSelectedPlans();
                }
            );
        }


        // =================================================
        // CONTACT ADMIN
        // =================================================

        const contactButton =
            document.getElementById(
                "contactAdminButton"
            );


        if (contactButton) {

            contactButton.addEventListener(
                "click",
                function () {

                    if (
                        tg &&
                        typeof tg.openTelegramLink ===
                        "function"
                    ) {

                        tg.openTelegramLink(
                            "https://t.me/AmirquIov"
                        );

                    }

                    else {

                        window.open(
                            "https://t.me/AmirquIov",
                            "_blank"
                        );
                    }
                }
            );
        }
    }


    // =====================================================
    // RENDER PREMIUM PLANS
    // =====================================================

    function renderPremiumPlans(
        username,
        getUsername
    ) {

        const selectedPlans =
            document.getElementById(
                "selectedPlans"
            );


        if (!selectedPlans) {
            return;
        }


        selectedPlans.innerHTML =

            backButtonHTML(
                "backFromPremium"
            );


        premiumPlans.forEach(
            function (plan) {

                if (plan.contact) {

                    selectedPlans.innerHTML += `

                        <div class="product-card">

                            <h3>
                                💎 Premium — ${plan.title}
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
                                    class="buy-button contact-premium"
                                    data-months="${plan.months}"
                                    data-price="${plan.price}"
                                    data-title="${plan.title}"
                                >
                                    ✉️ Murojaat qilish
                                </button>

                            </div>

                        </div>
                    `;
                }

                else {

                    selectedPlans.innerHTML += `

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
            }
        );


        // =================================================
        // BACK FROM PREMIUM
        // =================================================

        const back =
            document.getElementById(
                "backFromPremium"
            );


        if (back) {

            back.addEventListener(
                "click",
                function () {

                    // MUHIM:
                    // showPremium() chaqirilmaydi.
                    // Input o'z joyida qoladi.
                    clearSelectedPlans();
                }
            );
        }


        // =================================================
        // CONTACT PREMIUM
        // =================================================

        selectedPlans
            .querySelectorAll(
                ".contact-premium"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        async function () {

                            const currentUsername =
                                await getUsername();


                            if (!currentUsername) {
                                return;
                            }


                            const months =
                                Number(
                                    button.dataset.months
                                );


                            const price =
                                Number(
                                    button.dataset.price
                                );


                            const title =
                                button.dataset.title;


                            showContactMessage(
                                currentUsername,
                                months,
                                price,
                                title
                            );
                        }
                    );
                }
            );


        // =================================================
        // NORMAL PREMIUM
        // =================================================

        selectedPlans
            .querySelectorAll(
                ".premium-buy"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        async function () {

                            const currentUsername =
                                await getUsername();


                            if (!currentUsername) {
                                return;
                            }


                            createOrder(
                                "Telegram Premium",
                                currentUsername,
                                Number(
                                    button.dataset.months
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
    // SHOW PREMIUM
    // =====================================================

    function showPremium() {

        openProducts(
            "Premium paketlar"
        );


        products.innerHTML =
            createRecipientForm();


        const checker =
            setupUsernameChecker(
                function (username) {

                    renderPremiumPlans(
                        username,
                        checker.getUsername
                    );
                }
            );


        if (!checker) {
            return;
        }
    }


    // =====================================================
    // RENDER STARS
    // =====================================================

    function renderStarsPlans(
        username,
        getUsername
    ) {

        const selectedPlans =
            document.getElementById(
                "selectedPlans"
            );


        if (!selectedPlans) {
            return;
        }


        selectedPlans.innerHTML =

            backButtonHTML(
                "backFromStars"
            );


        starsPlans.forEach(
            function (item) {

                const count =
                    item[0];

                const price =
                    item[1];


                selectedPlans.innerHTML += `

                    <div class="product-card">

                        <h3>
                            ⭐ ${count} Telegram Stars
                        </h3>

                        <p>
                            @${username} ga
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


        // =================================================
        // BACK FROM STARS
        // =================================================

        const back =
            document.getElementById(
                "backFromStars"
            );


        if (back) {

            back.addEventListener(
                "click",
                function () {

                    // Input o'chirilmaydi.
                    clearSelectedPlans();
                }
            );
        }


        // =================================================
        // STARS BUY
        // =================================================

        selectedPlans
            .querySelectorAll(
                ".stars-buy"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        async function () {

                            const currentUsername =
                                await getUsername();


                            if (!currentUsername) {
                                return;
                            }


                            const count =
                                button.dataset.count;

                            const price =
                                Number(
                                    button.dataset.price
                                );


                            // Stars payment hali ulanmagan.
                            alert(
                                "⭐ Telegram Stars to‘lovi tez orada qo‘shiladi.\n\n" +
                                "@" +
                                currentUsername +
                                "\n" +
                                count +
                                " Stars\n" +
                                price.toLocaleString(
                                    "uz-UZ"
                                ) +
                                " so'm"
                            );
                        }
                    );
                }
            );
    }


    // =====================================================
    // SHOW STARS
    // =====================================================

    function showStars() {

        openProducts(
            "Telegram Stars"
        );


        products.innerHTML =
            createRecipientForm();


        const checker =
            setupUsernameChecker(
                function (username) {

                    renderStarsPlans(
                        username,
                        checker.getUsername
                    );
                }
            );


        if (!checker) {
            return;
        }
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

        }

        else {

            detail =
                option + " Stars";
        }


        const confirmed =
            confirm(

                "🎁 Buyurtma\n\n" +

                "👤 @" +
                username +
                "\n\n" +

                "📦 " +
                product +
                "\n" +

                "🔹 " +
                detail +
                "\n" +

                "💰 " +
                amount.toLocaleString(
                    "uz-UZ"
                ) +
                " so'm\n\n" +

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

        }

        else {

            stars =
                option;
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
                    amount.toLocaleString(
                        "uz-UZ"
                    ) +
                    " so'm"
                );

            }

            else {

                alert(
                    "❌ Buyurtma yaratilmadi.\n\n" +
                    (
                        data.message ||
                        "Noma'lum xato"
                    )
                );
            }

        }

        catch (error) {

            console.error(error);

            alert(
                "❌ Server bilan bog‘lanib bo‘lmadi."
            );
        }
    }


    // =====================================================
    // PREMIUM TOP BUTTON
    // =====================================================

    if (premiumButton) {

        premiumButton.addEventListener(
            "click",
            function () {

                premiumButton.classList.add(
                    "active"
                );


                if (starsButton) {

                    starsButton.classList.remove(
                        "active"
                    );
                }


                showPremium();


                setTimeout(
                    function () {

                        if (
                            productsSection &&
                            typeof productsSection.scrollIntoView ===
                            "function"
                        ) {

                            productsSection.scrollIntoView({
                                behavior: "smooth",
                                block: "start"
                            });
                        }

                    },
                    100
                );
            }
        );
    }


    // =====================================================
    // STARS TOP BUTTON
    // =====================================================

    if (starsButton) {

        starsButton.addEventListener(
            "click",
            function () {

                starsButton.classList.add(
                    "active"
                );


                if (premiumButton) {

                    premiumButton.classList.remove(
                        "active"
                    );
                }


                showStars();


                setTimeout(
                    function () {

                        if (
                            productsSection &&
                            typeof productsSection.scrollIntoView ===
                            "function"
                        ) {

                            productsSection.scrollIntoView({
                                behavior: "smooth",
                                block: "start"
                            });
                        }

                    },
                    100
                );
            }
        );
    }


    // =====================================================
    // INITIAL STATE
    // =====================================================

    if (productsSection) {

        productsSection.style.display =
            "none";
    }

});
