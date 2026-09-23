const tg = window.Telegram.WebApp;

tg.ready();
tg.expand();

const products = document.getElementById("products");

function showPremium() {
    products.innerHTML = `
        <div class="product-card">
            <h2>💎 Telegram Premium</h2>
            <p>Premium muddatini tanlang:</p>

            <button onclick="selectPremium(3)">
                3 oy
            </button>

            <button onclick="selectPremium(6)">
                6 oy
            </button>

            <button onclick="selectPremium(12)">
                12 oy
            </button>
        </div>
    `;
}

function showStars() {
    products.innerHTML = `
        <div class="product-card">
            <h2>🌟 Telegram Stars</h2>
            <p>Stars xizmati tez orada qo‘shiladi.</p>
        </div>
    `;
}

async function selectPremium(months) {

    products.innerHTML = `
        <div class="product-card">
            <h2>💎 Telegram Premium — ${months} oy</h2>

            <label>
                Qabul qiluvchi Telegram username:
            </label>

            <input
                id="username"
                type="text"
                placeholder="@username"
            >

            <button onclick="createOrder(${months})">
                🛒 Buyurtma berish
            </button>
        </div>
    `;

    try {
        const response = await fetch("/supplier-premium-prices");
        const data = await response.json();

        if (data.ok) {
            console.log("Supplier prices:", data);
        }
    } catch (error) {
        console.log("Narxlarni olishda xatolik:", error);
    }
}

async function createOrder(months) {

    const usernameInput = document.getElementById("username");
    const username = usernameInput.value.trim();

    if (!username) {
        alert("Telegram username kiriting.");
        return;
    }

    const userId = tg.initDataUnsafe?.user?.id;

    if (!userId) {
        alert("Telegram foydalanuvchisi aniqlanmadi.");
        return;
    }

    const product = `Telegram Premium ${months} oy — ${username}`;

    try {

        const response = await fetch("/create-order", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: userId,
                product: product,
                amount: 0
            })
        });

        const data = await response.json();

        if (data.ok) {

            products.innerHTML = `
                <div class="product-card">
                    <h2>✅ Buyurtma qabul qilindi</h2>

                    <p>
                        Buyurtma raqami:
                        <strong>#${data.order_id}</strong>
                    </p>

                    <p>
                        Qabul qiluvchi:
                        <strong>${username}</strong>
                    </p>

                    <p>
                        Premium:
                        <strong>${months} oy</strong>
                    </p>
                </div>
            `;

        } else {
            alert("Buyurtma yaratishda xatolik.");
        }

    } catch (error) {

        console.error(error);

        alert("Server bilan bog‘lanishda xatolik.");
    }
}