import React, { useState, useEffect, useCallback } from "react";
import "./Plans.css";
import { FaRunning, FaMoneyBillAlt, FaCalendarAlt, FaCreditCard, FaTimes, FaCheck, FaStar, FaLock, FaQrcode } from "react-icons/fa";
import { Element } from 'react-scroll';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import Notification from '../Notification/Notification';
import SignUpNotification from '../SignUpNotification/SignUpNotification';
import PlanNotification from './PlanNotification';
import PaymentButton from '../Payments/PaymentButton';
import { getCurrentUser } from '../../services/paymentService';
import firebaseService from '../../services/firebaseService';

// Utility function to check if an event date has passed
const isEventDatePassed = (eventDate) => {
  if (!eventDate) return false;
  
  let eventTime;
  if (eventDate.toDate && typeof eventDate.toDate === 'function') {
    eventTime = eventDate.toDate();
  } else if (eventDate instanceof Date) {
    eventTime = eventDate;
  } else {
    eventTime = new Date(eventDate);
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventTime.setHours(0, 0, 0, 0);
  
  return eventTime < today;
};

// Utility function to check if a booking is still valid (event hasn't passed)
const isBookingStillValid = (booking) => {
  // If there's no event date, consider it valid
  if (!booking.eventDate) return true;
  
  // Check if the event date has passed
  return !isEventDatePassed(booking.eventDate);
};

const Plans = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showSignUpNotification, setShowSignUpNotification] = useState(false);
  const [showPlanNotification, setShowPlanNotification] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isEligibleForFreeTrial, setIsEligibleForFreeTrial] = useState(true); // Default to true for public pages
  const [bookingsUpdated, setBookingsUpdated] = useState(0); // State to track booking updates
  const [purchasedPlan, setPurchasedPlan] = useState(null); // State to track which plan was purchased

  const checkFreeTrialEligibility = useCallback(async (userId, phoneNumber) => {
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
        setIsEligibleForFreeTrial(false);
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
          setIsEligibleForFreeTrial(false);
          return false;
        }
      }
      
      setIsEligibleForFreeTrial(true);
      return true;
    } catch (error) {
      console.error('Error checking free trial eligibility:', error);
      // On error (including timeout), default to eligible but show a warning
      setIsEligibleForFreeTrial(true);
      showNotification("There was a delay checking your eligibility. Please try again.", 'error');
      return true;
    }
  }, []);

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

  // Function to check if user has booked a monthly plan within the last 24 hours (excluding free trials)
  const hasBookedMonthlyRecently = useCallback(() => {
    // Get bookings from localStorage
    const localBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
    
    if (!localBookings || localBookings.length === 0) {
      return false;
    }
    
    // Get current time for comparison
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
    
    // Check if any booking was made within the last 24 hours for Monthly Membership (excluding free trials)
    return localBookings.some(booking => {
      // Skip free trial bookings
      if (booking.mode === 'free_trial') {
        return false;
      }
      
      // Check if booking is for Monthly Membership
      if (booking.eventName !== 'Monthly Membership') {
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

  // Check free trial eligibility when component mounts and user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if we're on the dashboard page
        const isOnDashboard = document.querySelector('.plans-page') !== null;
        // Check eligibility on both landing page and dashboard pages
        try {
          await checkFreeTrialEligibility(currentUser.uid, currentUser.phoneNumber || '');
          
          // Only check for recent bookings on dashboard pages
          if (isOnDashboard) {
            // Check if there's a recent booking to set purchasedPlan
            const localBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
            if (localBookings.length > 0) {
              // Filter out passed events
              const activeBookings = localBookings.filter(booking => !isEventDatePassed(booking.eventDate));
              
              if (activeBookings.length > 0) {
                // Get the most recent active booking
                const mostRecentBooking = activeBookings.reduce((latest, current) => {
                  const latestDate = new Date(latest.bookingDate || latest.createdAt);
                  const currentDate = new Date(current.bookingDate || current.createdAt);
                  return currentDate > latestDate ? current : latest;
                });
                
                // Set the purchased plan based on the most recent active booking
                setPurchasedPlan(mostRecentBooking.eventName || 'Unknown Plan');
              } else {
                // All events have passed, reset purchased plan
                setPurchasedPlan(null);
              }
            } else {
              // No bookings, reset purchased plan
              setPurchasedPlan(null);
            }
          }
        } catch (error) {
          console.error('Error in useEffect while checking eligibility:', error);
          showNotification("There was an issue checking your plan eligibility. Please refresh the page.", 'error');
        }
      } else {
        // Reset eligibility for non-logged in users
        setIsEligibleForFreeTrial(true);
        setPurchasedPlan(null);
      }
    });

    return () => unsubscribe();
  }, [checkFreeTrialEligibility, hasBookedRecently, bookingsUpdated]);

  // Check for changes in bookings and events
  useEffect(() => {
    const checkForBookingChanges = () => {
      // Update the state to trigger a re-render
      setBookingsUpdated(prev => prev + 1);
      
      // Check if there's a new booking and set purchasedPlan if needed
      const newBooking = localStorage.getItem('newBooking');
      if (newBooking) {
        try {
          const booking = JSON.parse(newBooking);
          // Set the purchased plan regardless of event date
          setPurchasedPlan(booking.eventName || 'Unknown Plan');
        } catch (e) {
          console.error('Error parsing new booking:', e);
        }
      }
      
      // Check for event updates and reset purchasedPlan if events have changed
      const eventsUpdated = localStorage.getItem('eventsUpdated');
      if (eventsUpdated === 'true') {
        // Reset purchased plan when events are updated
        setPurchasedPlan(null);
      }
      
      // Check if any booked events have passed and reset purchasedPlan if so
      const localBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
      if (localBookings.length > 0) {
        // Check if any booked events have passed
        const anyEventPassed = localBookings.some(booking => {
          return isEventDatePassed(booking.eventDate);
        });
        
        // If any events have passed, reset the purchased plan state
        // This ensures plans reset when their associated events pass
        if (anyEventPassed) {
          setPurchasedPlan(null);
        }
      } else {
        // No bookings, reset purchased plan
        setPurchasedPlan(null);
      }
      
      // Check if 24 hours have passed since last booking and reset purchasedPlan if so
      const localBookings2 = JSON.parse(localStorage.getItem('eventBookings') || '[]');
      if (localBookings2.length > 0) {
        // Get current time
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
        
        // Check if all bookings are older than 24 hours
        const allBookingsOlder = localBookings2.every(booking => {
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
        
        // If all bookings are older than 24 hours, reset the purchased plan state
        if (allBookingsOlder) {
          setPurchasedPlan(null);
        }
      }
    };
    
    // Check immediately
    checkForBookingChanges();
    
    // Check every 5 seconds
    const interval = setInterval(checkForBookingChanges, 5000);
    
    return () => clearInterval(interval);
  }, [bookingsUpdated]);

  const plansData = [
    {
      icon: <FaRunning />,
      name: "Free Trial",
      subtitle: "For First-Time Participants",
      price: "0",
      duration: "1 Session",
      originalPrice: null,
      popular: false,
      color: "#F15A24",
      freeTrial: true,
      features: [
        "Guided warm-up session",
        "1-hour community run",
        "Light post-run treats",
        "Networking with fellow runners",
        "Basic fitness assessment"
      ],
    },
    {
      icon: <FaMoneyBillAlt />,
      name: "Pay-Per-Run",
      subtitle: "Flexible Sessions",
      price: "99",
      duration: "Per Session",
      originalPrice: "149",
      popular: true,
      color: "#F15A24",
      features: [
        "Guided warm-up & cooldown",
        "1-hour structured run",
        "Healthy energy boosters",
        "Community networking"
        
      ],
    },
    {
      icon: <FaCalendarAlt />,
      name: "Monthly Membership",
      subtitle: "Unlimited Access",
      price: "299",
      duration: "Per Month",
      originalPrice: "499",
      popular: false,
      color: "#F15A24",
      features: [
        "Unlimited weekly runs",
        "Personal fitness consultation",
        "Nutritious post-run meals",
        "Exclusive community events",
        
      ],
    },
  ];

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
  };

  const closeNotification = () => {
    setNotification(null);
  };

  const handleSignUpClick = () => {
    setShowSignUpNotification(false);
    setShowPlanNotification(false);
    window.location.href = '/signup';
  };

  const handleCloseSignUpNotification = () => {
    setShowSignUpNotification(false);
  };

  const handleProceedToPayment = () => {
    setShowPlanNotification(false);
    // For free trial, after closing notification, redirect to signup
    if (selectedPlan && selectedPlan.freeTrial) {
      setShowSignUpNotification(true);
    }
  };

  const handleClosePlanNotification = () => {
    setShowPlanNotification(false);
    setSelectedPlan(null);
  };

  // Handle free trial booking directly
  const handleFreeTrialBooking = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        // If no user, redirect to signup
        setShowSignUpNotification(true);
        return;
      }

      // Check eligibility first
      if (!isEligibleForFreeTrial) {
        showNotification("You've already claimed your free trial. Upgrade to a paid plan for continued access.", 'info');
        return;
      }

      // Get the selected event from localStorage if it exists
      const selectedEventStr = localStorage.getItem('selectedEvent');
      let eventInfo = null;
      if (selectedEventStr) {
        try {
          eventInfo = JSON.parse(selectedEventStr);
        } catch (e) {
          console.error('Error parsing selected event:', e);
        }
      }

      // Prepare booking data for free trial
      // Normalize phone number to E.164 format for consistency
      let normalizedPhone = user.phoneNumber || '';
      if (normalizedPhone && !normalizedPhone.startsWith('+91') && normalizedPhone.length === 10 && /^\d+$/.test(normalizedPhone)) {
        normalizedPhone = '+91' + normalizedPhone;
      }
      
      const bookingData = {
        eventName: eventInfo ? eventInfo.name || eventInfo.title : "Free Trial",
        eventId: eventInfo ? String(eventInfo.id) : "free_trial",
        eventDate: eventInfo ? new Date(eventInfo.date) : new Date(),
        eventTime: eventInfo ? eventInfo.time : '',
        eventLocation: eventInfo ? eventInfo.location : '',
        status: 'confirmed',
        amount: 0, // Free trial
        paymentId: 'free_trial_' + Date.now(),
        mode: 'free_trial',
        userId: user.uid,
        userEmail: user.email,
        userName: user.name,
        phoneNumber: normalizedPhone,
        bookingDate: new Date()
      };

      // Create the booking in Firestore
      const result = await firebaseService.createBooking(user.uid, bookingData);
      console.log('Free trial booking created successfully with ID:', result.bookingId);

      // Add the booking ID to the booking data for storage
      const bookingDataWithId = {
        ...bookingData,
        id: result.bookingId
      };

      // Clear the selected event from localStorage
      localStorage.removeItem('selectedEvent');

      // Set flags in localStorage to indicate that bookings should be refreshed
      localStorage.setItem('refreshBookings', 'true');
      localStorage.setItem('newBooking', JSON.stringify(bookingDataWithId));
      localStorage.setItem('eventsUpdated', 'true');

      // Store booking data for ticket display
      localStorage.setItem('latestBooking', JSON.stringify(bookingDataWithId));

      // Store in a global key that both pages will check
      localStorage.setItem('latestEventBooking', JSON.stringify({
        eventId: bookingData.eventId,
        bookingId: result.bookingId,
        timestamp: Date.now()
      }));

      // Update eventBookings in localStorage to include the new booking
      const localBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
      const updatedBookings = [...localBookings, bookingDataWithId];
      localStorage.setItem('eventBookings', JSON.stringify(updatedBookings));

      // Set the purchased plan
      setPurchasedPlan("Free Trial");

      // Close the plan notification
      setShowPlanNotification(false);
      setSelectedPlan(null);

      // Show success notification
      showNotification('Free trial booked successfully! Enjoy your session.', 'success');

      // Redirect to dashboard where user can see their ticket
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (error) {
      console.error('Error creating free trial booking:', error);
      showNotification('Failed to book free trial. Please try again.', 'error');
    }
  };

  const handlePayNow = (plan) => {
    // Check if we're on the landing page or user page/dashboard
    // More reliable detection using the specific class
    const isOnDashboard = document.querySelector('.plans-page') !== null;
    
    if (!isOnDashboard) {
      // On landing page, show signup notification for all plans
      setShowSignUpNotification(true);
    } else {
      // In dashboard, handle differently based on plan type
      if (plan.freeTrial) {
        // For free trial in dashboard, check eligibility first
        if (!isEligibleForFreeTrial) {
          // Show notification that user has already claimed their free trial
          showNotification("You've already claimed your free trial. Upgrade to a paid plan for continued access.", 'info');
          return;
        }
        // For eligible users, directly create the free trial booking
        setSelectedPlan(plan);
        handleFreeTrialBooking();
      } else {
        // For paid plans in dashboard, go directly to payment WITHOUT showing any notification
        setSelectedPlan(plan);
        setShowPaymentModal(true);
      }
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = async (response) => {
    console.log('Payment successful:', response);
    // Close the modal
    setShowPaymentModal(false);
    
    // Create booking for the user
    try {
      const user = getCurrentUser();
      if (user && selectedPlan) {
        // Get the selected event from localStorage if it exists
        const selectedEventStr = localStorage.getItem('selectedEvent');
        let eventInfo = null;
        if (selectedEventStr) {
          try {
            eventInfo = JSON.parse(selectedEventStr);
          } catch (e) {
            console.error('Error parsing selected event:', e);
          }
        }
        
        // Prepare booking data - USE ACTUAL EVENT ID IF AVAILABLE
        const bookingData = {
          eventName: eventInfo ? eventInfo.name || eventInfo.title : selectedPlan.name,
          eventId: eventInfo ? String(eventInfo.id) : `plan_${selectedPlan.name.toLowerCase().replace(/\s+/g, '_')}`,
          eventDate: eventInfo ? new Date(eventInfo.date) : new Date(),
          eventTime: eventInfo ? eventInfo.time : '',
          eventLocation: eventInfo ? eventInfo.location : '',
          status: 'confirmed',
          amount: selectedPlan.price,
          paymentId: response.razorpay_payment_id || response.razorpay_order_id,
          mode: 'razorpay',
          userId: user.uid,
          userEmail: user.email,
          userName: user.name,
          phoneNumber: user.phoneNumber,
          bookingDate: new Date()
        };
        
        // Create the booking in Firestore
        const result = await firebaseService.createBooking(user.uid, bookingData);
        console.log('Booking created successfully with ID:', result.bookingId);
        
        // Add the booking ID to the booking data for storage
        const bookingDataWithId = {
          ...bookingData,
          id: result.bookingId
        };
        
        // Clear the selected event from localStorage
        localStorage.removeItem('selectedEvent');
        
        // Set flags in localStorage to indicate that bookings should be refreshed
        localStorage.setItem('refreshBookings', 'true');
        localStorage.setItem('newBooking', JSON.stringify(bookingDataWithId));
        localStorage.setItem('eventsUpdated', 'true');
        
        // Store booking data for ticket display
        localStorage.setItem('latestBooking', JSON.stringify(bookingDataWithId));
        
        // Store in a global key that both pages will check
        localStorage.setItem('latestEventBooking', JSON.stringify({
          eventId: bookingData.eventId,
          bookingId: result.bookingId,
          timestamp: Date.now()
        }));
        
        // Update eventBookings in localStorage to include the new booking
        const localBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
        const updatedBookings = [...localBookings, bookingDataWithId];
        localStorage.setItem('eventBookings', JSON.stringify(updatedBookings));
        
        // Force immediate refresh by directly updating localStorage values
        localStorage.setItem('forceRefresh', 'true');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      // Even if booking creation fails, we still want to show success message
    }
    
    // Set the purchased plan
    setPurchasedPlan(selectedPlan?.name || 'Unknown Plan');
    
    // Close the payment modal and show success notification
    closeModal();
    showNotification('Payment successful! Thank you for your purchase.', 'success');
    
    // Redirect to dashboard where user can see their ticket
    setTimeout(() => {
      // Use window.location instead of navigate to ensure full page refresh
      window.location.href = '/dashboard';
    }, 1500);

  };

  // Handle failed payment
  const handlePaymentFailure = (error) => {
    console.log('Payment failed:', error);
    // Show error notification using in-app notification
    showNotification('Payment failed. Please try again.', 'error');
  };

  const closeModal = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
  };

  // Filter plans to hide free trial for ineligible users on dashboard
  const filteredPlansData = plansData.filter(plan => {
    // Always show all plans on landing page
    const isOnDashboard = document.querySelector('.plans-page') !== null;
    if (!isOnDashboard) return true;
    
    // On dashboard, we show all plans but disable the free trial if user is not eligible
    // This is to keep the card visible but unusable as per user preference
    return true;
  });

  return (
    <Element name="plans" className="plans-container">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      )}
      
      {showSignUpNotification && (
        <SignUpNotification
          onSignUpClick={handleSignUpClick}
          onClose={handleCloseSignUpNotification}
        />
      )}
      
      {showPlanNotification && selectedPlan && !selectedPlan.freeTrial && (
        <PlanNotification
          plan={selectedPlan}
          onSignUpClick={handleSignUpClick}
          onProceedToPayment={handleProceedToPayment}
          onClose={handleClosePlanNotification}
        />
      )}
      
      <div className="plans-background">
        <div className="blur plans-blur-1"></div>
        <div className="blur plans-blur-2"></div>
      </div>

      <div className="plans-content">
        <div className="plans-header">
          <div className="header-badge">
            <FaStar className="star-icon" />
            <span>Choose Your Plan</span>
          </div>
          <h2 className="main-title">
            <span className="stroke-text">Ready to Start</span>
            <span className="highlight-text">Your Journey</span>
            <span className="stroke-text">With Us</span>
          </h2>
          <p className="subtitle">Select the perfect plan that fits your fitness goals and lifestyle</p>
        </div>

        <div className="plans-grid">
          {filteredPlansData.map((plan, i) => (
            <div 
              key={i} 
              className={`plan-card ${plan.popular ? 'popular' : ''} ${plan.freeTrial && !isEligibleForFreeTrial ? 'disabled' : ''}`}
              style={{ '--plan-color': plan.color }}
            >
              {plan.popular && (
                <div className="popular-badge">
                  <span className="badge-star">★</span>
                  MOST POPULAR
                </div>
              )}
              
              {plan.freeTrial && !isEligibleForFreeTrial && (
                <div className="plan-disabled-overlay">
                  <div className="disabled-message">Already Claimed</div>
                </div>
              )}
              
              <div className="plan-header">
                <div className="plan-icon" style={{ color: plan.color }}>
                  {plan.icon}
                </div>
                <div className="plan-title">
                  <h3>{plan.name}</h3>
                  <div className="plan-subtitle">{plan.subtitle}</div>
                </div>
              </div>
              
              <div className="price-section">
                <div className="price-comparison">
                  {plan.originalPrice && (
                    <span className="original-price">₹{plan.originalPrice}</span>
                  )}
                  {plan.originalPrice && (
                    <span className="discount-tag">
                      SAVE ₹{plan.originalPrice - plan.price}
                    </span>
                  )}
                </div>
                <div className="current-price-wrapper">
                  <span className="currency">₹</span>
                  <span className="current-price">{plan.price}</span>
                  {plan.duration && (
                    <span className="duration">/{plan.duration}</span>
                  )}
                </div>
              </div>
              
              <div className="features-section">
                <div className="features-title">What's Included</div>
                <ul className="features-list">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="feature-item">
                      <FaCheck className="check-icon" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="plan-footer">
                <button
                  className={`cta-button ${plan.freeTrial ? 'free-trial' : ''} ${plan.popular ? 'popular-btn' : ''} ${plan.freeTrial && !isEligibleForFreeTrial ? 'disabled' : ''} ${!plan.freeTrial && (hasBookedRecently(plan.name) || purchasedPlan) ? 'disabled' : ''}`}
                  onClick={() => handlePayNow(plan)}
                  disabled={plan.freeTrial && !isEligibleForFreeTrial || (!plan.freeTrial && (hasBookedRecently(plan.name) || purchasedPlan))}
                >
                  <span className="button-text">
                    {plan.freeTrial ? (isEligibleForFreeTrial ? "Start Free Trial" : "Already Claimed") : 
                     (purchasedPlan ? 
                       (purchasedPlan === 'Monthly Membership' ? "Booked for 24 hrs" : "Booked for 24 hrs") : 
                       (hasBookedRecently(plan.name) ? 
                         (plan.name === 'Monthly Membership' ? "Booked for 24 hrs" : "Booked for 24 hrs") : 
                         "Choose Plan"))}
                  </span>
                  <div className="button-arrow">→</div>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Payment Modal */}
      {showPaymentModal && (
        <div className="payment-modal-overlay" onClick={closeModal}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h3>Complete Your Purchase</h3>
                <p>Secure payment with Razorpay</p>
              </div>
              <button className="close-button" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="selected-plan-card">
                <div className="plan-summary">
                  <div className="plan-info">
                    <h4>{selectedPlan?.name}</h4>
                    <p>{selectedPlan?.subtitle || 'Subscription Plan'}</p>
                  </div>
                  <div className="price-summary">
                    {selectedPlan?.originalPrice && (
                      <span className="original-price-modal">₹{selectedPlan?.originalPrice}</span>
                    )}
                    <span className="final-price">₹{selectedPlan?.price}</span>
                  </div>
                </div>
                {selectedPlan?.originalPrice && (
                  <div className="savings-info">
                    <span className="savings-text">
                      You save ₹{selectedPlan?.originalPrice - selectedPlan?.price}!
                    </span>
                  </div>
                )}
              </div>
              
              {/* Razorpay Payment Integration */}
              <div className="payment-methods-section">
                <h5>PAYMENT METHOD</h5>
                <div className="payment-grid">
                  {/* Credit/Debit Card Payment Method */}
                  <div className="payment-method-card credit-card-method">
                    <div className="method-header">
                      <div className="method-icon">
                        <FaCreditCard />
                      </div>
                      <div className="method-details">
                        <span className="method-name">Credit/Debit Card</span>
                        <span className="method-description">Pay securely with your card</span>
                      </div>
                    </div>
                    <div className="method-footer">
                      <PaymentButton
                        amount={parseInt(selectedPlan?.price)}
                        eventName={selectedPlan?.name}
                        eventId={`plan_${selectedPlan?.name.toLowerCase().replace(/\s+/g, '_')}`}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentFailure={handlePaymentFailure}
                      />
                    </div>
                  </div>
                  
                  {/* UPI Payment Method */}
                  <div className="payment-method-card upi-method">
                    <div className="method-header">
                      <div className="method-icon">
                        <FaQrcode />
                      </div>
                      <div className="method-details">
                        <span className="method-name">UPI Payment</span>
                        <span className="method-description">Pay instantly using any UPI app</span>
                      </div>
                    </div>
                    <div className="method-footer">
                      <PaymentButton
                        amount={parseInt(selectedPlan?.price)}
                        eventName={selectedPlan?.name}
                        eventId={`plan_${selectedPlan?.name.toLowerCase().replace(/\s+/g, '_')}_upi`}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentFailure={handlePaymentFailure}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="security-note">
                  <FaCheck className="security-icon" />
                  <span>Secure payment processing powered by Razorpay</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Element>
  );
};

export default Plans;