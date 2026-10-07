document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // ASOSIY SOZLAMALAR
    // =====================================================

    const SERVER_URL = "https://telegram-shop-co3o.onrender.com";

    const tg = window.Telegram?.WebApp;

    if (tg) {
        tg.ready();
        tg.expand();

        try {
            tg.setHeaderColor("#0b1118");
            tg.setBackgroundColor("#0b1118");
        } catch (error) {
            console.log("Telegram theme error:", error);
        }
    }


    // =====================================================
    // SAHIFALAR
    // =====================================================

    const homePage = document.getElementById("homePage");
    const ordersPage = document.getElementById("ordersPage");
    const profilePage = document.getElementById("profilePage");
    const productsSection =
        document.getElementById("productsSection");


    // =====================================================
    // NAVIGATION
    // =====================================================

    const homeNavButton =
        document.getElementById("homeNavButton");

    const ordersNavButton =
        document.getElementById("ordersNavButton");

    const profileNavButton =
        document.getElementById("profileNavButton");


    // =====================================================
    // ASOSIY BUTTONLAR
    // =====================================================

    const premiumButton =
        document.getElementById("premiumButton");

    const starsButton =
        document.getElementById("starsButton");


    // =====================================================
    // TELEGRAM USER
    // =====================================================

    const telegramUser =
        tg?.initDataUnsafe?.user || null;


    // =====================================================
    // YORDAMCHI FUNKSIYALAR
    // =====================================================

    function haptic(type = "light") {
        try {
            tg?.HapticFeedback?.impactOccurred(type);
        } catch (error) {}
    }


    function telegramAlert(message) {
        if (tg?.showAlert) {
            tg.showAlert(message);
        } else {
            alert(message);
        }
    }


    function getUserName() {

        if (!telegramUser) {
            return "Telegram foydalanuvchisi";
        }

        const first =
            telegramUser.first_name || "";

        const last =
            telegramUser.last_name || "";

        const fullName =
            `${first} ${last}`.trim();

        return (
            fullName ||
            telegramUser.username ||
            "Foydalanuvchi"
        );
    }


    function updateUserInfo() {

        const userName =
            document.getElementById("userName");

        const profileName =
            document.getElementById("profileName");

        const profileUsername =
            document.getElementById("profileUsername");

        const name = getUserName();

        if (userName) {
            userName.textContent = name;
        }

        if (profileName) {
            profileName.textContent = name;
        }

        if (profileUsername) {

            if (telegramUser?.username) {
                profileUsername.textContent =
                    "@" + telegramUser.username;
            } else {
                profileUsername.textContent =
                    "Telegram username mavjud emas";
            }
        }
    }


    // =====================================================
    // SAHIFALARNI YASHIRISH
    // =====================================================

    function hideAllPages() {

        [
            homePage,
            ordersPage,
            profilePage,
            productsSection
        ].forEach(page => {

            if (!page) return;

            page.style.display = "none";
            page.classList.remove("active-page");
        });
    }


    function clearNavigation() {

        [
            homeNavButton,
            ordersNavButton,
            profileNavButton
        ].forEach(button => {

            if (button) {
                button.classList.remove("active");
            }
        });
    }


    // =====================================================
    // BOSH SAHIFA
    // =====================================================

    function showHome() {

        hideAllPages();
        clearNavigation();

        if (homePage) {
            homePage.style.display = "block";
            homePage.classList.add("active-page");
        }

        if (homeNavButton) {
            homeNavButton.classList.add("active");
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        haptic("light");
    }


    // =====================================================
    // BUYURTMALAR
    // =====================================================

    function showOrders() {

        hideAllPages();
        clearNavigation();

        if (ordersPage) {
            ordersPage.style.display = "block";
            ordersPage.classList.add("active-page");
        }

        if (ordersNavButton) {
            ordersNavButton.classList.add("active");
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        haptic("light");

        const ordersContent =
            document.getElementById("ordersContent");

        if (ordersContent) {

            ordersContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>

                    <h3>Buyurtmalar</h3>

                    <p>
                        Buyurtmalar bo‘limi keyingi
                        qismda ulanadi.
                    </p>
                </div>
            `;
        }
    }


    // =====================================================
    // PROFIL
    // =====================================================

    function showProfile() {

        hideAllPages();
        clearNavigation();

        if (profilePage) {
            profilePage.style.display = "block";
            profilePage.classList.add("active-page");
        }

        if (profileNavButton) {
            profileNavButton.classList.add("active");
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        haptic("light");
    }


    // =====================================================
    // PRODUCTS PAGE
    // =====================================================

    function showProductsPage() {

        hideAllPages();
        clearNavigation();

        if (productsSection) {
            productsSection.style.display = "block";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    // =====================================================
    // BUTTONLAR
    // =====================================================

    if (homeNavButton) {
        homeNavButton.addEventListener(
            "click",
            showHome
        );
    }


    if (ordersNavButton) {
        ordersNavButton.addEventListener(
            "click",
            showOrders
        );
    }


    if (profileNavButton) {
        profileNavButton.addEventListener(
            "click",
            showProfile
        );
    }


    // Hozircha faqat keyingi qismga tayyorlaymiz
    if (premiumButton) {
        premiumButton.addEventListener(
            "click",
            () => {

                haptic("medium");

                showProductsPage();

                const products =
                    document.getElementById("products");

                if (products) {
                    products.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">💎</div>
                            <h3>Telegram Premium</h3>
                            <p>
                                Keyingi qismda Premium
                                paketlari chiqadi.
                            </p>
                        </div>
                    `;
                }
            }
        );
    }


    if (starsButton) {
        starsButton.addEventListener(
            "click",
            () => {

                haptic("medium");

                showProductsPage();

                const products =
                    document.getElementById("products");

                if (products) {
                    products.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">⭐</div>
                            <h3>Telegram Stars</h3>
                            <p>
                                Keyingi qismda Stars
                                paketlari chiqadi.
                            </p>
                        </div>
                    `;
                }
            }
        );
    }


    // =====================================================
    // START
    // =====================================================

    updateUserInfo();
    showHome();

});
