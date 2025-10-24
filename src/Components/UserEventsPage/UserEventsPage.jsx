import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import firebaseService from '../../services/firebaseService';
import { formatDate } from '../../utils/dateUtils';
import './UserEventsPage.css';

function UserEventsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [notificationPreferences, setNotificationPreferences] = useState({});
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
      // Check for refresh flag
      const shouldRefresh = localStorage.getItem('refreshBookings');
      if (shouldRefresh === 'true') {
        // Clear the refresh flag
        localStorage.removeItem('refreshBookings');
        // Trigger a refresh
        setLastRefresh(Date.now());
      }
      
      // Check for new booking flag (set after successful payment)
      const newBooking = localStorage.getItem('newBooking');
      if (newBooking) {
        // Clear the new booking flag
        localStorage.removeItem('newBooking');
        // Trigger a refresh
        setLastRefresh(Date.now());
      }
      
      // Check for event updates flag (set when events are updated in admin)
      const eventsUpdated = localStorage.getItem('eventsUpdated');
      if (eventsUpdated === 'true') {
        // Clear the events updated flag
        localStorage.removeItem('eventsUpdated');
        // Trigger a refresh
        setLastRefresh(Date.now());
      }
      
      // Check for latest event booking (new approach)
      const latestEventBooking = localStorage.getItem('latestEventBooking');
      if (latestEventBooking) {
        // Trigger a refresh
        setLastRefresh(Date.now());
      }
    };

    // Check immediately when component mounts
    checkForRefresh();

    // Check more frequently (every 500ms) for faster updates
    const interval = setInterval(checkForRefresh, 500);
    
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

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const [upcoming, past] = await Promise.all([
        firebaseService.getUpcomingEvents(),
        firebaseService.getPastEvents()
      ]);
      
      // Filter to show only "Weekly Community Run" event and ensure proper ID handling
      const weeklyCommunityRun = upcoming.filter(event => 
        event.name && event.name.toLowerCase().includes('weekly community run')
      ).map(event => ({
        ...event,
        id: String(event.id) // Ensure ID is a string for consistent comparison
      }));
      
      // Use the filtered events or show all upcoming events
      setUpcomingEvents(weeklyCommunityRun.length > 0 ? weeklyCommunityRun : upcoming.map(event => ({
        ...event,
        id: String(event.id) // Ensure ID is a string for consistent comparison
      })));
      
      // Filter past events to show only "Weekly Community Run" events
      const pastWeeklyCommunityRun = past.filter(event => 
        event.name && event.name.toLowerCase().includes('weekly community run')
      ).map(event => ({
        ...event,
        id: String(event.id) // Ensure ID is a string for consistent comparison
      }));
      
      setPastEvents(pastWeeklyCommunityRun.length > 0 ? pastWeeklyCommunityRun : past.map(event => ({
        ...event,
        id: String(event.id) // Ensure ID is a string for consistent comparison
      })));
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

  // Add a function to refresh bookings
  const refreshUserBookings = async () => {
    if (user && user.uid) {
      await fetchUserBookings(user.uid);
    }
  };

  useEffect(() => {
    if (user && user.uid) {
      fetchUserBookings(user.uid);
    }
  }, [user, lastRefresh]);

  // ENHANCED VERSION - Check if a user has already booked a specific event WITH DEBUGGING AND TODAY'S CHECK
  const hasUserBookedEvent = (eventId) => {
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
    
    console.log('No match found for event ID:', targetEventId);
    return false;
  };

  // New function to check if user booked today (regardless of event)
  const hasUserBookedToday = (eventId) => {
    if (!user || !userBookings || userBookings.length === 0) {
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
      
      // Now check if the booking was made today
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
        
        bookingTime.setHours(0, 0, 0, 0);
        
        return bookingTime.getTime() === today.getTime();
      }
      
      return false;
    });
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

  // Function to set event reminder notification preference
  const setEventReminder = async (event) => {
    if (!user) {
      alert('You must be logged in to set reminders.');
      return;
    }

    try {
      // Check if user has already set a reminder for this event
      const hasReminder = notificationPreferences[event.id];
      
      if (hasReminder) {
        // Remove existing reminder
        setNotificationPreferences(prev => ({ ...prev, [event.id]: false }));
        // In a full implementation, you would also remove the notification from Firestore
        alert('Reminder removed for this event.');
      } else {
        // Set new reminder
        setNotificationPreferences(prev => ({ ...prev, [event.id]: true }));
        
        // Create a notification in Firestore for the user
        const notificationData = {
          userId: user.uid,
          title: 'Event Reminder',
          message: `Don't forget about your upcoming event: ${event.title}`,
          eventName: event.title,
          eventId: event.id,
          eventDate: event.date,
          createdAt: new Date(),
          read: false
        };

        // Add the notification to the notifications collection
        await addDoc(collection(db, 'notifications'), notificationData);
        
        alert('Reminder set! You will receive a notification before the event.');
      }
    } catch (err) {
      console.error('Error setting reminder:', err);
      alert('Failed to set reminder. Please try again.');
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = (participants, maxParticipants) => {
    return Math.min(100, (participants / maxParticipants) * 100);
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
      <div className="events-container">
        <div className="events-header">
          <h1>Weekly Community Run</h1>
          <p>Join our community runs and be part of something amazing!</p>
          {/* Add refresh button with clean styling */}
          <button 
            onClick={() => {
              setLastRefresh(Date.now());
              fetchMainEvent(); // Also refresh the main event
            }}
            className="refresh-btn"
            style={{
              background: 'transparent',
              color: '#F15A24',
              border: '1px solid #F15A24',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#F15A24';
              e.target.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#F15A24';
            }}
          >
            Refresh Bookings
          </button>
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
                      <div className="event-status-badge">{event.status || 'Open'}</div>
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
                        >
                          {hasUserBookedToday(event.id) ? 'Already Booked Today' : 
                           hasUserBookedEvent(event.id) ? 'Already Booked' : 
                           'Book Your Slot'}
                        </button>
                        
                        {hasUserBookedEvent(event.id) && (
                          <button 
                            className={`reminder-btn ${notificationPreferences[event.id] ? 'active' : ''}`}
                            onClick={() => setEventReminder(event)}
                          >
                            {notificationPreferences[event.id] ? 'Remove Reminder' : 'Set Reminder'}
                          </button>
                        )}
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