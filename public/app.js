
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
                this.showSection('home');
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
                    this.showSection('home');
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
        const userMenu = document.getElementById('userMenu');
        const roleBadge = document.getElementById('roleBadge');

        if (this.currentUser) {
            authLinks.classList.add('d-none');
            userMenu.classList.remove('d-none');
            roleBadge.classList.remove('d-none');
            
            document.getElementById('userName').textContent = this.currentUser.name;
            document.getElementById('userRole').textContent = this.currentUser.role.toUpperCase();
            roleBadge.querySelector('.badge').textContent = this.currentUser.role.toUpperCase();
        } else {
            authLinks.classList.remove('d-none');
            userMenu.classList.add('d-none');
            roleBadge.classList.add('d-none');
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (response.ok) {
                this.products = await response.json();
                this.displayProducts();
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    displayProducts() {
        const productsList = document.getElementById('productsList');
        productsList.innerHTML = '';

        this.products.forEach(product => {
            const productCard = `
                <div class="col-md-4 mb-4">
                    <div class="card">
                        ${product.image ? `<img src="${product.image}" class="card-img-top product-image" alt="${product.name}">` : ''}
                        <div class="card-body">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text">${product.description}</p>
                            <p class="text-muted">Vendor: ${product.vendorName}</p>
                            <p class="text-muted">Country: ${product.countryOfOrigin}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="h5 text-primary">₹${product.price}</span>
                                <span class="badge bg-secondary">Stock: ${product.stock}</span>
                            </div>
                            ${this.currentUser && this.currentUser.role === 'customer' ? 
                                `<button class="btn btn-primary w-100 mt-2" onclick="app.addToCart('${product.id}')">Add to Cart</button>` : ''}
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
        }
    }

    async showDashboard() {
        if (!this.currentUser) return;

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

        return `
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-boxes"></i> My Products</h5>
                        </div>
                        <div class="card-body">
                            ${vendorProducts.length > 0 ? this.renderVendorProducts(vendorProducts) : '<p>No products added yet</p>'}
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-plus"></i> Add New Product</h5>
                        </div>
                        <div class="card-body">
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
            <div class="border-bottom py-2">
                <strong>${product.name}</strong><br>
                <small>Price: ₹${product.price} | Stock: ${product.stock}</small><br>
                <small>Category: ${product.category}</small>
            </div>
        `).join('');
    }

    renderAddProductForm() {
        return `
            <form id="addProductForm" onsubmit="app.addProduct(event)">
                <div class="mb-3">
                    <input type="text" class="form-control" name="name" placeholder="Product Name" required>
                </div>
                <div class="mb-3">
                    <textarea class="form-control" name="description" placeholder="Description" rows="2" required></textarea>
                </div>
                <div class="mb-3">
                    <input type="number" class="form-control" name="price" placeholder="Price" step="0.01" required>
                </div>
                <div class="mb-3">
                    <input type="text" class="form-control" name="category" placeholder="Category" required>
                </div>
                <div class="mb-3">
                    <input type="number" class="form-control" name="stock" placeholder="Stock Quantity" required>
                </div>
                <div class="mb-3">
                    <input type="text" class="form-control" name="countryOfOrigin" placeholder="Country of Origin" required>
                </div>
                <div class="mb-3">
                    <input type="file" class="form-control" name="image" accept="image/*">
                </div>
                <button type="submit" class="btn btn-primary w-100">Add Product</button>
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

    async addProduct(e) {
        e.preventDefault();
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

    showSection(sectionName) {
        // Hide all sections
        const sections = ['homeSection', 'productsSection', 'authSection', 'dashboardSection'];
        sections.forEach(section => {
            document.getElementById(section).classList.add('d-none');
        });

        // Show selected section
        document.getElementById(sectionName + 'Section').classList.remove('d-none');
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
