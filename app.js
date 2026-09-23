document.addEventListener("DOMContentLoaded", function () {

    const products = document.getElementById("products");
    const premiumButton = document.getElementById("premiumButton");
    const starsButton = document.getElementById("starsButton");

    function showPremium() {
        products.innerHTML = `
            <div class="product-card">
                <h3>💎 Telegram Premium — 3 oy</h3>
                <p>Premium xizmatidan 3 oy foydalaning</p>
                <div class="product-price">
                    <span class="price">165 000 so'm</span>
                    <button class="buy-button">Sotib olish</button>
                </div>
            </div>

            <div class="product-card">
                <h3>💎 Telegram Premium — 6 oy</h3>
                <p>Premium xizmatidan 6 oy foydalaning</p>
                <div class="product-price">
                    <span class="price">220 000 so'm</span>
                    <button class="buy-button">Sotib olish</button>
                </div>
            </div>

            <div class="product-card">
                <h3>💎 Telegram Premium — 1 yil</h3>
                <p>Premium xizmatidan 12 oy foydalaning</p>
                <div class="product-price">
                    <span class="price">390 000 so'm</span>
                    <button class="buy-button">Sotib olish</button>
                </div>
            </div>
        `;
    }

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
                    <p>Telegram Stars</p>
                    <div class="product-price">
                        <span class="price">
                            ${price.toLocaleString("uz-UZ")} so'm
                        </span>
                        <button class="buy-button">
                            Sotib olish
                        </button>
                    </div>
                </div>
            `;
        });
    }

    premiumButton.addEventListener("click", function () {
        premiumButton.classList.add("active");
        starsButton.classList.remove("active");
        showPremium();
    });

    starsButton.addEventListener("click", function () {
        starsButton.classList.add("active");
        premiumButton.classList.remove("active");
        showStars();
    });

    showPremium();

});
