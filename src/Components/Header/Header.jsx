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
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  const navigate = useNavigate();

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

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
        {!isMobile && (
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
            {user ? (
              <li onClick={() => navigate('/dashboard')}>Dashboard</li>
            ) : (
              <>
                <li onClick={() => navigate('/signup')}>Join Now</li>
              </>
            )}
          </ul>
        )}

        {/* Mobile trigger */}
        {isMobile && (
          <button className="mobile-trigger" onClick={() => setMenuOpened(true)} aria-label="Open menu">
            <img src={Bars} alt="menu" width={24} height={24} />
          </button>
        )}
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