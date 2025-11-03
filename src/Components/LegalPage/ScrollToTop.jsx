import React, { useEffect } from 'react';

const ScrollToTop = () => {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return null; // This component doesn't render anything
};

export default ScrollToTop;