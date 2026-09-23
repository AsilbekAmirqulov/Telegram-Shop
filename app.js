```javascript
const products = document.getElementById("products");

const tg = window.Telegram.WebApp;


// ==========================
// TELEGRAM MINI APP
// ==========================

tg.ready();
tg.expand();


// ==========================
// USER
// ==========================

const user = tg.initDataUnsafe?.user;

if (user) {

    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    const fullName =
        [user.first_name, user.last_name]
            .filter(Boolean)
            .join(" ");

    userName.textContent =
        fullName || user.username || "Telegram foydalanuvchisi";

    if (user.photo_url) {

        userAvatar.innerHTML = `
            <img
                src="${user.photo_url}"
                alt="Avatar"
                style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    border-radius:50%;
                "
            >
        `;
    }
}


// ==========================
// TELEGRAM PREMIUM
// ==========================

function showPremium() {

    products.innerHTML = `

        <div class="product-card">

            <h3>💎 Telegram Premium — 3 oy</h3>

            <p>
                Premium xizmatidan 3 oy foydalaning
            </p>

            <div class="product-price">

                <span class="price">
                    165 000 so'm
                </span>

                <button
                    class="buy-button"
                    onclick="buy('premium_3', 165000)"
                >
                    Sotib olish
                </button>

            </div>

        </div>


        <div class="product-card">

            <h3>💎 Telegram Premium — 6 oy</h3>

            <p>
                Premium xizmatidan 6 oy foydalaning
            </p>

            <div class="product-price">

                <span class="price">
                    220 000 so'm
                </span>

                <button
                    class="buy-button"
                    onclick="buy('premium_6', 220000)"
                >
                    Sotib olish
                </button>

            </div>

        </div>


        <div class="product-card">

            <h3>💎 Telegram Premium — 1 yil</h3>

            <p>
                Premium xizmatidan 12 oy foydalaning
            </p>

            <div class="product-price">

                <span class="price">
                    390 000 so'm
                </span>

                <button
                    class="buy-button"
                    onclick="buy('premium_12', 390000)"
                >
                    Sotib olish
                </button>

            </div>

        </div>

    `;
}


// ==========================
// TELEGRAM STARS
// ==========================

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

    products.innerHTML = stars.map(
        ([count, price]) => `

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
                        onclick="buy('stars_${count}', ${price})"
                    >
                        Sotib olish
                    </button>

                </div>

            </div>

        `
    ).join("");
}


// ==========================
// CATEGORY BUTTONS
// ==========================

const premiumButton =
    document.getElementById("premiumButton");

const starsButton =
    document.getElementById("starsButton");


premiumButton.addEventListener(
    "click",
    () => {

        premiumButton.classList.add("active");
        starsButton.classList.remove("active");

        showPremium();
    }
);


starsButton.addEventListener(
    "click",
    () => {

        starsButton.classList.add("active");
        premiumButton.classList.remove("active");

        showStars();
    }
);


// ==========================
// DEFAULT
// ==========================

showPremium();


// ==========================
// BUY
// ==========================

async function buy(product, amount) {

    if (!user) {

        tg.showAlert(
            "Telegram foydalanuvchisi aniqlanmadi."
        );

        return;
    }


    // Telegram Mini App confirmation
    const confirmed = confirm(
        "Buyurtmani tasdiqlaysizmi?\n\n" +
        "Mahsulot: " + product +
        "\nNarx: " +
        amount.toLocaleString("uz-UZ") +
        " so'm"
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
                    user_id: user.id,
                    product: product,
                    amount: amount
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

            tg.showAlert(
                "✅ Buyurtma yaratildi!\n\n" +
                "Buyurtma №: " +
                data.order_id +
                "\n\n" +
                "Mahsulot: " +
                product +
                "\n" +
                "Narx: " +
                amount.toLocaleString("uz-UZ") +
                " so'm"
            );

        } else {

            tg.showAlert(
                "❌ Buyurtma yaratilmadi."
            );
        }


    } catch (error) {

        console.error(error);

        tg.showAlert(
            "❌ Server bilan bog‘lanib bo‘lmadi."
        );
    }
}
```
