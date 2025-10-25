import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import firebaseService from '../services/firebaseService';
import { formatDate } from '../utils/dateUtils';
import './EventsPage.css';

function EventsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [isEventExpanded, setIsEventExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mainEvent, setMainEvent] = useState(null); // Main event from Firebase
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now()); // Add refresh tracking

  // Check if it's a mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // On mobile, default to collapsed view
      if (mobile) {
        setIsEventExpanded(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch main upcoming event from Firebase
  const fetchMainEvent = async () => {
    try {
      // Get the "Weekly Community Run" event from upcomingEvents
      const events = await firebaseService.getUpcomingEvents();
      const weeklyCommunityRun = events.find(event => 
        event.name && event.name.includes('Weekly Community Run')
      );
      
      if (weeklyCommunityRun) {
        // Ensure the event ID is properly set as a string
        const eventWithProperId = {
          ...weeklyCommunityRun,
          id: String(weeklyCommunityRun.id)
        };
        setMainEvent(eventWithProperId);
      } else {
        // Fallback to default event if not found
        setMainEvent({
          id: 'event_001',
          name: 'Weekly Community Run',
          date: new Date().toISOString().split('T')[0],
          time: '07:00 AM',
          location: 'C3 Cafe, City Park',
          description: 'Join fellow runners for an unforgettable experience.',
          image: '/upcoming-events.jpeg',
          status: 'Open for Registration',
          participants: 25,
          maxParticipants: 50
        });
      }
    } catch (error) {
      console.error('Error fetching main event:', error);
      // Fallback to default event on error
      setMainEvent({
        id: 'event_001',
        name: 'Weekly Community Run',
        date: new Date().toISOString().split('T')[0],
        time: '07:00 AM',
        location: 'C3 Cafe, City Park',
        description: 'Join fellow runners for an unforgettable experience.',
        image: '/upcoming-events.jpeg',
        status: 'Open for Registration',
        participants: 25,
        maxParticipants: 50
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMainEvent();
  }, [lastRefresh]); // Add lastRefresh as dependency

  // Check for refresh flag
  useEffect(() => {
    const checkForRefresh = () => {
      // Check for refresh flag
      const shouldRefresh = localStorage.getItem('refreshBookings');
      if (shouldRefresh === 'true') {
        // Clear the refresh flag
        localStorage.removeItem('refreshBookings');
        // Refresh user bookings
        if (user && user.uid) {
          fetchUserBookings(user.uid);
        }
        // Also refresh the main event
        setLastRefresh(Date.now());
      }
      
      // Check for new booking flag (set after successful payment)
      const newBooking = localStorage.getItem('newBooking');
      if (newBooking) {
        // Clear the new booking flag
        localStorage.removeItem('newBooking');
        // Refresh user bookings
        if (user && user.uid) {
          fetchUserBookings(user.uid);
        }
        // Also refresh the main event
        setLastRefresh(Date.now());
      }
      
      // Check for event updates flag (set when events are updated in admin)
      const eventsUpdated = localStorage.getItem('eventsUpdated');
      if (eventsUpdated === 'true') {
        // Clear the events updated flag
        localStorage.removeItem('eventsUpdated');
        // Refresh the main event
        setLastRefresh(Date.now());
      }
      
      // Check for latest event booking (new approach)
      const latestEventBooking = localStorage.getItem('latestEventBooking');
      if (latestEventBooking) {
        // Refresh user bookings
        if (user && user.uid) {
          fetchUserBookings(user.uid);
        }
        // Also refresh the main event
        setLastRefresh(Date.now());
      }
    };

    // Check immediately when component mounts
    checkForRefresh();

    // Check periodically (every 500ms) for faster updates
    const interval = setInterval(checkForRefresh, 500);
    
    return () => clearInterval(interval);
  }, [user]);

  // Add auto-refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refresh bookings
        if (user && user.uid) {
          fetchUserBookings(user.uid);
        }
        // Also refresh the main event
        setLastRefresh(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Auth State Listener and User Data Fetch
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
          phoneNumber: userData.phoneNumber || '',
        };
        setUser(userObject);
        fetchUserBookings(userObject.uid);
      } else {
        setUser(null);
        setUserBookings([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch User Bookings
  const fetchUserBookings = async (userId) => {
    if (!userId) {
      console.warn("fetchUserBookings called without a userId.");
      return;
    }
    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const bookings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserBookings(bookings);
      localStorage.setItem(`userBookings_${userId}`, JSON.stringify(bookings));
      console.log('Fetched user bookings:', bookings);
      
      // Also update the global eventBookings for consistency
      localStorage.setItem('eventBookings', JSON.stringify(bookings));
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      const cachedBookings = localStorage.getItem(`userBookings_${userId}`);
      if (cachedBookings) {
        const parsedBookings = JSON.parse(cachedBookings);
        setUserBookings(parsedBookings);
        console.log('Using cached user bookings:', parsedBookings);
      }
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

  // Check if a user has already booked a specific event - ENHANCED VERSION WITH TODAY'S BOOKING CHECK
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

  // Handle Registration Click
  const handleRegister = async (event) => {
    if (!user) {
      navigate('/signup');
      return;
    }

    if (!user.phoneNumber) {
      alert('To book an event, please ensure your profile has a phone number.');
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

  // Toggle event details on mobile
  const toggleEventDetails = () => {
    if (isMobile) {
      setIsEventExpanded(!isEventExpanded);
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = (participants, maxParticipants) => {
    return (participants / maxParticipants) * 100;
  };

  if (loading) {
    return (
      <div className="events-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="events-page">
      <div className="upcoming-events-section">
        <div className="section-header">
          <h1>Upcoming Events</h1>
          <p>Join our community runs and be part of something amazing!</p>
        </div>

        <div className="upcoming-events-container">
          {mainEvent ? (
            <div
              className={`event-card ${isEventExpanded ? 'expanded' : ''}`}
              onMouseEnter={() => !isMobile && setIsEventExpanded(true)}
              onMouseLeave={() => !isMobile && setIsEventExpanded(false)}
              onClick={toggleEventDetails}
            >
              <div className="event-image-wrapper">
                <img
                  src={mainEvent.image || '/upcoming-events.jpeg'}
                  alt={mainEvent.name}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = '/upcoming-events.jpeg';
                  }}
                />
              </div>

              <div className="event-content">
                <div className="event-main-info">
                  <h3>{mainEvent.name}</h3>
                  <div className="event-meta">
                    <div className="event-date">
                      {formatDate(mainEvent.date)}
                    </div>
                    <div className="event-time">{mainEvent.time}</div>
                  </div>
                  <div className="event-location">{mainEvent.location || 'Location TBD'}</div>
                  <div className="event-description">{mainEvent.description || 'Event description coming soon.'}</div>
                </div>

                <div className="event-stats">
                  <div className="participants-info">
                    <div className="participants-text">Registration Progress</div>
                    <div className="progress-container">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${getProgressPercentage(mainEvent.participants || 0, mainEvent.maxParticipants || 50)}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      {mainEvent.participants || 0} of {mainEvent.maxParticipants || 50} spots filled
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(mainEvent.participants || 0 / mainEvent.maxParticipants || 50) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <button
                  className="book-slot-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegister(mainEvent);
                  }}
                  disabled={isBookingClosed(mainEvent) || 
                           hasUserBookedToday(mainEvent.id, mainEvent.date) || 
                           hasUserBookedEvent(mainEvent.id, mainEvent.date)}
                >
                  {isBookingClosed(mainEvent) ? 'Bookings Closed' :
                   hasUserBookedToday(mainEvent.id, mainEvent.date) ? 'Already Booked Today' : 
                   hasUserBookedEvent(mainEvent.id, mainEvent.date) ? 'Already Booked' : 'Book Your Slot Now'}
                </button>

                {/* Mobile toggle indicator */}
                {isMobile && (
                  <div className="mobile-toggle-indicator">
                    {isEventExpanded ? 'Tap to collapse details ▲' : 'Tap to expand details ▼'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="no-events-message">No upcoming events at the moment. Check back soon!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventsPage;