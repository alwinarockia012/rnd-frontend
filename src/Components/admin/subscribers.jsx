import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, orderBy, where, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatDate } from '../../utils/dateUtils';
import './subscribers.css'; // Import the new stylesheet

const Subscribers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null); // State for selected user details
  const [userDetails, setUserDetails] = useState(null); // State for detailed user info
  const [userBookings, setUserBookings] = useState([]); // State for user bookings
  const [userStats, setUserStats] = useState(null); // State for user statistics
  const [loadingUserDetails, setLoadingUserDetails] = useState(false); // State for loading user details
  const [editingUser, setEditingUser] = useState(null); // State for user being edited
  const [editFormData, setEditFormData] = useState({}); // State for edit form data

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      setError(null);

      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      // Create an array of promises to fetch session count for each user
      const userPromises = querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Calculate actual session count from bookings
        let totalSessions = 0;
        try {
          const bookingsRef = collection(db, 'bookings');
          const bookingsQuery = query(bookingsRef, where('userId', '==', doc.id));
          const bookingsSnapshot = await getDocs(bookingsQuery);
          totalSessions = bookingsSnapshot.size;
        } catch (bookingsError) {
          console.error('Error fetching bookings for user:', doc.id, bookingsError);
          totalSessions = data.totalSessions || 0; // Fallback to stored value
        }

        return {
          id: doc.id,
          name: data.fullName || data.displayName || 'Unknown User',
          email: data.email || 'N/A',
          phone: data.phoneNumber || data.phone || 'N/A',
          joinDate: data.createdAt?.toDate?.() || new Date(),
          plan: data.planType || 'Basic',
          status: data.status || 'pending',
          totalSessions: totalSessions, // Use calculated session count
          lastActive: data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
          registrationType: data.registrationType || 'unknown',
          profession: data.profession || 'N/A',
          age: data.age || 'N/A'
        };
      });

      // Wait for all user data to be fetched
      const fetchedSubscribers = await Promise.all(userPromises);

      setSubscribers(fetchedSubscribers);
    } catch (err) {
      console.error('Error fetching subscribers:', err);
      setError('Failed to load subscribers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to calculate user statistics based on bookings (similar to Dashboard)
  const calculateUserStats = async (userId) => {
    try {
      // Always calculate from bookings as the primary source
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      // Count all bookings (not just confirmed ones)
      let totalRuns = querySnapshot.size;
      
      // Each run contributes exactly 2km to total distance as per user requirement
      let totalDistance = totalRuns * 2;
      
      // Calculate streak based on event dates (similar to eventStatsUpdater)
      let currentStreak = 0;
      let longestStreak = 0;
      
      if (totalRuns > 0) {
        // Get all booking dates
        const bookingDates = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.eventDate) {
            let eventDate = data.eventDate;
            if (data.eventDate && typeof data.eventDate.toDate === 'function') {
              eventDate = data.eventDate.toDate();
            } else if (data.eventDate && data.eventDate.seconds) {
              eventDate = new Date(data.eventDate.seconds * 1000);
            }
            bookingDates.push(eventDate);
          }
        });
        
        // Sort dates in descending order (newest first)
        bookingDates.sort((a, b) => new Date(b) - new Date(a));
        
        // Calculate streak based on Sunday events
        if (bookingDates.length > 0) {
          // Get the most recent Sunday (events happen every Sunday)
          const getLastSunday = (date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day;
            return new Date(d.setDate(diff));
          };
          
          // Get this week's Sunday
          const thisSunday = getLastSunday(new Date());
          
          // Get last week's Sunday
          const lastWeekSunday = new Date(thisSunday);
          lastWeekSunday.setDate(lastWeekSunday.getDate() - 7);
          
          // Normalize all booking dates to their respective Sundays
          const bookingSundays = bookingDates.map(date => getLastSunday(date).getTime());
          
          // Remove duplicates
          const uniqueSundays = [...new Set(bookingSundays)];
          
          // Check if user attended this Sunday or last Sunday
          const attendedThisSunday = uniqueSundays.includes(thisSunday.getTime());
          const attendedLastWeek = uniqueSundays.includes(lastWeekSunday.getTime());
          
          // Calculate current streak
          if (attendedThisSunday) {
            // User attended this Sunday, check consecutive previous weeks
            currentStreak = 1;
            let checkSunday = new Date(lastWeekSunday);
            
            // Count consecutive weeks backward
            while (uniqueSundays.includes(checkSunday.getTime())) {
              currentStreak++;
              checkSunday.setDate(checkSunday.getDate() - 7);
            }
          } else if (attendedLastWeek) {
            // User attended last Sunday but not this Sunday
            currentStreak = 1;
            let checkSunday = new Date(lastWeekSunday);
            checkSunday.setDate(checkSunday.getDate() - 7);
            
            // Count consecutive weeks backward
            while (uniqueSundays.includes(checkSunday.getTime())) {
              currentStreak++;
              checkSunday.setDate(checkSunday.getDate() - 7);
            }
          }
          
          // Calculate longest streak
          if (uniqueSundays.length > 0) {
            let maxStreak = 1;
            let currentStreakCount = 1;
            
            // Sort Sundays in ascending order (oldest first)
            uniqueSundays.sort((a, b) => a - b);
            
            for (let i = 1; i < uniqueSundays.length; i++) {
              const currentSunday = new Date(uniqueSundays[i]);
              const previousSunday = new Date(uniqueSundays[i - 1]);
              previousSunday.setDate(previousSunday.getDate() + 7);
              
              // Check if consecutive weeks
              if (currentSunday.getTime() === previousSunday.getTime()) {
                currentStreakCount++;
              } else {
                maxStreak = Math.max(maxStreak, currentStreakCount);
                currentStreakCount = 1;
              }
            }
            
            longestStreak = Math.max(maxStreak, currentStreakCount);
          }
        }
      }
      
      return { totalRuns, totalDistance, currentStreak, longestStreak };
    } catch (error) {
      console.error('Error calculating user stats:', error);
      // Fallback to default values
      return { totalRuns: 0, totalDistance: 0, currentStreak: 0, longestStreak: 0 };
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
      
      // Calculate user statistics based on bookings (similar to Dashboard)
      const stats = await calculateUserStats(userId);
      const processedStatsData = {
        totalRuns: stats.totalRuns || 0,
        totalDistance: stats.totalDistance || 0,
        currentStreak: stats.currentStreak || 0,
        longestStreak: stats.longestStreak || 0
      };
      
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
      setUserStats(processedStatsData); // Use calculated stats data
    } catch (err) {
      console.error('Error fetching user details:', err);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Function to open user details modal
  const openUserDetails = async (subscriber) => {
    setSelectedUser(subscriber);
    await fetchUserDetails(subscriber.id);
  };

  // Function to close user details modal
  const closeUserDetails = () => {
    setSelectedUser(null);
    setUserDetails(null);
    setUserBookings([]);
    setUserStats(null);
  };

  // Function to open edit user modal
  const openEditUser = (subscriber) => {
    setEditingUser(subscriber);
    // Initialize form data with current user values
    setEditFormData({
      name: subscriber.name || '',
      email: subscriber.email || '',
      phone: subscriber.phone || '',
      profession: subscriber.profession || '',
      age: subscriber.age || '',
      plan: subscriber.plan || 'Basic',
      status: subscriber.status || 'pending'
    });
  };

  // Function to close edit user modal
  const closeEditUser = () => {
    setEditingUser(null);
    setEditFormData({});
  };

  // Function to handle form input changes
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to save edited user data
  const saveEditedUser = async () => {
    try {
      if (!editingUser) return;
      
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        fullName: editFormData.name,
        email: editFormData.email,
        phoneNumber: editFormData.phone,
        profession: editFormData.profession,
        age: editFormData.age,
        planType: editFormData.plan,
        status: editFormData.status,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setSubscribers(prev => 
        prev.map(sub => 
          sub.id === editingUser.id 
            ? { 
                ...sub, 
                name: editFormData.name,
                email: editFormData.email,
                phone: editFormData.phone,
                profession: editFormData.profession,
                age: editFormData.age,
                plan: editFormData.plan,
                status: editFormData.status
              }
            : sub
        )
      );

      alert('User updated successfully');
      closeEditUser();
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Failed to update user. Please try again.');
    }
  };

  // Function to handle status change
  const handleStatusChange = async (subscriberId, newStatus) => {
    try {
      const userRef = doc(db, 'users', subscriberId);
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setSubscribers(prev => 
        prev.map(sub => 
          sub.id === subscriberId 
            ? { ...sub, status: newStatus, lastActive: new Date() }
            : sub
        )
      );

      alert(`User status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  // Filter and sort subscribers based on search term and filters
  const filteredSubscribers = subscribers.filter(subscriber => {
    const matchesSearch = 
      subscriber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscriber.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || subscriber.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'sessions':
        return b.totalSessions - a.totalSessions;
      case 'date':
      default:
        return new Date(b.joinDate) - new Date(a.joinDate);
    }
  });

  // Function to get plan color
  const getPlanColor = (plan) => {
    switch (plan?.toLowerCase()) {
      case 'basic':
        return '#4CAF50'; // Green
      case 'standard':
        return '#2196F3'; // Blue
      case 'premium':
        return '#FF9800'; // Orange
      default:
        return '#9E9E9E'; // Grey
    }
  };

  // Function to get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return '#4CAF50'; // Green
      case 'pending':
        return '#FFC107'; // Yellow
      case 'suspended':
      case 'inactive':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };

  // Function to get status icon
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return '✅';
      case 'pending':
        return '⏳';
      case 'suspended':
      case 'inactive':
        return '❌';
      default:
        return '❓';
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
      <div className="subscribers">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading subscribers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="subscribers">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={fetchSubscribers} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="subscribers">
      <div className="subscribers-header">
        <div>
          <h2>Subscribers</h2>
          <p className="subscribers-count">{subscribers.length} total subscribers</p>
        </div>
        <div className="subscribers-stats">
          <div className="stat-item">
            <span className="stat-number">{subscribers.length}</span>
            <span className="stat-label">Total Subscribers</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{subscribers.filter(s => s.status === 'active').length}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{subscribers.filter(s => s.status === 'pending').length}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{subscribers.filter(s => s.status === 'suspended').length}</span>
            <span className="stat-label">Suspended</span>
          </div>
        </div>
      </div>

      <div className="subscribers-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search subscribers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input form-input"
          />
        </div>
        
        <div className="filter-controls">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter form-input"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-filter form-input"
          >
            <option value="date">Sort by Join Date</option>
            <option value="name">Sort by Name</option>
            <option value="sessions">Sort by Sessions</option>
          </select>
        </div>
      </div>

      <div className="subscribers-grid">
        {filteredSubscribers.map((subscriber) => (
          <div key={subscriber.id} className="subscriber-item">
            <div className="subscriber-header">
              <div className="subscriber-avatar">
                {subscriber.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="subscriber-basic-info">
                <h4 className="subscriber-name">{subscriber.name}</h4>
                <p className="subscriber-email">{subscriber.email}</p>
                <p className="subscriber-phone">{subscriber.phone}</p>
              </div>
            </div>
            
            <div className="subscriber-details">
              <div className="detail-row">
                <span className="detail-label">Profession:</span>
                <span className="detail-value">{subscriber.profession}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Age:</span>
                <span className="detail-value">{subscriber.age}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Joined:</span>
                <span className="detail-value">{formatDate(subscriber.joinDate)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last Active:</span>
                <span className="detail-value">{formatDate(subscriber.lastActive)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Registration:</span>
                <span className="detail-value">
                  {subscriber.registrationType === 'contact_form' ? '📝 Form' : '📱 Mobile'}
                </span>
              </div>
            </div>
            
            <div className="subscriber-tags">
              <div className="subscriber-plan">
                <span 
                  className="plan-badge" 
                  style={{ backgroundColor: getPlanColor(subscriber.plan) + '20', color: getPlanColor(subscriber.plan) }}
                >
                  {subscriber.plan}
                </span>
              </div>
              
              <div className="subscriber-sessions">
                <span className="sessions-count">{subscriber.totalSessions}</span>
                <span className="sessions-label">Sessions</span>
              </div>
              
              <div className="subscriber-status">
                <span 
                  className="status-badge" 
                  style={{ backgroundColor: getStatusColor(subscriber.status) + '20', color: getStatusColor(subscriber.status) }}
                >
                  {getStatusIcon(subscriber.status)} {subscriber.status.charAt(0).toUpperCase() + subscriber.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="subscriber-actions">
              <button className="action-btn contact secondary">
                <span className="btn-icon">📞</span>
                Contact
              </button>
              <button 
                className="action-btn view tertiary"
                onClick={() => openUserDetails(subscriber)}
              >
                <span className="btn-icon">👁️</span>
                View Details
              </button>
              <button 
                className="action-btn edit tertiary"
                onClick={() => openEditUser(subscriber)}
              >
                <span className="btn-icon">✏️</span>
                Edit
              </button>
              {subscriber.status === 'active' && (
                <button 
                  className="action-btn suspend danger"
                  onClick={() => handleStatusChange(subscriber.id, 'suspended')}
                >
                  <span className="btn-icon">⏸️</span>
                  Suspend
                </button>
              )}
              {subscriber.status === 'suspended' && (
                <button 
                  className="action-btn activate primary"
                  onClick={() => handleStatusChange(subscriber.id, 'active')}
                >
                  <span className="btn-icon">✅</span>
                  Activate
                </button>
              )}
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
                      <span className="detail-label">Joined:</span>
                      <span className="detail-value">{selectedUser.joinDate.toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Last Active:</span>
                      <span className="detail-value">{selectedUser.lastActive.toLocaleString()}</span>
                    </div>
                    {userDetails && (
                      <>
                        <div className="detail-row">
                          <span className="detail-label">Profession:</span>
                          <span className="detail-value">{userDetails.profession || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Age:</span>
                          <span className="detail-value">{userDetails.age || 'N/A'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="user-stats-section">
                  <h3>Running Statistics</h3>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span className="stat-label">Total Runs</span>
                      <span className="stat-value">{userStats ? (userStats.totalRuns || 0) : 0}</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Total Distance (km)</span>
                      <span className="stat-value">{userStats ? (userStats.totalDistance || 0) : 0}</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Current Streak</span>
                      <span className="stat-value">{userStats ? (userStats.currentStreak || 0) : 0}</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Longest Streak</span>
                      <span className="stat-value">{userStats ? (userStats.longestStreak || 0) : 0}</span>
                    </div>
                  </div>
                </div>
                
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={closeEditUser}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User</h2>
              <button className="modal-close" onClick={closeEditUser}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="user-profile-section">
                <h3>User Information</h3>
                <div className="profile-details">
                  <div className="detail-row">
                    <span className="detail-label">Name:</span>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditFormChange}
                      className="form-input"
                    />
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditFormChange}
                      className="form-input"
                    />
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <input
                      type="text"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditFormChange}
                      className="form-input"
                    />
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Profession:</span>
                    <input
                      type="text"
                      name="profession"
                      value={editFormData.profession}
                      onChange={handleEditFormChange}
                      className="form-input"
                    />
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Age:</span>
                    <input
                      type="number"
                      name="age"
                      value={editFormData.age}
                      onChange={handleEditFormChange}
                      className="form-input"
                    />
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Plan:</span>
                    <select
                      name="plan"
                      value={editFormData.plan}
                      onChange={handleEditFormChange}
                      className="form-input"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditFormChange}
                      className="form-input"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="modal-action-btn secondary" onClick={closeEditUser}>
                Cancel
              </button>
              <button className="modal-action-btn primary" onClick={saveEditedUser}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredSubscribers.length === 0 && (
        <div className="no-results">
          <span className="no-results-icon">🔍</span>
          <h3>No subscribers found</h3>
          <p>Try adjusting your search criteria or filters</p>
        </div>
      )}
    </div>
  );
};

export default Subscribers;