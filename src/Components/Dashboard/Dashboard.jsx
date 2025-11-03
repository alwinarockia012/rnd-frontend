import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaRunning, FaUser, FaTicketAlt, FaTimes, FaDownload } from 'react-icons/fa';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import DashboardNav from '../DashboardNav/DashboardNav';
import TicketNotification from './TicketNotification';
import PlanExpirationNotification from './PlanExpirationNotification';
import { formatDate } from '../../utils/dateUtils';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState({
    totalRuns: 0,
    totalDistance: 0,
    currentStreak: 0
  });
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);

  // State for full-screen ticket view
  const [fullScreenTicket, setFullScreenTicket] = useState(null);

  // Add state for new booking notification
  const [showNewBookingNotification, setShowNewBookingNotification] = useState(false);
  const [latestBooking, setLatestBooking] = useState(null);

  // Check for new bookings when component mounts
  useEffect(() => {
    const latestBookingData = localStorage.getItem('latestBooking');
    if (latestBookingData) {
      try {
        const booking = JSON.parse(latestBookingData);
        setLatestBooking(booking);
        setShowNewBookingNotification(true);
        
        // Clear the flag after showing notification
        localStorage.removeItem('latestBooking');
      } catch (error) {
        console.error('Error parsing latest booking data:', error);
      }
    }
  }, []);

  // Debug useEffect to see when bookings change
  useEffect(() => {
    // Removed console logs to prevent warnings
  }, [bookings]);

  // Function to calculate user statistics based on bookings
  const calculateUserStats = useCallback(async (userId) => {
    try {
      // Always calculate from bookings as the primary source
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      // Count all bookings (not just confirmed ones)
      let totalRuns = querySnapshot.size;
      
      // Each run contributes exactly 2km to total distance as per user requirement
      let totalDistance = totalRuns * 2;
      
      return { totalRuns, totalDistance, currentStreak: 0 }; // Streak calculation would be more complex
    } catch (error) {
      console.error('Error calculating user stats:', error);
      // Fallback to default values
      return { totalRuns: 0, totalDistance: 0, currentStreak: 0 };
    }
  }, []);

  // Function to fetch user statistics based on bookings
  const fetchUserStats = useCallback(async (userId) => {
    try {
      const stats = await calculateUserStats(userId);
      console.log('Calculated user stats:', stats); // Debug log
      if (stats) {
        setUserStats({
          totalRuns: stats.totalRuns || 0,
          totalDistance: stats.totalDistance || 0,
          currentStreak: stats.currentStreak || 0
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Set default values on error
      setUserStats({
        totalRuns: 0,
        totalDistance: 0,
        currentStreak: 0
      });
    }
  }, [calculateUserStats]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Fetch user data from Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let userData = {};
          if (userDoc.exists()) {
            userData = userDoc.data();
          } else {
            // If user document doesn't exist, create initial data
            userData = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || 'User',
              createdAt: new Date(),
            };
          }
          
          const userObject = {
            uid: currentUser.uid,
            name: currentUser.displayName || userData.displayName || 'User',
            email: currentUser.email || userData.email || 'No email provided',
            phone: currentUser.phoneNumber || userData.phoneNumber || 'No phone provided',
            photoURL: currentUser.photoURL || null,
            memberSince: currentUser.metadata.creationTime ? formatDate(new Date(currentUser.metadata.creationTime)) : 'Unknown',
          };
          
          setUser(userObject);
          
          // Fetch user bookings
          await fetchUserBookings(currentUser.uid);
          
          setLoading(false);
        } catch (error) {
          // Fallback to basic user data
          const userObject = {
            uid: currentUser.uid,
            name: currentUser.displayName || 'User',
            email: currentUser.email || 'No email provided',
            phone: currentUser.phoneNumber || 'No phone provided',
            photoURL: currentUser.photoURL || null,
            memberSince: currentUser.metadata.creationTime ? formatDate(new Date(currentUser.metadata.creationTime)) : 'Unknown',
          };
          
          setUser(userObject);
          setLoading(false);
        }
      } else {
        navigate('/signin');
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  // Separate useEffect for user stats updates
  useEffect(() => {
    console.log('Stats useEffect running, user:', user, 'bookings:', bookings); // Debug log
    if (user && user.uid) {
      fetchUserStats(user.uid);
    }
  }, [user, fetchUserStats, bookings]); // Add bookings as dependency to recalculate stats when bookings change

  // Debug useEffect to see when user changes
  useEffect(() => {
    // Removed console log to prevent warnings
  }, [user]);

  // Fetch user bookings when component mounts or user changes
  useEffect(() => {
    console.log('Bookings useEffect running, user:', user); // Debug log
    if (user && user.uid) {
      fetchUserBookings(user.uid);
    }
  }, [user]);

  // Add a refresh effect to ensure bookings are updated
  useEffect(() => {
    if (user && user.uid) {
      console.log('Setting up interval for user:', user.uid); // Debug log
      const interval = setInterval(() => {
        console.log('Interval running, fetching bookings for user:', user.uid); // Debug log
        fetchUserBookings(user.uid);
      }, 30000); // Refresh every 30 seconds
      
      return () => {
        console.log('Clearing interval for user:', user.uid); // Debug log
        clearInterval(interval);
      };
    }
  }, [user]);

  // handleJoinEvent function removed as it's no longer used

  // fetchUpcomingEvents function removed as it's no longer used

  const fetchUserBookings = async (userId) => {
    try {
      console.log(`Fetching bookings for user ${userId}`); // Debug log
      
      // Then fetch from Firestore for accurate data
      const bookingsRef = collection(db, 'bookings');
      // Remove the orderBy clause that might be causing issues with missing or invalid dates
      const q = query(bookingsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      console.log(`Found ${querySnapshot.size} bookings`); // Debug log
      
      // Removed console logs to prevent warnings
      
      const userBookings = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Removed console log to prevent warnings
        
        // Handle date conversion properly
        let eventDate = new Date();
        if (data.eventDate) {
          if (data.eventDate.toDate && typeof data.eventDate.toDate === 'function') {
            eventDate = data.eventDate.toDate();
          } else if (typeof data.eventDate === 'string') {
            eventDate = new Date(data.eventDate);
          } else if (data.eventDate instanceof Date) {
            eventDate = data.eventDate;
          } else if (data.eventDate.seconds && data.eventDate.nanoseconds) {
            // Firebase timestamp format
            eventDate = new Date(data.eventDate.seconds * 1000 + data.eventDate.nanoseconds / 1000000);
          } else {
            // Fallback to current date if we can't parse
            eventDate = new Date(data.eventDate);
          }
        }
  
        // Also handle bookingDate conversion
        let bookingDate = new Date();
        if (data.bookingDate) {
          if (data.bookingDate.toDate && typeof data.bookingDate.toDate === 'function') {
            bookingDate = data.bookingDate.toDate();
          } else if (typeof data.bookingDate === 'string') {
            bookingDate = new Date(data.bookingDate);
          } else if (data.bookingDate instanceof Date) {
            bookingDate = data.bookingDate;
          } else if (data.bookingDate.seconds && data.bookingDate.nanoseconds) {
            // Firebase timestamp format
            bookingDate = new Date(data.bookingDate.seconds * 1000 + data.bookingDate.nanoseconds / 1000000);
          } else {
            bookingDate = new Date(data.bookingDate);
          }
        }
  
        const booking = {
          id: doc.id,
          ...data,
          eventDate: eventDate,
          bookingDate: bookingDate
        };
  
        // Removed console log to prevent warnings
        return booking;
      });
  
      // Removed console logs to prevent warnings
      setBookings(userBookings);
  
      // Update localStorage with fresh data
      localStorage.setItem('eventBookings', JSON.stringify(userBookings));
  
      // Removed console log to prevent warnings
  
    } catch (error) {
      // Removed console error to prevent warnings
    }
  };

  // Function to generate QR code data in the correct format for scanning
  const generateQRData = (booking) => {
    if (!booking || !user) {
      return null;
    }

    try {
      // Format dates as ISO strings for proper JSON serialization
      const eventDateString = booking.eventDate ? 
        (booking.eventDate instanceof Date ? booking.eventDate.toISOString() : 
         (booking.eventDate.toDate && typeof booking.eventDate.toDate === 'function') ? booking.eventDate.toDate().toISOString() : 
         new Date(booking.eventDate).toISOString()) : 
        new Date().toISOString();
      
      const bookingDateString = booking.bookingDate ? 
        (booking.bookingDate instanceof Date ? booking.bookingDate.toISOString() : 
         (booking.bookingDate.toDate && typeof booking.bookingDate.toDate === 'function') ? booking.bookingDate.toDate().toISOString() : 
         new Date(booking.bookingDate).toISOString()) : 
        new Date().toISOString();

      const qrData = {
        id: booking.id || 'N/A',
        event: booking.eventName || 'Event Name',
        date: eventDateString,
        time: booking.eventTime || 'Time not available',
        location: booking.eventLocation || 'Location not available',
        user: user.name || 'User',
        userId: user.uid || 'N/A',
        userEmail: user.email || booking.userEmail || 'Email not available',
        phoneNumber: user.phone || user.phoneNumber || booking.phoneNumber || 'Phone not available',
        eventId: booking.eventId || 'Event ID not available',
        bookingDate: bookingDateString,
        isFreeTrial: booking.isFreeTrial || false,
        status: booking.status || 'confirmed',
        // Add additional verification data
        ticketType: booking.isFreeTrial ? 'FREE_TRIAL' : 'PAID',
        generatedAt: new Date().toISOString(),
        version: '1.0'
      };

      return qrData;
    } catch (error) {
      // Removed console error to prevent warnings
      return null;
    }
  };

  // Function to open full-screen ticket view
  const openFullScreenTicket = (booking) => {
    setFullScreenTicket(booking);
  };

  // Function to close full-screen ticket view
  const closeFullScreenTicket = () => {
    setFullScreenTicket(null);
  };

  // Function to download ticket as PDF (simplified version)
  const downloadTicketAsPDF = (booking) => {
    // Add safety checks
    if (!booking) {
      return;
    }
    
    if (!user) {
      return;
    }
    
    try {
      // Create a simple text version for download
      const ticketInfo = `
R&D Event Ticket

Event: ${booking.eventName || 'Event Name'}
Date: ${booking.eventDate ? formatDate(new Date(booking.eventDate)) : 'Date not available'}
Time: ${booking.eventTime || 'Time not available'}
Location: ${booking.eventLocation || 'Location not available'}

Booking ID: ${booking.id || 'N/A'}
Name: ${user.name || 'N/A'}
Email: ${user.email || 'N/A'}
Phone: ${user.phone || user.phoneNumber || booking.phoneNumber || 'Phone not available'}

${booking.isFreeTrial ? 'FREE TRIAL' : 'PAID TICKET'}

Booking Date: ${booking.bookingDate ? formatDate(new Date(booking.bookingDate)) : 'Date not available'}

Thank you for booking with R&D - Run and Develop!
      `;
      
      // Create and download file
      const blob = new Blob([ticketInfo], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${(booking.eventName || 'event').replace(/\s+/g, '_')}-${booking.id || 'unknown'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating ticket PDF:', error);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <DashboardNav />
        <div className="dashboard-main"><div className="dashboard-content"><div className="loading-state"><p>Loading dashboard...</p></div></div></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard">
        <DashboardNav />
        <div className="dashboard-main"><div className="dashboard-content"><div className="error-state"><p>Please log in to view your dashboard.</p><button onClick={() => navigate('/SignIn')}>Go to SignIn</button></div></div></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <DashboardNav />
      <TicketNotification bookings={bookings} onDismiss={() => {}} />
      {showNewBookingNotification && latestBooking && (
        <div className="new-booking-notification">
          <div className="notification-content">
            <FaTicketAlt className="notification-icon" />
            <div className="notification-text">
              <h4>Booking Confirmed!</h4>
              <p>You have successfully booked {latestBooking.eventName || 'an event'}</p>
              <p className="ticket-id">Ticket ID: {latestBooking.id}</p>
            </div>
            <div className="notification-actions">
              <button 
                className="view-ticket-btn"
                onClick={() => {
                  openFullScreenTicket(latestBooking);
                  setShowNewBookingNotification(false);
                }}
              >
                View Ticket
              </button>
              <button 
                className="close-btn"
                onClick={() => setShowNewBookingNotification(false)}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      <PlanExpirationNotification bookings={bookings} onDismiss={() => {}} />
      <div className="dashboard-main">
        <div className="dashboard-content">
          <div className="dashboard-grid">
            {/* User Profile Card (Modified to include stats) */}
            <motion.div className="profile-card card-glow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="profile-header">
                <div className="profile-avatar">{user.photoURL ? <img src={user.photoURL} alt="Profile" /> : <FaUser />}</div>
                <div className="profile-info">
                  <h2>{user.name}</h2>
                  <p className="member-since">Member since {user.memberSince && typeof user.memberSince === 'string' ? user.memberSince : 'Unknown'}</p>
                </div>
              </div>
              
              {/* User Statistics */}
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-number">{userStats.totalRuns}</span>
                  <span className="stat-label">Total Runs</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{userStats.totalDistance} km</span>
                  <span className="stat-label">Distance</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{userStats.currentStreak}</span>
                  <span className="stat-label">Current Streak</span>
                </div>
              </div>
              
              {/* Refresh Stats Button */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginTop: '0.75rem' 
              }}>
                <button 
                  onClick={() => {
                    if (user && user.uid) {
                      fetchUserStats(user.uid);
                    }
                  }}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: 'rgba(241, 90, 36, 0.2)',
                    color: 'white',
                    border: '1px solid var(--orange)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Refresh Stats
                </button>
              </div>
            </motion.div>

            {/* Fitness Tracker Card with My Tickets */}
            <motion.div className="events-card card-glow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <div className="card-header">
                <h3>Fitness & Nutrition</h3>
              </div>
              <div className="events-list" style={{ minHeight: 'auto' }}>
                <div className="event-item">
                  <div className="event-info">
                    <h4>Track Your Progress</h4>
                    <p className="event-details">
                      Monitor your meals, workouts, and nutrition goals
                    </p>
                  </div>
                  <button className="join-event-btn" onClick={() => navigate('/fitness')}>
                    Open Tracker
                  </button>
                </div>
              </div>
              
              {/* My Tickets Section */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '1rem', paddingTop: '1rem' }}>
                <div className="card-header" style={{ padding: '0.5rem 0' }}>
                  <FaTicketAlt className="card-icon" />
                  <h3>My Tickets</h3>
                </div>
                <div className="events-list" style={{ maxHeight: 'none', minHeight: 'auto' }}>
                  {bookings && bookings.length > 0 ? (
                    (() => {
                      // Sort bookings by event date (descending - newest first)
                      const sortedBookings = [...bookings].sort((a, b) => {
                        // Sort by event date (descending - newest first)
                        // Handle different date formats for sorting
                        let dateA, dateB;
                        
                        if (a.eventDate instanceof Date) {
                          dateA = a.eventDate;
                        } else if (a.eventDate.toDate && typeof a.eventDate.toDate === 'function') {
                          dateA = a.eventDate.toDate();
                        } else if (typeof a.eventDate === 'string') {
                          dateA = new Date(a.eventDate);
                        } else if (a.eventDate) {
                          dateA = new Date(a.eventDate);
                        } else {
                          dateA = new Date(); // Default to now if no date
                        }
                        
                        if (b.eventDate instanceof Date) {
                          dateB = b.eventDate;
                        } else if (b.eventDate.toDate && typeof b.eventDate.toDate === 'function') {
                          dateB = b.eventDate.toDate();
                        } else if (typeof b.eventDate === 'string') {
                          dateB = new Date(b.eventDate);
                        } else if (b.eventDate) {
                          dateB = new Date(b.eventDate);
                        } else {
                          dateB = new Date(); // Default to now if no date
                        }
                        
                        return dateB - dateA; // Descending order
                      });
                      
                      // Get only the most recent booking
                      const recentBooking = sortedBookings[0];
                      
                      // Handle date display for the recent booking
                      let displayDate;
                      if (recentBooking.eventDate instanceof Date) {
                        displayDate = recentBooking.eventDate;
                      } else if (recentBooking.eventDate.toDate && typeof recentBooking.eventDate.toDate === 'function') {
                        displayDate = recentBooking.eventDate.toDate();
                      } else if (typeof recentBooking.eventDate === 'string') {
                        displayDate = new Date(recentBooking.eventDate);
                      } else if (recentBooking.eventDate) {
                        displayDate = new Date(recentBooking.eventDate);
                      } else {
                        displayDate = new Date(); // Default to now if no date
                      }
                      
                      return (
                        <div key={recentBooking.id} className="ticket-item-container" 
                             style={{ 
                               padding: '0.75rem', 
                               marginBottom: '0.5rem',
                               minHeight: 'auto'
                             }}>
                          {/* Compact Ticket Info */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ 
                                margin: '0 0 0.25rem 0', 
                                fontSize: '0.95rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {recentBooking.eventName || 'Event Name'}
                              </h4>
                              <p className="event-details" style={{ 
                                margin: 0, 
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {displayDate ? formatDate(displayDate) : 'Date not available'}
                                • {recentBooking.eventTime || 'Time not available'}
                              </p>
                              <p className="booking-id-preview" style={{ 
                                margin: '0.1rem 0 0 0', 
                                fontSize: '0.7rem' 
                              }}>
                                ID: {recentBooking.id ? recentBooking.id.substring(0, 8) : 'N/A'}
                              </p>
                              <p className="event-status" style={{ 
                                margin: '0.1rem 0 0 0', 
                                fontSize: '0.7rem' 
                              }}>
                                Status: <span className={recentBooking.status || 'confirmed'}>
                                  {recentBooking.status ? recentBooking.status.charAt(0).toUpperCase() + recentBooking.status.slice(1) : 'Confirmed'}
                                </span>
                              </p>
                            </div>
                            
                            {/* View Ticket Button */}
                            <button 
                              onClick={() => {
                                openFullScreenTicket(recentBooking);
                              }}
                              className="view-ticket-btn"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="no-tickets-container">
                      <p className="no-tickets-message">No tickets found. Book your slots to get started!</p>
                      <button 
                        className="book-event-btn"
                        onClick={() => navigate('/plans')}
                      >
                        Book Your Slots
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Upcoming Events Card (Modified to show user's booked events) */}
            <motion.div className="events-card card-glow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <div className="card-header">
                <h3>{bookings && bookings.length > 0 ? 'Upcoming Events' : 'No Upcoming Events'}</h3>
              </div>
              <div className="events-list" style={{ maxHeight: 'none', minHeight: 'auto' }}>
                {bookings && bookings.length > 0 ? (
                  (() => {
                    // Sort bookings by event date (most recent first)
                    const sortedBookings = [...bookings].sort((a, b) => {
                      // Handle different date formats for sorting
                      let dateA, dateB;
                      
                      try {
                        if (a.eventDate instanceof Date) {
                          dateA = a.eventDate;
                        } else if (a.eventDate.toDate && typeof a.eventDate.toDate === 'function') {
                          dateA = a.eventDate.toDate();
                        } else if (typeof a.eventDate === 'string') {
                          dateA = new Date(a.eventDate);
                        } else if (a.eventDate.seconds && a.eventDate.nanoseconds) {
                          // Firebase timestamp format
                          dateA = new Date(a.eventDate.seconds * 1000 + a.eventDate.nanoseconds / 1000000);
                        } else {
                          dateA = new Date(a.eventDate);
                        }
                        
                        if (b.eventDate instanceof Date) {
                          dateB = b.eventDate;
                        } else if (b.eventDate.toDate && typeof b.eventDate.toDate === 'function') {
                          dateB = b.eventDate.toDate();
                        } else if (typeof b.eventDate === 'string') {
                          dateB = new Date(b.eventDate);
                        } else if (b.eventDate.seconds && b.eventDate.nanoseconds) {
                          // Firebase timestamp format
                          dateB = new Date(b.eventDate.seconds * 1000 + b.eventDate.nanoseconds / 1000000);
                        } else {
                          dateB = new Date(b.eventDate);
                        }
                      } catch (error) {
                        // Removed console error to prevent warnings
                        return 0;
                      }
                      
                      return dateB - dateA; // Descending order (most recent first)
                    });
                    
                    // Get the most recent booking
                    const mostRecentBooking = sortedBookings[0];
                    // Removed console log to prevent warnings
                    
                    // Handle date display
                    let displayDate;
                    try {
                      if (mostRecentBooking.eventDate instanceof Date) {
                        displayDate = mostRecentBooking.eventDate;
                      } else if (mostRecentBooking.eventDate.toDate && typeof mostRecentBooking.eventDate.toDate === 'function') {
                        displayDate = mostRecentBooking.eventDate.toDate();
                      } else if (typeof mostRecentBooking.eventDate === 'string') {
                        displayDate = new Date(mostRecentBooking.eventDate);
                      } else if (mostRecentBooking.eventDate.seconds && mostRecentBooking.eventDate.nanoseconds) {
                        // Firebase timestamp format
                        displayDate = new Date(mostRecentBooking.eventDate.seconds * 1000 + mostRecentBooking.eventDate.nanoseconds / 1000000);
                      } else {
                        displayDate = new Date(mostRecentBooking.eventDate);
                      }
                    } catch (error) {
                      // Removed console error to prevent warnings
                      displayDate = new Date();
                    }
                    
                    return (
                      <div key={mostRecentBooking.id} className="event-item">
                        <div className="event-info">
                          <h4>{mostRecentBooking.eventName || 'Event Name'}</h4>
                          <p className="event-details">
                            {displayDate ? formatDate(displayDate) : 'Date not available'} 
                            • {mostRecentBooking.eventTime || 'Time not available'} • {mostRecentBooking.eventLocation || 'Location not available'}
                          </p>
                          <p className="event-status">
                            Status: <span className={mostRecentBooking.status || 'confirmed'}>
                              {mostRecentBooking.status ? mostRecentBooking.status.charAt(0).toUpperCase() + mostRecentBooking.status.slice(1) : 'Confirmed'}
                            </span>
                          </p>
                        </div>
                        <button className="join-event-btn" onClick={() => openFullScreenTicket(mostRecentBooking)}>View Details</button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="no-events-container">
                    <p className="no-events-message">No events found.</p>
                    <button 
                      className="book-event-btn"
                      onClick={() => navigate('/plans')}
                    >
                      Book Your Slots
                    </button>
                  </div>
                )}
                <div className="plan-section" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '1rem', paddingTop: '1rem' }}>
                  <div className="card-header" style={{ padding: '0.5rem 0' }}>
                    <FaRunning className="card-icon" />
                    <h3>My Plan</h3>
                  </div>
                  {/* Check if user has any paid bookings first, then check for free trial */}
                  {bookings && bookings.some(booking => !booking.isFreeTrial) ? (
                    // Show the most recent paid plan
                    (() => {
                      const paidBookings = bookings.filter(booking => !booking.isFreeTrial);
                      if (paidBookings.length > 0) {
                        // Sort by booking date to get the most recent
                        const sortedPaidBookings = paidBookings.sort((a, b) => {
                          let dateA, dateB;
                          
                          if (a.bookingDate instanceof Date) {
                            dateA = a.bookingDate;
                          } else if (a.bookingDate.toDate && typeof a.bookingDate.toDate === 'function') {
                            dateA = a.bookingDate.toDate();
                          } else if (typeof a.bookingDate === 'string') {
                            dateA = new Date(a.bookingDate);
                          } else if (a.bookingDate) {
                            dateA = new Date(a.bookingDate);
                          } else {
                            dateA = new Date();
                          }
                          
                          if (b.bookingDate instanceof Date) {
                            dateB = b.bookingDate;
                          } else if (b.bookingDate.toDate && typeof b.bookingDate.toDate === 'function') {
                            dateB = b.bookingDate.toDate();
                          } else if (typeof b.bookingDate === 'string') {
                            dateB = new Date(b.bookingDate);
                          } else if (b.bookingDate) {
                            dateB = new Date(b.bookingDate);
                          } else {
                            dateB = new Date();
                          }
                          
                          return dateB - dateA; // Descending order
                        });
                        
                        const mostRecentPaidBooking = sortedPaidBookings[0];
                        
                        return (
                          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <h4>{mostRecentPaidBooking.eventName || 'Paid Plan'}</h4>
                            <button 
                              className="upgrade-btn" 
                              onClick={() => navigate('/plans')}
                            >
                              Manage Plan
                            </button>
                          </div>
                        );
                      } else {
                        // No paid bookings found
                        return (
                          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <h4>No Active Plan</h4>
                            <p>You don't have an active plan</p>
                            <button 
                              className="upgrade-btn" 
                              onClick={() => navigate('/plans')}
                            >
                              Choose Plan
                            </button>
                          </div>
                        );
                      }
                    })()
                  ) : bookings && bookings.some(booking => booking.isFreeTrial) ? (
                    // Show free trial only if no paid bookings exist
                    (() => {
                      // Find the free trial booking to get plan name
                      const freeTrialBooking = bookings.find(booking => booking.isFreeTrial);
                        
                      return (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                          <h4>Free Trial</h4>
                          <button 
                            className="upgrade-btn" 
                            onClick={() => navigate('/plans')}
                          >
                            Upgrade
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    // No bookings at all
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <h4>No Active Plan</h4>
                      <p>You don't have an active plan</p>
                      <button 
                        className="upgrade-btn" 
                        onClick={() => navigate('/plans')}
                      >
                        Choose Plan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>




          </div>
        </div>
      </div>

      {/* Ticket Modal Overlay */}
      <div 
        className="full-screen-ticket-modal"
        onClick={closeFullScreenTicket}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: fullScreenTicket ? 'flex' : 'none',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}
      >
        <div 
          className="full-screen-ticket-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(135deg, var(--appColor) 0%, var(--darkGrey) 100%)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '90%',
            width: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            margin: '1rem'
          }}
        >
          {/* Close Button */}
          <button 
            className="close-ticket-btn"
            onClick={closeFullScreenTicket}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              transition: 'all 0.3s ease',
              zIndex: 1001
            }}
          >
            <FaTimes />
          </button>
          
          {fullScreenTicket && (
            <>
              <div className="full-screen-ticket-header" style={{
                textAlign: 'center',
                marginBottom: '2rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h2 style={{ 
                  color: 'var(--orange)', 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '1.8rem' 
                }}>
                  {fullScreenTicket?.eventName || 'Event Name'}
                </h2>
                <p className="ticket-id" style={{
                  color: '#aaa',
                  fontSize: '0.9rem',
                  margin: '0'
                }}>
                  Booking ID: {fullScreenTicket?.id || 'N/A'}
                </p>
              </div>
              
              <div className="full-screen-ticket-body" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                marginBottom: '2rem'
              }}>
                <div className="ticket-info-section">
                  <div className="ticket-info-group" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ 
                      color: 'var(--orange)', 
                      margin: '0 0 1rem 0', 
                      fontSize: '1.2rem' 
                    }}>
                      Event Details
                    </h3>
                    <p style={{ margin: '0.5rem 0', color: '#ccc', fontSize: '1rem' }}>
                      <strong>Date:</strong> 
                      {fullScreenTicket?.eventDate ? formatDate(new Date(fullScreenTicket.eventDate)) : 'Date not available'}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#ccc', fontSize: '1rem' }}>
                      <strong>Time:</strong> {fullScreenTicket?.eventTime || 'Time not available'}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#ccc', fontSize: '1rem' }}>
                      <strong>Location:</strong> {fullScreenTicket?.eventLocation || 'Location not available'}
                    </p>
                  </div>
                  
                  <div className="ticket-info-group" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ 
                      color: 'var(--orange)', 
                      margin: '0 0 1rem 0', 
                      fontSize: '1.2rem' 
                    }}>
                      Booking Information
                    </h3>
                    <p style={{ margin: '0.5rem 0', color: '#ccc', fontSize: '1rem' }}>
                      <strong>Name:</strong> {user?.name || 'N/A'}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#ccc', fontSize: '1rem' }}>
                      <strong>Email:</strong> {user?.email || 'N/A'}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#ccc', fontSize: '1rem' }}>
                      <strong>Phone:</strong> {user?.phone || user?.phoneNumber || fullScreenTicket?.phoneNumber || 'Phone not available'}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#ccc', fontSize: '1rem' }}>
                      <strong>Booking Date:</strong> 
                      {fullScreenTicket?.bookingDate ? formatDate(new Date(fullScreenTicket.bookingDate)) : 'Date not available'}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#ccc', fontSize: '1rem' }}>
                      <strong>User ID:</strong> {fullScreenTicket?.userId || 'Not available'}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#ccc', fontSize: '1rem' }}>
                      <strong>Event ID:</strong> {fullScreenTicket?.eventId || 'Not available'}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#ccc', fontSize: '1rem' }}>
                      <strong>Status:</strong> 
                      <span className={fullScreenTicket?.status || 'confirmed'}>
                        {fullScreenTicket?.status ? fullScreenTicket.status.charAt(0).toUpperCase() + fullScreenTicket.status.slice(1) : 'Confirmed'}
                      </span>
                    </p>
                  </div>
                  
                  {fullScreenTicket?.isFreeTrial && (
                    <div className="free-trial-badge-fullscreen" style={{
                      background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      textAlign: 'center',
                      display: 'inline-block',
                      animation: 'pulse 2s infinite',
                      marginBottom: '1rem'
                    }}>
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        color: 'white'
                      }}>
                        FREE TRIAL
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="ticket-qr-section" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem'
                }}>
                  <h3 style={{ 
                    color: 'var(--orange)', 
                    margin: '0 0 1rem 0', 
                    fontSize: '1.2rem' 
                  }}>
                    🎫 Your Ticket QR Code
                  </h3>
                  
                  <div style={{ 
                    padding: '1rem', 
                    background: 'white', 
                    borderRadius: '10px' 
                  }}>
                    {(() => {
                      const qrData = generateQRData(fullScreenTicket);
                      if (qrData) {
                        try {
                          return (
                            <>
                              <QRCodeCanvas
                                value={JSON.stringify(qrData)}
                                size={200}
                                level="M"
                                includeMargin={true}
                              />
                              <p className="qr-instructions" style={{
                                color: '#aaa',
                                fontSize: '0.9rem',
                                textAlign: 'center',
                                margin: '0.5rem 0 0 0'
                              }}>
                                Scan this QR code at the event entrance
                              </p>
                            </>
                          );
                        } catch (qrError) {
                          console.error('Error rendering QR code:', qrError);
                          return (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '200px',
                              height: '200px',
                              background: '#f0f0f0',
                              border: '1px dashed #ccc',
                              borderRadius: '5px',
                              textAlign: 'center'
                            }}>
                              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                                Error generating QR code
                              </p>
                            </div>
                          );
                        }
                      } else {
                        return (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '200px',
                            height: '200px',
                            background: '#f0f0f0',
                            border: '1px dashed #ccc',
                            borderRadius: '5px',
                            textAlign: 'center'
                          }}>
                            <p style={{ color: '#666', fontSize: '0.9rem' }}>
                              QR Code unavailable
                            </p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="full-screen-ticket-footer" style={{
                textAlign: 'center',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <button 
                  onClick={() => {
                    if (fullScreenTicket && user) {
                      downloadTicketAsPDF(fullScreenTicket);
                    } else {
                      console.error('Cannot download ticket: missing data');
                    }
                  }} 
                  className="download-ticket-fullscreen-btn"
                  style={{
                    padding: '0.8rem 1.5rem',
                    background: 'var(--orange)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '30px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FaDownload /> Download Ticket
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;