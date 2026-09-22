```javascript
const products = document.getElementById("products");


// ==========================
// TELEGRAM
// ==========================

const tg = window.Telegram.WebApp;

tg.ready();
tg.expand();


// ==========================
// PREMIUM
// ==========================

function showPremium() {
    products.innerHTML = `
        <div class="product">
            <h3>🔓 Premium — 3 oy</h3>
            <div class="price">165 000 so'm</div>
            <button class="buy-button" onclick="buy('premium_3', 165000)">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🔓 Premium — 6 oy</h3>
            <div class="price">220 000 so'm</div>
            <button class="buy-button" onclick="buy('premium_6', 220000)">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🔓 Premium — 1 yil</h3>
            <div class="price">390 000 so'm</div>
            <button class="buy-button" onclick="buy('premium_12', 390000)">
                💳 Sotib olish
            </button>
        </div>
    `;
}


// ==========================
// STARS
// ==========================

function showStars() {
    products.innerHTML = `
        <div class="product">
            <h3>🌟 100 Stars</h3>
            <div class="price">30 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_100', 30000)">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 150 Stars</h3>
            <div class="price">40 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_150', 40000)">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 250 Stars</h3>
            <div class="price">64 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_250', 64000)">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 350 Stars</h3>
            <div class="price">89 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_350', 89000)">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 500 Stars</h3>
            <div class="price">125 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_500', 125000)">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 750 Stars</h3>
            <div class="price">185 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_750', 185000)">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 1000 Stars</h3>
            <div class="price">244 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_1000', 244000)">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 1500 Stars</h3>
            <div class="price">365 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_1500', 365000)">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 2500 Stars</h3>
            <div class="price">605 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_2500', 605000)">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 5000 Stars</h3>
            <div class="price">1 205 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_5000', 1205000)">
                💳 Sotib olish
            </button>
        </div>
    `;
}


// ==========================
// SOTIB OLISH
// ==========================

async function buy(product, amount) {

    // Telegram foydalanuvchisini olish
    const user = tg.initDataUnsafe.user;

    if (!user) {
        tg.showAlert("Telegram foydalanuvchisi aniqlanmadi.");
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

        const data = await response.json();

        if (data.ok) {

            tg.showAlert(
                "Buyurtma yaratildi! ✅\n\n" +
                "Buyurtma №: " + data.order_id +
                "\nMahsulot: " + product +
                "\nNarx: " + amount.toLocaleString("uz-UZ") + " so'm"
            );

        } else {

            tg.showAlert(
                "Buyurtma yaratishda xatolik yuz berdi."
            );
        }

    } catch (error) {

        console.error(error);

        tg.showAlert(
            "Server bilan bog'lanishda xatolik yuz berdi."
        );
    }
}
```
