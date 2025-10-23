import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber, updateProfile } from "firebase/auth";
import { auth } from "../../firebase";
import firebaseService from "../../services/firebaseService";
import Notification from "../Notification/Notification";
import "./SignUp.css";

const SignUp = () => {
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();
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
        
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          'size': 'invisible',
          'callback': (response) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
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

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
  };

  const closeNotification = () => {
    setNotification(null);
  };

  const handleGetOtp = async () => {
    if (!phone || phone.length !== 10) {
      showNotification("Please enter a valid 10-digit phone number.", "error");
      return;
    }
    
    try {
      // Check if phone number already exists
      const phoneExists = await firebaseService.isPhoneNumberExists(phone);
      if (phoneExists) {
        showNotification("This phone number is already registered. Redirecting to sign in...", "warning");
        // Navigate to sign in page after a short delay
        setTimeout(() => {
          navigate("/SignIn");
        }, 2000);
        return;
      }
      
      const appVerifier = window.recaptchaVerifier;
      const phoneNumber = `+91${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      showNotification("✅ OTP sent successfully!", "success");
    } catch (error) {
      console.error("Error sending OTP:", error);
      showNotification("❌ " + (error.message || "Failed to send OTP."), "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate date of birth (must be at least 13 years old)
    const formData = new FormData(e.target);
    const dob = formData.get('dob');
    if (dob) {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birthday hasn't occurred this year yet
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 13) {
        showNotification("You must be at least 13 years old to register.", "error");
        setSubmitting(false);
        return;
      }
    }

    if (!confirmationResult) {
      showNotification("Please get an OTP first.", "error");
      setSubmitting(false);
      return;
    }

    try {
      const userCredential = await confirmationResult.confirm(otp);
      const user = userCredential.user;

      const rawData = Object.fromEntries(formData.entries());

      // Update Firebase Auth profile with displayName
      await updateProfile(user, {
        displayName: rawData.fullname
      });

      // Map form data to the correct structure for Firestore
      const userData = {
        displayName: rawData.fullname,
        gender: rawData.gender,
        dateOfBirth: rawData.dob,
        profession: rawData.profession,
        phone: rawData.phone,
        emergencyContact: rawData.emergency,
        firebase_uid: user.uid,
        joinCrew: formData.get("joinCrew") ? true : false,
        termsAccepted: formData.get("termsAccepted") ? true : false,
      };

      // Store user details in localStorage
      const userDetails = {
        fullName: userData.displayName,
        phone: userData.phone,
        emergencyContact: userData.emergencyContact,
        firebase_uid: user.uid
      };
      localStorage.setItem('currentUser', JSON.stringify(userDetails));

      // Register user in Firestore
      await firebaseService.saveUserProfile(user.uid, userData);

      showNotification("✅ User registered successfully!", "success");
      e.target.reset();
      navigate("/dashboard");
    } catch (error) {
      console.error("Error confirming OTP or registering user:", error);
      showNotification("❌ " + (error.message || "Failed to sign up."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTermsClick = (e) => {
    e.preventDefault();
    navigate('/terms-and-conditions');
  };

  const handleSignInClick = () => {
    navigate("/SignIn");
  };

  return (
    <div className="register-wrapper">
      <div id="recaptcha-container"></div>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      )}
      <div className="form-box">
        <div className="logo">
          <img src="redlogo.png" alt="logo" className="logo-img" />
        </div>
        <div className="top-buttons">
          <button className="toggle-btn active">Sign Up</button>
          <button className="toggle-btn" onClick={handleSignInClick}>Log in</button>
        </div>
        <div className="club">
          <h2>Join the club</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" name="fullname" placeholder="Enter your full name" required />
            </div>
            <div className="form-group">
              <label>Gender *</label>
              <select name="gender" required>
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date of Birth *</label>
              <input 
                type="date" 
                name="dob" 
                required 
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label>Profession *</label>
              <select name="profession" required>
                <option value="">Select your profession</option>
                <option>Student</option>
                <option>Employee</option>
                <option>Business</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone Number * (10 digits)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="tel" name="phone" placeholder="10-digit mobile number" maxLength={10} required style={{ flex: 1 }} value={phone} onChange={(e) => setPhone(e.target.value)} />
                <button type="button" onClick={handleGetOtp} className="get-otp-btn">Get OTP</button>
              </div>
            </div>
            <div className="form-group">
              <label>Emergency Contact</label>
              <input type="tel" name="emergency" placeholder="Emergency contact number" maxLength={10} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Enter OTP *</label>
              <input type="text" name="otp" placeholder="Enter the 6-digit OTP" maxLength="6" required value={otp} onChange={(e) => setOtp(e.target.value)} />
            </div>
          </div>
          <div className="form-check">
            <input type="checkbox" name="termsAccepted" required /> I accept the{" "}
            <button type="button" className="link-button" onClick={handleTermsClick}>Terms and Conditions</button>
          </div>
          <div className="form-check">
            <input type="checkbox" name="joinCrew" /> I want to join the crew
          </div>

          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Sign Up"}
          </button>

          <p className="SignIn-text">
            Already have an account?{" "}
            <button
              type="button"
              className="link-button"
              onClick={(e) => {
                e.preventDefault();
                handleSignInClick();
              }}
            >
              SignIn
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;