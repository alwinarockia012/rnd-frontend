import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './EventsPage.css';

// Placeholder for upcoming events - in a real app, this would come from Firestore
const upcomingEvents = [
  {
    id: 'event_001',
    title: 'Weekly Community Run',
    date: '2025-10-12T07:00:00',
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
];

function EventsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [isEventExpanded, setIsEventExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      const cachedBookings = localStorage.getItem(`userBookings_${userId}`);
      if (cachedBookings) {
        setUserBookings(JSON.parse(cachedBookings));
      }
    }
  };

  // Check if a user has already booked a specific event
  const hasUserBookedEvent = (eventId) => {
    return userBookings.some(booking => String(booking.eventId) === String(eventId));
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

  return (
    <div className="events-page">
      <div className="upcoming-events-section">
        <div className="section-header">
          <h1>Upcoming Events</h1>
          <p>Join our community runs and be part of something amazing!</p>
        </div>

        <div className="upcoming-events-container">
          {upcomingEvents.length > 0 ? (
            <div
              className={`event-card ${isEventExpanded ? 'expanded' : ''}`}
              onMouseEnter={() => !isMobile && setIsEventExpanded(true)}
              onMouseLeave={() => !isMobile && setIsEventExpanded(false)}
              onClick={toggleEventDetails}
            >
              <div className="event-image-wrapper">
                <img
                  src={upcomingEvents[0].image}
                  alt={upcomingEvents[0].title}
                  loading="lazy"
                />
              </div>

              <div className="event-content">
                <div className="event-main-info">
                  <h3>{upcomingEvents[0].title}</h3>
                  <div className="event-meta">
                    <div className="event-date">
                      {new Date(upcomingEvents[0].date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="event-time">{upcomingEvents[0].time}</div>
                  </div>
                  <div className="event-location">{upcomingEvents[0].location}</div>
                  <div className="event-description">{upcomingEvents[0].description}</div>
                </div>

                <div className="event-stats">
                  <div className="participants-info">
                    <div className="participants-text">Registration Progress</div>
                    <div className="progress-container">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${getProgressPercentage(upcomingEvents[0].participants, upcomingEvents[0].maxParticipants)}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      {upcomingEvents[0].participants} of {upcomingEvents[0].maxParticipants} spots filled
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(upcomingEvents[0].participants / upcomingEvents[0].maxParticipants) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <button
                  className="book-slot-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegister(upcomingEvents[0]);
                  }}
                  disabled={hasUserBookedEvent(upcomingEvents[0].id)}
                >
                  {hasUserBookedEvent(upcomingEvents[0].id) ? 'Already Booked' : 'Book Your Slot Now'}
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