
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

// In-memory database (replace with actual database in production)
let users = [];
let products = [];
let orders = [];
let deliveryPersonnel = [];

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
    const { name, email, password, role, businessDetails } = req.body;
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
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
      password: hashedPassword,
      role,
      businessDetails: role === 'vendor' ? businessDetails : null,
      isApproved: role === 'customer' ? true : false, // Customers auto-approved
      createdAt: new Date().toISOString()
    };

    users.push(user);

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

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
        role: user.role,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Product Routes
app.post('/api/products', authenticateToken, requireRole(['vendor']), upload.single('image'), (req, res) => {
  try {
    const { name, description, price, category, stock, countryOfOrigin } = req.body;
    
    const product = {
      id: uuidv4(),
      vendorId: req.user.id,
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      countryOfOrigin,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString()
    };

    products.push(product);
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
    res.json({ message: 'Order status updated successfully' });
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
    console.log('Default admin created: admin@sharanyacollections.com / admin123');
  }
};

createDefaultAdmin();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sharanya Collections server running on port ${PORT}`);
});
