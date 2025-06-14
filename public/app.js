
const { useState, useEffect, useRef } = React;

// Utility function to check delivery cutoff
const isDeliveryCutoffPassed = () => {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(12, 0, 0, 0);
  return now > cutoff;
};

// Timer component for delivery cutoff
const DeliveryTimer = () => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isPastCutoff, setIsPastCutoff] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      
      const cutoff = new Date();
      cutoff.setHours(12, 0, 0, 0);
      
      let targetTime;
      if (now > cutoff) {
        targetTime = tomorrow;
        setIsPastCutoff(true);
      } else {
        targetTime = cutoff;
        setIsPastCutoff(false);
      }
      
      const diff = targetTime - now;
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft('00h 00m 00s');
      }
    };

    const interval = setInterval(updateTimer, 1000);
    updateTimer();
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`alert ${isPastCutoff ? 'alert-danger' : 'alert-warning'} text-center`}>
      <h5>
        {isPastCutoff ? 'Next Delivery Window: ' : 'Same Day Delivery Ends In: '}
        <span className="fw-bold">{timeLeft}</span>
      </h5>
      {isPastCutoff && <p className="mb-0">Orders placed now will be delivered tomorrow</p>}
    </div>
  );
};

// CSV Upload Component for Vendors
const CSVUploader = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csv = event.target.result;
        const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
        setPreview(parsed.data.slice(0, 5)); // Show first 5 rows
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('csvFile', file);
    
    try {
      const response = await fetch('/api/inventory/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Inventory uploaded successfully!');
        onUploadSuccess?.(result.data);
        setFile(null);
        setPreview([]);
        fileInputRef.current.value = '';
        
        // Play success sound
        const audio = new Audio('data:audio/wav;base64,UklGRvIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC');
        audio.play().catch(() => {}); // Ignore errors
      }
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
      handleFileSelect({ target: { files: [droppedFile] } });
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5>Upload Inventory CSV</h5>
      </div>
      <div className="card-body">
        <div 
          className="border-dashed border-2 border-secondary p-4 text-center"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="form-control mb-3"
          />
          <p>Drag & drop CSV file here or click to select</p>
          <small className="text-muted">Required columns: name, price, category, stock</small>
        </div>
        
        {preview.length > 0 && (
          <div className="mt-3">
            <h6>Preview (First 5 rows):</h6>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    {Object.keys(preview[0]).map(key => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, i) => (
                        <td key={i}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <button 
          className="btn btn-primary mt-3" 
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Inventory'}
        </button>
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product, onAddToCart }) => {
  return (
    <div className="col-md-4 mb-3">
      <div className="card h-100">
        <div className="card-body">
          <h6 className="card-title">{product.name}</h6>
          <p className="card-text">
            <small>Category: {product.category}</small><br/>
            <small>Country of Origin: {product.countryOfOrigin}</small><br/>
            <strong>₹{product.price}</strong>
          </p>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => onAddToCart(product)}
            disabled={isDeliveryCutoffPassed()}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

// Cart Component
const Cart = ({ items, onUpdateQuantity, onRemove, onCheckout }) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  return (
    <div className="card">
      <div className="card-header">
        <h5>Shopping Cart ({items.length} items)</h5>
      </div>
      <div className="card-body">
        {items.length === 0 ? (
          <p>Your cart is empty</p>
        ) : (
          <>
            {items.map(item => (
              <div key={item.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                  <h6>{item.name}</h6>
                  <small>₹{item.price} each</small>
                </div>
                <div className="d-flex align-items-center">
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span className="mx-2">{item.quantity}</span>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button 
                    className="btn btn-sm btn-danger ms-2"
                    onClick={() => onRemove(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="mt-3">
              <div className="d-flex justify-content-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>GST (18%):</span>
                <span>₹{gst.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between fw-bold">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <button 
                className="btn btn-success w-100 mt-3"
                onClick={() => onCheckout(total)}
                disabled={isDeliveryCutoffPassed()}
              >
                {isDeliveryCutoffPassed() ? 'Checkout Disabled (Past Cutoff)' : 'Proceed to Checkout'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Location Component
const LocationSelector = ({ onLocationSelect }) => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          onLocationSelect({ lat: latitude, lng: longitude });
        },
        (error) => {
          alert('Error getting location: ' + error.message);
        }
      );
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5>Delivery Location</h5>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <button className="btn btn-outline-primary" onClick={getCurrentLocation}>
            Use Current Location
          </button>
        </div>
        <div className="mb-3">
          <label className="form-label">Or enter address:</label>
          <textarea 
            className="form-control" 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your delivery address"
          />
        </div>
        {location && (
          <small className="text-success">
            Location set: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </small>
        )}
      </div>
    </div>
  );
};

// Order Status Component
const OrderStatus = ({ orders }) => {
  const shareOnWhatsApp = (order) => {
    const message = `Order Update: ${order.orderId}\nStatus: ${order.status}\nTotal: ₹${order.total}\nItems: ${order.items.map(item => item.name).join(', ')}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5>Your Orders</h5>
      </div>
      <div className="card-body">
        {orders.length === 0 ? (
          <p>No orders found</p>
        ) : (
          orders.map(order => (
            <div key={order.orderId} className="border rounded p-3 mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6>{order.orderId}</h6>
                  <p className="mb-1">Status: <span className="badge bg-primary">{order.status}</span></p>
                  <p className="mb-1">Total: ₹{order.total}</p>
                  <small>Ordered: {new Date(order.createdAt).toLocaleString()}</small>
                </div>
                <button 
                  className="btn btn-success btn-sm"
                  onClick={() => shareOnWhatsApp(order)}
                >
                  Share on WhatsApp
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Admin Panel Component
const AdminPanel = () => {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    fetchOrders();
    fetchInventory();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory');
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  return (
    <div>
      <h2>Admin Panel</h2>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders Management
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory Management
          </button>
        </li>
      </ul>

      {activeTab === 'orders' && (
        <div>
          <h4>Orders ({orders.length})</h4>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.orderId}>
                    <td>{order.orderId}</td>
                    <td>{order.customerInfo?.name || 'N/A'}</td>
                    <td>{order.items?.length || 0} items</td>
                    <td>₹{order.total}</td>
                    <td>
                      <span className="badge bg-secondary">{order.status}</span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <CSVUploader onUploadSuccess={fetchInventory} />
          <div className="mt-4">
            <h4>Current Inventory ({inventory.length} items)</h4>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Country of Origin</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td>₹{item.price}</td>
                      <td>{item.stock || 'N/A'}</td>
                      <td>{item.countryOfOrigin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const [currentView, setCurrentView] = useState('shop');
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [orders, setOrders] = useState([]);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    fetchInventory();
    fetchOrders();
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory');
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
    } else {
      setCart(cart.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleCheckout = async (total) => {
    if (!location) {
      alert('Please set your delivery location first');
      return;
    }

    try {
      // Create Razorpay order
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total })
      });
      
      const razorpayOrder = await orderResponse.json();

      const options = {
        key: 'your_razorpay_key_id',
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Quick Commerce',
        description: 'Order Payment',
        order_id: razorpayOrder.id,
        handler: async (response) => {
          // Verify payment
          const verifyResponse = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          });
          
          const verified = await verifyResponse.json();
          
          if (verified.success) {
            // Create order
            const createOrderResponse = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: cart,
                vendorId: 'VENDOR001',
                deliveryLocation: location,
                customerInfo: {
                  name: 'Customer',
                  phone: '+919999999999',
                  email: 'customer@example.com'
                }
              })
            });
            
            const orderResult = await createOrderResponse.json();
            
            if (orderResult.success) {
              alert('Order placed successfully!');
              setCart([]);
              fetchOrders();
            }
          } else {
            alert('Payment verification failed');
          }
        },
        prefill: {
          name: 'Customer Name',
          email: 'customer@example.com',
          contact: '+919999999999'
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (error) {
      alert('Checkout failed: ' + error.message);
    }
  };

  return (
    <div className="container-fluid">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
        <div className="container">
          <span className="navbar-brand">Quick Commerce</span>
          <div className="navbar-nav">
            <button 
              className={`nav-link btn btn-link ${currentView === 'shop' ? 'active' : ''}`}
              onClick={() => setCurrentView('shop')}
            >
              Shop
            </button>
            <button 
              className={`nav-link btn btn-link ${currentView === 'orders' ? 'active' : ''}`}
              onClick={() => setCurrentView('orders')}
            >
              My Orders
            </button>
            <button 
              className={`nav-link btn btn-link ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin')}
            >
              Admin
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        <DeliveryTimer />
        
        {currentView === 'shop' && (
          <div className="row">
            <div className="col-md-8">
              <h3>Products</h3>
              <div className="row">
                {inventory.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            </div>
            <div className="col-md-4">
              <LocationSelector onLocationSelect={setLocation} />
              <div className="mt-3">
                <Cart 
                  items={cart}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                  onCheckout={handleCheckout}
                />
              </div>
            </div>
          </div>
        )}

        {currentView === 'orders' && (
          <OrderStatus orders={orders} />
        )}

        {currentView === 'admin' && (
          <AdminPanel />
        )}
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
