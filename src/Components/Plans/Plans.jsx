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

const Plans = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showSignUpNotification, setShowSignUpNotification] = useState(false);
  const [showPlanNotification, setShowPlanNotification] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isEligibleForFreeTrial, setIsEligibleForFreeTrial] = useState(true); // Default to true for public pages

  const checkFreeTrialEligibility = useCallback(async (userId, phoneNumber) => {
    try {
      // Check if user has any existing bookings with a timeout
      const bookingsRef = collection(db, 'bookings');
      const userQuery = query(bookingsRef, where('userId', '==', userId));
      
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
      
      if (!userQuerySnapshot.empty) {
        setIsEligibleForFreeTrial(false);
        return false;
      }
      
      // Check if phone number has been used for a free trial
      if (phoneNumber) {
        const phoneQuery = query(bookingsRef, where('phoneNumber', '==', phoneNumber));
        
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
        const eligible = phoneQuerySnapshot.empty;
        setIsEligibleForFreeTrial(eligible);
        return eligible;
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

  // Check free trial eligibility when component mounts and user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if we're on the dashboard page
        const isOnDashboard = document.querySelector('.plans-page') !== null;
        if (isOnDashboard) {
          // Only check eligibility on dashboard pages
          try {
            await checkFreeTrialEligibility(currentUser.uid, currentUser.phoneNumber || '');
          } catch (error) {
            console.error('Error in useEffect while checking eligibility:', error);
            showNotification("There was an issue checking your plan eligibility. Please refresh the page.", 'error');
          }
        }
      } else {
        // Reset eligibility for non-logged in users
        setIsEligibleForFreeTrial(true);
      }
    });

    return () => unsubscribe();
  }, [checkFreeTrialEligibility]);

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
      price: "1",
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
        // For eligible users, show the plan notification
        setSelectedPlan(plan);
        setShowPlanNotification(true);
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
        const bookingData = {
          eventName: selectedPlan.name,
          eventDate: new Date(), // In a real implementation, you might want to set a specific date
          status: 'confirmed',
          amount: selectedPlan.price,
          paymentId: response.razorpay_payment_id || response.razorpay_order_id,
          mode: 'razorpay'
        };
        
        await firebaseService.createBooking(user.uid, bookingData);
        console.log('Booking created successfully');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      // Even if booking creation fails, we still want to show success message
    }
    
    // Show success notification using in-app notification
    showNotification('Payment successful! Thank you for your purchase.', 'success');
    // Here you would typically redirect to a success page or update the UI
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
      
      {showPlanNotification && selectedPlan && (
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
                  className={`cta-button ${plan.freeTrial ? 'free-trial' : ''} ${plan.popular ? 'popular-btn' : ''} ${plan.freeTrial && !isEligibleForFreeTrial ? 'disabled' : ''}`}
                  onClick={() => handlePayNow(plan)}
                  disabled={plan.freeTrial && !isEligibleForFreeTrial}
                >
                  <span className="button-text">
                    {plan.freeTrial ? (isEligibleForFreeTrial ? "Start Free Trial" : "Already Claimed") : "Choose Plan"}
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