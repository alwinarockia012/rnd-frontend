import React, { useState, useEffect, useRef } from "react";
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import firebaseService from "../../services/firebaseService";
import Notification from "../Notification/Notification";
import "./SignIn.css";

const SignIn = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [error, setError] = useState(null);
  const [isPhoneFilled, setIsPhoneFilled] = useState(false);
  const [isOtpFilled, setIsOtpFilled] = useState(false);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();
  
  const otpInputs = useRef([]);
  const recaptchaContainerRef = useRef(null);

  useEffect(() => {
    // Clean up previous recaptcha verifier if it exists
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    
    // Initialize recaptcha after component mount when DOM is ready
    const initRecaptcha = () => {
      try {
        // Check if container element exists
        if (!recaptchaContainerRef.current) {
          console.warn("Recaptcha container not found, retrying...");
          setTimeout(initRecaptcha, 100);
          return;
        }
        
        // Initialize recaptcha verifier with proper parameters for Netlify
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          'size': 'invisible',
          'callback': (response) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber to proceed
            console.log("Recaptcha verified");
          },
          'expired-callback': () => {
            // Response expired, reset the recaptcha
            console.log("Recaptcha expired");
            showNotification("Recaptcha expired. Please try again.", "error");
          },
          'error-callback': (error) => {
            console.error("Recaptcha error:", error);
            showNotification("Recaptcha error. Please refresh the page and try again.", "error");
          }
        });
        
        // Render the recaptcha
        window.recaptchaVerifier.render().catch(error => {
          console.error("Recaptcha render error:", error);
          showNotification("Failed to initialize reCAPTCHA. Please refresh the page.", "error");
          // Try to reinitialize recaptcha as visible if invisible fails
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
          }
          // Check again if container exists before reinitializing
          if (recaptchaContainerRef.current) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
              'size': 'normal', // Fallback to visible recaptcha
              'callback': (response) => {
                console.log("Visible Recaptcha verified");
              },
              'expired-callback': () => {
                console.log("Visible Recaptcha expired");
                showNotification("Recaptcha expired. Please try again.", "error");
              },
              'error-callback': (error) => {
                console.error("Visible Recaptcha error:", error);
                showNotification("Recaptcha error. Please refresh the page and try again.", "error");
              }
            });
            
            window.recaptchaVerifier.render().catch(renderError => {
              console.error("Visible Recaptcha render error:", renderError);
              showNotification("Failed to initialize reCAPTCHA. Please check your internet connection and refresh the page.", "error");
            });
          }
        });
      } catch (error) {
        console.error("Error initializing RecaptchaVerifier:", error);
        showNotification("Failed to initialize reCAPTCHA. Please check your internet connection and refresh the page.", "error");
      }
    };
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(initRecaptcha, 100);
    
    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  useEffect(() => {
    setIsPhoneFilled(phoneNumber.length === 10);
  }, [phoneNumber]);

  useEffect(() => {
    const allFilled = otp.every(digit => digit !== "");
    setIsOtpFilled(allFilled);
  }, [otp]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
  };

  const closeNotification = () => {
    setNotification(null);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsSendingOtp(true);
    setError(null);
    
    try {
      // Validate phone number format
      if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
        showNotification("Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.", "error");
        setIsSendingOtp(false);
        return;
      }

      // Check if phone number exists in the database
      const phoneExists = await firebaseService.isPhoneNumberExists(phoneNumber);
      if (!phoneExists) {
        showNotification("This phone number is not registered. Please sign up first.", "warning not-registered");
        // Navigate to sign up page after a short delay
        setTimeout(() => {
          navigate("/SignUp");
        }, 2000);
        setIsSendingOtp(false);
        return;
      }

      const fullPhoneNumber = "+91" + phoneNumber;
      console.log("Attempting to send OTP to:", fullPhoneNumber);
      
      // Check if Firebase auth is properly initialized
      if (!auth) {
        throw new Error("Firebase auth is not initialized properly.");
      }

      // Ensure recaptcha is ready
      if (!window.recaptchaVerifier) {
        // Try to reinitialize recaptcha
        try {
          if (recaptchaContainerRef.current) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
              'size': 'invisible',
              'callback': (response) => {
                console.log("Recaptcha verified during reinit");
              },
              'expired-callback': () => {
                // Response expired, reset the recaptcha
                console.log("Recaptcha expired during reinit");
                showNotification("Recaptcha expired. Please try again.", "error");
              },
              'error-callback': (error) => {
                console.error("Recaptcha error during reinit:", error);
                showNotification("Recaptcha error. Please refresh the page and try again.", "error");
              }
            });
            await window.recaptchaVerifier.render();
          } else {
            throw new Error("Recaptcha container not found");
          }
        } catch (recaptchaError) {
          console.error("Failed to reinitialize recaptcha:", recaptchaError);
          showNotification("Failed to initialize reCAPTCHA. Please refresh the page.", "error");
          setIsSendingOtp(false);
          return;
        }
      }

      // Debug: Log auth and recaptcha verifier state
      console.log("Auth object:", auth);
      console.log("Recaptcha verifier:", window.recaptchaVerifier);
      console.log("Firebase app name:", auth.app.name);
      console.log("Firebase config:", auth.app.options);

      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);
      setConfirmationResult(result);
    
      setTimeout(() => {
        if (otpInputs.current[0]) {
            otpInputs.current[0].focus();
        }
    }, 0);
    
    // Show notification instead of popup
    showNotification("OTP Sent Successfully", "otp-success");

  } catch (err) {
    console.error("Error sending OTP:", err);
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
    
    // Log additional debugging information
    console.log("Current auth state:", auth.currentUser);
    console.log("Recaptcha verifier state:", window.recaptchaVerifier ? "Available" : "Not available");
    
    let errorMessage = "Failed to send OTP. ";
    
    if (err.code === 'auth/too-many-requests') {
      errorMessage += "Too many requests. Please try again later.";
    } else if (err.code === 'auth/invalid-phone-number') {
      errorMessage += "Invalid phone number format.";
    } else if (err.code === 'auth/missing-app-credential') {
      errorMessage += "Firebase configuration error. Please contact support.";
    } else if (err.code === 'auth/internal-error') {
      // Specific handling for internal-error
      errorMessage += "Authentication service error. This may be due to network issues, Firebase configuration, or country restrictions. Please check your internet connection and try again.";
    } else if (err.code === 'auth/captcha-check-failed') {
      errorMessage += "reCAPTCHA verification failed. Please try again.";
    } else if (err.code === 'auth/missing-phone-number') {
      errorMessage += "Phone number is missing or invalid.";
    } else if (err.code === 'auth/quota-exceeded') {
      errorMessage += "SMS quota exceeded. Please contact support.";
    } else {
      errorMessage += err.message || "Please try again.";
    }
    
    showNotification(errorMessage, "error");
  } finally {
    setIsSendingOtp(false);
  }
};
  
  const handleOtpChange = (element, index) => {
    const value = element.value;
    if (/^\d?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value !== "" && index < 5) {
        otpInputs.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && otp[index] === "" && index > 0) {
      e.preventDefault();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      otpInputs.current[index - 1].focus();
    }
  };
  
  const handlePaste = (e) => {
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      setTimeout(() => {
          otpInputs.current[newOtp.length - 1].focus();
      }, 0);
    }
    e.preventDefault();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setIsVerifyingOtp(true);
    
    try {
      const fullOtp = otp.join("");
      
      if (fullOtp.length !== 6) {
        showNotification("Please enter the complete 6-digit OTP.", "error");
        setIsVerifyingOtp(false);
        return;
      }
      
      if (confirmationResult) {
        await confirmationResult.confirm(fullOtp);
        console.log("OTP verification successful!");
        
        // Clear any existing user data from localStorage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('eventBookings');
        localStorage.removeItem('eventParticipants');
        
        // Navigate to dashboard
        navigate("/dashboard");
      } else {
        showNotification("No OTP request found. Please request a new OTP.", "error");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      let errorMessage = "Failed to verify OTP. ";
      
      if (err.code === 'auth/invalid-verification-code') {
        errorMessage += "Invalid OTP. Please check and try again.";
      } else if (err.code === 'auth/code-expired') {
        errorMessage += "OTP has expired. Please request a new one.";
      } else if (err.code === 'auth/missing-app-credential') {
        errorMessage += "Firebase configuration error. Please contact support.";
      } else if (err.code === 'auth/internal-error') {
        errorMessage += "Authentication service error. Please check your internet connection and try again.";
      } else if (err.code === 'auth/captcha-check-failed') {
        errorMessage += "reCAPTCHA verification failed. Please refresh the page and try again.";
      } else if (err.code === 'auth/missing-phone-number') {
        errorMessage += "Phone number is missing. Please refresh the page and try again.";
      } else {
        errorMessage += err.message || "Please try again.";
      }
      
      showNotification(errorMessage, "error");
    } finally {
      setIsVerifyingOtp(false);
    }
  };
  
  const handleResendOtp = async (e) => {
    e.preventDefault();
    setConfirmationResult(null);
    setOtp(["", "", "", "", "", ""]);
    await handleSendOtp(e);
  };

  return (
    <div className="SignIn-body">
      <div className="SignIn-card">
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={closeNotification}
          />
        )}

        <div className="logo">
          <img src="/redlogo.png" alt="logo" className="logo-img" />
        </div>
        <div className="SignIn-title">Phone Login</div>
        <form>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group-container">
            <div className="form-group phone-input">
              <label htmlFor="phone">MOBILE NUMBER</label>
              <div className="phone-input-container">
                <span className="country-code">+91</span>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  placeholder="ENTER YOUR NUMBER"
                  disabled={confirmationResult}
                  maxLength="10"
                />
              </div>
            </div>
            <button 
              type="button" 
              className={`btn-SignIn get-otp-btn ${isPhoneFilled ? 'filled' : ''} ${confirmationResult ? 'sent' : ''}`}
              onClick={confirmationResult ? handleResendOtp : handleSendOtp} 
              disabled={isSendingOtp || (!confirmationResult && phoneNumber.length !== 10)}
            >
              {isSendingOtp ? "Sending..." : (confirmationResult ? "Resend" : "Get OTP")}
            </button>
          </div>

          <div className="otp-section">
            <div className="form-group otp-input-group">
              <label htmlFor="otp-container">OTP</label>
              <div className="otp-container">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="tel"
                    maxLength="1"
                    className={`otp-input ${digit !== '' ? 'filled' : ''}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    required
                    disabled={!confirmationResult}
                    ref={(el) => (otpInputs.current[index] = el)}
                  />
                ))}
              </div>
            </div>
            <button 
              type="button" 
              className={`btn-SignIn verify-otp-btn ${isOtpFilled ? 'filled' : ''}`}
              onClick={handleVerifyOtp} 
              disabled={isSendingOtp || isVerifyingOtp || !confirmationResult || otp.join("").length < 6}
            >
              {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
          
          {/* Changed from display:none to visibility:hidden to keep element in DOM */}
          <div id="recaptcha-container" ref={recaptchaContainerRef} style={{ visibility: 'hidden', position: 'absolute' }}></div>
          <div className="signup-link">
            Don't have an account? <a href="/SignUp">Sign up</a>
          </div>
          <div className="admin-link">
            <a href="/admin" className="btn-admin">Admin Login</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignIn;