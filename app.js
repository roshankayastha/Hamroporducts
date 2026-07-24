// Database state loaded dynamically from SQLite API
let products = [];

// App State Management
let cart = JSON.parse(localStorage.getItem("hamro_cart")) || [];
let currentFilter = "All";
let searchQuery = "";
let currentSort = "featured";
let currentDiscount = 0; // 0 to 1 discount multiplier
let currentUser = JSON.parse(localStorage.getItem("hamro_user")) || null;
let currentToken = localStorage.getItem("hamro_token") || null;

// Elements
const productsGrid = document.getElementById("products-grid");
const filterTags = document.getElementById("filter-tags");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const cartBadge = document.getElementById("cart-badge");
const cartDrawer = document.getElementById("cart-drawer");
const cartOverlay = document.getElementById("cart-overlay");
const cartItemsContainer = document.getElementById("cart-items");
const cartSubtotal = document.getElementById("cart-subtotal");
const cartTotal = document.getElementById("cart-total");
const cartButton = document.getElementById("cart-btn");
const closeCartBtn = document.getElementById("close-cart-btn");
const themeToggleBtn = document.getElementById("theme-toggle");

// Modals
const productModal = document.getElementById("product-modal");
const checkoutModal = document.getElementById("checkout-modal");

// Render Products Catalog
function renderProducts() {
  if (!productsGrid) return;
  
  // Filter products
  let filtered = products.filter(p => {
    const matchesCategory = currentFilter === "All" || p.category === currentFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort products
  if (currentSort === "price-low") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentSort === "price-high") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (currentSort === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  // Generate HTML
  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <p>No products found matching your search.</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered.map(product => {
    // Generate star rating elements
    const fullStars = Math.floor(product.rating);
    const halfStar = product.rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let starsHtml = "";
    for (let i = 0; i < fullStars; i++) starsHtml += `<i class="ri-star-fill"></i>`;
    if (halfStar) starsHtml += `<i class="ri-star-half-fill"></i>`;
    for (let i = 0; i < emptyStars; i++) starsHtml += `<i class="ri-star-line"></i>`;

    return `
      <article class="product-card">
        ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ""}
        <div class="product-img-wrapper" onclick="openProductDetail(${product.id})">
          <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy" />
        </div>
        <div class="product-info">
          <span class="product-cat">${product.category}</span>
          <h3 class="product-name" onclick="openProductDetail(${product.id})">${product.name}</h3>
          <div class="product-meta">
            <span class="product-price">$${product.price.toFixed(2)}</span>
            <span class="product-rating">
              ${starsHtml}
              <span class="rating-val">${product.rating}</span>
            </span>
          </div>
          <div class="product-actions">
            <button class="btn btn-primary btn-add-cart" onclick="addToCart(${product.id})">
              <i class="ri-shopping-bag-line"></i> Add to Cart
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

// Shopping Cart Actions
function updateCartUI() {
  if (cartBadge) {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalCount;
    cartBadge.style.transform = "scale(1.2)";
    cartBadge.classList.add("wobble");
    setTimeout(() => {
      cartBadge.classList.remove("wobble");
      cartBadge.style.transform = "scale(1)";
    }, 400);
  }

  if (cartItemsContainer) {
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="cart-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <p>Your cart is empty</p>
        </div>
      `;
      if (cartSubtotal) cartSubtotal.textContent = "$0.00";
      if (cartTotal) cartTotal.textContent = "$0.00";
    } else {
      cartItemsContainer.innerHTML = cart.map(item => {
        const prod = products.find(p => p.id === item.id);
        return `
          <div class="cart-item">
            <img src="${prod.image}" alt="${prod.name}" class="cart-item-img" />
            <div class="cart-item-info">
              <h4 class="cart-item-name">${prod.name}</h4>
              <div class="cart-item-price">$${prod.price.toFixed(2)}</div>
              <div class="cart-item-actions">
                <div class="qty-selector">
                  <button class="qty-btn" onclick="changeQuantity(${item.id}, -1)">-</button>
                  <span class="qty-val">${item.quantity}</span>
                  <button class="qty-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
                </div>
                <button class="remove-item-btn" onclick="removeFromCart(${item.id})">
                  <i class="ri-delete-bin-line"></i> Remove
                </button>
              </div>
            </div>
          </div>
        `;
      }).join("");

      const subtotal = cart.reduce((sum, item) => {
        const prod = products.find(p => p.id === item.id);
        return sum + (prod.price * item.quantity);
      }, 0);

      if (cartSubtotal) cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
      if (cartTotal) cartTotal.textContent = `$${subtotal.toFixed(2)}`;
    }
  }
  
  localStorage.setItem("hamro_cart", JSON.stringify(cart));
}

window.addToCart = function(id) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id, quantity: 1 });
  }
  updateCartUI();
  openCart();
};

window.removeFromCart = function(id) {
  cart = cart.filter(item => item.id !== id);
  updateCartUI();
};

window.changeQuantity = function(id, delta) {
  const item = cart.find(item => item.id === id);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter(i => i.id !== id);
    }
  }
  updateCartUI();
};

// Side Drawer handlers
function openCart() {
  cartDrawer.classList.add("open");
  cartOverlay.classList.add("open");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.remove("open");
}

// Product Details Modal
window.openProductDetail = function(id) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;

  const modalContent = document.getElementById("product-modal-content");
  modalContent.innerHTML = `
    <div class="product-modal-content">
      <div class="modal-gallery">
        <img src="${prod.image}" alt="${prod.name}" class="modal-gallery-img" />
      </div>
      <div class="modal-details-pane">
        <button class="close-btn modal-close-btn" onclick="closeProductDetail()">
          <i class="ri-close-line"></i>
        </button>
        <span class="modal-product-cat">${prod.category}</span>
        <h2 class="modal-product-name">${prod.name}</h2>
        <div class="modal-product-meta">
          <span class="modal-product-price">$${prod.price.toFixed(2)}</span>
          <span class="product-rating">
            <i class="ri-star-fill"></i>
            <span class="rating-val">${prod.rating} (${prod.reviews} reviews)</span>
          </span>
        </div>
        <p class="modal-product-desc">${prod.description}</p>
        <div class="product-specs">
          <div class="spec-row">
            <span class="spec-label">Origin:</span>
            <span class="spec-val">${prod.specs.origin || "Nepal"}</span>
          </div>
          <div class="spec-row">
            <span class="spec-label">Details:</span>
            <span class="spec-val">${prod.specs.weight || prod.specs.material || prod.specs.diameter}</span>
          </div>
        </div>
        <div class="modal-product-actions">
          <button class="btn btn-primary btn-add-cart" onclick="addToCart(${prod.id}); closeProductDetail();">
            <i class="ri-shopping-bag-line"></i> Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;
  productModal.classList.add("open");
};

window.closeProductDetail = function() {
  productModal.classList.remove("open");
};

// Checkout Flow
let checkoutStep = 1;
window.openCheckout = function() {
  if (cart.length === 0) {
    alert("Please add some items to your cart first.");
    return;
  }
  closeCart();
  checkoutStep = 1;
  updateCheckoutStepUI();
  
  if (currentUser) {
    document.getElementById("chk-name").value = currentUser.name || "";
    document.getElementById("chk-email").value = currentUser.email || "";
  }
  
  checkoutModal.classList.add("open");
};

window.closeCheckout = function() {
  checkoutModal.classList.remove("open");
};

function updateCheckoutStepUI() {
  // Step Content visibility
  document.querySelectorAll(".checkout-step-content").forEach(el => el.classList.remove("active"));
  document.getElementById(`step-${checkoutStep}-content`).classList.add("active");

  // Step indicator tags
  document.querySelectorAll(".step-indicator").forEach((el, index) => {
    if (index + 1 <= checkoutStep) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });

  // Footer buttons config
  const prevBtn = document.getElementById("checkout-prev-btn");
  const nextBtn = document.getElementById("checkout-next-btn");

  if (checkoutStep === 1) {
    prevBtn.style.display = "none";
    nextBtn.textContent = "Continue to Payment";
  } else if (checkoutStep === 2) {
    prevBtn.style.display = "block";
    nextBtn.textContent = "Place Order";
  } else {
    // Step 3 (Success Screen)
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    
    // Clear cart on success
    cart = [];
    updateCartUI();
  }
}

window.handleCheckoutNext = function() {
  if (checkoutStep === 1) {
    // Simple validation
    const name = document.getElementById("chk-name").value.trim();
    const email = document.getElementById("chk-email").value.trim();
    const address = document.getElementById("chk-address").value.trim();

    if (!name || !email || !address) {
      alert("Please fill out all shipping details.");
      return;
    }
    checkoutStep = 2;
    updateCheckoutStepUI();
  } else if (checkoutStep === 2) {
    const card = document.getElementById("chk-card").value.trim();
    const expiry = document.getElementById("chk-expiry").value.trim();
    const cvv = document.getElementById("chk-cvv").value.trim();

    if (!card || !expiry || !cvv) {
      alert("Please enter payment details.");
      return;
    }
    
    submitOrderToBackend();
  }
};

async function submitOrderToBackend() {
  const name = document.getElementById("chk-name").value.trim();
  const email = document.getElementById("chk-email").value.trim();
  const address = document.getElementById("chk-address").value.trim();
  const city = document.getElementById("chk-city").value.trim();
  const zip = document.getElementById("chk-zip").value.trim();
  
  let subtotal = cart.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.id);
    return sum + (prod ? (prod.price * item.quantity) : 0);
  }, 0);
  
  const totalWithDiscount = subtotal * (1 - currentDiscount);

  const items = cart.map(item => {
    const prod = products.find(p => p.id === item.id);
    return {
      id: item.id,
      name: prod ? prod.name : "Unknown Item",
      quantity: item.quantity,
      price: prod ? prod.price : 0
    };
  });

  const orderData = {
    customer_name: name,
    customer_email: email,
    address: address,
    city: city,
    zip: zip,
    total: totalWithDiscount,
    items: items
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    if (res.ok) {
      checkoutStep = 3;
      updateCheckoutStepUI();
    } else {
      const err = await res.json();
      alert('Error submitting order: ' + err.error);
    }
  } catch (err) {
    alert('Failed to connect to backend server for order submission.');
  }
}

window.handleCheckoutPrev = function() {
  if (checkoutStep > 1) {
    checkoutStep--;
    updateCheckoutStepUI();
  }
};

// Filtering & Searching listeners
function initListeners() {
  // Category tags click
  if (filterTags) {
    filterTags.addEventListener("click", (e) => {
      if (e.target.classList.contains("filter-tag")) {
        document.querySelectorAll(".filter-tag").forEach(btn => btn.classList.remove("active"));
        e.target.classList.add("active");
        currentFilter = e.target.getAttribute("data-category");
        renderProducts();
      }
    });
  }

  // Search input typing
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderProducts();
    });
  }

  // Sorting selection
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderProducts();
    });
  }

  // Cart open/close triggers
  if (cartButton) cartButton.addEventListener("click", openCart);
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);

  // Theme toggle listener
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const targetTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", targetTheme);
      
      const themeIcon = themeToggleBtn.querySelector("i");
      if (targetTheme === "dark") {
        themeIcon.className = "ri-sun-line";
      } else {
        themeIcon.className = "ri-moon-line";
      }
    });
  }

  // Mobile menu toggle listener
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const navLinks = document.getElementById("nav-links");
  
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("open");
      const icon = mobileMenuBtn.querySelector("i");
      if (navLinks.classList.contains("open")) {
        icon.className = "ri-close-line";
      } else {
        icon.className = "ri-menu-line";
      }
    });

    // Close mobile menu when clicking any nav link
    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        mobileMenuBtn.querySelector("i").className = "ri-menu-line";
      });
    });
  }
}

// Hero Image Slider
function initHeroSlider() {
  const slidesContainer = document.getElementById("hero-slider-slides");
  const dotsContainer = document.getElementById("slider-dots");
  const prevBtn = document.getElementById("slider-prev-btn");
  const nextBtn = document.getElementById("slider-next-btn");
  
  if (!slidesContainer) return;
  
  const slides = slidesContainer.querySelectorAll(".slider-slide");
  const dots = dotsContainer ? dotsContainer.querySelectorAll(".dot") : [];
  let currentIndex = 0;
  let slideInterval;
  
  function showSlide(index) {
    if (index >= slides.length) {
      currentIndex = 0;
    } else if (index < 0) {
      currentIndex = slides.length - 1;
    } else {
      currentIndex = index;
    }
    
    // Translate slides
    slidesContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
    
    // Update dots
    dots.forEach((dot, idx) => {
      if (idx === currentIndex) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });
  }
  
  function nextSlide() {
    showSlide(currentIndex + 1);
  }
  
  function prevSlide() {
    showSlide(currentIndex - 1);
  }
  
  function startAutoSlide() {
    stopAutoSlide();
    slideInterval = setInterval(nextSlide, 5000); // Auto slide every 5 seconds
  }
  
  function stopAutoSlide() {
    if (slideInterval) clearInterval(slideInterval);
  }
  
  // Navigation event listeners
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      nextSlide();
      startAutoSlide();
    });
  }
  
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      prevSlide();
      startAutoSlide();
    });
  }
  
  if (dotsContainer) {
    dotsContainer.addEventListener("click", (e) => {
      if (e.target.classList.contains("dot")) {
        const index = parseInt(e.target.getAttribute("data-index"));
        showSlide(index);
        startAutoSlide();
      }
    });
  }
  
  // Start slideshow
  startAutoSlide();
}

// Initial Launch
document.addEventListener("DOMContentLoaded", async () => {
  initListeners();
  initHeroSlider();
  
  try {
    const res = await fetch('/api/products');
    products = await res.json();
  } catch (err) {
    console.error('Error fetching products from backend:', err);
  }
  
  renderProducts();
  updateCartUI();
  updateAuthUI();
});

// --- Auth Feature ---
let authMode = 'login'; // 'login' or 'register'

window.toggleAuthModal = function() {
  if (currentUser) {
    document.getElementById("auth-form").style.display = "none";
    document.getElementById("auth-toggle-text").parentElement.style.display = "none";
    document.getElementById("auth-logged-in-view").style.display = "block";
    document.getElementById("auth-welcome-msg").textContent = `Hi, ${currentUser.name}!`;
    document.getElementById("auth-title").textContent = "Your Account";
  } else {
    document.getElementById("auth-form").style.display = "block";
    document.getElementById("auth-toggle-text").parentElement.style.display = "block";
    document.getElementById("auth-logged-in-view").style.display = "none";
    setAuthMode('login');
  }
  document.getElementById("auth-modal").classList.add("open");
};

window.closeAuthModal = function() {
  document.getElementById("auth-modal").classList.remove("open");
};

window.toggleAuthMode = function() {
  setAuthMode(authMode === 'login' ? 'register' : 'login');
};

function setAuthMode(mode) {
  authMode = mode;
  const nameGroup = document.getElementById("auth-name-group");
  const nameInput = document.getElementById("auth-name");
  
  if (mode === 'register') {
    document.getElementById("auth-title").textContent = "Create Account";
    document.getElementById("auth-submit-btn").textContent = "Register";
    document.getElementById("auth-toggle-text").textContent = "Already have an account?";
    document.getElementById("auth-toggle-link").textContent = "Login";
    nameGroup.style.display = "block";
    nameInput.required = true;
  } else {
    document.getElementById("auth-title").textContent = "Welcome Back";
    document.getElementById("auth-submit-btn").textContent = "Login";
    document.getElementById("auth-toggle-text").textContent = "Don't have an account?";
    document.getElementById("auth-toggle-link").textContent = "Register";
    nameGroup.style.display = "none";
    nameInput.required = false;
  }
}

window.handleAuthSubmit = async function(e) {
  e.preventDefault();
  
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value.trim();
  
  const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
  const payload = { email, password };
  
  if (authMode === 'register') {
    payload.name = document.getElementById("auth-name").value.trim();
  }
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (res.ok) {
      currentUser = data.user;
      currentToken = data.token;
      localStorage.setItem("hamro_user", JSON.stringify(currentUser));
      localStorage.setItem("hamro_token", currentToken);
      
      updateAuthUI();
      closeAuthModal();
      
      if (currentUser.role === 'admin') {
        alert("Logged in as Admin! You can now access the Admin Portal.");
      } else {
        alert(authMode === 'login' ? "Successfully logged in!" : "Account created successfully!");
      }
    } else {
      alert("Error: " + data.error);
    }
  } catch (err) {
    alert("Network error connecting to backend.");
  }
};

window.handleLogout = function() {
  currentUser = null;
  currentToken = null;
  localStorage.removeItem("hamro_user");
  localStorage.removeItem("hamro_token");
  updateAuthUI();
  closeAuthModal();
  alert("Logged out successfully.");
};

function updateAuthUI() {
  const userIconState = document.getElementById("user-icon-state");
  if (!userIconState) return;
  
  if (currentUser) {
    userIconState.className = "ri-user-fill"; // Logged in icon
    userIconState.style.color = "var(--primary)";
  } else {
    userIconState.className = "ri-user-line"; // Logged out icon
    userIconState.style.color = "var(--text-main)";
  }
}

// --- Spin the Wheel Feature ---
let wheelSpinning = false;
let wheelSpun = false;

window.openWheelModal = function() {
  document.getElementById("wheel-modal").classList.add("open");
};

window.closeWheelModal = function() {
  document.getElementById("wheel-modal").classList.remove("open");
};

window.spinWheel = function() {
  if (wheelSpinning || wheelSpun) return;
  wheelSpinning = true;
  const wheel = document.getElementById("spin-wheel");
  const resultOverlay = document.getElementById("wheel-result");
  
  // Segments: 1: 5%, 2: Free Ship, 3: 10%, 4: Next Time, 5: 15%, 6: 20%
  const randomSegment = Math.floor(Math.random() * 6) + 1; 
  
  // Calculate rotation degrees to land on segment
  const targetDeg = 360 - (randomSegment * 60 - 30);
  const totalDeg = targetDeg + (360 * 5); // Add 5 full spins
  
  wheel.style.transform = `rotate(${totalDeg}deg)`;
  
  setTimeout(() => {
    wheelSpinning = false;
    wheelSpun = true;
    
    let msg = "";
    let code = "";
    
    if (randomSegment === 1) { msg = "5% OFF!"; code = "WIN5"; }
    else if (randomSegment === 2) { msg = "FREE SHIPPING!"; code = "FREESHIP"; }
    else if (randomSegment === 3) { msg = "10% OFF!"; code = "WIN10"; }
    else if (randomSegment === 4) { msg = "Oops! Next Time"; code = "NONE"; }
    else if (randomSegment === 5) { msg = "15% OFF!"; code = "WIN15"; }
    else if (randomSegment === 6) { msg = "20% OFF!"; code = "WIN20"; }
    
    document.getElementById("win-message").textContent = randomSegment === 4 ? msg : `You Won ${msg}`;
    document.getElementById("discount-code-box").textContent = code;
    resultOverlay.style.display = "flex";
  }, 4000); 
};

window.applyDiscount = function() {
  const code = document.getElementById("chk-discount").value.trim().toUpperCase();
  const discountRow = document.querySelector(".discount-row");
  const discountAmountEl = document.getElementById("discount-amount");
  
  let discountMultiplier = 0;
  
  if (code === "WIN5") discountMultiplier = 0.05;
  else if (code === "WIN10") discountMultiplier = 0.10;
  else if (code === "WIN15") discountMultiplier = 0.15;
  else if (code === "WIN20") discountMultiplier = 0.20;
  else if (code === "FREESHIP") {
    alert("Free shipping applied! (Eco-Shipping cost waived)");
    currentDiscount = 0;
    discountRow.style.display = "none";
    return;
  } else {
    alert("Invalid or expired discount code.");
    currentDiscount = 0;
    discountRow.style.display = "none";
    return;
  }
  
  currentDiscount = discountMultiplier;
  
  let subtotal = cart.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.id);
    return sum + (prod ? (prod.price * item.quantity) : 0);
  }, 0);
  
  const discountVal = subtotal * discountMultiplier;
  discountAmountEl.textContent = `-$${discountVal.toFixed(2)}`;
  discountRow.style.display = "flex";
  alert(`${discountMultiplier * 100}% Discount Applied!`);
};

