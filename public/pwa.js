// PWA Configuration
const pwaConfig = {
  // PWA name
  name: 'Tech Vaseegrah',
  
  // Short name for home screen
  shortName: 'Tech Vaseegrah',
  
  // Description of the app
  description: 'Run and Develop - Fitness and Community App',
  
  // Theme color for browser UI
  themeColor: '#F15A24',
  
  // Background color for splash screen
  backgroundColor: '#3c3f45',
  
  // Display mode
  display: 'standalone',
  
  // Orientation
  orientation: 'portrait',
  
  // Scope of the app
  scope: '/',
  
  // Start URL
  startUrl: '/',
  
  // Icons configuration
  icons: [
    {
      src: '/logo192.png',
      sizes: '192x192',
      type: 'image/png'
    },
    {
      src: '/logo512.png',
      sizes: '512x512',
      type: 'image/png'
    }
  ],
  
  // Cache strategies
  cache: {
    // Cache static assets
    static: true,
    
    // Cache API responses
    api: true,
    
    // Cache duration in seconds
    duration: 3600
  },
  
  // Offline fallback
  offline: {
    page: '/offline.html',
    image: '/logo512.png'
  }
};

// Export configuration
export default pwaConfig;