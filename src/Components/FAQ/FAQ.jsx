import React from 'react';
import './FAQ.css';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

const FAQ = () => {
  return (
    <div className="faq-page">
      <Header />
      <div className="faq-container">
        <div className="faq-content">
          <h1>Frequently Asked Questions (FAQ)</h1>
          
          <div className="faq-item">
            <h2 className="faq-question">1. What is Run and Develop?</h2>
            <p className="faq-answer">Run and Develop is a positive space where people come together to run, grow, and share ideas. We believe that when the body moves, the mind opens — helping us improve our personal and professional life.</p>
          </div>
          
          <div className="faq-item">
            <h2 className="faq-question">2. Who can join the community?</h2>
            <p className="faq-answer">Anyone who is interested in self-growth, fitness, or meaningful connections can join. Whether you're a beginner, a regular runner, or someone who just wants a fresh start — you are welcome here.</p>
          </div>
          
          <div className="faq-item">
            <h2 className="faq-question">3. Do I need to be an experienced runner?</h2>
            <p className="faq-answer">Not at all. Our community includes all levels — beginners, casual runners, and experienced athletes. You can run at your own pace. No pressure, no comparison — just progress.</p>
          </div>
          
          <div className="faq-item">
            <h2 className="faq-question">4. What is the purpose of combining running and ideas?</h2>
            <p className="faq-answer">We believe that running strengthens the body, and reflection strengthens the mind. When both grow together, life becomes more meaningful, focused, and joyful.</p>
          </div>
          
          <div className="faq-item">
            <h2 className="faq-question">5. How often do you conduct runs or activities?</h2>
            <p className="faq-answer">We conduct our community runs every Sunday, where we come together to move, connect, reflect, and grow as a team.</p>
          </div>
          
          <div className="faq-item">
            <h2 className="faq-question">6. What should I bring for a run?</h2>
            <p className="faq-answer">Just wear comfortable sports clothing, proper shoes, and carry a water bottle. Most importantly — bring a smile and an open, positive mindset.</p>
          </div>
          
          <div className="faq-item">
            <h2 className="faq-question">7. Is the community beginner-friendly and supportive?</h2>
            <p className="faq-answer">Absolutely! Our culture is built on encouragement, empathy, and discipline — not comparison or judgment. We grow as a team.</p>
          </div>
          
          <div className="faq-item">
            <h2 className="faq-question">8. How will I stay updated about sessions?</h2>
            <p className="faq-answer">We will share updates through WhatsApp, email, or our website notification. Just make sure your contact details are correct</p>
          </div>
          
          <div className="faq-item">
            <h2 className="faq-question">9. What if I can't attend regularly?</h2>
            <p className="faq-answer">No problem. Life gets busy — come whenever you can. Consistency is your goal, not perfection. We will be here whenever you show up.</p>
          </div>
          
          <div className="faq-item">
            <h2 className="faq-question">10. Can I bring a friend or family member?</h2>
            <p className="faq-answer">Yes! We love community energy. You can bring anyone who shares a positive and growth-oriented mindset.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FAQ;