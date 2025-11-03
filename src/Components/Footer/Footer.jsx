import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaInstagram,
  FaYoutube,
  FaMapMarkerAlt,
  FaPhone,
  FaChevronDown,
  FaEnvelope,
} from 'react-icons/fa';
import './Footer.css';

const CollapsibleSection = ({ title, children, defaultOpen = true, forceOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <div className="footer-section">
      <button
        className="footer-section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`sect-${title.replace(/\s+/g, '-')}`}
        type="button"
      >
        <h4>{title}</h4>
        <FaChevronDown className={`chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div id={`sect-${title.replace(/\s+/g, '-')}`} className="footer-section-body">
          {children}
        </div>
      )}
    </div>
  );
};

const Footer = () => {
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : true);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <footer className="footer">
      <div className="footer-container">
      

        {/* Partner Logos at Top of Footer */}
        <div className="footer-partners-top">
          <div className="moving-logos">
            <img src="/techvase.png" alt="Tech Vaseegrah" className="partner-logo" />
            <img src="/ccafe.png" alt="C3 Cafe" className="partner-logo" />
            <img src="/vaseegrahveda.png" alt="Vaseegrah Veda" className="partner-logo" />
            <img src="/cp.png" alt="CP Brand" className="partner-logo" />
            <img src="/iron-paradise.png" alt="Iron Paradise" className="partner-logo" />
            {/* New sponsors added here */}
            <img src="/decode.png" alt="Decode" className="partner-logo" />
            
            {/* Duplicate for seamless infinite scroll */}
            <img src="/techvase.png" alt="Tech Vaseegrah" className="partner-logo" />
            <img src="/ccafe.png" alt="C3 Cafe" className="partner-logo" />
            <img src="/vaseegrahveda.png" alt="Vaseegrah Veda" className="partner-logo" />
            <img src="/cp.png" alt="CP Brand" className="partner-logo" />
            <img src="/iron-paradise.png" alt="Iron Paradise" className="partner-logo" />
            {/* Duplicate of new sponsors */}
            <img src="/decode.png" alt="Decode" className="partner-logo" />
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="footer-main">
          {/* Company Info + Newsletter */}
          <div className="footer-brand-card">
            <div className="footer-logo">
              <img src="/redlogo.png" alt="Run & Develop" />
              <h3>Run & Develop</h3>
            </div>
            <p className="footer-description">
              Join our community of runners and entrepreneurs. Run together, grow together, and achieve your fitness and career goals.
            </p>

           

            <div className="social-links">
              <a href="https://www.instagram.com/run_and_develop?igsh=MW9pdzV0YXBlZGZtaA==" className="social-link" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <FaInstagram />
              </a>
              <a href="mailto:info@runanddevelop.com" className="social-link" aria-label="Email" target="_blank" rel="noopener noreferrer">
                <FaEnvelope />
              </a>
              <a href="https://www.youtube.com/@RunAnddevelop" className="social-link" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
                <FaYoutube />
              </a>
            </div>
          </div>

          {/* Support */}
          <CollapsibleSection title="Support" defaultOpen={isDesktop} forceOpen={isDesktop}>
            <ul className="footer-links">
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
            </ul>
          </CollapsibleSection>

          {/* Contact Info */}
          <CollapsibleSection title="Contact" defaultOpen={isDesktop} forceOpen={isDesktop}>
            <div className="contact-info">
              <div className="contact-item">
                <FaMapMarkerAlt className="contact-icon" />
                <span>123 <br />Thanjavur, Tamil Nadu</span>
              </div>
              <div className="contact-item">
                <FaPhone className="contact-icon" />
                <span>+91 82708 12842</span>
              </div>

            </div>
          </CollapsibleSection>
        </div>

        {/* Bottom Social Row (compact for small screens) */}
  

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>&copy; 2025 Run & Develop. All rights reserved.</p>
            <div className="footer-bottom-links">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/faq">FAQ</Link>
            </div>
          </div>
        </div>

        {/* Back to top inside footer edge */}
        <button
          className="back-to-top"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
        >
          ↑
        </button>
      </div>
    </footer>
  );
};

export default Footer;
