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
  const [dob, setDob] = useState("");
  const navigate = useNavigate();
  const dobInputRef = useRef(null);

  useEffect(() => {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
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

  // Calculate maximum date (13 years ago from today)
  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  };

  // Calculate minimum date (100 years ago from today)
  const getMinDate = () => {
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    return minDate.toISOString().split('T')[0];
  };

  const handleDobChange = (e) => {
    const selectedDate = e.target.value;
    setDob(selectedDate);
    
    // Check if user is under 13
    const dobDate = new Date(selectedDate);
    const today = new Date();
    const thirteenYearsAgo = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    
    if (dobDate > thirteenYearsAgo) {
      showNotification("You must be at least 13 years old to register.", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate DOB
    if (!dob) {
      showNotification("Please enter your date of birth.", "error");
      setSubmitting(false);
      return;
    }

    // Check if user is under 13
    const dobDate = new Date(dob);
    const today = new Date();
    const thirteenYearsAgo = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    
    if (dobDate > thirteenYearsAgo) {
      showNotification("You must be at least 13 years old to register.", "error");
      setSubmitting(false);
      return;
    }

    if (!confirmationResult) {
      showNotification("Please get an OTP first.", "error");
      setSubmitting(false);
      return;
    }

    try {
      const userCredential = await confirmationResult.confirm(otp);
      const user = userCredential.user;

      const formData = new FormData(e.target);
      const rawData = Object.fromEntries(formData.entries());

      // Update Firebase Auth profile with displayName
      await updateProfile(user, {
        displayName: rawData.fullname
      });

      // Map form data to the correct structure for Firestore
      const userData = {
        displayName: rawData.fullname,
        gender: rawData.gender,
        dateOfBirth: dob, // Use the state value
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
    navigate('/terms');
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
          <button className="toggle-btn" onClick={handleSignInClick}>LogIn</button>
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
              <div className="date-input-wrapper">
                <input 
                  type="date" 
                  name="dob" 
                  required 
                  value={dob}
                  onChange={handleDobChange}
                  ref={dobInputRef}
                  max={getMaxDate()}
                  min={getMinDate()}
                  className="date-input"
                />
                <span className="calendar-icon" onClick={() => dobInputRef.current?.showPicker?.()}>
                  📅
                </span>
              </div>
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
              Login
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;