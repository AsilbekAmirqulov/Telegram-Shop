const products = document.getElementById("products");


// ==========================
// PREMIUM
// ==========================

function showPremium() {

    products.innerHTML = `
        <div class="product">
            <h3>🔐 Premium — 1 oy</h3>
            <div class="price">40 000 so'm</div>
            <button class="buy-button" onclick="buy('premium_1')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🔐 Premium — 1 yil</h3>
            <div class="price">280 000 so'm</div>
            <button class="buy-button" onclick="buy('premium_12')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🔓 Premium — 3 oy</h3>
            <div class="price">165 000 so'm</div>
            <button class="buy-button" onclick="buy('premium_no_login_3')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🔓 Premium — 6 oy</h3>
            <div class="price">220 000 so'm</div>
            <button class="buy-button" onclick="buy('premium_no_login_6')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🔓 Premium — 1 yil</h3>
            <div class="price">390 000 so'm</div>
            <button class="buy-button" onclick="buy('premium_no_login_12')">
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
            <button class="buy-button" onclick="buy('stars_100')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 150 Stars</h3>
            <div class="price">40 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_150')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 250 Stars</h3>
            <div class="price">64 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_250')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 350 Stars</h3>
            <div class="price">89 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_350')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 500 Stars</h3>
            <div class="price">125 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_500')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 750 Stars</h3>
            <div class="price">185 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_750')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 1000 Stars</h3>
            <div class="price">244 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_1000')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 1500 Stars</h3>
            <div class="price">365 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_1500')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 2500 Stars</h3>
            <div class="price">605 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_2500')">
                💳 Sotib olish
            </button>
        </div>

        <div class="product">
            <h3>🌟 5000 Stars</h3>
            <div class="price">1 205 000 so'm</div>
            <button class="buy-button" onclick="buy('stars_5000')">
                💳 Sotib olish
            </button>
        </div>
    `;
}


// ==========================
// SOTIB OLISH
// ==========================

function buy(product) {

    const tg = window.Telegram.WebApp;

    tg.showAlert(
        "Tanlangan mahsulot: " + product
    );
}
