const products = document.getElementById("products");


// ==========================
// TELEGRAM PREMIUM
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
// TELEGRAM STARS
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
// TUGMALARNI ULASH
// ==========================

document
    .getElementById("premiumButton")
    .addEventListener("click", showPremium);

document
    .getElementById("starsButton")
    .addEventListener("click", showStars);


// ==========================
// SOTIB OLISH
// ==========================

async function buy(product, amount) {

    alert(
        "Tanlangan mahsulot: " +
        product +
        "\nNarxi: " +
        amount.toLocaleString("uz-UZ") +
        " so'm"
    );
}
