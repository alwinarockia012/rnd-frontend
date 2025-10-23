import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUsers, FaHome, FaUser, FaSignOutAlt, FaCalendarAlt, FaBell, FaTimes, FaRunning } from 'react-icons/fa';
// import { useAuth } from '../../../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import './DashboardNav.css';

const DashboardNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const { currentUser } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const profileMenuRef = useRef(null);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FaHome },
    { path: '/community', label: 'Community', icon: FaUsers },
    // Removed progress page from navigation
    { path: '/user-events', label: 'My Events', icon: FaCalendarAlt },
    // Add Plans page to navigation
    { path: '/plans', label: 'Plans', icon: FaRunning }
  ];

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const handleViewProfile = () => {
    navigate('/profile');
    setIsProfileMenuOpen(false);
  };

  const handleNotifications = () => {
    // Navigate to the notifications page
    navigate('/notifications');
    setIsProfileMenuOpen(false);
  };

  const handleGoToLandingPageClick = () => {
    // Show confirmation notification instead of navigating directly
    setNotificationMessage('Are you sure you want to go to the landing page?');
    setPendingAction('landing');
    setShowNotification(true);
    setIsProfileMenuOpen(false);
  };

  const handleLogout = async () => {
    // Show confirmation notification instead of logging out directly
    setNotificationMessage('Are you sure you want to logout?');
    setPendingAction('logout');
    setShowNotification(true);
    setIsProfileMenuOpen(false);
  };

  const handleNotificationClose = () => {
    setShowNotification(false);
    setPendingAction(null);
  };

  const handleNotificationConfirm = () => {
    if (pendingAction === 'landing') {
      navigate('/');
    } else if (pendingAction === 'logout') {
      performLogout();
    }
    setShowNotification(false);
    setPendingAction(null);
  };

  const performLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/');
    }
  };

  return (
    <nav className="dashboard-nav">
      <div className="nav-content">
        <div className="nav-logo">
          <img src="/redlogo.png" alt="Run & Develop" />
          <span>Run & Develop</span>
        </div>
        
        <div className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="nav-user" ref={profileMenuRef}>
          <div className="profile-icon" onClick={handleProfileClick}>
            <div className="profile-image-placeholder">
              <FaUser />
            </div>
          </div>
          
          {isProfileMenuOpen && (
            <div className="profile-dropdown">
              <button className="dropdown-item" onClick={handleViewProfile}>
                <FaUser />
                <span>Profile</span>
              </button>
              <button className="dropdown-item" onClick={handleNotifications}>
                <FaBell />
                <span>Notifications</span>
              </button>
              <button className="dropdown-item" onClick={handleGoToLandingPageClick}>
                <FaHome />
                <span>Go to Landing Page</span>
              </button>
              <button className="dropdown-item logout-item" onClick={handleLogout}>
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* In-App Notification for Confirmation */}
      {showNotification && (
        <div className="notification-overlay">
          <div className="custom-notification">
            <div className="custom-notification-header">
              <span className="notification-icon">⚠️</span>
              <button className="notification-close-btn" onClick={handleNotificationClose}>
                <FaTimes />
              </button>
            </div>
            <div className="custom-notification-content">
              <p className="notification-message">{notificationMessage}</p>
              <div className="notification-buttons">
                {pendingAction === 'logout' ? (
                  <button className="confirm-btn" onClick={handleNotificationConfirm}>
                    Yes, Logout
                  </button>
                ) : pendingAction === 'landing' ? (
                  <button className="confirm-btn" onClick={() => {
                    // For landing page, we want to logout
                    setPendingAction('logout');
                    // We need to trigger the logout action directly
                    performLogout();
                    // Close the notification
                    setShowNotification(false);
                  }}>
                    Yes, Logout
                  </button>
                ) : (
                  <button className="confirm-btn" onClick={handleNotificationConfirm}>
                    Yes
                  </button>
                )}
                <button className="cancel-btn" onClick={handleNotificationClose}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default DashboardNav;