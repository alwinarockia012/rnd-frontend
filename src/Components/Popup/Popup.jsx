import React, { useEffect, useState } from 'react';
import { Link } from 'react-scroll';
import { useNavigate } from 'react-router-dom'; // Add this import
import './Popup.css'; // Make sure this CSS file is imported

const Popup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate(); // Add this hook

  // Show the popup after the component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 500); // small delay for smooth entrance
    return () => clearTimeout(timer);
  }, []);

  const closePopup = () => {
    setIsClosing(true); // Trigger the closing animation
    setTimeout(() => {
      setShowPopup(false);
      setIsClosing(false); // Reset for next time
    }, 500); // should match exit animation duration
  };

  // Function to handle register now button click
  const handleRegisterNow = () => {
    closePopup(); // Close the popup first
    setTimeout(() => {
      navigate('/signup'); // Navigate to signup page after a short delay
    }, 300); // Small delay to allow popup closing animation to complete
  };

  // Conditionally render the popup
  if (!showPopup) {
    return null; 
  }

  return (
    <div className={`popup-overlay ${showPopup ? 'active' : ''} ${isClosing ? 'closing' : ''}`}>
      <div className="popup-content">
        <button className="close-btn" onClick={closePopup}>&times;</button>
        <h2>Your First Run is FREE!</h2>
        <p>Limited spots. Don’t miss out! Register now & lock in your spot!</p>
        {/* You can make this a link or a button */}
        <button // Changed from Link to button
          className="register-button"
          onClick={handleRegisterNow} // Changed to use navigate
        >
          REGISTER NOW
        </button>
      </div>
    </div>
  );
};

export default Popup;