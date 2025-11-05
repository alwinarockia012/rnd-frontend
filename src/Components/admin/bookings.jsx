import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatDate } from '../../utils/dateUtils';
import './bookings.css';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDays, setFilterDays] = useState(5);
  const [userCache, setUserCache] = useState({}); // Cache for user details

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const bookingsCollectionRef = collection(db, 'bookings');
      let q;

      if (filterDays > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - filterDays);
        q = query(
          bookingsCollectionRef,
          where('bookingDate', '>=', startDate),
          orderBy('bookingDate', 'desc')
        );
      } else {
        q = query(
          bookingsCollectionRef,
          orderBy('bookingDate', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const bookingsData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Process dates properly
        let bookingDate = data.bookingDate;
        if (data.bookingDate && typeof data.bookingDate.toDate === 'function') {
          bookingDate = data.bookingDate.toDate();
        } else if (data.bookingDate && data.bookingDate.seconds) {
          bookingDate = new Date(data.bookingDate.seconds * 1000);
        }
        
        let eventDate = data.eventDate;
        if (data.eventDate && typeof data.eventDate.toDate === 'function') {
          eventDate = data.eventDate.toDate();
        } else if (data.eventDate && data.eventDate.seconds) {
          eventDate = new Date(data.eventDate.seconds * 1000);
        }
        
        // Ensure amount is a number
        const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
        
        // Determine the actual plan name for display
        let displayEventName = data.eventName || 'N/A';
        // If this is a free trial booking, try to get the actual plan name from eventId or other fields
        if (data.isFreeTrial || data.paymentMethod === 'free_trial' || amount === 0) {
          // Check if we have eventId that might contain plan information
          if (data.eventId && data.eventId !== 'free_trial') {
            // Try to derive plan name from eventId
            if (data.eventId.includes('pay_per_run') || data.eventId.includes('pay-per-run')) {
              displayEventName = 'Pay-Per-Run';
            } else if (data.eventId.includes('weekly') && data.eventId.includes('community')) {
              displayEventName = 'Weekly Community Run';
            } else if (data.eventId.includes('monthly')) {
              displayEventName = 'Monthly Membership';
            } else if (data.eventId.startsWith('plan_')) {
              // Extract plan name from eventId
              const planName = data.eventId.replace('plan_', '').replace(/_/g, ' ');
              // Capitalize first letter of each word
              displayEventName = planName.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
            }
          }
          // If eventName is explicitly "Free Trial", try to get better name from other fields
          else if (displayEventName === 'Free Trial' || displayEventName === 'Free trial') {
            // Try to get plan name from eventId if it's not the generic free_trial id
            if (data.eventId && data.eventId.startsWith('plan_')) {
              // Extract plan name from eventId
              const planName = data.eventId.replace('plan_', '').replace(/_/g, ' ');
              // Capitalize first letter of each word
              displayEventName = planName.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
            }
            // If we still don't have a good name, check for common plan names in the data
            else if (!data.eventId || data.eventId === 'free_trial') {
              // Check if there's any other field that might contain plan information
              if (data.planName) {
                displayEventName = data.planName;
              } else if (data.planType) {
                displayEventName = data.planType;
              }
              // Default to a generic plan name if we can't determine the specific plan
              else if (displayEventName === 'Free Trial' || displayEventName === 'Free trial') {
                displayEventName = 'Pay-Per-Run'; // Default assumption for free trial users
              }
            }
          }
        }
        
        return {
          id: doc.id,
          ...data,
          amount: amount || 0,
          bookingDate: bookingDate,
          eventDate: eventDate,
          isFreeTrial: data.isFreeTrial || data.paymentMethod === 'free_trial' || amount === 0,
          status: data.status || 'confirmed',
          displayEventName: displayEventName // Add displayEventName for proper display
        };
      });

      setBookings(bookingsData);
    } catch (err) {
      if (err.code === 'failed-precondition') {
        console.error('Query failed. You might need to create a composite index in Firestore.', err);
        setError('Failed to load bookings. A database index might be required.');
      } else {
        console.error('Error fetching bookings:', err);
        setError('Failed to load bookings.');
      }
    } finally {
      setLoading(false);
    }
  }, [filterDays]);

  // Fetch user details for each booking
  useEffect(() => {
    const fetchUserDetails = async () => {
      // Find all bookings that have userId but no cached user details
      const bookingsWithoutUser = bookings.filter(booking => {
        const userId = booking.userId;
        const hasId = !!userId;
        const isCached = hasId && userCache[userId];
        return hasId && !isCached;
      });
      
      // Fetch details for each user
      for (const booking of bookingsWithoutUser) {
        const userId = booking.userId;
        if (userId) {
          await fetchUserDetailsById(userId);
        }
      }
    };
    
    if (bookings.length > 0) {
      fetchUserDetails();
    }
  }, [bookings, userCache]);

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

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Function to determine display name for payment method
  const getPaymentMethodDisplayName = (booking) => {
    if (booking.isFreeTrial) {
      return 'Free Trial';
    } else if (booking.paymentMethod) {
      // Map common payment methods to user-friendly names
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
        'razorpay': 'Razorpay'
      };
      
      return methodMap[booking.paymentMethod.toLowerCase()] || 
             booking.paymentMethod.charAt(0).toUpperCase() + booking.paymentMethod.slice(1).replace(/_/g, ' ');
    } else {
      return 'Razorpay';
    }
  };

  if (loading) {
    return <h2>Loading Bookings...</h2>;
  }

  return (
    <div className="bookings">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Bookings {filterDays > 0 ? `(Last ${filterDays} Days)` : '(All Time)'}</h2>
            <div className="filter-controls">
              <select 
                value={filterDays} 
                onChange={(e) => setFilterDays(Number(e.target.value))}
                className="status-filter"
              >
                <option value={5}>Last 5 Days</option>
                <option value={10}>Last 10 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={0}>All Time</option>
              </select>
            </div>
        </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {bookings.length === 0 && !loading ? (
        <p>No recent bookings found.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>User Name</th>
              <th>User Phone</th>
              <th>Event Name</th>
              <th>Booking Date</th>
              <th>Payment Method</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking, index) => {
              // Get user details from cache if available
              const user = booking.userId && userCache[booking.userId] ? userCache[booking.userId] : null;
              
              return (
                <tr key={booking.id}>
                  <td>{index + 1}</td>
                  <td>
                    {user ? (
                      user.displayName || 
                      user.name || 
                      user.email || 
                      'N/A'
                    ) : (
                      booking.userName || 
                      booking.name || 
                      booking.userEmail || 
                      booking.email || 
                      booking.displayName ||
                      booking.fullName ||
                      booking.firstName || 
                      booking.lastName ||
                      (booking.firstName && booking.lastName ? `${booking.firstName} ${booking.lastName}` : null) ||
                      'N/A'
                    )}
                  </td>
                  <td>
                    {user ? (
                      user.phone || 
                      'N/A'
                    ) : (
                      booking.phoneNumber || 
                      booking.phone || 
                      booking.mobile || 
                      booking.mobileNumber ||
                      'N/A'
                    )}
                  </td>
                  <td>{booking.displayEventName || booking.eventName || 'N/A'}</td>
                  <td>{booking.bookingDate ? formatDate(new Date(booking.bookingDate)) : 'N/A'}</td>
                  <td>{getPaymentMethodDisplayName(booking)}</td>
                  <td>
                    {booking.isFreeTrial ? (
                      <span>FREE</span>
                    ) : (
                      <span>{formatCurrency(booking.amount || 0)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Bookings;