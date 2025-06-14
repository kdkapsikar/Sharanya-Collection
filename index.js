
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Papa = require('papaparse');
const nodemailer = require('nodemailer');
const Database = require('@replit/database');
const Razorpay = require('razorpay');
const twilio = require('twilio');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const db = new Database();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// File upload configuration
const upload = multer({ dest: 'uploads/' });

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_secret'
});

// Initialize Twilio only if valid credentials are provided
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// Nodemailer configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your_email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your_app_password'
  }
});

// Haversine formula for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Auto-allocate orders to riders based on pincode
function allocateRider(deliveryLocation, riders) {
  let nearestRider = null;
  let minDistance = Infinity;
  
  riders.forEach(rider => {
    const distance = calculateDistance(
      deliveryLocation.lat, deliveryLocation.lng,
      rider.location.lat, rider.location.lng
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestRider = rider;
    }
  });
  
  return nearestRider;
}

// API Routes

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await db.get('orders') || [];
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new order
app.post('/api/orders', async (req, res) => {
  try {
    const { items, vendorId, deliveryLocation, customerInfo } = req.body;
    const orderId = `ORD-${Date.now()}`;
    
    // Calculate GST (18% for B2B)
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gstAmount = subtotal * 0.18;
    const total = subtotal + gstAmount;
    
    const order = {
      orderId,
      items: items.map(item => ({
        ...item,
        GST_rate: 18,
        countryOfOrigin: item.countryOfOrigin || 'India'
      })),
      vendorId,
      deliveryLocation,
      customerInfo,
      subtotal,
      gstAmount,
      total,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Get existing orders and add new one
    const orders = await db.get('orders') || [];
    orders.push(order);
    await db.set('orders', orders);
    
    // Allocate rider
    const riders = await db.get('riders') || [];
    if (riders.length > 0) {
      const allocatedRider = allocateRider(deliveryLocation, riders);
      order.riderId = allocatedRider?.id;
    }
    
    // Send WhatsApp notification
    if (twilioClient && process.env.TWILIO_WHATSAPP_NUMBER) {
      try {
        await twilioClient.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${customerInfo.phone}`,
          body: `Order ${orderId} placed successfully! Total: ₹${total.toFixed(2)}`
        });
      } catch (error) {
        console.log('WhatsApp notification failed:', error.message);
      }
    }
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await db.get('inventory') || [];
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload CSV for inventory
app.post('/api/inventory/upload', upload.single('csvFile'), async (req, res) => {
  try {
    const csvData = fs.readFileSync(req.file.path, 'utf8');
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    
    // Add country of origin field if not present
    const inventory = parsed.data.map(item => ({
      ...item,
      countryOfOrigin: item.countryOfOrigin || 'India',
      id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    await db.set('inventory', inventory);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Razorpay order
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    
    const options = {
      amount: amount * 100, // amount in paise
      currency,
      receipt: `receipt_${Date.now()}`
    };
    
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Razorpay payment
app.post('/api/payment/verify', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const crypto = require('crypto');
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_secret')
      .update(body.toString())
      .digest('hex');
    
    const isAuthentic = expectedSignature === razorpay_signature;
    
    res.json({ success: isAuthentic });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get terms of service from PrivacyPolicies.com API
app.get('/api/terms', async (req, res) => {
  try {
    // Simulated terms generation (replace with actual API call)
    const terms = {
      content: `Terms of Service for Quick Commerce App
      
1. Acceptance of Terms
By using this service, you agree to be bound by these terms.

2. Delivery Policy
- Orders placed before 12 PM will be delivered the same day
- Orders after 12 PM will be delivered the next day

3. Payment Terms
- All prices include applicable GST
- Payment is processed securely through Razorpay

4. Country of Origin
All products display their country of origin as per regulations.

5. Cancellation Policy
Orders can be cancelled within 30 minutes of placement.

Generated on: ${new Date().toISOString()}`,
      lastUpdated: new Date().toISOString()
    };
    
    res.json(terms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cron job for 11 AM vendor reminders
cron.schedule('0 11 * * *', async () => {
  try {
    const vendors = await db.get('vendors') || [];
    
    for (const vendor of vendors) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: vendor.email,
        subject: 'Delivery Cutoff Reminder - 1 Hour Left',
        text: `Dear ${vendor.name},\n\nThis is a reminder that the delivery cutoff is at 12 PM (1 hour from now). Please ensure all orders are ready for pickup.\n\nBest regards,\nQuick Commerce Team`
      });
    }
    
    console.log('Vendor reminder emails sent');
  } catch (error) {
    console.error('Error sending reminder emails:', error);
  }
});

// Default route to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
