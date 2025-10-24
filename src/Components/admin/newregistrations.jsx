import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, serverTimestamp, where, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatDate } from '../../utils/dateUtils';
import './newregistrations.css'; // Import the new stylesheet

const NewRegistrations = () => {
  const [filterPeriod, setFilterPeriod] = useState('week');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null); // State for selected user details
  const [userDetails, setUserDetails] = useState(null); // State for detailed user info
  const [userBookings, setUserBookings] = useState([]); // State for user bookings
  const [userStats, setUserStats] = useState(null); // State for user statistics
  const [loadingUserDetails, setLoadingUserDetails] = useState(false); // State for loading user details

  // Fetch registrations from Firestore
  useEffect(() => {
    fetchRegistrations();
  }, [filterPeriod]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query Firestore for all users, ordered by creation date
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        orderBy('createdAt', 'desc'),
        limit(100) // Increased limit to show more users
      );

      const querySnapshot = await getDocs(q);
      console.log('Fetched users from Firestore:', querySnapshot.size);

      const fetchedRegistrations = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('User document data:', doc.id, data);
        // Handle timestamp conversion properly
        let createdAtDate = new Date();
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            createdAtDate = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            createdAtDate = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            createdAtDate = new Date(data.createdAt);
          }
        }

        return {
          id: doc.id,
          name: data.displayName || data.fullName || 'Unknown User',
          email: data.email || 'N/A',
          phone: data.phoneNumber || data.phone || 'N/A',
          date: createdAtDate,
          plan: data.planType || 'Basic',
          status: data.status || 'pending',
          registrationType: data.registrationType || 'unknown',
          profession: data.profession || 'N/A',
          gender: data.gender || 'N/A',
          dateOfBirth: data.dateOfBirth || 'N/A',
          emergencyContact: data.emergencyContact || 'N/A',
          instagram: data.instagram || 'N/A',
          joinCrew: data.joinCrew ? 'Yes' : 'No',
          termsAccepted: data.termsAccepted ? 'Yes' : 'No'
        };
      });

      setRegistrations(fetchedRegistrations);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError('Failed to load registrations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch detailed user information
  const fetchUserDetails = async (userId) => {
    try {
      setLoadingUserDetails(true);
      
      // Fetch user profile data
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : null;
      
      // Fetch user statistics
      const statsDocRef = doc(db, 'userStatistics', userId);
      const statsDocSnap = await getDoc(statsDocRef);
      const statsData = statsDocSnap.exists() ? statsDocSnap.data() : null;
      
      // Fetch user bookings with proper error handling
      try {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('userId', '==', userId),
          orderBy('bookingDate', 'desc')
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map(doc => {
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
          
          return {
            id: doc.id,
            ...data,
            bookingDate: bookingDate,
            eventDate: eventDate,
            amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount
          };
        });
        setUserBookings(bookingsData);
      } catch (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        setUserBookings([]);
      }

      setUserDetails(userData);
      setUserStats(statsData);
    } catch (err) {
      console.error('Error fetching user details:', err);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Function to open user details modal
  const openUserDetails = async (registration) => {
    setSelectedUser(registration);
    await fetchUserDetails(registration.id);
  };

  // Function to close user details modal
  const closeUserDetails = () => {
    setSelectedUser(null);
    setUserDetails(null);
    setUserBookings([]);
    setUserStats(null);
  };

  // Update user status
  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setRegistrations(prev => 
        prev.map(reg => 
          reg.id === userId 
            ? { ...reg, status: newStatus }
            : reg
        )
      );

      alert(`User status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'active': return '#68d391';
      case 'pending': return '#ed8936';
      case 'rejected':
      case 'suspended': return '#fc8181';
      default: return '#a0aec0';
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'Premium': return '#F15A24';
      case 'Standard': return '#667eea';
      case 'Basic': return '#a0aec0';
      default: return '#a0aec0';
    }
  };

  const getRegistrationTypeIcon = (type) => {
    switch (type) {
      case 'contact_form': return '📝';
      case 'mobile_otp': return '📱';
      default: return '👤';
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format payment method for display
  const formatPaymentMethod = (method) => {
    if (!method) return 'Razorpay';
    
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
      'cod': 'Cash on Delivery',
      'free_trial': 'Free Trial',
      'razorpay': 'Razorpay'
    };
    
    // Return mapped name or capitalize the method name
    return methodMap[method.toLowerCase()] || 
           method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="new-registrations">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading registrations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="new-registrations">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={fetchRegistrations} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="new-registrations">
      <div className="registrations-header">
        <div>
          <h2>New Registrations</h2>
          <p className="registrations-count">{registrations.length} registrations found</p>
        </div>
        <div className="filter-controls">
          <select 
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="period-filter"
          >
            <option value="3days">Last 3 Days</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      <div className="registrations-grid">
        {registrations.map((registration) => (
          <div key={registration.id} className="registration-item">
            <div className="registration-header">
              <div className="user-avatar">
                {getRegistrationTypeIcon(registration.registrationType)}
                <span className="avatar-text">{registration.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div className="user-basic-info">
                <h4 className="user-name">{registration.name}</h4>
                <p className="user-email">{registration.email}</p>
                <p className="user-phone">{registration.phone}</p>
              </div>
            </div>
            
            <div className="user-details">
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Profession:</span>
                  <span className="detail-value">{registration.profession}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Gender:</span>
                  <span className="detail-value">{registration.gender}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">DOB:</span>
                  <span className="detail-value">{registration.dateOfBirth}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Emergency:</span>
                  <span className="detail-value">{registration.emergencyContact}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Instagram:</span>
                  <span className="detail-value">{registration.instagram}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Join Crew:</span>
                  <span className="detail-value">{registration.joinCrew}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Terms:</span>
                  <span className="detail-value">{registration.termsAccepted}</span>
                </div>
              </div>
              
              <div className="registration-date">
                Registered: {formatDate(registration.date)} at {registration.date.toLocaleTimeString()}
              </div>
            </div>
            
            <div className="user-tags">
              <div className="user-plan">
                <span 
                  className="plan-badge" 
                  style={{ backgroundColor: getPlanColor(registration.plan) + '20', color: getPlanColor(registration.plan) }}
                >
                  {registration.plan}
                </span>
              </div>
              
              <div className="user-status">
                <span 
                  className="status-badge" 
                  style={{ backgroundColor: getStatusColor(registration.status) + '20', color: getStatusColor(registration.status) }}
                >
                  {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="user-actions">
              {registration.status === 'pending' && (
                <>
                  <button 
                    className="action-btn approve primary"
                    onClick={() => handleStatusUpdate(registration.id, 'active')}
                  >
                    <span className="btn-icon">✓</span>
                    Approve
                  </button>
                  <button 
                    className="action-btn reject danger"
                    onClick={() => handleStatusUpdate(registration.id, 'suspended')}
                  >
                    <span className="btn-icon">✗</span>
                    Reject
                  </button>
                </>
              )}
              <button className="action-btn contact secondary">
                <span className="btn-icon">📞</span>
                Contact
              </button>
              <button 
                className="action-btn view tertiary"
                onClick={() => openUserDetails(registration)}
              >
                <span className="btn-icon">👁️</span>
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={closeUserDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button className="modal-close" onClick={closeUserDetails}>×</button>
            </div>
            
            {loadingUserDetails ? (
              <div className="modal-loading">
                <div className="loading-spinner"></div>
                <p>Loading user details...</p>
              </div>
            ) : (
              <div className="modal-body">
                <div className="user-profile-section">
                  <h3>Profile Information</h3>
                  <div className="profile-details">
                    <div className="detail-row">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{selectedUser.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedUser.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedUser.phone}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Plan:</span>
                      <span className="detail-value">{selectedUser.plan}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Status:</span>
                      <span className="detail-value">{selectedUser.status}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Registered:</span>
                      <span className="detail-value">{selectedUser.date.toLocaleString()}</span>
                    </div>
                    {userDetails && (
                      <>
                        <div className="detail-row">
                          <span className="detail-label">Profession:</span>
                          <span className="detail-value">{userDetails.profession || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Gender:</span>
                          <span className="detail-value">{userDetails.gender || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Date of Birth:</span>
                          <span className="detail-value">{userDetails.dateOfBirth || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Emergency Contact:</span>
                          <span className="detail-value">{userDetails.emergencyContact || 'N/A'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {userStats && (
                  <div className="user-stats-section">
                    <h3>Running Statistics</h3>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <span className="stat-label">Total Runs</span>
                        <span className="stat-value">{userStats.totalRuns || 0}</span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label">Total Distance (km)</span>
                        <span className="stat-value">{userStats.totalDistance || 0}</span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label">Current Streak</span>
                        <span className="stat-value">{userStats.currentStreak || 0}</span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label">Longest Streak</span>
                        <span className="stat-value">{userStats.longestStreak || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="user-bookings-section">
                  <h3>Payment History ({userBookings.length} bookings)</h3>
                  {userBookings.length > 0 ? (
                    <div className="bookings-list">
                      {userBookings.map((booking) => (
                        <div key={booking.id} className="booking-item">
                          <div className="booking-header">
                            <span className="booking-event">{booking.eventName || 'Event'}</span>
                            <span className={`booking-status ${booking.status || 'unknown'}`}>
                              {booking.status || 'Unknown'}
                              {booking.isFreeTrial && ' (Free Trial)'}
                            </span>
                          </div>
                          <div className="booking-details">
                            <div className="detail-row">
                              <span className="detail-label">Date:</span>
                              <span className="detail-value">
                                {booking.eventDate ? 
                                  (booking.eventDate instanceof Date ? 
                                    formatDate(booking.eventDate) : 
                                    formatDate(new Date(booking.eventDate))) : 
                                  'N/A'}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Amount:</span>
                              <span className="detail-value">
                                {formatCurrency(typeof booking.amount === 'number' ? booking.amount : (booking.amount || 0))}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Payment Method:</span>
                              <span className="detail-value">
                                {formatPaymentMethod(booking.paymentMethod) || (booking.isFreeTrial ? 'Free Trial' : 'N/A')}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Transaction ID:</span>
                              <span className="detail-value">
                                {booking.paymentId || booking.transactionId || booking.razorpay_payment_id || booking.id?.substring(0, 8) || 'N/A'}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Booking ID:</span>
                              <span className="detail-value">{booking.id}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-bookings">No payment history found.</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="modal-footer">
              <button className="modal-action-btn secondary" onClick={closeUserDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {registrations.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No New Registrations</h3>
          <p>No new user registrations found for the selected period.</p>
        </div>
      )}
    </div>
  );
};

export default NewRegistrations;