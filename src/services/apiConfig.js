   // API Configuration utility
// In browser environment, we need to detect development vs production differently

// Determine if we're in development based on the hostname
const isDevelopment = () => {
  // Check if we're running on localhost or 127.0.0.1
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.startsWith('192.168.') || // Common local network IPs
           window.location.hostname.startsWith('10.'); // Common local network IPs
  }
  
  // For Node.js environment
  return process.env.NODE_ENV === 'development';
};

// Determine the correct API base URL based on environment
export const getApiBaseUrl = () => {
  // In development, check if we're on a local network
  if (isDevelopment()) {
    // If we're accessing from a local network IP, use that IP for the backend
    if (window.location.hostname.startsWith('192.168.')) {
      // Use the same IP as the frontend but with backend port
      return `http://${window.location.hostname}:5003`;
    }
    // Otherwise, use localhost for local development
    return 'http://localhost:5003';
  }
  
  // In production (Netlify), use the Render backend URL
  // Make sure to replace this with your actual Render backend URL
  return process.env.REACT_APP_API_BASE_URL || 'https://your-render-app-name.onrender.com';
};

// Get the full API URL for a specific endpoint
export const getApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  
  // If baseUrl is empty (shouldn't happen), return relative URL
  if (!baseUrl) {
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }
  
  // Combine base URL with endpoint
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

// Create a default export object
const apiConfig = {
  getApiBaseUrl,
  getApiUrl
};

export default apiConfig;