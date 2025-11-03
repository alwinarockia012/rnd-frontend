import React from 'react';
import './FreeTrialNotification.css';

const FreeTrialNotification = ({ onClose, onClaimFreeTrial }) => {
  return (
    <div className="free-trial-overlay">
      <div className="free-trial-notification">
        <button className="close-btn" onClick={onClose}>×</button>
        <div className="notification-content">
          <h2>Unclaimed Free Trial</h2>
          <p>You have an unclaimed free trial!</p>
        </div>
        <div className="notification-buttons">
          <button className="claim-btn" onClick={onClaimFreeTrial}>
            Claim Free Trial
          </button>
        </div>
      </div>
    </div>
  );
};

export default FreeTrialNotification;