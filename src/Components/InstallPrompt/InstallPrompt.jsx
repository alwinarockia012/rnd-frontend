import React, { useState, useEffect } from 'react';
import { isAppInstalled } from '../../utils/pwaUtils';
import './InstallPrompt.css';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (isAppInstalled()) {
      return; // Already installed, don't show prompt
    }

    // Check if user has already dismissed the prompt
    const hasDismissed = localStorage.getItem('installPromptDismissed');
    if (hasDismissed) {
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt after a delay
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000); // Show after 3 seconds
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          // Hide the prompt immediately after installation
          setShowInstallPrompt(false);
        } else {
          console.log('User dismissed the install prompt');
        }
        // Clear the deferred prompt
        setDeferredPrompt(null);
        // Hide the prompt
        setShowInstallPrompt(false);
      });
    }
  };

  const handleNotNowClick = () => {
    // Set flag to not show again in this session
    localStorage.setItem('installPromptDismissed', 'true');
    setShowInstallPrompt(false);
  };

  // Hide prompt if app is installed while prompt is visible
  useEffect(() => {
    const handleAppInstalled = () => {
      setShowInstallPrompt(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt">
        <div className="install-prompt-logo">
          <img src="/logo192.png" alt="Tech Vaseegrah Logo" />
        </div>
        <h3>Install Tech Vaseegrah App for quick access 🚀</h3>
        <div className="install-prompt-buttons">
          <button className="install-btn" onClick={handleInstallClick}>
            Install App
          </button>
          <button className="not-now-btn" onClick={handleNotNowClick}>
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;