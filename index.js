
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'sharanya_collections_secret_2024';

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// JSON file-based storage
const DATA_FILE = 'data.json';

// Load data from file or initialize empty
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return {
        users: data.users || [],
        products: data.products || [],
        orders: data.orders || [],
        deliveryPersonnel: data.deliveryPersonnel || []
      };
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return { users: [], products: [], orders: [], deliveryPersonnel: [] };
}

// Save data to file
function saveData() {
  try {
    const data = { users, products, orders, deliveryPersonnel };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Load initial data
const data = loadData();
let users = data.users;
let products = data.products;
let orders = data.orders;
let deliveryPersonnel = data.deliveryPersonnel;

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Role-based access middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied for your role' });
    }
    next();
  };
};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, mobile, password, role, businessDetails } = req.body;
    
    // Check if user already exists (by email or mobile)
    const existingUser = users.find(u => u.email === email || u.mobile === mobile);
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already exists' });
      } else {
        return res.status(400).json({ error: 'Mobile number already exists' });
      }
    }

    // Validate mobile number
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobile || !mobileRegex.test(mobile)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit mobile number' });
    }

    // Validate role
    const validRoles = ['customer', 'vendor', 'delivery', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = {
      id: uuidv4(),
      name,
      email,
      mobile,
      password: hashedPassword,
      role,
      businessDetails: role === 'vendor' ? businessDetails : null,
      isApproved: role === 'customer' ? true : false, // Customers auto-approved
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveData();

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for email:', email);
    console.log('Total users in system:', users.length);
    console.log('All user emails:', users.map(u => u.email));

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    console.log('User found:', { id: user.id, email: user.email, role: user.role, isApproved: user.isApproved });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for user:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    console.log('Password match successful for user:', email);

    // Check if user is approved
    if (!user.isApproved) {
      return res.status(403).json({ error: 'Account pending approval' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Product Routes
app.post('/api/products', authenticateToken, requireRole(['vendor']), upload.array('images', 10), (req, res) => {
  try {
    const { name, description, price, category, stock, countryOfOrigin } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }
    
    const product = {
      id: uuidv4(),
      vendorId: req.user.id,
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      countryOfOrigin,
      image: `/uploads/${req.files[0].filename}`, // Main image (first one)
      images: req.files.map(file => `/uploads/${file.filename}`), // All images
      createdAt: new Date().toISOString()
    };

    products.push(product);
    saveData();
    res.status(201).json({ message: 'Product added successfully', product });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/products', (req, res) => {
  try {
    // Return products with vendor information
    const productsWithVendor = products.map(product => {
      const vendor = users.find(u => u.id === product.vendorId);
      return {
        ...product,
        vendorName: vendor ? vendor.name : 'Unknown Vendor'
      };
    });
    res.json(productsWithVendor);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/vendor/products', authenticateToken, requireRole(['vendor']), (req, res) => {
  try {
    const vendorProducts = products.filter(p => p.vendorId === req.user.id);
    res.json(vendorProducts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/products/:productId', authenticateToken, requireRole(['vendor']), upload.array('images', 10), (req, res) => {
  try {
    const { productId } = req.params;
    const { name, description, price, category, stock, countryOfOrigin } = req.body;
    
    // Find the product
    const productIndex = products.findIndex(p => p.id === productId && p.vendorId === req.user.id);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }
    
    // Update product details
    const product = products[productIndex];
    product.name = name;
    product.description = description;
    product.price = parseFloat(price);
    product.category = category;
    product.stock = parseInt(stock);
    product.countryOfOrigin = countryOfOrigin;
    
    // Update images if new ones provided
    if (req.files && req.files.length > 0) {
      // Remove old image files if they exist
      if (product.images && product.images.length > 0) {
        product.images.forEach(imagePath => {
          const oldImagePath = path.join(__dirname, 'public', imagePath);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        });
      } else if (product.image) {
        // Handle legacy single image
        const oldImagePath = path.join(__dirname, 'public', product.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      product.image = `/uploads/${req.files[0].filename}`; // Main image (first one)
      product.images = req.files.map(file => `/uploads/${file.filename}`); // All images
    }
    
    product.updatedAt = new Date().toISOString();
    
    saveData();
    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Order Routes
app.post('/api/orders', authenticateToken, requireRole(['customer']), (req, res) => {
  try {
    const { items, deliveryAddress, totalAmount } = req.body;
    
    const order = {
      id: uuidv4(),
      customerId: req.user.id,
      items,
      deliveryAddress,
      totalAmount,
      status: 'pending',
      assignedDeliveryPerson: null,
      createdAt: new Date().toISOString()
    };

    orders.push(order);
    saveData();
    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders', authenticateToken, (req, res) => {
  try {
    let userOrders = [];
    
    if (req.user.role === 'customer') {
      userOrders = orders.filter(o => o.customerId === req.user.id);
    } else if (req.user.role === 'vendor') {
      // Get orders that contain vendor's products
      userOrders = orders.filter(order => 
        order.items.some(item => 
          products.find(p => p.id === item.productId && p.vendorId === req.user.id)
        )
      );
    } else if (req.user.role === 'delivery') {
      userOrders = orders.filter(o => o.assignedDeliveryPerson === req.user.id);
    } else if (req.user.role === 'admin') {
      userOrders = orders;
    }

    res.json(userOrders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Routes
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const safeUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      role: u.role,
      isApproved: u.isApproved,
      businessDetails: u.businessDetails,
      createdAt: u.createdAt
    }));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/approve-user', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const { userId } = req.body;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.isApproved = true;
    saveData();
    res.json({ message: 'User approved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/assign-delivery', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const { orderId, deliveryPersonId } = req.body;
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    order.assignedDeliveryPerson = deliveryPersonId;
    order.status = 'assigned';
    saveData();
    
    res.json({ message: 'Delivery person assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status
app.post('/api/orders/:orderId/status', authenticateToken, (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check permissions
    if (req.user.role === 'delivery' && order.assignedDeliveryPerson !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this order' });
    }
    
    order.status = status;
    saveData();
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Profile management routes
app.put('/api/profile', authenticateToken, (req, res) => {
  try {
    const { name, email, mobile, businessDetails } = req.body;
    
    // Find user
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate mobile number
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobile || !mobileRegex.test(mobile)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit mobile number' });
    }

    // Check if email or mobile is already taken by another user
    const existingUser = users.find(u => (u.email === email || u.mobile === mobile) && u.id !== req.user.id);
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already in use by another account' });
      } else {
        return res.status(400).json({ error: 'Mobile number already in use by another account' });
      }
    }
    
    // Update user data
    const user = users[userIndex];
    user.name = name;
    user.email = email;
    user.mobile = mobile;
    
    if (user.role === 'vendor') {
      user.businessDetails = businessDetails;
    }
    
    user.updatedAt = new Date().toISOString();
    
    saveData();
    
    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        businessDetails: user.businessDetails,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/profile/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[userIndex];
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date().toISOString();
    
    saveData();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create default admin user
const createDefaultAdmin = async () => {
  const adminExists = users.find(u => u.role === 'admin');
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    users.push({
      id: uuidv4(),
      name: 'Admin',
      email: 'admin@sharanyacollections.com',
      password: hashedPassword,
      role: 'admin',
      isApproved: true,
      createdAt: new Date().toISOString()
    });
    saveData();
    console.log('Default admin created: admin@sharanyacollections.com / admin123');
  }
};

createDefaultAdmin();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sharanya Collections server running on port ${PORT}`);
});
