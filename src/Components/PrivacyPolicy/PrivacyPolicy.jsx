import React from 'react';
import './PrivacyPolicy.css';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-policy-page">
      <Header />
      <div className="privacy-policy-container">
        <div className="privacy-policy-content">
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last updated: October 21, 2025</p>
          
          <p>This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our website and services. By accessing our website, you agree to the practices described in this policy.</p>
          
          <h2>1. Information We Collect</h2>
          <p>We collect the following personal information from users when they register, book slots, or use our services:</p>
          <ul>
            <li>Name</li>
            <li>Age</li>
            <li>Gender</li>
            <li>Date of Birth</li>
            <li>Profession</li>
            <li>WhatsApp Number</li>
          </ul>
          
          <p>We may also collect:</p>
          <ul>
            <li>Login details (for user accounts)</li>
            <li>Payment information (processed securely by third-party payment gateways)</li>
            <li>Cookies and usage data (to improve website experience)</li>
          </ul>
          
          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Create and manage your user account</li>
            <li>Process slot bookings and payments</li>
            <li>Communicate event details, updates and reminders</li>
            <li>Improve our programs, events and website experience</li>
            <li>Provide customer support</li>
            <li>Send promotional or motivational content related to our platform (you can opt out anytime)</li>
          </ul>
          
          <h2>3. Cookies and Tracking</h2>
          <p>We use cookies to improve user experience, remember preferences and analyze website performance. You may disable cookies through browser settings.</p>
          
          <h2>4. Data Sharing and Disclosure</h2>
          <p>We do not sell or trade your personal information.</p>
          <p>We may share your data only with:</p>
          <ul>
            <li>Payment gateways (for processing payments)</li>
            <li>Technical service providers (for website hosting / analytics)</li>
          </ul>
          <p>We may disclose information only if required by:</p>
          <ul>
            <li>Law, regulation or legal process</li>
            <li>To protect our rights or prevent fraud</li>
          </ul>
          
          <h2>5. Data Security</h2>
          <p>We use industry-standard security measures to protect your data. However, no method of online transmission is 100% secure, and you agree that you use the service at your own risk.</p>
          
          <h2>6. Your Rights</h2>
          <p>You may:</p>
          <ul>
            <li>Update or correct your data</li>
            <li>Request deletion of your account</li>
            <li>Opt-out of promotional communication</li>
          </ul>
          <p>To request changes, contact: <a href="mailto:runanddevelop@gmail.com">runanddevelop@gmail.com</a></p>
          
          <h2>7. Third-Party Links</h2>
          <p>Our website may contain links to external sites. We are not responsible for their content or privacy practices.</p>
          
          <h2>8. Children's Privacy</h2>
          <p>We do not knowingly collect data from individuals below 15 without parental consent.</p>
          
          <h2>9. Policy Updates</h2>
          <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with a new "Last Updated" date.</p>
          
          <h2>10. Contact Us</h2>
          <p>For questions or concerns, email us at: <a href="mailto:runanddevelop@gmail.com">runanddevelop@gmail.com</a></p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;