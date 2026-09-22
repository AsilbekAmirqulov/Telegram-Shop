const premiumButton = document.getElementById("premiumButton");
const starsButton = document.getElementById("starsButton");
const products = document.getElementById("products");

premiumButton.addEventListener("click", function () {
    products.innerHTML = "<h2>🔓 Premium mahsulotlari</h2>";
});

starsButton.addEventListener("click", function () {
    products.innerHTML = "<h2>🌟 Stars mahsulotlari</h2>";
});
