// Script to get local IP address for mobile testing
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  let localIP = null;

  // Find the first non-internal IPv4 address
  Object.keys(interfaces).forEach(interfaceName => {
    interfaces[interfaceName].forEach(interface => {
      if (interface.family === 'IPv4' && !interface.internal && !localIP) {
        localIP = interface.address;
      }
    });
  });

  return localIP;
}

const localIP = getLocalIP();

if (localIP) {
  console.log('=== Local Network Access for Mobile Testing ===');
  console.log('');
  console.log('To test your app on mobile devices:');
  console.log('');
  console.log('1. Make sure your mobile device is on the same WiFi network');
  console.log('2. Start your development server: npm start');
  console.log('3. On your mobile device, open:');
  console.log(`   http://${localIP}:3000`);
  console.log('');
  console.log('Your local IP address is:', localIP);
  console.log('');
  console.log('Note: Firewall settings might block access. If needed, allow Node.js through your firewall.');
} else {
  console.log('Could not determine local IP address. Please check your network connection.');
}