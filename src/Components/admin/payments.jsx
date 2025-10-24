import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where, Timestamp, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatDate as formatDateUtil } from '../../utils/dateUtils';
import { getApiUrl } from '../../services/apiConfig';
import './payments.css';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDays, setFilterDays] = useState(30);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [paymentMethodCache, setPaymentMethodCache] = useState({}); // Cache for payment method details
  const [userCache, setUserCache] = useState({}); // Cache for user details
  const [updatingPayment, setUpdatingPayment] = useState(null); // Track which payment is being updated
  const [notification, setNotification] = useState(null); // For in-app notifications

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const bookingsCollectionRef = collection(db, 'bookings');
      let q;

      if (filterDays > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - filterDays);
        // Convert to Firestore Timestamp
        const startTimestamp = Timestamp.fromDate(startDate);
        q = query(
          bookingsCollectionRef,
          where('bookingDate', '>=', startTimestamp),
          orderBy('bookingDate', 'desc')
        );
      } else {
        q = query(
          bookingsCollectionRef,
          orderBy('bookingDate', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const paymentsData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Debug: Log the raw data to see what fields are available
        console.log('Raw payment data:', doc.id, data);
        
        // Process dates properly
        let bookingDate = data.bookingDate;
        if (data.bookingDate && typeof data.bookingDate.toDate === 'function') {
          bookingDate = data.bookingDate.toDate();
        } else if (data.bookingDate && data.bookingDate.seconds) {
          bookingDate = new Date(data.bookingDate.seconds * 1000);
        } else if (data.bookingDate instanceof Timestamp) {
          bookingDate = data.bookingDate.toDate();
        }
        
        let eventDate = data.eventDate;
        if (data.eventDate && typeof data.eventDate.toDate === 'function') {
          eventDate = data.eventDate.toDate();
        } else if (data.eventDate && data.eventDate.seconds) {
          eventDate = new Date(data.eventDate.seconds * 1000);
        } else if (data.eventDate instanceof Timestamp) {
          eventDate = data.eventDate.toDate();
        }
        
        // Ensure amount is a number
        const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
        
        return {
          id: doc.id,
          ...data,
          amount: amount || 0,
          bookingDate: bookingDate,
          eventDate: eventDate,
          isFreeTrial: data.isFreeTrial || data.paymentMethod === 'free_trial' || amount === 0,
          status: data.status || 'confirmed'
        };
      });

      setPayments(paymentsData);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, [filterDays]);

  // Fetch user details for each payment
  useEffect(() => {
    const fetchUserDetails = async () => {
      // Find all payments that have userId but no cached user details
      const paymentsWithoutUser = payments.filter(payment => {
        const userId = payment.userId;
        const hasId = !!userId;
        const isCached = hasId && userCache[userId];
        return hasId && !isCached;
      });
      
      // Fetch details for each user
      for (const payment of paymentsWithoutUser) {
        const userId = payment.userId;
        if (userId) {
          await fetchUserDetailsById(userId);
        }
      }
    };
    
    if (payments.length > 0) {
      fetchUserDetails();
    }
  }, [payments, userCache]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Fetch payment method details for Razorpay payments
  useEffect(() => {
    const fetchAllPaymentMethodDetails = async () => {
      // Find all payments that have razorpayPaymentId but no cached details
      const razorpayPayments = payments.filter(payment => {
        const razorpayPaymentId = payment.razorpayPaymentId;
        const hasId = !!razorpayPaymentId;
        const isCached = hasId && paymentMethodCache[razorpayPaymentId];
        console.log('Payment:', payment.id, 'Has Razorpay ID:', hasId, 'ID:', razorpayPaymentId, 'Cached:', isCached);
        return hasId && !isCached;
      });
      
      console.log('Found', razorpayPayments.length, 'Razorpay payments to fetch details for');
      
      // Fetch details for each payment
      for (const payment of razorpayPayments) {
        const razorpayPaymentId = payment.razorpayPaymentId;
        console.log('Fetching details for payment ID:', razorpayPaymentId);
        await fetchPaymentMethodDetails(razorpayPaymentId);
      }
    };
    
    if (payments.length > 0) {
      fetchAllPaymentMethodDetails();
    }
  }, [payments, paymentMethodCache]);

  // Function to fetch user details by ID
  const fetchUserDetailsById = async (userId) => {
    // Check cache first
    if (userCache[userId]) {
      return userCache[userId];
    }
    
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Cache the result
        setUserCache(prev => ({
          ...prev,
          [userId]: userData
        }));
        return userData;
      } else {
        console.log('User not found for ID:', userId);
      }
    } catch (error) {
      console.error('Error fetching user details for ID:', userId, error);
    }
    return null;
  };

  // Filter payments based on status and payment method
  const filteredPayments = payments.filter(payment => {
    // Status filter
    if (filterStatus !== 'all' && payment.status !== filterStatus) {
      return false;
    }
    
    // Payment method filter
    if (filterPaymentMethod !== 'all') {
      // Get the actual payment method display name
      const paymentMethodDisplayName = getPaymentMethodDisplayName(payment);
      
      // Map display names to filter values
      const displayNameToFilterMap = {
        'Free Trial': 'free_trial',
        'Card': 'card',
        'Credit Card': 'card',
        'Debit Card': 'card',
        'UPI': 'upi',
        'Internet Banking': 'netbanking',
        'Wallet': 'wallet',
        'EMI': 'emi',
        'Razorpay': 'razorpay'
      };
      
      const normalizedDisplayName = displayNameToFilterMap[paymentMethodDisplayName] || paymentMethodDisplayName.toLowerCase();
      
      if (normalizedDisplayName !== filterPaymentMethod) {
        return false;
      }
    }
    
    return true;
  });

  // Calculate total revenue
  const totalRevenue = filteredPayments
    .filter(payment => payment.status === 'confirmed' && !payment.isFreeTrial)
    .reduce((sum, payment) => {
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      return sum + (amount || 0);
    }, 0);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return formatDateUtil(new Date(date));
  };

  // Format payment method for display
  const formatPaymentMethod = (method) => {
    if (!method) return 'Razorpay';
    
    // Map common Razorpay payment methods to user-friendly names
    const methodMap = {
      'card': 'Card',
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card',
      'creditcard': 'Credit Card',
      'debitcard': 'Debit Card',
      'upi': 'UPI',
      'netbanking': 'Internet Banking',
      'net_banking': 'Internet Banking',
      'wallet': 'Wallet',
      'emi': 'EMI',
      'cod': 'Cash on Delivery',
      'free_trial': 'Free Trial',
      'razorpay': 'Razorpay'
    };
    
    // Return mapped name or capitalize the method name
    return methodMap[method.toLowerCase()] || 
           method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
  };

  // Function to fetch actual payment method from Razorpay
  const fetchPaymentMethodDetails = async (paymentId) => {
    // Check cache first
    if (paymentMethodCache[paymentId]) {
      return paymentMethodCache[paymentId];
    }
    
    try {
      const response = await fetch(getApiUrl(`/api/payment-details/${paymentId}`));
      if (response.ok) {
        const data = await response.json();
        // Cache the result
        setPaymentMethodCache(prev => ({
          ...prev,
          [paymentId]: data.paymentMethodDetails
        }));
        return data.paymentMethodDetails;
      } else {
        console.log('Failed to fetch payment details for ID:', paymentId, 'Status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching payment method details for ID:', paymentId, error);
    }
    return null;
  };

  // Function to determine display name for payment method
  const getPaymentMethodDisplayName = (payment) => {
    // If we have cached payment method details, use them
    const razorpayPaymentId = payment.razorpayPaymentId;
    console.log('Checking payment:', payment.id, 'Razorpay ID:', razorpayPaymentId, 'Cached:', paymentMethodCache[razorpayPaymentId]);
    if (razorpayPaymentId && paymentMethodCache[razorpayPaymentId]) {
      const details = paymentMethodCache[razorpayPaymentId];
      console.log('Using cached details for', payment.id, ':', details);
      
      // Map Razorpay method types to user-friendly names
      switch (details.method) {
        case 'card':
          if (details.card && details.card.type) {
            return details.card.type === 'credit' ? 'Credit Card' : 'Debit Card';
          }
          return 'Card';
        case 'upi':
          return 'UPI';
        case 'netbanking':
          return 'Internet Banking';
        case 'wallet':
          return 'Wallet';
        case 'emi':
          return 'EMI';
        default:
          return details.method.charAt(0).toUpperCase() + details.method.slice(1);
      }
    }
    
    // Fallback to existing logic
    if (payment.paymentMethod === 'free_trial') {
      return 'Free Trial';
    } else if (payment.paymentMethod === 'card' || payment.paymentMethod === 'credit_card' || payment.paymentMethod === 'debit_card') {
      return 'Card';
    } else if (payment.paymentMethod === 'upi') {
      return 'UPI';
    } else if (payment.paymentMethod === 'netbanking' || payment.paymentMethod === 'net_banking') {
      return 'Internet Banking';
    } else if (payment.paymentMethod === 'wallet') {
      return 'Wallet';
    } else if (payment.paymentMethod === 'emi') {
      return 'EMI';
    } else if (payment.paymentMethod) {
      return formatPaymentMethod(payment.paymentMethod);
    } else {
      return 'Razorpay';
    }
  };

  // Function to determine color for payment method
  const getPaymentMethodColor = (payment) => {
    // If we have cached payment method details, use them
    const razorpayPaymentId = payment.razorpayPaymentId;
    if (razorpayPaymentId && paymentMethodCache[razorpayPaymentId]) {
      const details = paymentMethodCache[razorpayPaymentId];
      
      switch (details.method) {
        case 'card':
        case 'credit':
        case 'debit':
          return '#2196f3'; // Blue for cards
        case 'upi':
          return '#ff9800'; // Orange for UPI
        case 'netbanking':
          return '#9c27b0'; // Purple for netbanking
        case 'wallet':
          return '#ffeb3b'; // Yellow for wallet
        case 'emi':
          return '#00bcd4'; // Cyan for EMI
        default:
          return '#4caf50'; // Green for others
      }
    }
    
    // Fallback to existing logic
    if (payment.paymentMethod === 'free_trial') {
      return '#F15A24'; // Orange for free trial
    } else if (payment.paymentMethod === 'card' || payment.paymentMethod === 'credit_card' || payment.paymentMethod === 'debit_card') {
      return '#2196f3'; // Blue for cards
    } else if (payment.paymentMethod === 'upi') {
      return '#ff9800'; // Orange for UPI
    } else if (payment.paymentMethod === 'netbanking' || payment.paymentMethod === 'net_banking') {
      return '#9c27b0'; // Purple for netbanking
    } else if (payment.paymentMethod === 'wallet') {
      return '#ffeb3b'; // Yellow for wallet
    } else if (payment.paymentMethod === 'emi') {
      return '#00bcd4'; // Cyan for EMI
    } else {
      return '#4caf50'; // Green for others
    }
  };

  // Function to show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
  };

  // Function to update payment status
  const updatePaymentStatus = async (paymentId, newStatus) => {
    try {
      setUpdatingPayment(paymentId);
      
      // Update in Firestore
      const bookingRef = doc(db, 'bookings', paymentId);
      await updateDoc(bookingRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setPayments(prevPayments => 
        prevPayments.map(payment => 
          payment.id === paymentId 
            ? { ...payment, status: newStatus }
            : payment
        )
      );
      
      console.log(`Payment ${paymentId} status updated to ${newStatus}`);
      showNotification(`Payment status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to update payment status.');
      showNotification('Failed to update payment status.', 'error');
    } finally {
      setUpdatingPayment(null);
    }
  };

  // Function to update all payments from today to 'confirmed' status
  const confirmTodaysPayments = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaysPayments = payments.filter(payment => {
        // Check if payment was made today
        const paymentDate = payment.bookingDate;
        if (!paymentDate) return false;
        
        const paymentDateObj = paymentDate instanceof Date ? paymentDate : new Date(paymentDate);
        paymentDateObj.setHours(0, 0, 0, 0);
        
        return paymentDateObj.getTime() === today.getTime() && payment.status !== 'confirmed';
      });
      
      if (todaysPayments.length === 0) {
        showNotification('No payments found for today that need confirmation.', 'info');
        return;
      }
      
      // Ask for confirmation using in-app notification approach
      if (!window.confirm(`Confirm ${todaysPayments.length} payments from today?`)) {
        return;
      }
      
      // Update all today's payments
      for (const payment of todaysPayments) {
        await updatePaymentStatus(payment.id, 'confirmed');
      }
      
      showNotification(`${todaysPayments.length} payments confirmed successfully!`, 'success');
    } catch (error) {
      console.error('Error confirming today\'s payments:', error);
      setError('Failed to confirm today\'s payments.');
      showNotification('Failed to confirm today\'s payments.', 'error');
    }
  };

  if (loading) {
    return <h2 style={{ color: '#ffffff' }}>Loading Payments...</h2>;
  }

  return (
    <div className="payments">
      {/* Add notification display */}
      {notification && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            borderRadius: '4px',
            color: 'white',
            zIndex: 1000,
            backgroundColor: notification.type === 'error' ? '#f44336' : 
                             notification.type === 'success' ? '#4CAF50' : '#2196F3'
          }}
        >
          {notification.message}
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2>Payment Records</h2>
        <div className="filter-controls" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select 
            value={filterDays} 
            onChange={(e) => setFilterDays(Number(e.target.value))}
            className="status-filter"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={0}>All Time</option>
          </select>
          
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          
          <select 
            value={filterPaymentMethod} 
            onChange={(e) => setFilterPaymentMethod(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Payment Methods</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="netbanking">Internet Banking</option>
            <option value="wallet">Wallet</option>
            <option value="emi">EMI</option>
            <option value="free_trial">Free Trial</option>
            <option value="razorpay">Razorpay</option>
          </select>
          
          {/* Add button to confirm today's payments */}
          <button 
            onClick={confirmTodaysPayments}
            className="status-filter"
            style={{ 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              padding: '5px 10px', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Confirm Today's Payments
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#f44336' }}>{error}</p>}

      <div className="revenue-summary">
        <h3>Revenue Summary</h3>
        <p>Total Revenue (Confirmed Payments): <strong style={{ color: '#ffffff' }}>{formatCurrency(totalRevenue)}</strong></p>
        <p>Total Transactions: <strong style={{ color: '#ffffff' }}>{filteredPayments.length}</strong></p>
        <p>Free Trials: <strong style={{ color: '#ffffff' }}>{filteredPayments.filter(p => p.isFreeTrial).length}</strong></p>
      </div>

      {filteredPayments.length === 0 && !loading ? (
        <p style={{ color: '#e0e0e0' }}>No payment records found.</p>
      ) : (
        <div className="table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Event</th>
                <th>Event Date</th>
                <th>Booking Date</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Actions</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment, index) => {
                // Get user details from cache if available
                const user = payment.userId && userCache[payment.userId] ? userCache[payment.userId] : null;
                
                return (
                  <tr key={payment.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div>
                        <div style={{ color: '#ffffff' }}>
                          {user ? (
                            user.displayName || 
                            user.name || 
                            user.email || 
                            'N/A'
                          ) : (
                            payment.userName || 
                            payment.name || 
                            payment.userEmail || 
                            payment.email || 
                            payment.displayName ||
                            payment.fullName ||
                            payment.firstName || 
                            payment.lastName ||
                            (payment.firstName && payment.lastName ? `${payment.firstName} ${payment.lastName}` : null) ||
                            'N/A'
                          )}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#aaaaaa' }}>
                          {user ? (
                            user.phone || 
                            'N/A'
                          ) : (
                            payment.phoneNumber || 
                            payment.phone || 
                            payment.mobile || 
                            payment.mobileNumber ||
                            'N/A'
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#ffffff' }}>{payment.eventName || 'N/A'}</td>
                    <td style={{ color: '#e0e0e0' }}>{formatDate(payment.eventDate)}</td>
                    <td style={{ color: '#e0e0e0' }}>{formatDate(payment.bookingDate)}</td>
                    <td>
                      {payment.isFreeTrial ? (
                        <span style={{ color: '#F15A24' }}>FREE</span>
                      ) : (
                        <span style={{ color: '#ffffff' }}>{formatCurrency(payment.amount || 0)}</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: getPaymentMethodColor(payment) }}>
                        {getPaymentMethodDisplayName(payment)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${payment.status || 'unknown'}`}>
                        {payment.status || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {payment.status !== 'confirmed' && (
                        <button
                          onClick={() => updatePaymentStatus(payment.id, 'confirmed')}
                          disabled={updatingPayment === payment.id}
                          style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            padding: '3px 8px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {updatingPayment === payment.id ? 'Confirming...' : 'Confirm'}
                        </button>
                      )}
                      {payment.status !== 'failed' && (
                        <button
                          onClick={() => updatePaymentStatus(payment.id, 'failed')}
                          disabled={updatingPayment === payment.id}
                          style={{
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            padding: '3px 8px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            marginLeft: '5px'
                          }}
                        >
                          {updatingPayment === payment.id ? 'Failing...' : 'Fail'}
                        </button>
                      )}
                    </td>
                    <td style={{ color: '#e0e0e0' }}>{payment.id?.substring(0, 8) || 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Payments;