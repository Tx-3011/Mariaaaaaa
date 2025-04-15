// --- Global State (defined in index.html) ---
// let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
// let cart = JSON.parse(localStorage.getItem('cart')) || [];
// const API_URL = '/api'; // Use relative path
// let menuItemsData = [];
// let categoriesData = [];
// function escapeHTML(str) { ... } // Defined in index.html

let vegOnlyActive = false;
let currentCategoryId = null; // Track the selected category

// --- DOM Elements (ensure these IDs exist in index.html) ---
const loginBox = document.getElementById('loginBox');
const menuSection = document.getElementById('menuSection');
const categoriesContainer = document.getElementById('categories');
const itemsContainer = document.getElementById('items');
const cartCountStatus = document.getElementById('cartCountStatus');
const cartTotalStatus = document.getElementById('cartTotalStatus');
const cartCountFloat = document.getElementById('cartCountFloat');
const cartModal = document.getElementById('cartModal');
const cartDetails = document.getElementById('cartDetails');
const cartModalTotal = document.getElementById('cartModalTotal');
const cartSidebar = document.getElementById('cartSidebar');
const cartSidebarItems = document.getElementById('cartSidebarItems');
const cartSidebarTotal = document.getElementById('cartSidebarTotal');
const toastElement = document.getElementById('toast');
const loginErrorElement = document.getElementById('loginError');
const userNameDisplay = document.getElementById('userNameDisplay');
const logoutButton = document.getElementById('logoutButton'); // Make sure button has id="logoutButton"
const feedbackModal = document.getElementById('feedbackModal');
const feedbackErrorElement = document.getElementById('feedbackError');
const vegToggleButton = document.getElementById('vegToggleButton');
const themeSelect = document.getElementById('themeSelect'); // For theme persistence

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Restore theme and dark mode first
    const savedTheme = localStorage.getItem('theme') || 'classic';
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    applyTheme(savedTheme);
    applyDarkMode(savedDarkMode);
    if (themeSelect) themeSelect.value = savedTheme; // Set dropdown value

    // Check login status
    if (currentUser) {
        showMenuSection();
        loadCategories(); // Load categories first, then items for the first category
    } else {
        showLoginSection();
    }
    updateCartUI(); // Update cart display on initial load
});

// --- UI Control ---
function showLoginSection() {
    if (loginBox) loginBox.style.display = 'block';
    if (menuSection) menuSection.style.display = 'none';
}

function showMenuSection() {
    if (loginBox) loginBox.style.display = 'none';
    if (menuSection) menuSection.style.display = 'block';
    if (userNameDisplay) {
         userNameDisplay.textContent = currentUser ? escapeHTML(currentUser.name) : 'Guest';
    }
}

function showToast(message, duration = 3000) {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.className = 'toast show'; // Use class directly
    setTimeout(() => {
        toastElement.className = 'toast';
    }, duration);
}

function displayError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block';
}

function hideError(element) {
    if (!element) return;
    element.textContent = '';
    element.style.display = 'none';
}

// --- API Calls ---
async function apiRequest(endpoint, options = {}) {
    // Ensure headers object exists
    options.headers = options.headers || {};
    // Set default content type for POST/PUT if body is an object
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData) && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body); // Stringify body if needed
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const contentType = response.headers.get("content-type");

        if (!response.ok) {
            let errorData = { error: `HTTP error! Status: ${response.status} ${response.statusText}` };
            if (contentType && contentType.includes("application/json")) {
                 try {
                    // Try to parse specific error from backend
                    const jsonError = await response.json();
                    errorData.error = jsonError.error || errorData.error;
                 } catch (e) { /* Ignore if JSON parsing fails */ }
            }
            throw new Error(errorData.error);
        }

        // Handle successful responses
        if (response.status === 204) { // No Content
             return null;
        }
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        console.error(`API Request Error for ${endpoint}:`, error);
        showToast(`Error: ${error.message || 'Network or server error'}`);
        throw error; // Re-throw for handling in calling functions
    }
}

// --- Login/Logout ---
async function loginUser() {
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    hideError(loginErrorElement); // Clear previous errors

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!name || !phone) {
        displayError(loginErrorElement, 'Please enter both name and phone number.');
        return;
    }
    if (!/^\d{10,}$/.test(phone)) {
         displayError(loginErrorElement, 'Please enter a valid phone number (at least 10 digits).');
         return;
    }

    try {
        const data = await apiRequest('/login', {
            method: 'POST',
            // body already stringified by apiRequest helper
            body: { name, phone }
        });

        if (data && data.success) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Save user
            showMenuSection();
            loadCategories(); // Load data after successful login
        } else {
            // Should be caught by apiRequest error handling, but as fallback:
             displayError(loginErrorElement, data?.error || 'Login failed. Please check details.');
        }
    } catch (error) {
         displayError(loginErrorElement, error.message || 'An error occurred during login.');
    }
}

function logoutUser() {
    currentUser = null;
    cart = []; // Clear cart on logout
    localStorage.removeItem('currentUser');
    localStorage.removeItem('cart');
    showLoginSection();
    updateCartUI();
    // Clear displayed categories and items
    if (categoriesContainer) categoriesContainer.innerHTML = '';
    if (itemsContainer) itemsContainer.innerHTML = '';
    currentCategoryId = null;
    vegOnlyActive = false; // Reset filters
    if (vegToggleButton) vegToggleButton.classList.remove('active');
}

// --- Categories ---
async function loadCategories() {
    if (!categoriesContainer) return;
    categoriesContainer.innerHTML = '<p>Loading categories...</p>'; // Loading state
    try {
        categoriesData = await apiRequest('/categories');
        renderCategories();
        // Load items for the first category if available
        if (categoriesData && categoriesData.length > 0) {
            loadItems(categoriesData[0].id);
        } else {
             if (itemsContainer) itemsContainer.innerHTML = '<p>No menu categories found.</p>';
        }
    } catch (error) {
        categoriesContainer.innerHTML = '<p style="color: red;">Error loading categories.</p>';
        if (itemsContainer) itemsContainer.innerHTML = ''; // Clear items on category error
    }
}

function renderCategories() {
    if (!categoriesContainer) return;
    categoriesContainer.innerHTML = ''; // Clear previous
    if (!categoriesData || categoriesData.length === 0) {
         categoriesContainer.innerHTML = '<p>No categories available.</p>';
         return;
    }
    categoriesData.forEach(category => {
        const button = document.createElement('button');
        button.textContent = escapeHTML(category.name); // Escape name
        button.onclick = () => loadItems(category.id);
        button.dataset.categoryId = category.id; // Store id
        if (category.id === currentCategoryId) {
            button.classList.add('active'); // Style the active category
        }
        const div = document.createElement('div');
        div.className = 'category';
        div.appendChild(button);
        categoriesContainer.appendChild(div);
    });
}

// --- Menu Items ---
async function loadItems(categoryId) {
    if (!itemsContainer) return;
    currentCategoryId = categoryId; // Update selected category ID
    renderCategories(); // Re-render categories to show active button

    itemsContainer.innerHTML = '<p>Loading items...</p>'; // Loading state
    try {
        // Fetch items for the specific category
        menuItemsData = await apiRequest(`/menu/${categoryId}`);
        renderItems(); // Render the fetched items
    } catch (error) {
        itemsContainer.innerHTML = `<p style="color: red;">Error loading items for this category.</p>`;
    }
}

function renderItems() {
    if (!itemsContainer) return;
    itemsContainer.innerHTML = ''; // Clear previous items

    if (!menuItemsData || menuItemsData.length === 0) {
         itemsContainer.innerHTML = '<p>No items found in this category.</p>';
         return;
    }

    // Filter based on vegOnlyActive status
    const itemsToRender = menuItemsData.filter(item => !vegOnlyActive || (vegOnlyActive && item.is_veg));

    if (itemsToRender.length === 0) {
        itemsContainer.innerHTML = `<p>No ${vegOnlyActive ? 'vegetarian ' : ''}items match your filter in this category.</p>`;
        return;
    }

    itemsToRender.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.itemId = item.id;
        card.dataset.isVeg = item.is_veg; // For potential future use

        const image = document.createElement('img');
        // Use placeholder if image is missing or broken
        const imageUrl = item.image ? `images/${item.image}` : 'images/placeholder.png';
        image.src = imageUrl;
        image.alt = escapeHTML(item.name);
        image.onerror = () => {
            console.warn(`Image not found: ${imageUrl}, using placeholder.`);
            image.src = 'images/placeholder.png';
         };

        const name = document.createElement('h3');
        name.textContent = escapeHTML(item.name); // Already includes symbols from backend? If not, add logic here.

        const description = document.createElement('p');
        description.textContent = escapeHTML(item.description || ''); // Handle missing description

        const price = document.createElement('p');
        price.className = 'item-price'; // Add class for potential styling
        price.textContent = `₹${item.price.toFixed(2)}`;

        const addButton = document.createElement('button');
        addButton.textContent = 'Add to Cart';
        addButton.onclick = (event) => {
            event.stopPropagation(); // Prevent card click if needed
            addToCart(item);
            // Pulse animation on button click
            addButton.classList.add('pulse');
            setTimeout(() => addButton.classList.remove('pulse'), 300);
        };

        card.appendChild(image);
        card.appendChild(name);
        card.appendChild(price);
        card.appendChild(description);
        card.appendChild(addButton);

        itemsContainer.appendChild(card);
    });
}

// --- Veg Toggle ---
function toggleVegMode(button) {
    vegOnlyActive = !vegOnlyActive;
    if (button) button.classList.toggle("active", vegOnlyActive);
    renderItems(); // Re-render items based on the current filter state
}

// --- Cart Management ---
function addToCart(item) {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        // Add only necessary info to cart to avoid storing large objects
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1
         });
    }
    saveCart();
    updateCartUI();
    showToast(`${escapeHTML(item.name)} added to cart!`);
}

function removeFromCart(itemId) {
    const itemIndex = cart.findIndex(cartItem => cartItem.id === itemId);
    if (itemIndex > -1) {
        const item = cart[itemIndex];
        if (item.quantity > 1) {
            item.quantity--;
        } else {
            cart.splice(itemIndex, 1); // Remove item completely
        }
        saveCart();
        updateCartUI();
        showToast(`${escapeHTML(item.name)} removed from cart.`);
    }
}

function increaseCartItemQuantity(itemId) {
    const item = cart.find(cartItem => cartItem.id === itemId);
    if (item) {
        item.quantity++;
        saveCart();
        updateCartUI();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function calculateCartTotals() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return { totalItems, totalPrice };
}

function updateCartUI() {
    const { totalItems, totalPrice } = calculateCartTotals();

    // Update various cart displays, checking if elements exist
    if (cartCountStatus) cartCountStatus.textContent = totalItems;
    if (cartTotalStatus) cartTotalStatus.textContent = totalPrice.toFixed(2);
    if (cartCountFloat) cartCountFloat.textContent = totalItems;
    if (cartModalTotal) cartModalTotal.textContent = totalPrice.toFixed(2);
    if (cartSidebarTotal) cartSidebarTotal.textContent = totalPrice.toFixed(2);

    const cartContentHTML = cart.length === 0 ? '<p>Your cart is empty.</p>' : generateCartHTML(cart);
    const cartContentHTMLWithControls = cart.length === 0 ? '<p>Your cart is empty.</p>' : generateCartHTML(cart, true); // For sidebar

    if (cartDetails) cartDetails.innerHTML = cartContentHTML;
    if (cartSidebarItems) cartSidebarItems.innerHTML = cartContentHTMLWithControls;

    // Enable/disable checkout buttons based on cart content
    const checkoutButtons = document.querySelectorAll('.checkout-btn');
    checkoutButtons.forEach(btn => {
        btn.disabled = cart.length === 0;
        btn.style.cursor = cart.length === 0 ? 'not-allowed' : 'pointer';
        btn.style.opacity = cart.length === 0 ? 0.5 : 1;
    });
}

function generateCartHTML(cartItems, includeControls = false) {
    let html = '<ul>';
    cartItems.forEach(item => {
        html += `<li class="cart-item-li">
            <span class="cart-item-name">${escapeHTML(item.name)}</span>
            <span class="cart-item-details">₹${item.price.toFixed(2)} x ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}</span>
            ${includeControls ? `
                <span class="cart-item-controls">
                    <button class="cart-control-btn minus" onclick="removeFromCart(${item.id})" aria-label="Remove one ${escapeHTML(item.name)}">-</button>
                    <span class="cart-item-quantity">${item.quantity}</span>
                    <button class="cart-control-btn plus" onclick="increaseCartItemQuantity(${item.id})" aria-label="Add one ${escapeHTML(item.name)}">+</button>
                </span>
            ` : ''}
        </li>`;
    });
    html += '</ul>';
    return html;
}

function seeCart() {
    updateCartUI(); // Ensure details are up-to-date before showing
    if(cartModal) cartModal.style.display = 'block';
}

function closeCart() {
    if(cartModal) cartModal.style.display = 'none';
}

function toggleCartSidebar() {
    if (!cartSidebar) return;
    const isOpen = cartSidebar.classList.toggle('open');
    if (isOpen) {
        updateCartUI(); // Ensure details are up-to-date when opening
    }
}

// --- Checkout ---
async function checkoutOrder() {
    if (!currentUser) {
        showToast('Please login before checking out.');
        // Optionally redirect to login or show login modal
        return;
    }
    if (cart.length === 0) {
        showToast('Your cart is empty. Add items to checkout.');
        return;
    }

    const { totalPrice } = calculateCartTotals();
    const orderData = {
        userId: currentUser.id,
        // Send only necessary item details
        items: cart.map(item => ({ id: item.id, quantity: item.quantity, price: item.price })),
        totalAmount: totalPrice // Use calculated total
    };

    // Disable checkout buttons during processing
    const checkoutButtons = document.querySelectorAll('.checkout-btn');
    checkoutButtons.forEach(btn => btn.disabled = true);
    showToast('Placing your order...'); // Indicate processing

    try {
        const result = await apiRequest('/orders', {
            method: 'POST',
            body: orderData // Will be stringified by apiRequest
        });

        if (result && result.success) {
            showToast(`Order #${result.orderId} placed successfully! Generating bill...`);

            // Generate and show the bill page in a new window
            generateBillPage(result.orderId); // Pass orderId

            // Clear cart AFTER successful order and bill generation call
            cart = []; // Clear local cart variable
            saveCart(); // Clear cart in localStorage
            updateCartUI(); // Update UI to show empty cart
            closeCart(); // Close modal if open
            if(cartSidebar && cartSidebar.classList.contains('open')) {
                 cartSidebar.classList.remove('open'); // Close sidebar if open
            }

        } else {
             // Should be caught by apiRequest, but for safety:
             showToast(result?.error || 'Checkout failed. Please try again.');
        }
    } catch (error) {
        // Error already shown by apiRequest, but maybe add more context
         showToast(`Checkout Error: ${error.message || 'Could not place order.'}`);
    } finally {
         // Re-enable checkout buttons even if there was an error (unless cart is now empty)
         updateCartUI(); // This will re-evaluate button state based on cart length
    }
}

// --- Theme & Dark Mode ---
function changeTheme(themeName) {
    if (!themeName) return;
    document.body.className = ''; // Clear existing theme/dark mode classes
    document.body.classList.add(`theme-${themeName}`);
    localStorage.setItem('theme', themeName); // Save preference
    // Re-apply dark mode if it was active
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
    }
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark); // Save preference
}

function applyTheme(themeName) {
     document.body.classList.add(`theme-${themeName}`);
     // No need to set dropdown here if it's done in DOMContentLoaded
}

function applyDarkMode(isDark) {
    if (isDark) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
}

// --- Make feedback functions globally accessible ---
// Ensure feedback.js defines these functions OR implement them here
// For now, assuming feedback.js defines them and is loaded after this script.
// We already have references to the modal elements.

// Example placeholder if feedback.js functions are not global:
// function showFeedbackModal() { if (feedbackModal) feedbackModal.style.display = 'block'; }
// function closeFeedback() { if (feedbackModal) feedbackModal.style.display = 'none'; }
// async function submitFeedback() { /* Logic from feedback.js goes here */ }

console.log("Frontend main.js loaded and initialized.");