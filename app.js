document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // ELEMENTLAR
    // =====================================================

    const products = document.getElementById("products");
    const premiumButton = document.getElementById("premiumButton");
    const starsButton = document.getElementById("starsButton");

    const tg = window.Telegram?.WebApp;

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

    // Bu yerda 1 oy YO'Q.
    // 1 oy alohida murojaat orqali.

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
    // STARS
    // =====================================================

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


    // =====================================================
    // HOLAT
    // =====================================================

    let currentUsername = "";
    let verifiedUsername = "";

    let usernameInput = null;
    let usernameStatus = null;

    let searchTimer = null;


    // =====================================================
    // YORDAMCHI
    // =====================================================

    function formatPrice(price) {

        return Number(price).toLocaleString("uz-UZ") +
            " so'm";
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

        if (products) {
            products.innerHTML = "";
        }
    }


    // =====================================================
    // BACK BUTTON
    // =====================================================

    function createBackButton(text) {

        const wrapper =
            document.createElement("div");

        wrapper.style.marginBottom = "12px";

        wrapper.innerHTML = `

            <button
                type="button"
                class="buy-button back-button"
                style="
                    width:100%;
                    background:#17212b;
                    border:1px solid rgba(255,255,255,0.10);
                    text-align:left;
                "
            >
                ← ${escapeHtml(text || "Orqaga")}
            </button>

        `;

        products.appendChild(wrapper);

        return wrapper.querySelector(".back-button");
    }


    // =====================================================
    // USERNAME STATUS
    // =====================================================

    function showStatus(message, type) {

        if (!usernameStatus ||
            !usernameInput) {

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

        if (!usernameStatus ||
            !usernameInput) {

            return;
        }


        usernameStatus.style.display =
            "none";

        usernameStatus.textContent =
            "";

        usernameInput.style.borderColor =
            "";

        verifiedUsername = "";
    }


    // =====================================================
    // USERNAME TEKSHIRISH
    // =====================================================

    async function checkUsername(username) {

        if (!usernameInput ||
            !usernameStatus) {

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
                "❗ Username tekshirilmadi. Qaytadan urinib ko‘ring.",
                "error"
            );


            return null;
        }
    }


    // =====================================================
    // USERNAME FORM
    // =====================================================

    function showRecipientForm() {

        clearTimeout(searchTimer);

        clearProducts();

        verifiedUsername = "";


        products.innerHTML = `

            <div class="gift-form">

                <h2>
                    🎁 Kimga yubormoqchisiz?
                </h2>

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

                <h3>
                    💎 Telegram Premium
                </h3>

                <p>
                    Telegram Premium sovg‘a qiling
                </p>

                <button
                    type="button"
                    class="buy-button"
                    id="choosePremium"
                    style="margin-top:14px;"
                >
                    💎 Premium
                </button>

            </div>


            <div class="product-card">

                <h3>
                    ⭐ Telegram Stars
                </h3>

                <p>
                    Telegram Stars sovg‘a qiling
                </p>

                <button
                    type="button"
                    class="buy-button"
                    id="chooseStars"
                    style="margin-top:14px;"
                >
                    ⭐ Stars
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
        // OLD USERNAME QAYTARISH
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
        // PREMIUM TANLASH
        // =================================================

        const choosePremium =
            document.getElementById(
                "choosePremium"
            );


        choosePremium.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();
                event.stopPropagation();


                const username =
                    await getUsername();


                if (!username) {
                    return;
                }


                showPremium(username);
            }
        );


        // =================================================
        // STARS TANLASH
        // =================================================

        const chooseStars =
            document.getElementById(
                "chooseStars"
            );


        chooseStars.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();
                event.stopPropagation();


                const username =
                    await getUsername();


                if (!username) {
                    return;
                }


                showStars(username);
            }
        );
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
    // PREMIUM SAHIFA
    // =====================================================

    function showPremium(username) {

        currentUsername =
            username;


        clearProducts();


        // BACK

        const backButton =
            createBackButton(
                "Username kiritish"
            );


        backButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                showRecipientForm();
            }
        );


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


            <div id="premiumPlans"></div>

            `
        );


        const plans =
            document.getElementById(
                "premiumPlans"
            );


        // =================================================
        // ODDIY 3 / 6 / 12 OY
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
                                ${formatPrice(
                                    plan.price
                                )}
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
        // MUROJAAT PAKETLARI
        // =================================================

        contactPlans.forEach(
            function (plan) {

                plans.insertAdjacentHTML(
                    "beforeend",
                    `

                    <div class="product-card">

                        <h3>
                            💬 ${plan.title}
                            Premium — Murojaat
                        </h3>

                        <p>
                            ${formatPrice(
                                plan.price
                            )}
                        </p>

                        <div class="product-price">

                            <span class="price">
                                ${formatPrice(
                                    plan.price
                                )}
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
        // ODDIY PREMIUM BUTTONLAR
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
        // MUROJAAT BUTTONLAR
        // =================================================

        plans
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


        // BACK

        const backButton =
            createBackButton(
                "Premium paketlari"
            );


        backButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                showPremium(username);
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
                    💎 ${months} oylik Premium
                </h3>

                <p>
                    Narxi: ${formatPrice(price)}
                </p>

                <p style="
                    margin-top:12px;
                    color:#ffffff;
                    opacity:0.85;
                ">
                    ${months === 1
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


        contactButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                const url =
                    "https://t.me/AmirquIov";


                if (tg &&
                    typeof tg.openTelegramLink ===
                    "function") {

                    tg.openTelegramLink(url);

                } else {

                    window.open(
                        url,
                        "_blank"
                    );
                }
            }
        );
    }


    // =====================================================
    // STARS SAHIFASI
    // =====================================================

    function showStars(username) {

        currentUsername =
            username;


        clearProducts();


        // BACK

        const backButton =
            createBackButton(
                "Username kiritish"
            );


        backButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                showRecipientForm();
            }
        );


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
                                ${formatPrice(
                                    price
                                )}
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
    // BUYURTMA
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


        let detail = "";


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
                "\n\n" +

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
                    SERVER_URL +
                    "/create-order",
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


                showRecipientForm();
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


                showRecipientForm();
            }
        );
    }


    // =====================================================
    // BOSHLANG'ICH HOLAT
    // =====================================================

    clearProducts();

});
