let isVegMode = false;
let currentCategoryId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    cart = JSON.parse(localStorage.getItem('cart')) || [];

    if (currentUser) {
        console.log("User found in localStorage:", currentUser.name);
        showMenuSection();
        loadCategories();
    } else {
        console.log("No user found in localStorage, showing login.");
        showLoginSection();
    }
    updateCartUI();

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => changeTheme(e.target.value));
        const savedTheme = localStorage.getItem('theme') || 'classic';
        themeSelect.value = savedTheme;
        changeTheme(savedTheme);
    } else {
        console.warn("Theme select dropdown not found.");
    }

    const darkModeBtn = document.getElementById('darkModeToggle');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', toggleDarkMode);
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark');
            darkModeBtn.textContent = '☀️';
            darkModeBtn.title = 'Switch to Light Mode';
        } else {
            darkModeBtn.textContent = '🌙';
             darkModeBtn.title = 'Switch to Dark Mode';
        }
    } else {
        console.warn("Dark mode toggle button not found.");
    }

    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', loginUser);
    } else {
        console.warn("Login button not found.");
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    } else {
        console.warn("Logout button not found.");
    }

    const vegToggleBtn = document.getElementById('vegToggleButton');
    if (vegToggleBtn) {
        vegToggleBtn.addEventListener('click', () => toggleVegMode(vegToggleBtn));
    } else {
        console.warn("Veg toggle button not found.");
    }

    const seeCartButton = document.getElementById('seeCartButton');
    if (seeCartButton) {
        seeCartButton.addEventListener('click', seeCart);
    } else {
        console.warn("See Cart button (status bar) not found.");
    }

    const checkoutButtons = document.querySelectorAll('.checkout-btn');
    if (checkoutButtons.length > 0) {
        checkoutButtons.forEach(btn => {
            btn.addEventListener('click', checkoutOrder);
        });
    } else {
        console.warn("No checkout buttons found.");
    }

    const floatCartButton = document.getElementById('cartFloatBtn');
    if (floatCartButton) {
        floatCartButton.addEventListener('click', toggleCartSidebar);
    } else {
        console.warn("Floating cart button not found.");
    }

    const closeSidebarButton = document.getElementById('closeCartSidebarBtn');
    if (closeSidebarButton) {
        closeSidebarButton.addEventListener('click', toggleCartSidebar);
    } else {
        console.warn("Close cart sidebar button not found.");
    }

    const closeModalButton = document.getElementById('closeCartModalBtn');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeCart);
    } else {
        console.warn("Close cart modal button not found.");
    }

});

function showLoginSection() {
    const loginBox = document.getElementById('loginBox');
    const menuSection = document.getElementById('menuSection');
    if (loginBox) loginBox.style.display = 'block';
    if (menuSection) menuSection.style.display = 'none';
    console.log("UI switched to: Login Section");
}

function showMenuSection() {
    const loginBox = document.getElementById('loginBox');
    const menuSection = document.getElementById('menuSection');
    const userNameDisplay = document.getElementById('userNameDisplay');

    if (loginBox) loginBox.style.display = 'none';
    if (menuSection) menuSection.style.display = 'block';

    if (userNameDisplay) {
        userNameDisplay.textContent = currentUser ? escapeHTML(currentUser.name) : 'Guest';
    } else {
        console.warn("Element 'userNameDisplay' not found.");
    }
    console.log("UI switched to: Menu Section");
}

async function loginUser() {
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const errorDisplay = document.getElementById('loginError');

    if (errorDisplay) errorDisplay.style.display = 'none';

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!name || !phone) {
        showToast('Please enter both name and phone number.', true);
        if (errorDisplay) {
            errorDisplay.textContent = 'Please enter both name and phone number.';
            errorDisplay.style.display = 'block';
        }
        return;
    }

    console.log(`Attempting login for: ${name}, ${phone}`);
    showToast("Logging in...", false);

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log("Login successful:", currentUser);
            showToast(`Welcome, ${escapeHTML(currentUser.name)}!`, false);
            showMenuSection();
            loadCategories();
        } else {
            const errorMessage = data.error || `Login failed (Status: ${response.status}). Please check details or try again.`;
            console.error("Login failed:", errorMessage);
            showToast(errorMessage, true);
            if (errorDisplay) {
                errorDisplay.textContent = errorMessage;
                errorDisplay.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('An error occurred during login fetch:', error);
        const networkErrorMsg = 'Network error during login. Please check connection.';
        showToast(networkErrorMsg, true);
        if (errorDisplay) {
            errorDisplay.textContent = networkErrorMsg;
            errorDisplay.style.display = 'block';
        }
    }
}

function logoutUser() {
    console.log(`Logging out user: ${currentUser ? currentUser.name : 'Guest'}`);
    const userName = currentUser ? currentUser.name : 'User';
    currentUser = null;
    cart = [];
    isVegMode = false;
    currentCategoryId = null;

    localStorage.removeItem('currentUser');
    localStorage.removeItem('cart');

    const categoriesContainer = document.getElementById('categories');
    const itemsContainer = document.getElementById('items');
    if (categoriesContainer) categoriesContainer.innerHTML = '';
    if (itemsContainer) itemsContainer.innerHTML = '';

    const vegToggleBtn = document.getElementById('vegToggleButton');
     if (vegToggleBtn) {
         vegToggleBtn.classList.remove('active');
         vegToggleBtn.innerHTML = '🌿 Veg Only';
     }

    updateCartUI();
    showLoginSection();
    showToast(`Goodbye, ${escapeHTML(userName)}!`, false);
}

async function loadCategories() {
    const categoriesContainer = document.getElementById('categories');
    if (!categoriesContainer) {
        console.error("Categories container not found.");
        return;
    }
    categoriesContainer.innerHTML = 'Loading categories...';

    try {
        console.log("Fetching categories...");
        const response = await fetch(`${API_URL}/categories`);
        if (!response.ok) {
            throw new Error(`HTTP error fetching categories! Status: ${response.status}`);
        }
        categoriesData = await response.json();
        console.log("Categories received:", categoriesData);

        categoriesContainer.innerHTML = '';

        if (categoriesData.length === 0) {
            categoriesContainer.innerHTML = '<p>No categories available.</p>';
            document.getElementById('items').innerHTML = '';
            return;
        }

        categoriesData.forEach((category, index) => {
            const button = document.createElement('button');
            button.textContent = escapeHTML(category.name);
            button.dataset.categoryId = category.id;
            button.title = `Show ${escapeHTML(category.name)} items`;

            button.addEventListener('click', () => {
                const activeButton = categoriesContainer.querySelector('button.active');
                if (activeButton) activeButton.classList.remove('active');
                button.classList.add('active');
                loadItems(category.id);
            });
            categoriesContainer.appendChild(button);

            if (index === 0) {
                button.classList.add('active');
                loadItems(category.id);
            }
        });

    } catch (error) {
        console.error("Error loading categories:", error);
        categoriesContainer.innerHTML = '<p>Error loading categories. Please try again later.</p>';
        showToast("Could not load categories.", true);
    }
}

async function loadItems(categoryId) {
    if (currentCategoryId === categoryId && menuItemsData.length > 0) {
        console.log(`Category ${categoryId} items already loaded. Re-rendering.`);
        renderMenuItems();
        return;
    }

    currentCategoryId = categoryId;
    const itemsContainer = document.getElementById('items');
    if (!itemsContainer) {
        console.error("Items container not found.");
        return;
    }
    itemsContainer.innerHTML = '<p>Loading items...</p>';
    menuItemsData = [];

    try {
        console.log(`Fetching items for category ID: ${categoryId}`);
        const response = await fetch(`${API_URL}/menu/${categoryId}`);
        if (!response.ok) {
            throw new Error(`HTTP error fetching items! Status: ${response.status}`);
        }
        menuItemsData = await response.json();
        console.log(`Items received for category ${categoryId}:`, menuItemsData);
        renderMenuItems();

    } catch (error) {
        console.error(`Error loading items for category ${categoryId}:`, error);
        itemsContainer.innerHTML = '<p>Error loading items. Please try again later.</p>';
        showToast("Could not load menu items.", true);
    }
}

function renderMenuItems() {
    const itemsContainer = document.getElementById('items');
    if (!itemsContainer) return;

    itemsContainer.innerHTML = '';

    const itemsToDisplay = isVegMode
        ? menuItemsData.filter(item => item.is_veg)
        : menuItemsData;

    console.log(`Rendering ${itemsToDisplay.length} items (Veg mode: ${isVegMode})`);

    if (itemsToDisplay.length === 0) {
        if (isVegMode && menuItemsData.length > 0) {
            itemsContainer.innerHTML = '<p>No vegetarian items found in this category.</p>';
        } else if (menuItemsData.length === 0) {
             itemsContainer.innerHTML = '<p>No items found in this category.</p>';
        } else {
             itemsContainer.innerHTML = '<p>No items to display.</p>';
        }
       return;
    }

    itemsToDisplay.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';

        const typeLabel = document.createElement('span');
        typeLabel.classList.add('type-label');
        if (item.is_veg) {
            typeLabel.classList.add('veg');
            typeLabel.textContent = 'Veg';
            typeLabel.title = 'Vegetarian';
        } else {
            typeLabel.classList.add('non-veg');
            typeLabel.textContent = 'Non-Veg';
             typeLabel.title = 'Non-Vegetarian';
        }
        card.appendChild(typeLabel);

        const img = document.createElement('img');
        img.src = item.image || 'https://placehold.co/200x140/cccccc/ffffff?text=No+Image';
        img.alt = escapeHTML(item.name);
        img.onerror = function() {
            this.onerror=null;
            this.src='https://placehold.co/200x140/cccccc/ffffff?text=Error';
            this.alt = 'Image loading error';
        };
        card.appendChild(img);

        const name = document.createElement('h3');
        name.textContent = escapeHTML(item.name);
        card.appendChild(name);

        if (item.description) {
            const description = document.createElement('p');
            description.className = 'item-description';
            description.textContent = escapeHTML(item.description);
            card.appendChild(description);
        }

        const price = document.createElement('p');
        price.className = 'item-price';
        price.textContent = `₹${item.price.toFixed(2)}`;
        card.appendChild(price);

        const addButton = document.createElement('button');
        addButton.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        addButton.title = `Add ${escapeHTML(item.name)} to cart`;
        addButton.addEventListener('click', () => addToCart(item));
        card.appendChild(addButton);

        itemsContainer.appendChild(card);
    });
}

function addToCart(item) {
    if (!item || typeof item.id === 'undefined' || typeof item.name === 'undefined' || typeof item.price === 'undefined') {
        console.error("Attempted to add invalid item object to cart:", item);
        showToast("Error: Cannot add invalid item to cart.", true);
        return;
    }

    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);

    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity++;
        console.log(`Incremented quantity for item ID ${item.id} to ${cart[existingItemIndex].quantity}`);
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1
        });
        console.log(`Added new item to cart: ID ${item.id}, Name: ${item.name}`);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();

    const cartButton = document.getElementById('cartFloatBtn');
    if (cartButton) {
        cartButton.classList.remove('pulse');
        void cartButton.offsetWidth;
        cartButton.classList.add('pulse');
        setTimeout(() => cartButton.classList.remove('pulse'), 300);
    }
}

function removeFromCart(itemId) {
    const itemIndex = cart.findIndex(item => item.id === itemId);

    if (itemIndex > -1) {
        const item = cart[itemIndex];
        if (item.quantity > 1) {
            item.quantity--;
            console.log(`Decremented quantity for item ID ${itemId} to ${item.quantity}`);
        } else {
            cart.splice(itemIndex, 1);
            console.log(`Removed item ID ${itemId} from cart.`);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
    } else {
        console.warn(`Attempted to remove item ID ${itemId} which is not in the cart.`);
    }
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const isEmpty = cart.length === 0;

    console.log(`Updating Cart UI: Items=${totalItems}, Total=₹${totalPrice.toFixed(2)}`);

    const cartCountStatus = document.getElementById('cartCountStatus');
    const cartTotalStatus = document.getElementById('cartTotalStatus');
    if (cartCountStatus) cartCountStatus.textContent = totalItems;
    if (cartTotalStatus) cartTotalStatus.textContent = totalPrice.toFixed(2);

    const cartCountFloat = document.getElementById('cartCountFloat');
    if (cartCountFloat) cartCountFloat.textContent = totalItems;

    let cartItemsHtml = '';
    if (isEmpty) {
        cartItemsHtml = '<p>Your cart is empty.</p>';
    } else {
        cartItemsHtml = '<ul>' + cart.map(item => `
            <li>
                <span class="cart-item-name">${escapeHTML(item.name)}</span>
                <div class="cart-item-details-container">
                    <span class="cart-item-details">₹${item.price.toFixed(2)} x ${item.quantity}</span>
                    <span class="cart-item-total">= ₹${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <span class="cart-item-controls">
                    <button class="cart-control-btn plus" title="Add one more" onclick='addToCart(${JSON.stringify({id: item.id, name: item.name, price: item.price}).replace(/'/g, "&apos;")})'>+</button>
                    <span class="cart-item-quantity">${item.quantity}</span>
                    <button class="cart-control-btn minus" title="Remove one" onclick="removeFromCart(${item.id})">-</button>
                </span>
            </li>
        `).join('') + '</ul>';
    }

    const cartModalDetails = document.getElementById('cartDetails');
    const cartModalTotal = document.getElementById('cartModalTotal');
    if (cartModalDetails) cartModalDetails.innerHTML = cartItemsHtml;
    if (cartModalTotal) cartModalTotal.textContent = totalPrice.toFixed(2);

    const cartSidebarItems = document.getElementById('cartSidebarItems');
    const cartSidebarTotal = document.getElementById('cartSidebarTotal');
    if (cartSidebarItems) cartSidebarItems.innerHTML = cartItemsHtml;
    if (cartSidebarTotal) cartSidebarTotal.textContent = totalPrice.toFixed(2);

    document.querySelectorAll('.checkout-btn').forEach(btn => {
        btn.disabled = isEmpty;
        if (isEmpty) {
            btn.title = "Add items to cart to enable checkout";
        } else {
            btn.title = "Proceed to checkout";
        }
    });
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.warn("Toast element not found, cannot display message:", message);
        return;
    }

    toast.textContent = message;
    toast.className = 'toast show';
    if (isError) {
        toast.classList.add('error');
    }

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

function seeCart() {
    toggleCartSidebar();
}

function closeCart() {
    const cartModal = document.getElementById('cartModal');
    if (cartModal) cartModal.style.display = 'none';
    console.log("Cart modal closed.");
}

function openCartModal() {
    const cartModal = document.getElementById('cartModal');
    if (cartModal) {
        updateCartUI();
        cartModal.style.display = 'block';
        console.log("Cart modal opened.");
    }
}

function toggleCartSidebar() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) {
        const isOpen = sidebar.classList.toggle('open');
        if (isOpen) {
            updateCartUI();
            console.log("Cart sidebar opened.");
        } else {
             console.log("Cart sidebar closed.");
        }
    } else {
         console.warn("Cart sidebar element not found.");
    }
}

async function checkoutOrder() {
    if (!currentUser) {
        showToast('Please login before checking out.', true);
        return;
    }
    if (cart.length === 0) {
        showToast('Your cart is empty. Add items to checkout.', true);
        return;
    }

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (!confirm(`Proceed to checkout with ${cart.length} item(s) for a total of ₹${totalPrice.toFixed(2)}?`)) {
        console.log("Checkout cancelled by user.");
        return;
    }

    const orderData = {
        userId: currentUser.id,
        items: cart.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        totalAmount: totalPrice
    };

    console.log("Proceeding with checkout. Order data:", orderData);
    showToast('Placing your order...', false);

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log(`Order placed successfully! Order ID: ${result.orderId}`);
            showToast('Order placed successfully! Generating bill...', false);

            generateBillPage();

            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();

            closeCart();
            const sidebar = document.getElementById('cartSidebar');
            if (sidebar) sidebar.classList.remove('open');

            setTimeout(() => {
                if (typeof showFeedbackModal === 'function') {
                    showFeedbackModal();
                } else {
                    console.warn("showFeedbackModal function not found (should be in feedback.js).");
                }
            }, 1500);

        } else {
            const errorMessage = result.error || `Checkout failed (Status: ${response.status}). Please try again.`;
            console.error("Checkout failed:", errorMessage, "Response:", result);
            showToast(`Checkout failed: ${errorMessage}`, true);
        }
    } catch (error) {
        console.error('Error during checkout fetch operation:', error);
        showToast('Network error during checkout. Please check connection and try again.', true);
    }
}

function changeTheme(themeName) {
    const validThemes = ['classic', 'modern', 'romantic'];
    if (!validThemes.includes(themeName)) {
        console.warn(`Invalid theme name provided: ${themeName}. Defaulting to classic.`);
        themeName = 'classic';
    }

    document.body.classList.remove('theme-classic', 'theme-modern', 'theme-romantic');
    document.body.classList.add(`theme-${themeName}`);
    localStorage.setItem('theme', themeName);

    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark');
    }
    console.log(`Theme changed to: ${themeName}`);
}

function toggleDarkMode() {
    const body = document.body;
    const darkModeBtn = document.getElementById('darkModeToggle');
    const isDarkMode = body.classList.toggle('dark');

    if (isDarkMode) {
        localStorage.setItem('darkMode', 'enabled');
        if (darkModeBtn) {
            darkModeBtn.textContent = '☀️';
            darkModeBtn.title = 'Switch to Light Mode';
        }
        console.log("Dark mode enabled");
    } else {
        localStorage.setItem('darkMode', 'disabled');
         if (darkModeBtn) {
            darkModeBtn.textContent = '🌙';
            darkModeBtn.title = 'Switch to Dark Mode';
        }
        console.log("Dark mode disabled");
    }
}

function toggleVegMode(button) {
    isVegMode = !isVegMode;
    button.classList.toggle('active', isVegMode);
    button.innerHTML = isVegMode ? '<i class="fas fa-check-circle"></i> Veg Only' : '🌿 Veg Only';
    button.title = isVegMode ? 'Show all items' : 'Show only vegetarian items';

    console.log(`Veg mode toggled: ${isVegMode ? 'ON' : 'OFF'}`);

    if (currentCategoryId !== null) {
       renderMenuItems();
    } else {
        console.log("No category selected, cannot apply veg filter yet.");
    }
}
