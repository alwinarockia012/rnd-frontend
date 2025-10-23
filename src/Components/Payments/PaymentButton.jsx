import React, { useState, useEffect } from 'react';
import { getCurrentUser, formatAmountForRazorpay, validatePaymentData } from '../../services/paymentService';
import { getApiUrl } from '../../services/apiConfig';
import { FaCreditCard, FaLock, FaSpinner } from 'react-icons/fa';
import './PaymentButton.css';

const PaymentButton = ({ amount, eventName, eventId, onPaymentSuccess, onPaymentFailure }) => {
  const [loading, setLoading] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Load Razorpay script dynamically
  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          resolve(true);
        };
        script.onerror = () => {
          resolve(false);
        };
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript();
  }, []);

  const loadRazorpay = async () => {
    // Check if Razorpay script is loaded
    if (!window.Razorpay) {
      // Use onPaymentFailure to handle this error which will show notification in parent
      if (onPaymentFailure) {
        onPaymentFailure(new Error('Razorpay SDK failed to load. Are you online?'));
      }
      return;
    }

    // Validate payment data
    const validation = validatePaymentData({ amount, eventName, eventId });
    if (!validation.isValid) {
      // Use onPaymentFailure to handle this error which will show notification in parent
      if (onPaymentFailure) {
        onPaymentFailure(new Error(validation.error));
      }
      return;
    }

    // Get current user
    const user = getCurrentUser();
    const userId = user ? user.uid : 'anonymous';

    setLoading(true);

    try {
      // Debug: Log the API URL being used
      const apiUrl = getApiUrl('/api/create-order');
      console.log('Making request to:', apiUrl);
      
      // Create order on backend using the correct API URL
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: formatAmountForRazorpay(amount), // Convert to paise
          currency: 'INR',
          eventId,
          userId,
          eventName
        }),
      });

      // Debug: Log response details
      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);
      
      // Get content type
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);
      
      // Check if response is successful
      if (!response.ok) {
        let errorMessage = `Server error ${response.status}: ${response.statusText}`;
        
        // Only try to read the body if it exists and hasn't been read yet
        if (response.body) {
          try {
            // Read the response body once
            const responseClone = response.clone(); // Clone to read safely
            if (contentType && contentType.includes('application/json')) {
              const errorData = await responseClone.json();
              errorMessage = `Server error: ${errorData.message || response.statusText}`;
            } else {
              const errorText = await responseClone.text();
              errorMessage = `Server error ${response.status}: ${response.statusText}. Response: ${errorText.substring(0, 200)}...`;
            }
          } catch (parseError) {
            console.log('Error parsing response body:', parseError);
            // Use generic error message if parsing fails
          }
        }
        
        throw new Error(errorMessage);
      }

      // Parse successful response
      let order;
      if (contentType && contentType.includes('application/json')) {
        order = await response.json();
      } else {
        throw new Error(`Expected JSON response but received ${contentType || 'unknown type'}`);
      }

      if (!order.id) {
        throw new Error('Order creation failed - No order ID returned');
      }

      // Configure Razorpay options
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID, // Use frontend environment variable
        amount: order.amount,
        currency: order.currency,
        name: 'R&D Run and Develop',
        description: `Payment for ${eventName}`,
        image: '/redlogo.png',
        order_id: order.id,
        handler: function (response) {
          // Payment success handler
          console.log('Payment successful:', response);
          
          // Verify payment signature for security by calling backend
          verifyPaymentSignature(response, order.id);
          
          // Use onPaymentSuccess which will show notification in parent
          if (onPaymentSuccess) {
            onPaymentSuccess(response);
          }
        },
        prefill: {
          name: user ? user.name : 'User Name',
          email: user ? user.email : 'user@example.com',
          contact: user && user.phoneNumber ? user.phoneNumber.replace('+91', '') : '9999999999',
        },
        notes: {
          eventId: eventId,
          userId: userId,
        },
        theme: {
          color: '#F15A24', // Orange theme to match your app
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal was closed by the user');
            // Use onPaymentFailure to handle cancellation which will show notification in parent
            if (onPaymentFailure) {
              onPaymentFailure(new Error('Payment was cancelled. You can try again when ready.'));
            }
          }
        }
      };

      // Create Razorpay instance
      const rzpInstance = new window.Razorpay(options);

      // Open Razorpay checkout
      rzpInstance.open();
    } catch (error) {
      console.error('Error during payment:', error);
      // Use onPaymentFailure to handle this error which will show notification in parent
      
      if (onPaymentFailure) {
        onPaymentFailure(error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine if this is a ₹1 payment button
  const isOneRupeePayment = amount === 1;

  return (
    <button 
      className={`payment-button enhanced ${isOneRupeePayment ? 'one-rupee' : ''}`}
      onClick={loadRazorpay}
      disabled={loading}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={{
        transform: isPressed ? 'translateY(1px) scale(0.98)' : 'none',
        transition: 'transform 0.1s ease'
      }}
    >
      {loading ? (
        <div className="button-content">
          <FaSpinner className="spinner-icon" />
          <span>Processing Payment...</span>
        </div>
      ) : (
        <div className="button-content">
          <FaCreditCard className="card-icon" />
          <span>Pay ₹{amount}</span>
          <FaLock className="lock-icon" />
        </div>
      )}
    </button>
  );
};

// Function to verify payment signature
const verifyPaymentSignature = async (response, orderId) => {
  try {
    const verificationResponse = await fetch(getApiUrl('/api/verify-payment'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      }),
    });
    
    const verificationResult = await verificationResponse.json();
    
    if (verificationResult.success) {
      console.log('Payment signature verified successfully');
      return true;
    } else {
      console.error('Payment signature verification failed:', verificationResult.message);
      return false;
    }
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

export default PaymentButton;