// scripts/clear-user-data.js
// Script to clear user data from localStorage (for testing purposes)

// This script is meant to be run in the browser console by users
// to clear their local booking data

function clearUserData() {
  console.log('Clearing user booking data from localStorage...');
  
  // List of keys to remove
  const keysToRemove = [
    'eventBookings',
    'latestBooking',
    'latestEventBooking',
    'newBooking',
    'refreshBookings',
    'eventsUpdated',
    'selectedEvent',
    'forceRefresh'
  ];
  
  // Remove each key
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`Removed ${key} from localStorage`);
  });
  
  console.log('✅ User data cleared successfully!');
  console.log('Please refresh the page to see the changes.');
}

// For testing in Node.js environment (not typically used)
function simulateClearUserData() {
  console.log('This is a simulation. In a real browser environment, this would clear localStorage.');
  console.log('To use this in a browser, copy and paste the clearUserData function into the console.');
}

if (typeof window === 'undefined') {
  // Node.js environment
  simulateClearUserData();
} else {
  // Browser environment
  console.log('To clear your booking data, run: clearUserData()');
}

module.exports = { clearUserData, simulateClearUserData };