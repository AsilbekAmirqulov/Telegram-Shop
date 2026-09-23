```javascript
document.addEventListener("DOMContentLoaded", function () {

    const products = document.getElementById("products");
    const premiumButton = document.getElementById("premiumButton");
    const starsButton = document.getElementById("starsButton");

    // Telegram WebApp
    const tg = window.Telegram?.WebApp || null;

    if (tg) {
        tg.ready();
        tg.expand();
    }

    const user = tg?.initDataUnsafe?.user || null;

    // Foydalanuvchi nomi
    if (user) {
        const userName = document.getElementById("userName");
        const userAvatar = document.getElementById("userAvatar");

        const fullName = [user.first_name, user.last_name]
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

    // PREMIUM
    function showPremium() {

        products.innerHTML = `
            <div class="product-card">
                <h3>💎 Telegram Premium — 3 oy</h3>
                <p>Premium xizmatidan 3 oy foydalaning</p>

                <div class="product-price">
                    <span class="price">165 000 so'm</span>

                    <button
                        class="buy-button"
                        onclick="buyProduct('premium_3', 165000)"
                    >
                        Sotib olish
                    </button>
                </div>
            </div>

            <div class="product-card">
                <h3>💎 Telegram Premium — 6 oy</h3>
                <p>Premium xizmatidan 6 oy foydalaning</p>

                <div class="product-price">
                    <span class="price">220 000 so'm</span>

                    <button
                        class="buy-button"
                        onclick="buyProduct('premium_6', 220000)"
                    >
                        Sotib olish
                    </button>
                </div>
            </div>

            <div class="product-card">
                <h3>💎 Telegram Premium — 1 yil</h3>
                <p>Premium xizmatidan 12 oy foydalaning</p>

                <div class="product-price">
                    <span class="price">390 000 so'm</span>

                    <button
                        class="buy-button"
                        onclick="buyProduct('premium_12', 390000)"
                    >
                        Sotib olish
                    </button>
                </div>
            </div>
        `;
    }


    // STARS
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

        products.innerHTML = stars.map(function ([count, price]) {

            return `
                <div class="product-card">

                    <h3>⭐ ${count} Telegram Stars</h3>

                    <p>Telegram Stars</p>

                    <div class="product-price">

                        <span class="price">
                            ${price.toLocaleString("uz-UZ")} so'm
                        </span>

                        <button
                            class="buy-button"
                            onclick="buyProduct('stars_${count}', ${price})"
                        >
                            Sotib olish
                        </button>

                    </div>

                </div>
            `;

        }).join("");
    }


    // PREMIUM BUTTON
    premiumButton.addEventListener("click", function () {

        console.log("PREMIUM BOSILDI");

        premiumButton.classList.add("active");
        starsButton.classList.remove("active");

        showPremium();
    });


    // STARS BUTTON
    starsButton.addEventListener("click", function () {

        console.log("STARS BOSILDI");

        starsButton.classList.add("active");
        premiumButton.classList.remove("active");

        showStars();
    });


    // BOSHLANG'ICH HOLAT
    showPremium();


    // BUY
    window.buyProduct = async function (product, amount) {

        if (!user) {

            if (tg) {
                tg.showAlert(
                    "Telegram foydalanuvchisi aniqlanmadi."
                );
            } else {
                alert("Telegram ichidan oching.");
            }

            return;
        }

        let confirmed;

        if (tg) {

            confirmed = await new Promise(function (resolve) {

                tg.showConfirm(
                    "Buyurtmani tasdiqlaysizmi?\n\n" +
                    "Mahsulot: " + product +
                    "\nNarx: " +
                    amount.toLocaleString("uz-UZ") +
                    " so'm",

                    function (result) {
                        resolve(result);
                    }
                );

            });

        } else {

            confirmed = confirm(
                "Buyurtmani tasdiqlaysizmi?\n\n" +
                "Mahsulot: " + product +
                "\nNarx: " +
                amount.toLocaleString("uz-UZ") +
                " so'm"
            );
        }

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
                    "Server xatosi: " + response.status
                );
            }


            const data = await response.json();


            if (data.ok) {

                if (tg) {

                    tg.showAlert(
                        "✅ Buyurtma yaratildi!\n\n" +
                        "Buyurtma №: " +
                        data.order_id
                    );

                } else {

                    alert(
                        "Buyurtma yaratildi! № " +
                        data.order_id
                    );

                }

            } else {

                if (tg) {
                    tg.showAlert("❌ Buyurtma yaratilmadi.");
                } else {
                    alert("Buyurtma yaratilmadi.");
                }

            }

        } catch (error) {

            console.error(error);

            if (tg) {

                tg.showAlert(
                    "❌ Server bilan bog‘lanib bo‘lmadi."
                );

            } else {

                alert(
                    "❌ Server bilan bog‘lanib bo‘lmadi."
                );

            }
        }
    };

});
```
