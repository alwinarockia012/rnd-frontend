// server.js - Node.js/Express backend for Razorpay integration
require('dotenv').config({ path: __dirname + '/../.env' });
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Log environment variables for debugging
console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);
console.log('Environment variables:');
console.log('  PORT:', process.env.PORT);
console.log('  BACKEND_PORT:', process.env.BACKEND_PORT);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  RAZORPAY_KEY_ID_TEST:', process.env.RAZORPAY_KEY_ID_TEST ? 'SET' : 'NOT SET');
console.log('  RAZORPAY_KEY_SECRET_TEST:', process.env.RAZORPAY_KEY_SECRET_TEST ? 'SET' : 'NOT SET');
console.log('  RAZORPAY_WEBHOOK_SECRET:', process.env.RAZORPAY_WEBHOOK_SECRET ? 'SET' : 'NOT SET');

const app = express();

// Add logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Middleware with CORS configuration for development
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:5003',
    // Local network IP for mobile testing
    'http://192.168.1.21:3000',
    // Ngrok URLs for mobile testing
    'https://*.ngrok.io',
    'https://*.ngrok-free.app',
    // LocalTunnel URLs
    'https://*.loca.lt',
    // Serveo URLs
    'https://*.serveo.net',
    // Generic patterns for tunneling services
    'https://*',
    'http://*'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Determine mode (test or live)
const razorpayMode = process.env.RAZORPAY_MODE || 'test';

// Set keys based on mode
const razorpayKeyId = razorpayMode === 'live' 
  ? process.env.RAZORPAY_KEY_ID_LIVE 
  : process.env.RAZORPAY_KEY_ID_TEST;

const razorpayKeySecret = razorpayMode === 'live' 
  ? process.env.RAZORPAY_KEY_SECRET_LIVE 
  : process.env.RAZORPAY_KEY_SECRET_TEST;

// Get webhook secret
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

// Check if keys are properly configured
if (!razorpayKeyId || !razorpayKeySecret) {
  console.error('❌ RAZORPAY KEYS NOT CONFIGURED PROPERLY!');
  console.error('Please check your .env file and ensure RAZORPAY_KEY_ID_TEST and RAZORPAY_KEY_SECRET_TEST are set for test mode');
  console.error('Current values:');
  console.error('  RAZORPAY_KEY_ID_TEST:', process.env.RAZORPAY_KEY_ID_TEST);
  console.error('  RAZORPAY_KEY_SECRET_TEST:', process.env.RAZORPAY_KEY_SECRET_TEST ? 'SET' : 'NOT SET');
}

// Initialize Razorpay instance with better error handling
let razorpay;
try {
  if (!razorpayKeyId || !razorpayKeySecret) {
    throw new Error('Razorpay keys are not configured');
  }
  
  razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
  console.log('✅ Razorpay instance initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Razorpay instance:', error.message);
  // We'll handle this error in the route instead of exiting
  razorpay = null;
}

// Log current mode and key status
console.log(`Razorpay Server Running in ${razorpayMode.toUpperCase()} mode`);
console.log(`Key ID set: ${!!razorpayKeyId}`);
console.log(`Key Secret set: ${!!razorpayKeySecret}`);

// Route to create Razorpay order
app.post('/api/create-order', async (req, res) => {
  try {
    // Check if Razorpay is properly initialized
    if (!razorpay) {
      return res.status(500).json({
        error: 'Payment service not available',
        message: 'Razorpay service is not properly configured. Please contact the administrator.'
      });
    }

    const { amount, currency, eventId, userId, eventName } = req.body;

    // Log incoming request for debugging
    console.log('Received order request:', { amount, currency, eventId, userId, eventName });

    // Validate request
    if (!amount || !currency || !eventId || !userId) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Missing required fields: amount, currency, eventId, userId',
      });
    }

    // Validate amount
    if (amount <= 0) {
      console.log('Validation failed: Invalid amount');
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be greater than zero',
      });
    }

    // Create order options
    const options = {
      amount: amount, // Amount in paise
      currency: currency,
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        eventId: eventId,
        userId: userId,
        eventName: eventName || 'Event',
        mode: razorpayMode, // Include mode in notes for reference
      },
    };

    console.log('Creating Razorpay order with options:', options);

    // Create order using Razorpay API
    const order = await razorpay.orders.create(options);
    
    console.log('Order created successfully:', order);

    // Return order details to frontend
    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    
    // Handle different types of errors
    if (error.statusCode === 401) {
      // Authentication error - usually means invalid keys
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid Razorpay credentials. Please check the API keys.',
        statusCode: 401
      });
    } else if (error.statusCode) {
      // Other Razorpay API errors
      console.error('Razorpay API error:', error.statusCode, error.error);
      return res.status(error.statusCode).json({
        error: 'Razorpay API error',
        message: error.error.description || error.error.reason || error.error,
        statusCode: error.statusCode
      });
    } else {
      // Unexpected errors
      return res.status(500).json({
        error: 'Failed to create order',
        message: error.message || 'An unexpected error occurred while creating the payment order',
      });
    }
  }
});

// Route to create QR code payment order
app.post('/api/create-qr-order', async (req, res) => {
  try {
    // Check if Razorpay is properly initialized
    if (!razorpay) {
      return res.status(500).json({
        error: 'Payment service not available',
        message: 'Razorpay service is not properly configured. Please contact the administrator.'
      });
    }

    const { amount, currency, eventId, userId, eventName, customerName, customerEmail, customerPhone } = req.body;

    // Log incoming request for debugging
    console.log('Received QR order request:', { amount, currency, eventId, userId, eventName });

    // Validate request
    if (!amount || !currency || !eventId || !userId) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Missing required fields: amount, currency, eventId, userId',
      });
    }

    // Validate amount
    if (amount <= 0) {
      console.log('Validation failed: Invalid amount');
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be greater than zero',
      });
    }

    // Create QR code options
    const options = {
      type: 'upi_qr',
      name: 'R&D Run and Develop',
      description: `Payment for ${eventName || 'Event'}`,
      fixed_amount: true,
      payment_amount: amount, // Amount in paise
      customer_name: customerName || 'Customer',
      customer_email: customerEmail || '',
      customer_contact: customerPhone || '',
      notes: {
        eventId: eventId,
        userId: userId,
        eventName: eventName || 'Event',
        mode: razorpayMode,
      }
    };

    console.log('Creating Razorpay QR code with options:', options);

    // Create QR code using Razorpay API
    const qrCode = await razorpay.qrCode.create(options);
    
    console.log('QR Code created successfully:', qrCode);

    // Return QR code details to frontend
    res.json({
      id: qrCode.id,
      qrCode: qrCode.qr_code,
      shortUrl: qrCode.short_url,
      amount: qrCode.amount,
      currency: qrCode.currency,
      status: qrCode.status
    });
  } catch (error) {
    console.error('Error creating Razorpay QR code:', error);
    
    // Handle different types of errors
    if (error.statusCode === 401) {
      // Authentication error - usually means invalid keys
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid Razorpay credentials. Please check the API keys.',
        statusCode: 401
      });
    } else if (error.statusCode) {
      // Other Razorpay API errors
      console.error('Razorpay API error:', error.statusCode, error.error);
      return res.status(error.statusCode).json({
        error: 'Razorpay API error',
        message: error.error.description || error.error.reason || error.error,
        statusCode: error.statusCode
      });
    } else {
      // Unexpected errors
      return res.status(500).json({
        error: 'Failed to create QR code',
        message: error.message || 'An unexpected error occurred while creating the QR code',
      });
    }
  }
});

// Route to check payment status for a QR code order
app.get('/api/check-payment-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Check if Razorpay is properly initialized
    if (!razorpay) {
      return res.status(500).json({
        error: 'Payment service not available',
        message: 'Razorpay service is not properly configured.'
      });
    }

    // Fetch the QR code details
    const qrCode = await razorpay.qrCode.fetch(orderId);
    
    // Check if payments have been made
    if (qrCode && qrCode.payments && qrCode.payments.count > 0) {
      // Get the latest payment
      const payments = await razorpay.qrCode.fetchAllPayments(orderId);
      if (payments && payments.items && payments.items.length > 0) {
        const latestPayment = payments.items[0];
        
        // Return payment status
        return res.json({
          status: latestPayment.status,
          paymentId: latestPayment.id,
          orderId: latestPayment.order_id
        });
      }
    }
    
    // If no payments found, return pending status
    res.json({
      status: 'pending'
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    // Handle different types of errors
    if (error.statusCode === 404) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'The specified order could not be found.',
        statusCode: 404
      });
    } else if (error.statusCode === 401) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid Razorpay credentials.',
        statusCode: 401
      });
    } else {
      return res.status(500).json({
        error: 'Failed to check payment status',
        message: error.message || 'An unexpected error occurred while checking payment status.',
      });
    }
  }
});

// Route to verify payment (optional but recommended)
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Create expected signature
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    // Verify signature
    const isVerified = expectedSignature === razorpay_signature;

    if (isVerified) {
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      message: error.message,
    });
  }
});

// Webhook endpoint for real-time payment updates
app.post('/api/webhook', express.raw({type: 'application/json'}), (req, res) => {
  try {
    // Verify webhook signature (you'll need to set up WEBHOOK_SECRET in your .env)
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('Webhook secret not configured. Webhook verification skipped.');
    } else {
      const signature = req.headers['x-razorpay-signature'];
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body)
        .digest('hex');
      
      if (expectedSignature !== signature) {
        console.error('Webhook signature verification failed');
        return res.status(400).send('Webhook signature verification failed');
      }
    }

    // Parse the event
    const event = JSON.parse(req.body);
    
    // Handle different event types
    switch (event.event) {
      case 'payment.captured':
        console.log('Payment captured:', event.payload.payment.entity);
        // Update your database with payment details
        // Send confirmation emails, update user status, etc.
        // Create booking for the user
        const payment = event.payload.payment.entity;
        const userId = payment.notes && payment.notes.userId;
        const eventName = payment.notes && payment.notes.eventName;
        
        if (userId && eventName) {
          console.log(`Creating booking for user ${userId} for event ${eventName}`);
          // In a real implementation, you would create a booking in the database here
          // For now, we'll just log it
          console.log('Booking would be created here in a full implementation');
        }
        break;
        
      case 'payment.failed':
        console.log('Payment failed:', event.payload.payment.entity);
        // Handle failed payment (notify user, log for review, etc.)
        break;
        
      case 'order.paid':
        console.log('Order paid:', event.payload.order.entity);
        // Handle order paid event
        break;
        
      default:
        console.log('Unhandled event type:', event.event);
    }
    
    // Acknowledge receipt of webhook
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mode: razorpayMode,
    keyIdSet: !!razorpayKeyId,
    razorpayInitialized: !!razorpay
  });
});

// Test endpoint to verify keys
app.get('/api/test-keys', (req, res) => {
  res.json({ 
    mode: razorpayMode,
    keyIdSet: !!razorpayKeyId,
    keySecretSet: !!razorpayKeySecret,
    keyId: razorpayKeyId ? razorpayKeyId.substring(0, 10) + '...' : null,
    razorpayInitialized: !!razorpay
  });
});

// Update the 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.path);
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Update the global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  // Ensure we always return JSON
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// Determine the port
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5001;
console.log('  Using port:', PORT);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Razorpay backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Mode: ${razorpayMode.toUpperCase()}`);
  console.log(`CORS enabled for: http://localhost:3000, http://localhost:3001, http://localhost:5001`);
  
  // Remind user to set up keys if they're using placeholder values
  if (razorpayKeyId && razorpayKeyId.includes('your_test_key_id')) {
    console.log('\n⚠️  WARNING: You are using placeholder Razorpay keys!');
    console.log('Please update your .env file with real Razorpay test keys from https://dashboard.razorpay.com/');
  }
});

module.exports = app;