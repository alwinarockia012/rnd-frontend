import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import firebaseService from '../../services/firebaseService';
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
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const [upcoming, past] = await Promise.all([
        firebaseService.getUpcomingEvents(),
        firebaseService.getPastEvents()
      ]);
      
      // Filter to show only "Weekly Community Run" event
      const weeklyCommunityRun = upcoming.filter(event => 
        event.title && event.title.toLowerCase().includes('weekly community run')
      );
      
      // If no "Weekly Community Run" events from Firebase, use placeholder data
      setUpcomingEvents(weeklyCommunityRun.length > 0 ? weeklyCommunityRun : [
        {
          id: 1,
          title: 'Weekly Community Run',
          date: '2025-10-25T07:00:00',
          time: '07:00 AM',
          location: 'C3 Cafe, City Park',
          description: 'Join fellow runners for an unforgettable experience.',
          image: '/upcoming-events.jpeg',
          status: 'Open for Registration',
          participants: 25,
          maxParticipants: 50,
          detailedDescription: 'Experience the ultimate running challenge as we welcome 2025! This event combines fitness, community, and celebration. The route takes you through the most scenic parts of Trichy, including heritage sites and modern landmarks. Whether you\'re a seasoned marathoner or a beginner, this event offers multiple distance options: 5K Fun Run, 10K Challenge, and Full Marathon (42K). Pre-event warm-up sessions, professional timing, medical support, hydration stations every 2K, post-race celebrations with live music, healthy refreshments, and awards ceremony. Special goody bags for all participants including event t-shirt, medal, and local sponsor gifts.',
          requirements: [
            'Comfortable running gear and shoes',
            'Water bottle (additional hydration provided)',
            'Valid ID for registration verification'
          ],
        }
      ]);
      
      // Filter past events to show only "Weekly Community Run" events
      const pastWeeklyCommunityRun = past.filter(event => 
        event.title && event.title.toLowerCase().includes('weekly community run')
      );
      
      setPastEvents(pastWeeklyCommunityRun.length > 0 ? pastWeeklyCommunityRun : [
        {
          id: 101,
          title: 'Weekly Community Run',
          date: '2025-09-15T07:00:00',
          time: '07:00 AM',
          location: 'City Stadium',
          description: 'A fun-filled sprint event to kickstart the summer.',
          image: '/summer-sprint.jpg',
          participants: 120,
          maxParticipants: 150,
        }
      ]);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again later.');
      
      // Use placeholder data in case of error
      setUpcomingEvents([
        {
          id: 1,
          title: 'Weekly Community Run',
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
          id: 101,
          title: 'Weekly Community Run',
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
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      const localBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
      setUserBookings(localBookings);
    }
  };

  const hasUserBookedEvent = (eventId) => {
    if (!user || !userBookings || userBookings.length === 0) {
      return false;
    }

    const targetEventId = String(eventId);
    return userBookings.some(booking => String(booking.eventId) === targetEventId);
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

  // Format date for display
  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
                        alt={event.title} 
                        onError={(e) => {
                          e.target.src = '/upcoming-events.jpeg';
                        }}
                      />
                      <div className="event-status-badge">{event.status || 'Open'}</div>
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
                            {event.participants || 0} of {event.maxParticipants || 100} spots filled
                          </div>
                        </div>
                      </div>
                      
                      <div className="event-actions">
                        <button 
                          className="register-btn"
                          onClick={() => handleRegister(event)}
                          disabled={hasUserBookedEvent(event.id)}
                        >
                          {hasUserBookedEvent(event.id) ? 'Already Booked' : 'Book Your Slot'}
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