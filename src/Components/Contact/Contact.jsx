import React, { useState } from 'react';
import Notification from '../Notification/Notification';
import './Contact.css';

const Contact = () => {
  const [notification, setNotification] = useState(null);

  const closeNotification = () => {
    setNotification(null);
  };

  return (
    <div className="register-container">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      )}
      
      {/* Header Text */}
      <div className="header-text">
        <div className="header-line"></div>
        <h1>
          <span className="stroke-text">READY TO</span> <span className="white-text">LEVEL UP</span><br/>
          <span className="fill-text">YOUR BODY /</span><br/>
          <span className="fill-text">BUSINESS</span><br/>
          <span className="stroke-text">WITH US?</span>
        </h1>
      </div>

      {/* Contact Info */}
      <div className="contact-info-box">
        <h3>Contact Us</h3>
        <a
          href="https://www.instagram.com/run_and_develop?igsh=MW9pdzV0YXBlZGZtaA=="
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fa fa-instagram"></i>
          <span>Run and develop</span>
        </a>
      </div>

    </div>
  );
};

export default Contact;