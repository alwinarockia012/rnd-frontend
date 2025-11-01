import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import firebaseService from '../../services/firebaseService';
import { formatDate } from '../../utils/dateUtils';
import DashboardNav from '../DashboardNav/DashboardNav';
import './UserEventsPage.css';

function UserEventsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now()); // Add refresh tracking
  const [mainEvent, setMainEvent] = useState(null); // Main event from Firebase

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
      
        const userObject = {
          uid: currentUser.uid,
          name: currentUser.displayName || userData.displayName || 'User',
          email: currentUser.email || userData.email,
          phoneNumber: currentUser.phoneNumber || userData.phoneNumber || '',
        };
        
        setUser(userObject);
        await fetchUserBookings(currentUser.uid);
      } else {
        setUser(null);
        setUserBookings([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && user.uid) {
      fetchUserBookings(user.uid);
    }
  }, [user, lastRefresh]);

  useEffect(() => {
    fetchEvents();
  }, [lastRefresh]); // Add lastRefresh as dependency

  // Fetch the main upcoming event
  const fetchMainEvent = async () => {
    // This function is now handled within fetchEvents
  };

  // Check for refresh flag
  useEffect(() => {
    const checkForRefresh = () => {
      let shouldTriggerRefresh = false;
      
      // Check for refresh flag
      const shouldRefresh = localStorage.getItem('refreshBookings');
      if (shouldRefresh === 'true') {
        // Clear the refresh flag
        localStorage.removeItem('refreshBookings');
        shouldTriggerRefresh = true;
      }
      
      // Check for new booking flag (set after successful payment)
      const newBooking = localStorage.getItem('newBooking');
      if (newBooking) {
        // Clear the new booking flag
        localStorage.removeItem('newBooking');
        shouldTriggerRefresh = true;
      }
      
      // Check for event updates flag (set when events are updated in admin)
      const eventsUpdated = localStorage.getItem('eventsUpdated');
      if (eventsUpdated === 'true') {
        // Clear the events updated flag
        localStorage.removeItem('eventsUpdated');
        shouldTriggerRefresh = true;
      }
      
      // Check for latest event booking (new approach)
      const latestEventBooking = localStorage.getItem('latestEventBooking');
      if (latestEventBooking) {
        // Clear the latest event booking flag
        localStorage.removeItem('latestEventBooking');
        shouldTriggerRefresh = true;
      }
      
      // Check if 24 hours have passed since last booking and trigger refresh if so
      const localBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
      if (localBookings.length > 0) {
        // Get current time
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
        
        // Check if all bookings are older than 24 hours
        const allBookingsOlder = localBookings.every(booking => {
          // Skip free trial bookings
          if (booking.mode === 'free_trial') {
            return true;
          }
          
          const bookingDate = booking.bookingDate || booking.createdAt;
          if (bookingDate) {
            let bookingTime;
            if (bookingDate.toDate && typeof bookingDate.toDate === 'function') {
              bookingTime = bookingDate.toDate();
            } else if (bookingDate instanceof Date) {
              bookingTime = bookingDate;
            } else {
              bookingTime = new Date(bookingDate);
            }
            
            return bookingTime < twentyFourHoursAgo;
          }
          
          return true;
        });
        
        // If all bookings are older than 24 hours, trigger refresh
        if (allBookingsOlder) {
          shouldTriggerRefresh = true;
        }
      }
      
      // Only trigger refresh if needed
      if (shouldTriggerRefresh) {
        setLastRefresh(Date.now());
      }
    };

    // Check immediately when component mounts
    checkForRefresh();

    // Check less frequently (every 5 seconds) to reduce performance impact
    const interval = setInterval(checkForRefresh, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Add auto-refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refresh bookings
        if (user && user.uid) {
          setLastRefresh(Date.now());
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Function to check if user is eligible for free trial
  const checkFreeTrialEligibility = async (userId, phoneNumber) => {
    try {
      // Check if user has ANY existing free trial bookings (not just within 24 hours)
      const bookingsRef = collection(db, 'bookings');
      const userQuery = query(bookingsRef, where('userId', '==', userId), where('mode', '==', 'free_trial'));
      
      // Create a promise with timeout for the user query
      const userQueryWithTimeout = new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout while checking user bookings'));
        }, 10000); // 10 second timeout
        
        try {
          const result = await getDocs(userQuery);
          clearTimeout(timeoutId);
          resolve(result);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });
      
      const userQuerySnapshot = await userQueryWithTimeout;
      
      // If user has any free trial bookings, they're not eligible
      if (!userQuerySnapshot.empty) {
        return false;
      }
      
      // Check if phone number has been used for ANY free trial (not just within 24 hours)
      if (phoneNumber) {
        // Normalize phone number to E.164 format before comparison
        // Firebase Auth stores phone numbers in E.164 format (+91XXXXXXXXXX)
        // But our Firestore user profile stores it in 10-digit format (XXXXXXXXXX)
        let normalizedPhone = phoneNumber;
        
        // If it's already in E.164 format, use it as is
        if (phoneNumber.startsWith('+91') && phoneNumber.length === 13) {
          normalizedPhone = phoneNumber;
        } 
        // If it's in 10-digit format, convert to E.164
        else if (phoneNumber.length === 10 && /^\d+$/.test(phoneNumber)) {
          normalizedPhone = '+91' + phoneNumber;
        }
        // If it's in any other format, try to extract digits and convert
        else {
          const digitsOnly = phoneNumber.replace(/\D/g, '');
          if (digitsOnly.length === 10) {
            normalizedPhone = '+91' + digitsOnly;
          } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
            normalizedPhone = '+' + digitsOnly;
          }
        }
        
        const phoneQuery = query(bookingsRef, where('phoneNumber', '==', normalizedPhone), where('mode', '==', 'free_trial'));
        
        // Create a promise with timeout for the phone query
        const phoneQueryWithTimeout = new Promise(async (resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Timeout while checking phone number'));
          }, 10000); // 10 second timeout
          
          try {
            const result = await getDocs(phoneQuery);
            clearTimeout(timeoutId);
            resolve(result);
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        });
        
        const phoneQuerySnapshot = await phoneQueryWithTimeout;
        
        // If phone number has been used for any free trial, they're not eligible
        if (!phoneQuerySnapshot.empty) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking free trial eligibility:', error);
      // On error (including timeout), default to eligible
      return true;
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const [upcoming, past] = await Promise.all([
        firebaseService.getUpcomingEvents(),
        firebaseService.getPastEvents()
      ]);
      
      // Filter to show only ONE "Weekly Community Run" event and ensure proper ID handling
      const weeklyCommunityRun = upcoming.filter(event => 
        event.name && event.name.toLowerCase().includes('weekly community run')
      ).map(event => ({
        ...event,
        id: String(event.id) // Ensure ID is a string for consistent comparison
      }));
      
      // Use only the first event if there are multiple instances
      const filteredUpcomingEvents = weeklyCommunityRun.length > 0 ? [weeklyCommunityRun[0]] : [];
      
      // Filter past events to show only "Weekly Community Run" events
      const pastWeeklyCommunityRun = past.filter(event => 
        event.name && event.name.toLowerCase().includes('weekly community run')
      ).map(event => ({
        ...event,
        id: String(event.id) // Ensure ID is a string for consistent comparison
      }));
      
      setUpcomingEvents(filteredUpcomingEvents);
      setPastEvents(pastWeeklyCommunityRun.length > 0 ? [pastWeeklyCommunityRun[0]] : []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again later.');
      
      // Use placeholder data in case of error
      setUpcomingEvents([
        {
          id: '1',
          name: 'Weekly Community Run',
          date: '2025-10-25T07:00:00',
          time: '07:00 AM',
          location: 'C3 Cafe, City Park',
          description: 'Join fellow runners for an unforgettable experience.',
          image: '/upcoming-events.jpeg',
          status: 'Open for Registration',
          participants: 25,
          maxParticipants: 50,
        }
      ]);
      
      setPastEvents([
        {
          id: '101',
          name: 'Weekly Community Run',
          date: '2025-09-15T07:00:00',
          time: '07:00 AM',
          location: 'City Stadium',
          description: 'A fun-filled sprint event to kickstart the summer.',
          image: '/summer-sprint.jpg',
          participants: 120,
          maxParticipants: 150,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBookings = async (userId) => {
    try {
      const localBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
      if (localBookings.length > 0) {
        setUserBookings(localBookings);
      }
      
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const bookings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUserBookings(bookings);
      localStorage.setItem('eventBookings', JSON.stringify(bookings));
      console.log('Fetched user bookings:', bookings);
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      const localBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
      setUserBookings(localBookings);
      console.log('Using cached user bookings:', localBookings);
    }
  };

  // Function to check if bookings are closed for an event
  const isBookingClosed = (event) => {
    // If event has bookingStatus as 'closed' and bookingCloseTime is set
    if (event.bookingStatus === 'closed' && event.bookingCloseTime) {
      // Convert bookingCloseTime to Date object
      let closeTime;
      if (event.bookingCloseTime.toDate && typeof event.bookingCloseTime.toDate === 'function') {
        closeTime = event.bookingCloseTime.toDate();
      } else if (event.bookingCloseTime instanceof Date) {
        closeTime = event.bookingCloseTime;
      } else {
        closeTime = new Date(event.bookingCloseTime);
      }
      
      // Compare with current time
      const now = new Date();
      return now >= closeTime;
    }
    
    return false;
  };

  // Function to check if user has booked within the last 24 hours based on plan (excluding free trials)
  const hasBookedRecently = useCallback((planName) => {
    // Get bookings from localStorage
    const localBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
    
    if (!localBookings || localBookings.length === 0) {
      return false;
    }
    
    // Get current time for comparison
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
    
    // Check if any booking was made within the last 24 hours for this plan (excluding free trials)
    return localBookings.some(booking => {
      // Skip free trial bookings
      if (booking.mode === 'free_trial') {
        return false;
      }
      
      // Check if booking matches the plan name
      if (booking.eventName !== planName) {
        return false;
      }
      
      // Check if booking was made within the last 24 hours
      const bookingDate = booking.bookingDate || booking.createdAt;
      if (bookingDate) {
        let bookingTime;
        if (bookingDate.toDate && typeof bookingDate.toDate === 'function') {
          bookingTime = bookingDate.toDate();
        } else if (bookingDate instanceof Date) {
          bookingTime = bookingDate;
        } else {
          bookingTime = new Date(bookingDate);
        }
        
        return bookingTime >= twentyFourHoursAgo && bookingTime <= now;
      }
      
      return false;
    });
  }, []);

  // New function to check if user booked today (regardless of event)
  const hasUserBookedToday = (eventId, eventDate) => {
    if (!userBookings || userBookings.length === 0) {
      return false;
    }

    const targetEventId = String(eventId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if any booking was made today
    return userBookings.some(booking => {
      // First check if the booking is for the target event
      let isTargetEvent = false;
      
      // Check multiple possible field names
      const bookingEventId = booking.eventId || booking.event_id || booking.eventID;
      if (bookingEventId) {
        isTargetEvent = String(bookingEventId) === targetEventId;
      }
      
      // If this booking is not for the target event, skip it
      if (!isTargetEvent) {
        return false;
      }
      
      // If eventDate is provided, also check if the booking is for the same date
      if (eventDate) {
        const bookingEventDate = booking.eventDate;
        if (bookingEventDate) {
          let bookingDate;
          if (bookingEventDate.toDate && typeof bookingEventDate.toDate === 'function') {
            bookingDate = bookingEventDate.toDate();
          } else if (bookingEventDate instanceof Date) {
            bookingDate = bookingEventDate;
          } else {
            bookingDate = new Date(bookingEventDate);
          }
          
          // Compare dates
          const eventDateObj = new Date(eventDate);
          if (bookingDate.toDateString() !== eventDateObj.toDateString()) {
            // Different date, so not the same event instance
            return false;
          }
        }
      }
      
      // Now check if the booking was made today
      const bookingCreationDate = booking.bookingDate || booking.createdAt;
      if (bookingCreationDate) {
        let bookingTime;
        if (bookingCreationDate.toDate && typeof bookingCreationDate.toDate === 'function') {
          bookingTime = bookingCreationDate.toDate();
        } else if (bookingCreationDate instanceof Date) {
          bookingTime = bookingCreationDate;
        } else {
          bookingTime = new Date(bookingCreationDate);
        }
        
        bookingTime.setHours(0, 0, 0, 0);
        
        return bookingTime.getTime() === today.getTime();
      }
      
      return false;
    });
  };

  // Function to check for today's bookings from localStorage (immediate feedback after payment)
  const checkTodaysBookingFromStorage = (eventId) => {
    const latestBooking = localStorage.getItem('latestBooking');
    if (latestBooking) {
      try {
        const booking = JSON.parse(latestBooking);
        const bookingEventId = booking.eventId || booking.event_id || booking.eventID;
        const targetEventId = String(eventId);
        
        if (String(bookingEventId) === targetEventId) {
          // Check if this booking was made today
          const bookingDate = booking.bookingDate || booking.createdAt || booking.timestamp;
          if (bookingDate) {
            let bookingTime;
            if (bookingDate.toDate && typeof bookingDate.toDate === 'function') {
              bookingTime = bookingDate.toDate();
            } else if (bookingDate instanceof Date) {
              bookingTime = bookingDate;
            } else if (typeof bookingDate === 'string' || typeof bookingDate === 'number') {
              bookingTime = new Date(bookingDate);
            } else {
              bookingTime = new Date(bookingDate);
            }
            
            if (!isNaN(bookingTime.getTime())) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              bookingTime.setHours(0, 0, 0, 0);
              
              return bookingTime.getTime() === today.getTime();
            }
          }
        }
      } catch (e) {
        console.error('Error parsing latest booking from localStorage:', e);
      }
    }
    return false;
  };

  const handleRegister = async (event) => {
    if (!user) {
      navigate('/signup');
      return;
    }

    if (!user.phoneNumber) {
      alert('To book a free trial, please update your profile with a phone number.');
      navigate('/profile');
      return;
    }

    // Check if bookings are closed
    if (isBookingClosed(event)) {
      alert('Bookings for this event are currently closed.');
      return;
    }

    // Pass the event information to the plans page
    // We'll store the event in localStorage so the plans page can access it
    localStorage.setItem('selectedEvent', JSON.stringify(event));
    
    // Instead of checking eligibility and navigating to payments, 
    // we'll navigate directly to the plans page
    navigate('/plans');
    
    // Note: The original functionality for checking free trial eligibility
    // and navigating to payments has been removed as per the user's request
    // to navigate directly to the plans page
  };

  // Calculate progress percentage
  const getProgressPercentage = (participants, maxParticipants) => {
    return Math.min(100, (participants / maxParticipants) * 100);
  };

  // ENHANCED VERSION - Check if a user has already booked a specific event WITH DEBUGGING AND TODAY'S CHECK
  const hasUserBookedEvent = (eventId, eventDate) => {
    // Make sure we have user bookings data
    if (!userBookings || userBookings.length === 0) {
      console.log('No user bookings found');
      return false;
    }
    
    // Convert eventId to string for comparison
    const targetEventId = String(eventId);
    console.log('Checking if user booked event:', targetEventId);
    console.log('User bookings data:', userBookings);
    
    // Get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Enhanced approach - check if any booking has this event ID
    for (const booking of userBookings) {
      // Check multiple possible field names and ensure consistent string comparison
      const bookingEventId = booking.eventId || booking.event_id || booking.eventID;
      if (bookingEventId !== undefined && bookingEventId !== null) {
        const bookingEventIdStr = String(bookingEventId);
        console.log('Comparing with booking event ID:', bookingEventIdStr);
        // Use multiple comparison methods for better compatibility
        if (bookingEventIdStr === targetEventId || 
            bookingEventIdStr == targetEventId ||
            bookingEventIdStr.trim() === targetEventId.trim()) {
          
          // If eventDate is provided, also check if the booking is for the same date
          if (eventDate) {
            const bookingEventDate = booking.eventDate;
            if (bookingEventDate) {
              let bookingDate;
              if (bookingEventDate.toDate && typeof bookingEventDate.toDate === 'function') {
                bookingDate = bookingEventDate.toDate();
              } else if (bookingEventDate instanceof Date) {
                bookingDate = bookingEventDate;
              } else {
                bookingDate = new Date(bookingEventDate);
              }
              
              // Compare dates
              const eventDateObj = new Date(eventDate);
              if (bookingDate.toDateString() === eventDateObj.toDateString()) {
                // Check if this booking was made today
                const bookingCreationDate = booking.bookingDate || booking.createdAt;
                if (bookingCreationDate) {
                  let bookingTime;
                  if (bookingCreationDate.toDate && typeof bookingCreationDate.toDate === 'function') {
                    bookingTime = bookingCreationDate.toDate();
                  } else if (bookingCreationDate instanceof Date) {
                    bookingTime = bookingCreationDate;
                  } else {
                    bookingTime = new Date(bookingCreationDate);
                  }
                  
                  // Set time to beginning of day for comparison
                  bookingTime.setHours(0, 0, 0, 0);
                  
                  // If booking was made today, return true
                  if (bookingTime.getTime() === today.getTime()) {
                    console.log('MATCH FOUND FOR TODAY!');
                    return true;
                  }
                }
                
                // For backward compatibility, return true for any match
                console.log('MATCH FOUND!');
                return true;
              }
            }
          } else {
            // If no eventDate provided, use original logic
            // Check if this booking was made today
            const bookingDate = booking.bookingDate || booking.createdAt;
            if (bookingDate) {
              let bookingTime;
              if (bookingDate.toDate && typeof bookingDate.toDate === 'function') {
                bookingTime = bookingDate.toDate();
              } else if (bookingDate instanceof Date) {
                bookingTime = bookingDate;
              } else {
                bookingTime = new Date(bookingDate);
              }
              
              // Set time to beginning of day for comparison
              bookingTime.setHours(0, 0, 0, 0);
              
              // If booking was made today, return true
              if (bookingTime.getTime() === today.getTime()) {
                console.log('MATCH FOUND FOR TODAY!');
                return true;
              }
            }
            
            // For backward compatibility, return true for any match
            console.log('MATCH FOUND!');
            return true;
          }
        }
      }
    }
    
    console.log('No match found for event ID:', targetEventId);
    return false;
  };

  if (loading) {
    return (
      <div className="events-page">
        <div className="events-container">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="events-page">
        <div className="events-container">
          <div className="error-container">
            <p>{error}</p>
            <button onClick={fetchEvents} className="retry-btn">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="events-page">
      <DashboardNav />
      <div className="events-container">
        <div className="events-header">
          <h1>Weekly Community Run</h1>
          <p>Join our community runs and be part of something amazing!</p>
          {/* Add refresh button with clean styling */}
        </div>

        {/* Section Header (New) */}
        <div className="section-header">
          <h2>Your Events</h2>
          <p>Manage your upcoming and past event bookings</p>
        </div>

        {/* Tab Navigation */}
        <div className="events-tabs">
          <button 
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Events
          </button>
          <button 
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past Events
          </button>
        </div>

        {/* Events Content */}
        <div className="events-content">
          {activeTab === 'upcoming' ? (
            <div className="events-grid">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map(event => (
                  <div key={event.id} className="event-card">
                    <div className="event-image-container">
                      <img 
                        src={event.image || '/upcoming-events.jpeg'} 
                        alt={event.title || event.name} 
                        onError={(e) => {
                          e.target.src = '/upcoming-events.jpeg';
                        }}
                      />
                      <div className="event-status-badge">
                        {isBookingClosed(event) ? 'Bookings Closed' : (event.status || 'Open')}
                      </div>
                    </div>
                    
                    <div className="event-details">
                      <h3 className="event-title">{event.title || event.name}</h3>
                      
                      <div className="event-meta">
                        <div className="event-date">
                          <span className="icon">📅</span>
                          {formatDate(event.date)}
                        </div>
                        <div className="event-time">
                          <span className="icon">⏰</span>
                          {event.time || 'TBD'}
                        </div>
                        <div className="event-location">
                          <span className="icon">📍</span>
                          {event.location}
                        </div>
                      </div>
                      
                      <p className="event-description">{event.description}</p>
                      
                      <div className="event-stats">
                        <div className="participants-info">
                          <div className="progress-container">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${getProgressPercentage(event.participants || 0, event.maxParticipants || 100)}%` }}
                            ></div>
                          </div>
                          <div className="progress-text">
                            {event.participants || 0} of {event.maxParticipants || 100} spots filled
                          </div>
                        </div>
                      </div>
                      
                      <div className="event-actions">
                        <button 
                          className="register-btn"
                          onClick={() => handleRegister(event)}
                          disabled={checkTodaysBookingFromStorage(event.id) || 
                                   isBookingClosed(event) ||
                                   hasUserBookedToday(event.id, event.date)}
                        >
                          {isBookingClosed(event) ? 'Bookings Closed' :
                           checkTodaysBookingFromStorage(event.id) ? 'Booked for this week' : 
                           hasUserBookedToday(event.id, event.date) ? 'Booked for this week' :
                           'Book Your Slot'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-events">
                  <p>No upcoming Weekly Community Run events at the moment. Check back soon!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="events-grid">
              {pastEvents.length > 0 ? (
                pastEvents.map(event => (
                  <div key={event.id} className="event-card past-event">
                    <div className="event-image-container">
                      <img 
                        src={event.image || '/upcoming-events.jpeg'} 
                        alt={event.title} 
                        onError={(e) => {
                          e.target.src = '/upcoming-events.jpeg';
                        }}
                      />
                      <div className="event-status-badge past">Completed</div>
                    </div>
                    
                    <div className="event-details">
                      <h3 className="event-title">{event.title}</h3>
                      
                      <div className="event-meta">
                        <div className="event-date">
                          <span className="icon">📅</span>
                          {formatDate(event.date)}
                        </div>
                        <div className="event-time">
                          <span className="icon">⏰</span>
                          {event.time || 'TBD'}
                        </div>
                        <div className="event-location">
                          <span className="icon">📍</span>
                          {event.location}
                        </div>
                      </div>
                      
                      <p className="event-description">{event.description}</p>
                      
                      <div className="event-stats">
                        <div className="participants-info">
                          <div className="progress-container">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${getProgressPercentage(event.participants || 0, event.maxParticipants || 100)}%` }}
                            ></div>
                          </div>
                          <div className="progress-text">
                            {event.participants || 0} participants
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-events">
                  <p>No past Weekly Community Run events available.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserEventsPage;