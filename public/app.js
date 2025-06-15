
class SharanyaCollections {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.products = [];
        this.orders = [];
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.loadProducts();
    }

    setupEventListeners() {
        // Auth forms
        document.getElementById('signinForm').addEventListener('submit', (e) => this.handleSignin(e));
        document.getElementById('signupForm').addEventListener('submit', (e) => this.handleSignup(e));
        
        // Add real-time validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        // Sign in form validation
        const signinEmail = document.getElementById('signinEmail');
        const signinPassword = document.getElementById('signinPassword');
        
        signinEmail.addEventListener('blur', () => this.validateField(signinEmail, 'signinEmailError', 'Email is required'));
        signinPassword.addEventListener('blur', () => this.validateField(signinPassword, 'signinPasswordError', 'Password is required'));
        
        // Sign up form validation
        const signupName = document.getElementById('signupName');
        const signupEmail = document.getElementById('signupEmail');
        const signupPassword = document.getElementById('signupPassword');
        const roleSelect = document.getElementById('roleSelect');
        const businessDetails = document.getElementById('businessDetails');
        
        signupName.addEventListener('blur', () => this.validateField(signupName, 'signupNameError', 'Name is required'));
        signupEmail.addEventListener('blur', () => this.validateSignupEmail());
        signupPassword.addEventListener('blur', () => this.validateSignupPassword());
        roleSelect.addEventListener('change', () => this.validateRole());
        businessDetails.addEventListener('blur', () => this.validateBusinessDetails());
    }

    validateField(field, errorId, message) {
        const errorElement = document.getElementById(errorId);
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            errorElement.textContent = message;
            return false;
        } else {
            field.classList.remove('is-invalid');
            errorElement.textContent = '';
            return true;
        }
    }

    validateSignupEmail() {
        const email = document.getElementById('signupEmail');
        const errorElement = document.getElementById('signupEmailError');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email.value.trim()) {
            email.classList.add('is-invalid');
            errorElement.textContent = 'Email is required';
            return false;
        } else if (!emailRegex.test(email.value)) {
            email.classList.add('is-invalid');
            errorElement.textContent = 'Please enter a valid email address';
            return false;
        } else {
            email.classList.remove('is-invalid');
            errorElement.textContent = '';
            return true;
        }
    }

    validateSignupPassword() {
        const password = document.getElementById('signupPassword');
        const errorElement = document.getElementById('signupPasswordError');
        
        if (!password.value.trim()) {
            password.classList.add('is-invalid');
            errorElement.textContent = 'Password is required';
            return false;
        } else if (password.value.length < 6) {
            password.classList.add('is-invalid');
            errorElement.textContent = 'Password must be at least 6 characters long';
            return false;
        } else {
            password.classList.remove('is-invalid');
            errorElement.textContent = '';
            return true;
        }
    }

    validateRole() {
        const role = document.getElementById('roleSelect');
        const errorElement = document.getElementById('signupRoleError');
        
        if (!role.value) {
            role.classList.add('is-invalid');
            errorElement.textContent = 'Please select a role';
            return false;
        } else {
            role.classList.remove('is-invalid');
            errorElement.textContent = '';
            return true;
        }
    }

    validateBusinessDetails() {
        const role = document.getElementById('roleSelect');
        const businessDetails = document.getElementById('businessDetails');
        const errorElement = document.getElementById('businessDetailsError');
        
        if (role.value === 'vendor' && !businessDetails.value.trim()) {
            businessDetails.classList.add('is-invalid');
            errorElement.textContent = 'Business details are required for vendors';
            return false;
        } else {
            businessDetails.classList.remove('is-invalid');
            errorElement.textContent = '';
            return true;
        }
    }

    validateSigninForm() {
        const email = document.getElementById('signinEmail');
        const password = document.getElementById('signinPassword');
        
        let isValid = true;
        
        if (!this.validateField(email, 'signinEmailError', 'Email is required')) {
            isValid = false;
        }
        if (!this.validateField(password, 'signinPasswordError', 'Password is required')) {
            isValid = false;
        }
        
        return isValid;
    }

    validateSignupForm() {
        let isValid = true;
        
        if (!this.validateField(document.getElementById('signupName'), 'signupNameError', 'Name is required')) {
            isValid = false;
        }
        if (!this.validateSignupEmail()) {
            isValid = false;
        }
        if (!this.validateSignupPassword()) {
            isValid = false;
        }
        if (!this.validateRole()) {
            isValid = false;
        }
        if (!this.validateBusinessDetails()) {
            isValid = false;
        }
        
        return isValid;
    }

    async checkAuth() {
        if (this.token) {
            try {
                // Verify token by making a request
                const response = await fetch('/api/orders', {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                
                if (response.ok) {
                    // Token is valid, decode user info
                    const payload = JSON.parse(atob(this.token.split('.')[1]));
                    this.currentUser = payload;
                    this.updateUI();
                    // Reload products after authentication
                    await this.loadProducts();
                } else {
                    this.logout();
                }
            } catch (error) {
                this.logout();
            }
        }
    }

    async handleSignin(e) {
        e.preventDefault();
        
        // Validate form before submitting
        if (!this.validateSigninForm()) {
            return;
        }
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                this.token = result.token;
                this.currentUser = result.user;
                localStorage.setItem('token', this.token);
                this.updateUI();
                // Reload products after login
                await this.loadProducts();
                this.showDashboard();
                this.showAlert('Login successful!', 'success');
            } else {
                this.showAlert(result.error, 'danger');
            }
        } catch (error) {
            this.showAlert('Login failed. Please try again.', 'danger');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        // Validate form before submitting
        if (!this.validateSignupForm()) {
            return;
        }
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                if (result.user.isApproved) {
                    this.token = result.token;
                    this.currentUser = result.user;
                    localStorage.setItem('token', this.token);
                    this.updateUI();
                    // Reload products after signup
                    await this.loadProducts();
                    this.showDashboard();
                    this.showAlert('Account created successfully!', 'success');
                } else {
                    this.showAlert('Account created! Waiting for admin approval.', 'info');
                }
            } else {
                this.showAlert(result.error, 'danger');
            }
        } catch (error) {
            this.showAlert('Signup failed. Please try again.', 'danger');
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        this.updateUI();
        this.showSection('home');
    }

    updateUI() {
        const authLinks = document.getElementById('authLinks');
        const userInfo = document.getElementById('userInfo');
        const logoutLink = document.getElementById('logoutLink');
        const honeycombPattern = document.getElementById('honeycombPattern');
        const secondaryNav = document.getElementById('secondaryNav');

        if (this.currentUser) {
            authLinks.classList.add('d-none');
            userInfo.classList.remove('d-none');
            logoutLink.classList.remove('d-none');
            honeycombPattern.classList.remove('d-none');
            secondaryNav.classList.remove('d-none');
            
            document.getElementById('userName').textContent = this.currentUser.name;
        } else {
            authLinks.classList.remove('d-none');
            userInfo.classList.add('d-none');
            logoutLink.classList.add('d-none');
            honeycombPattern.classList.add('d-none');
            secondaryNav.classList.add('d-none');
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (response.ok) {
                this.products = await response.json();
                console.log('Products loaded:', this.products.length);
                this.displayProducts();
            } else {
                console.error('Failed to load products:', response.status);
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    displayProducts() {
        const productsList = document.getElementById('productsList');
        productsList.innerHTML = '';

        // Show all products in the Products section
        let productsToShow = this.products;

        productsToShow.forEach(product => {
            const productCard = `
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        ${(product.images && product.images.length > 0) || product.image ? `
                            <div style="height: 250px; overflow: hidden; position: relative; background: #f8f9fa;">
                                ${product.images && product.images.length > 0 ? `
                                    <div id="carousel-${product.id}" class="carousel slide h-100" data-bs-ride="carousel">
                                        <div class="carousel-inner h-100">
                                            ${product.images.map((img, index) => `
                                                <div class="carousel-item ${index === 0 ? 'active' : ''} h-100">
                                                    <div class="d-flex align-items-center justify-content-center h-100">
                                                        <img src="${img}" class="img-fluid" style="max-height: 100%; max-width: 100%; object-fit: contain;" alt="${product.name}">
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                        ${product.images.length > 1 ? `
                                            <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${product.id}" data-bs-slide="prev">
                                                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                                            </button>
                                            <button class="carousel-control-next" type="button" data-bs-target="#carousel-${product.id}" data-bs-slide="next">
                                                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                                            </button>
                                            <div class="carousel-indicators">
                                                ${product.images.map((_, index) => `
                                                    <button type="button" data-bs-target="#carousel-${product.id}" data-bs-slide-to="${index}" ${index === 0 ? 'class="active"' : ''}></button>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : `
                                    <div class="d-flex align-items-center justify-content-center h-100">
                                        <img src="${product.image}" class="img-fluid" style="max-height: 100%; max-width: 100%; object-fit: contain;" alt="${product.name}">
                                    </div>
                                `}
                            </div>
                        ` : `
                            <div style="height: 250px; display: flex; align-items: center; justify-content: center; background: #f8f9fa; color: #6c757d;">
                                <i class="fas fa-image fa-3x"></i>
                            </div>
                        `}
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text flex-grow-1">${product.description}</p>
                            <p class="text-muted mb-1">Vendor: ${product.vendorName}</p>
                            <p class="text-muted mb-3">Country: ${product.countryOfOrigin}</p>
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="h5 text-primary mb-0">₹${product.price}</span>
                                <span class="badge bg-secondary">Stock: ${product.stock}</span>
                            </div>
                            ${this.currentUser && this.currentUser.role === 'customer' ? 
                                `<button class="btn btn-primary w-100" onclick="app.addToCart('${product.id}')">Add to Cart</button>` : ''}
                            ${this.currentUser && this.currentUser.role === 'vendor' && product.vendorId === this.currentUser.id ? 
                                `<button class="btn btn-outline-primary w-100" onclick="app.editProductInline('${product.id}')">
                                    <i class="fas fa-edit"></i> Edit Product
                                </button>` : ''}
                        </div>
                    </div>
                </div>
            `;
            productsList.innerHTML += productCard;
        });
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product && product.stock > 0) {
            const existingItem = this.cart.find(item => item.productId === productId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                this.cart.push({ productId, quantity: 1, product });
            }
            localStorage.setItem('cart', JSON.stringify(this.cart));
            this.showAlert('Product added to cart!', 'success');
            
            // If currently viewing dashboard, refresh it to show updated cart
            const dashboardSection = document.getElementById('dashboardSection');
            if (!dashboardSection.classList.contains('d-none')) {
                this.showDashboard();
            }
        }
    }

    async showDashboard() {
        if (!this.currentUser) return;

        // Refresh cart from localStorage
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];

        this.showSection('dashboard');
        const dashboardContent = document.getElementById('dashboardContent');

        switch (this.currentUser.role) {
            case 'customer':
                dashboardContent.innerHTML = await this.getCustomerDashboard();
                break;
            case 'vendor':
                dashboardContent.innerHTML = await this.getVendorDashboard();
                break;
            case 'delivery':
                dashboardContent.innerHTML = await this.getDeliveryDashboard();
                break;
            case 'admin':
                dashboardContent.innerHTML = await this.getAdminDashboard();
                break;
        }
    }

    async getCustomerDashboard() {
        // Load customer orders
        try {
            const response = await fetch('/api/orders', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (response.ok) {
                this.orders = await response.json();
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }

        return `
            <div class="mb-4">
                <h6 class="text-muted mb-0">Customer Portal</h6>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-shopping-cart"></i> Shopping Cart</h5>
                        </div>
                        <div class="card-body">
                            ${this.cart.length > 0 ? this.renderCart() : '<p>Your cart is empty</p>'}
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-list"></i> My Orders</h5>
                        </div>
                        <div class="card-body">
                            ${this.orders.length > 0 ? this.renderOrders() : '<p>No orders yet</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async getVendorDashboard() {
        // Load vendor products
        let vendorProducts = [];
        try {
            const response = await fetch('/api/vendor/products', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (response.ok) {
                vendorProducts = await response.json();
            }
        } catch (error) {
            console.error('Error loading vendor products:', error);
        }

        // Store products for edit functionality
        this.vendorProducts = vendorProducts;

        return `
            <div class="mb-4">
                <h6 class="text-muted mb-0">Vendor Portal</h6>
            </div>
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-boxes"></i> My Products</h5>
                        </div>
                        <div class="card-body" id="vendorProductsList">
                            ${vendorProducts.length > 0 ? this.renderVendorProducts(vendorProducts) : '<p>No products added yet</p>'}
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card" id="productFormCard">
                        <div class="card-header">
                            <h5 id="productFormTitle"><i class="fas fa-plus"></i> Add New Product</h5>
                        </div>
                        <div class="card-body" id="productFormBody">
                            ${this.renderAddProductForm()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async getDeliveryDashboard() {
        // Load assigned orders
        try {
            const response = await fetch('/api/orders', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (response.ok) {
                this.orders = await response.json();
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }

        return `
            <div class="mb-4">
                <h6 class="text-muted mb-0">Delivery Portal</h6>
            </div>
            <div class="card">
                <div class="card-header">
                    <h5><i class="fas fa-truck"></i> Assigned Deliveries</h5>
                </div>
                <div class="card-body">
                    ${this.orders.length > 0 ? this.renderDeliveryOrders() : '<p>No deliveries assigned yet</p>'}
                </div>
            </div>
        `;
    }

    async getAdminDashboard() {
        // Load all users and orders
        let users = [];
        try {
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (response.ok) {
                users = await response.json();
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }

        try {
            const response = await fetch('/api/orders', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (response.ok) {
                this.orders = await response.json();
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }

        return `
            <div class="mb-4">
                <h6 class="text-muted mb-0">Admin Portal</h6>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-users"></i> User Management</h5>
                        </div>
                        <div class="card-body">
                            ${this.renderUserManagement(users)}
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-clipboard-list"></i> Order Management</h5>
                        </div>
                        <div class="card-body">
                            ${this.renderOrderManagement()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCart() {
        let cartHtml = '';
        let total = 0;

        this.cart.forEach(item => {
            const itemTotal = item.product.price * item.quantity;
            total += itemTotal;
            cartHtml += `
                <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                    <div>
                        <strong>${item.product.name}</strong><br>
                        <small>₹${item.product.price} x ${item.quantity}</small>
                    </div>
                    <div>
                        <span>₹${itemTotal}</span>
                        <button class="btn btn-sm btn-danger ms-2" onclick="app.removeFromCart('${item.productId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        cartHtml += `
            <div class="mt-3">
                <strong>Total: ₹${total}</strong>
                <button class="btn btn-success w-100 mt-2" onclick="app.checkout()">Checkout</button>
            </div>
        `;

        return cartHtml;
    }

    renderOrders() {
        return this.orders.map(order => `
            <div class="border-bottom py-2">
                <strong>Order #${order.id.substr(0, 8)}</strong><br>
                <small>Status: <span class="badge bg-info">${order.status}</span></small><br>
                <small>Total: ₹${order.totalAmount}</small><br>
                <small>Date: ${new Date(order.createdAt).toLocaleDateString()}</small>
            </div>
        `).join('');
    }

    renderVendorProducts(products) {
        return products.map(product => `
            <div class="border-bottom py-2 mb-3">
                <div class="row">
                    <div class="col-md-3">
                        ${(product.images && product.images.length > 0) || product.image ? `
                            <div style="position: relative;">
                                <img src="${product.images ? product.images[0] : product.image}" class="img-fluid rounded" style="max-height: 100px; object-fit: cover;">
                                ${product.images && product.images.length > 1 ? `
                                    <span class="badge bg-primary position-absolute top-0 end-0 m-1">+${product.images.length - 1}</span>
                                ` : ''}
                            </div>
                        ` : '<div class="bg-light rounded d-flex align-items-center justify-content-center" style="height: 100px;"><small>No Image</small></div>'}
                    </div>
                    <div class="col-md-6">
                        <strong>${product.name}</strong><br>
                        <small>Price: ₹${product.price} | Stock: ${product.stock}</small><br>
                        <small>Category: ${product.category}</small><br>
                        <small>Country: ${product.countryOfOrigin}</small>
                    </div>
                    <div class="col-md-3 text-end">
                        <button class="btn btn-sm btn-outline-primary mb-1" onclick="app.editProduct('${product.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderAddProductForm(editMode = false, product = null) {
        return `
            <form id="${editMode ? 'editProductForm' : 'addProductForm'}" onsubmit="app.${editMode ? 'updateProduct' : 'addProduct'}(event)">
                ${editMode ? `<input type="hidden" name="productId" value="${product.id}">` : ''}
                <div class="mb-3">
                    <label class="form-label">Product Name <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="name" id="productName" placeholder="Product Name" value="${editMode ? product.name : ''}" required>
                    <div class="invalid-feedback" id="productNameError"></div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Description <span class="text-danger">*</span></label>
                    <textarea class="form-control" name="description" id="productDescription" placeholder="Description" rows="2" required>${editMode ? product.description : ''}</textarea>
                    <div class="invalid-feedback" id="productDescriptionError"></div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Price <span class="text-danger">*</span></label>
                    <input type="number" class="form-control" name="price" id="productPrice" placeholder="Price" step="0.01" value="${editMode ? product.price : ''}" required>
                    <div class="invalid-feedback" id="productPriceError"></div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Category <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="category" id="productCategory" placeholder="Category" value="${editMode ? product.category : ''}" required>
                    <div class="invalid-feedback" id="productCategoryError"></div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Stock Quantity <span class="text-danger">*</span></label>
                    <input type="number" class="form-control" name="stock" id="productStock" placeholder="Stock Quantity" value="${editMode ? product.stock : ''}" required>
                    <div class="invalid-feedback" id="productStockError"></div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Country of Origin <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="countryOfOrigin" id="productCountry" placeholder="Country of Origin" value="${editMode ? product.countryOfOrigin : ''}" required>
                    <div class="invalid-feedback" id="productCountryError"></div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Product Images <span class="text-danger">*</span> (At least one image required)</label>
                    ${editMode && ((product.images && product.images.length > 0) || product.image) ? `
                        <div class="mb-2">
                            <div class="small text-muted mb-2">Current images (upload new to replace):</div>
                            <div class="d-flex flex-wrap gap-2">
                                ${product.images ? product.images.map((img, index) => `
                                    <div style="position: relative;">
                                        <img src="${img}" class="img-fluid rounded" style="max-height: 100px; max-width: 100px; object-fit: contain; border: 1px solid #dee2e6;">
                                        <small class="position-absolute bottom-0 start-0 bg-dark text-white px-1 rounded-top-end">${index + 1}</small>
                                    </div>
                                `).join('') : `
                                    <img src="${product.image}" class="img-fluid rounded" style="max-height: 100px; max-width: 100px; object-fit: contain; border: 1px solid #dee2e6;">
                                `}
                            </div>
                        </div>
                    ` : ''}
                    <input type="file" class="form-control" name="images" id="productImages" accept="image/*" multiple onchange="app.previewImages(this)" required>
                    <div class="invalid-feedback" id="productImagesError"></div>
                    <div class="small text-muted">You can select multiple images. The first image will be the main product image.</div>
                    <div id="imagesPreview" class="mt-2"></div>
                    <div id="imageCropContainer" class="mt-2 d-none">
                        <canvas id="cropCanvas" style="max-width: 100%; border: 1px solid #dee2e6;"></canvas>
                        <div class="mt-2">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="app.resizeImage(0.5)">50% Size</button>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="app.resizeImage(0.75)">75% Size</button>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="app.resizeImage(1.0)">Original Size</button>
                            <button type="button" class="btn btn-sm btn-primary" onclick="app.applyImageChanges()">Apply Changes</button>
                        </div>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary w-100">${editMode ? 'Update Product' : 'Add Product'}</button>
                ${editMode ? '<button type="button" class="btn btn-secondary w-100 mt-2" onclick="app.cancelEdit()">Cancel</button>' : ''}
            </form>
        `;
    }

    renderDeliveryOrders() {
        return this.orders.map(order => `
            <div class="border-bottom py-2">
                <strong>Order #${order.id.substr(0, 8)}</strong><br>
                <small>Status: <span class="badge bg-info">${order.status}</span></small><br>
                <small>Address: ${order.deliveryAddress}</small><br>
                <button class="btn btn-sm btn-success mt-1" onclick="app.updateOrderStatus('${order.id}', 'delivered')">
                    Mark Delivered
                </button>
            </div>
        `).join('');
    }

    renderUserManagement(users) {
        return users.map(user => `
            <div class="border-bottom py-2">
                <strong>${user.name}</strong> (${user.role})<br>
                <small>${user.email}</small><br>
                <small>Status: ${user.isApproved ? 'Approved' : 'Pending'}</small>
                ${!user.isApproved ? `<br><button class="btn btn-sm btn-success mt-1" onclick="app.approveUser('${user.id}')">Approve</button>` : ''}
            </div>
        `).join('');
    }

    renderOrderManagement() {
        const deliveryPersonnel = this.getAllUsers().filter(u => u.role === 'delivery');
        return this.orders.map(order => `
            <div class="border-bottom py-2">
                <strong>Order #${order.id.substr(0, 8)}</strong><br>
                <small>Status: <span class="badge bg-info">${order.status}</span></small><br>
                <small>Amount: ₹${order.totalAmount}</small>
                ${order.status === 'pending' ? `
                    <br><select class="form-select form-select-sm mt-1" onchange="app.assignDelivery('${order.id}', this.value)">
                        <option value="">Assign Delivery Person</option>
                        ${deliveryPersonnel.map(dp => `<option value="${dp.id}">${dp.name}</option>`).join('')}
                    </select>
                ` : ''}
            </div>
        `).join('');
    }

    validateProductForm(editMode = false) {
        let isValid = true;
        
        // Validate product name
        const name = document.getElementById('productName');
        const nameError = document.getElementById('productNameError');
        if (!name.value.trim()) {
            name.classList.add('is-invalid');
            nameError.textContent = 'Product name is required';
            isValid = false;
        } else {
            name.classList.remove('is-invalid');
            nameError.textContent = '';
        }
        
        // Validate description
        const description = document.getElementById('productDescription');
        const descError = document.getElementById('productDescriptionError');
        if (!description.value.trim()) {
            description.classList.add('is-invalid');
            descError.textContent = 'Description is required';
            isValid = false;
        } else {
            description.classList.remove('is-invalid');
            descError.textContent = '';
        }
        
        // Validate price
        const price = document.getElementById('productPrice');
        const priceError = document.getElementById('productPriceError');
        if (!price.value || parseFloat(price.value) <= 0) {
            price.classList.add('is-invalid');
            priceError.textContent = 'Valid price is required';
            isValid = false;
        } else {
            price.classList.remove('is-invalid');
            priceError.textContent = '';
        }
        
        // Validate category
        const category = document.getElementById('productCategory');
        const catError = document.getElementById('productCategoryError');
        if (!category.value.trim()) {
            category.classList.add('is-invalid');
            catError.textContent = 'Category is required';
            isValid = false;
        } else {
            category.classList.remove('is-invalid');
            catError.textContent = '';
        }
        
        // Validate stock
        const stock = document.getElementById('productStock');
        const stockError = document.getElementById('productStockError');
        if (!stock.value || parseInt(stock.value) < 0) {
            stock.classList.add('is-invalid');
            stockError.textContent = 'Valid stock quantity is required';
            isValid = false;
        } else {
            stock.classList.remove('is-invalid');
            stockError.textContent = '';
        }
        
        // Validate country
        const country = document.getElementById('productCountry');
        const countryError = document.getElementById('productCountryError');
        if (!country.value.trim()) {
            country.classList.add('is-invalid');
            countryError.textContent = 'Country of origin is required';
            isValid = false;
        } else {
            country.classList.remove('is-invalid');
            countryError.textContent = '';
        }
        
        // Validate images (at least one required for new products, optional for edit mode)
        const images = document.getElementById('productImages');
        const imagesError = document.getElementById('productImagesError');
        if (!editMode && (!images.files || images.files.length === 0)) {
            images.classList.add('is-invalid');
            imagesError.textContent = 'At least one product image is required';
            isValid = false;
        } else if (images.files && images.files.length > 0) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            let hasInvalidFile = false;
            
            for (let i = 0; i < images.files.length; i++) {
                const file = images.files[i];
                if (!validTypes.includes(file.type)) {
                    images.classList.add('is-invalid');
                    imagesError.textContent = 'Please select valid image files (JPEG, PNG, GIF)';
                    hasInvalidFile = true;
                    break;
                } else if (file.size > 5 * 1024 * 1024) { // 5MB limit per file
                    images.classList.add('is-invalid');
                    imagesError.textContent = 'Each image size must be less than 5MB';
                    hasInvalidFile = true;
                    break;
                }
            }
            
            if (!hasInvalidFile) {
                images.classList.remove('is-invalid');
                imagesError.textContent = '';
            } else {
                isValid = false;
            }
        } else {
            images.classList.remove('is-invalid');
            imagesError.textContent = '';
        }
        
        return isValid;
    }

    previewImages(input) {
        const previewContainer = document.getElementById('imagesPreview');
        previewContainer.innerHTML = '';
        
        if (input.files && input.files.length > 0) {
            Array.from(input.files).forEach((file, index) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    const imageDiv = document.createElement('div');
                    imageDiv.className = 'border rounded p-2 mb-2';
                    imageDiv.innerHTML = `
                        <div class="d-flex align-items-center">
                            <img src="${e.target.result}" class="img-thumbnail me-2" style="max-height: 80px; max-width: 80px; object-fit: cover;">
                            <div>
                                <div class="fw-bold">${index === 0 ? 'Main Image' : `Image ${index + 1}`}</div>
                                <small class="text-muted">${file.name}</small><br>
                                <small class="text-muted">${(file.size / 1024 / 1024).toFixed(2)} MB</small>
                            </div>
                        </div>
                    `;
                    previewContainer.appendChild(imageDiv);
                };
                
                reader.readAsDataURL(file);
            });
        }
    }

    previewImage(input) {
        // Keep the old function for backward compatibility
        this.previewImages(input);
    }

    showImagePreview(img) {
        const canvas = document.getElementById('cropCanvas');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('imageCropContainer');
        
        // Calculate display size while maintaining aspect ratio
        const maxWidth = 300;
        const maxHeight = 200;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        this.currentImageData = { img, width, height };
        container.classList.remove('d-none');
    }

    resizeImage(scale) {
        if (!this.originalImage) return;
        
        const canvas = document.getElementById('cropCanvas');
        const ctx = canvas.getContext('2d');
        
        const newWidth = this.originalImage.width * scale;
        const newHeight = this.originalImage.height * scale;
        
        // Update display size
        const maxWidth = 300;
        const maxHeight = 200;
        let displayWidth = newWidth;
        let displayHeight = newHeight;
        
        if (displayWidth > maxWidth || displayHeight > maxHeight) {
            const ratio = Math.min(maxWidth / displayWidth, maxHeight / displayHeight);
            displayWidth *= ratio;
            displayHeight *= ratio;
        }
        
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        ctx.drawImage(this.originalImage, 0, 0, newWidth, newHeight, 0, 0, displayWidth, displayHeight);
        
        this.currentImageData = { 
            img: this.originalImage, 
            width: newWidth, 
            height: newHeight,
            displayWidth,
            displayHeight
        };
    }

    applyImageChanges() {
        if (!this.currentImageData) return;
        
        // Create final canvas with actual size
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        
        finalCanvas.width = this.currentImageData.width;
        finalCanvas.height = this.currentImageData.height;
        finalCtx.drawImage(this.currentImageData.img, 0, 0, this.currentImageData.width, this.currentImageData.height);
        
        // Convert to blob and update file input
        finalCanvas.toBlob((blob) => {
            const file = new File([blob], 'processed-image.jpg', { type: 'image/jpeg' });
            
            // Create new file input with processed image
            const input = document.getElementById('productImage');
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            
            this.showAlert('Image processed successfully!', 'success');
        }, 'image/jpeg', 0.9);
    }

    editProduct(productId) {
        const product = this.vendorProducts.find(p => p.id === productId);
        if (!product) return;
        
        // Update form title and body
        const formTitle = document.getElementById('productFormTitle');
        const formBody = document.getElementById('productFormBody');
        
        formTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Product';
        formBody.innerHTML = this.renderAddProductForm(true, product);
    }

    async editProductInline(productId) {
        // Navigate to dashboard to edit the product
        await this.showDashboard();
        
        // Wait a bit for the dashboard to render completely
        setTimeout(() => {
            // Find the product in the loaded vendor products
            const product = this.vendorProducts.find(p => p.id === productId);
            if (product) {
                // Trigger the edit mode in dashboard
                this.editProduct(productId);
            }
        }, 100);
    }

    cancelEdit() {
        // Reset form to add mode
        const formTitle = document.getElementById('productFormTitle');
        const formBody = document.getElementById('productFormBody');
        
        formTitle.innerHTML = '<i class="fas fa-plus"></i> Add New Product';
        formBody.innerHTML = this.renderAddProductForm(false);
    }

    async updateProduct(e) {
        e.preventDefault();
        
        // Validate form before submitting
        if (!this.validateProductForm(true)) {
            return;
        }
        
        const formData = new FormData(e.target);
        const productId = formData.get('productId');

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.token}` },
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showAlert('Product updated successfully!', 'success');
                await this.loadProducts(); // Reload products
                this.showDashboard(); // Refresh dashboard
            } else {
                this.showAlert(result.error, 'danger');
            }
        } catch (error) {
            this.showAlert('Failed to update product', 'danger');
        }
    }

    async addProduct(e) {
        e.preventDefault();
        
        // Validate form before submitting
        if (!this.validateProductForm()) {
            return;
        }
        
        const formData = new FormData(e.target);

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` },
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showAlert('Product added successfully!', 'success');
                e.target.reset();
                // Clear image preview
                const imagesPreview = document.getElementById('imagesPreview');
                const imageCropContainer = document.getElementById('imageCropContainer');
                if (imagesPreview) imagesPreview.innerHTML = '';
                if (imageCropContainer) imageCropContainer.classList.add('d-none');
                
                // Clear validation states
                const fields = ['productName', 'productDescription', 'productPrice', 'productCategory', 'productStock', 'productCountry', 'productImages'];
                fields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.classList.remove('is-invalid');
                        const errorElement = document.getElementById(fieldId + 'Error');
                        if (errorElement) errorElement.textContent = '';
                    }
                });
                await this.loadProducts(); // Reload products to show the new one
                this.showDashboard(); // Refresh dashboard
            } else {
                this.showAlert(result.error, 'danger');
            }
        } catch (error) {
            this.showAlert('Failed to add product', 'danger');
        }
    }

    async checkout() {
        if (this.cart.length === 0) return;

        const deliveryAddress = prompt('Enter delivery address:');
        if (!deliveryAddress) return;

        const totalAmount = this.cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}` 
                },
                body: JSON.stringify({
                    items: this.cart,
                    deliveryAddress,
                    totalAmount
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                this.cart = [];
                localStorage.removeItem('cart');
                this.showAlert('Order placed successfully!', 'success');
                this.showDashboard(); // Refresh dashboard
            } else {
                this.showAlert(result.error, 'danger');
            }
        } catch (error) {
            this.showAlert('Failed to place order', 'danger');
        }
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.showDashboard(); // Refresh dashboard
    }

    async approveUser(userId) {
        try {
            const response = await fetch('/api/admin/approve-user', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}` 
                },
                body: JSON.stringify({ userId })
            });

            if (response.ok) {
                this.showAlert('User approved successfully!', 'success');
                this.showDashboard(); // Refresh dashboard
            }
        } catch (error) {
            this.showAlert('Failed to approve user', 'danger');
        }
    }

    async assignDelivery(orderId, deliveryPersonId) {
        if (!deliveryPersonId) return;

        try {
            const response = await fetch('/api/admin/assign-delivery', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}` 
                },
                body: JSON.stringify({ orderId, deliveryPersonId })
            });

            if (response.ok) {
                this.showAlert('Delivery person assigned successfully!', 'success');
                this.showDashboard(); // Refresh dashboard
            }
        } catch (error) {
            this.showAlert('Failed to assign delivery person', 'danger');
        }
    }

    async updateOrderStatus(orderId, status) {
        try {
            const response = await fetch(`/api/orders/${orderId}/status`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}` 
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                this.showAlert('Order status updated!', 'success');
                this.showDashboard(); // Refresh dashboard
            }
        } catch (error) {
            this.showAlert('Failed to update order status', 'danger');
        }
    }

    getAllUsers() {
        // This would typically come from an API call
        return []; // Placeholder
    }

    async showSection(sectionName) {
        // Hide all sections
        const sections = ['homeSection', 'productsSection', 'authSection', 'dashboardSection'];
        sections.forEach(section => {
            document.getElementById(section).classList.add('d-none');
        });

        // Show selected section
        document.getElementById(sectionName + 'Section').classList.remove('d-none');
        
        // Reload products when navigating to products section
        if (sectionName === 'products') {
            await this.loadProducts();
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Global functions
function showSection(section) {
    app.showSection(section);
}

function showDashboard() {
    app.showDashboard();
}

function logout() {
    app.logout();
}

function toggleBusinessDetails() {
    const roleSelect = document.getElementById('roleSelect');
    const businessSection = document.getElementById('businessDetailsSection');
    const businessDetails = document.getElementById('businessDetails');
    
    if (roleSelect.value === 'vendor') {
        businessSection.classList.remove('d-none');
        businessDetails.setAttribute('required', 'required');
    } else {
        businessSection.classList.add('d-none');
        businessDetails.removeAttribute('required');
        businessDetails.classList.remove('is-invalid');
        document.getElementById('businessDetailsError').textContent = '';
    }
}

// Password visibility toggle function
function togglePasswordVisibility(passwordFieldId, eyeIcon) {
    const passwordField = document.getElementById(passwordFieldId);
    const isPassword = passwordField.type === 'password';
    
    passwordField.type = isPassword ? 'text' : 'password';
    eyeIcon.className = isPassword ? 'fas fa-eye-slash password-toggle' : 'fas fa-eye password-toggle';
}

// Initialize app
const app = new SharanyaCollections();
