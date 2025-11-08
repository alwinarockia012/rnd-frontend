import React, { useEffect, useState } from 'react';
import Logo from '../../assets/redlogo.png';
import './Header.css';
import { Link as ScrollLink } from 'react-scroll';
import Bars from '../../assets/bars.png';
import { useNavigate, Link } from 'react-router-dom';
import { FaChevronDown } from 'react-icons/fa';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';

const Header = () => {
  const [menuOpened, setMenuOpened] = useState(false);
  const [openPrograms, setOpenPrograms] = useState(false);
  const [user, setUser] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const navigate = useNavigate();

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    console.log('Install button clicked');
    console.log('Deferred prompt available:', !!deferredPrompt);
    console.log('Is localhost:', window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    console.log('Is HTTPS:', window.location.protocol === 'https:');
    
    // Check if we're in localhost development
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        // Clear the deferred prompt
        setDeferredPrompt(null);
      });
    } else if (isLocalhost) {
      // Special handling for localhost development
      let message = 'PWA installation testing:\n\n';
      message += '1. This app is currently running in development mode on localhost.\n';
      message += '2. For full PWA functionality, deploy to a production environment with HTTPS.\n';
      message += '3. In Chrome, you can test PWA installation using DevTools:\n';
      message += '   - Open DevTools (F12)\n';
      message += '   - Go to Application tab\n';
      message += '   - Click "Manifest" in the sidebar\n';
      message += '   - Click "Add to homescreen"\n\n';
      
      if (isIOS) {
        message += 'For iOS Safari:\n';
        message += '1. Open this site in Safari\n';
        message += '2. Tap the Share button\n';
        message += '3. Select "Add to Home Screen"\n';
      } else {
        message += 'For other browsers:\n';
        message += '1. Look for the install icon in the address bar\n';
        message += '2. Or check the browser menu for "Install" or "Add to Home Screen" option\n';
      }
      
      alert(message);
    } else {
      // If no deferred prompt and not localhost, show instructions for manual install
      let message = 'To install this app:\n\n';
      
      if (isIOS) {
        message += '1. Open this site in Safari\n';
        message += '2. Tap the Share button\n';
        message += '3. Select "Add to Home Screen"\n';
      } else {
        message += '1. Look for the install icon in the address bar\n';
        message += '2. Or check the browser menu for "Install" or "Add to Home Screen" option\n';
      }
      
      alert(message);
    }
  };

  // Lock body scroll when drawer open
  useEffect(() => {
    if (menuOpened) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpened]);

  const closeDrawer = () => setMenuOpened(false);

  return (
    <>
      <div className="header" id="header">
        <img src={Logo} alt="Logo" className="logo" />

        {/* Desktop menu */}
        <ul className="header-menu">
          <li>
            <ScrollLink to="home" spy={true} smooth={true} duration={500} offset={-80}>
              Home page
            </ScrollLink>
          </li>
          <li>
            <ScrollLink to="about" spy={true} smooth={true} duration={500} offset={-80}>
              About us
            </ScrollLink>
          </li>
          <li onClick={() => navigate('/events')}>Events</li>
          <li>
            <ScrollLink to="plans" spy={true} smooth={true} duration={500} offset={-80}>
              Membership
            </ScrollLink>
          </li>
          <li>
            <button className="install-header-btn" onClick={handleInstallClick}>
              Download App
            </button>
          </li>
          {user ? (
            <li onClick={() => navigate('/dashboard')}>Dashboard</li>
          ) : (
            <>
              <li onClick={() => navigate('/signup')}>Join Now</li>
            </>
          )}
        </ul>

        {/* Mobile header */}
        <div className="mobile-header-right">
          <button className="install-header-btn mobile" onClick={handleInstallClick}>
            Download
          </button>
          <button className="mobile-trigger" onClick={() => setMenuOpened(true)} aria-label="Open menu">
            <img src={Bars} alt="menu" width={24} height={24} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobile && (
        <div className={`mobile-drawer ${menuOpened ? 'open' : ''}`} role="dialog" aria-modal="true">
          <div className="drawer-topbar">
            <div className="drawer-logo">
              <img src={Logo} alt="Run & Develop" />
              <span>Run & Develop</span>
            </div>
            <button className="drawer-close" aria-label="Close menu" onClick={closeDrawer}>
              ×
            </button>
          </div>

          <nav className="drawer-nav">
            <button className="drawer-link" onClick={closeDrawer}>
              <ScrollLink to="home" spy={true} smooth={true} duration={500} offset={-80}>
                Home
              </ScrollLink>
            </button>

            <div className="drawer-group">
              <button
                className="drawer-link has-caret"
                aria-expanded={openPrograms}
                onClick={() => setOpenPrograms((v) => !v)}
                type="button"
              >
                <span>Programs</span>
                <FaChevronDown className={`caret ${openPrograms ? 'open' : ''}`} />
              </button>
              {openPrograms && (
                <div className="drawer-submenu">
                  <Link to="/programs" onClick={closeDrawer}>All Programs</Link>
                  <ScrollLink to="plans" spy={true} smooth={true} duration={500} offset={-80} onClick={closeDrawer}>
                    Membership
                  </ScrollLink>
                </div>
              )}
            </div>

            <button className="drawer-link" onClick={() => { closeDrawer(); navigate('/events'); }}>
              Events
            </button>

            <button className="drawer-link" onClick={closeDrawer}>
              <ScrollLink to="about" spy={true} smooth={true} duration={500} offset={-80}>
                About
              </ScrollLink>
            </button>

            <button className="drawer-link" onClick={handleInstallClick}>
              Download App
            </button>

            {user ? (
              <button className="drawer-link" onClick={() => { closeDrawer(); navigate('/dashboard'); }}>
                Dashboard
              </button>
            ) : (
              <>
                <button className="drawer-link" onClick={() => { closeDrawer(); navigate('/signup'); }}>
                  Join Now
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
};

export default Header;