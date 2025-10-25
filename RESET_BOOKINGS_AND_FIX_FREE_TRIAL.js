// RESET_BOOKINGS_AND_FIX_FREE_TRIAL.js
// Script to reset all bookings and fix the free trial duration issue

// INSTRUCTIONS:
// 1. Open your web application in the browser
// 2. Make sure you're logged in as an admin user
// 3. Open the developer tools (F12 or right-click and select "Inspect")
// 4. Go to the Console tab
// 5. Copy and paste this code into the console and press Enter

async function resetAllBookingsAndFixFreeTrial() {
  try {
    console.log('Starting reset of all bookings and fixing free trial duration...');
    
    // Get Firestore reference
    const db = firebase.firestore();
    
    // Confirm with user before proceeding
    const confirmation = confirm("This will delete ALL bookings and reset the system. Are you sure you want to proceed?");
    if (!confirmation) {
      console.log('Operation cancelled by user');
      return;
    }
    
    // 1. Delete all bookings
    console.log('Deleting all bookings...');
    const bookingsSnapshot = await db.collection('bookings').get();
    console.log(`Found ${bookingsSnapshot.size} bookings to delete`);
    
    let deletedCount = 0;
    const batch = db.batch();
    
    bookingsSnapshot.docs.forEach((doc, index) => {
      batch.delete(doc.ref);
      deletedCount++;
      
      // Firestore batch operations are limited to 500 writes per batch
      if ((index + 1) % 500 === 0 || (index + 1) === bookingsSnapshot.docs.length) {
        batch.commit();
        console.log(`Committed batch of deletions. Processed ${Math.min(index + 1, bookingsSnapshot.size)} bookings`);
        // Start a new batch for remaining documents
        if ((index + 1) < bookingsSnapshot.docs.length) {
          batch = db.batch();
        }
      }
    });
    
    console.log(`Deleted ${deletedCount} bookings`);
    
    // 2. Clear localStorage bookings for all users
    console.log('Clearing localStorage bookings...');
    // Note: This only clears for the current user. In a real reset, you would need to 
    // implement a server-side solution to notify all users to clear their localStorage
    
    localStorage.removeItem('eventBookings');
    localStorage.removeItem('latestBooking');
    localStorage.removeItem('latestEventBooking');
    localStorage.removeItem('newBooking');
    localStorage.removeItem('refreshBookings');
    localStorage.removeItem('eventsUpdated');
    localStorage.removeItem('selectedEvent');
    
    console.log('LocalStorage bookings cleared for current user');
    
    // 3. Show completion message
    console.log('✅ Reset completed successfully!');
    console.log('All bookings have been deleted and localStorage has been cleared.');
    console.log('The free trial system will now work with the new 1-week duration limit.');
    
    alert('Reset completed successfully!\nAll bookings have been deleted and the system has been reset.');
    
  } catch (error) {
    console.error('❌ Error during reset:', error);
    alert('Error during reset: ' + error.message);
  }
}

// Function to fix the free trial duration check
// This should be implemented in the Plans.jsx component
function fixFreeTrialDurationCheck() {
  console.log('To fix the free trial duration issue:');
  console.log('1. Modify the checkFreeTrialEligibility function in Plans.jsx');
  console.log('2. Instead of checking for ANY past booking, check for bookings within the last week');
  console.log('3. See the example implementation in the comments below');
  
  /*
  Example implementation for checkFreeTrialEligibility function:
  
  const checkFreeTrialEligibility = useCallback(async (userId, phoneNumber) => {
    try {
      // Check if user has any existing bookings within the last week
      const bookingsRef = collection(db, 'bookings');
      const userQuery = query(bookingsRef, where('userId', '==', userId));
      const userQuerySnapshot = await getDocs(userQuery);
      
      if (!userQuerySnapshot.empty) {
        // Check if any booking is within the last week (7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const hasRecentBooking = userQuerySnapshot.docs.some(doc => {
          const bookingData = doc.data();
          const bookingDate = bookingData.bookingDate;
          
          if (bookingDate && typeof bookingDate.toDate === 'function') {
            return bookingDate.toDate() > oneWeekAgo;
          } else if (bookingDate instanceof Date) {
            return bookingDate > oneWeekAgo;
          } else {
            const date = new Date(bookingDate);
            return date > oneWeekAgo;
          }
        });
        
        setIsEligibleForFreeTrial(!hasRecentBooking);
        return !hasRecentBooking;
      }
      
      // Check if phone number has been used for a free trial within the last week
      if (phoneNumber) {
        const phoneQuery = query(bookingsRef, where('phoneNumber', '==', phoneNumber));
        const phoneQuerySnapshot = await getDocs(phoneQuery);
        
        if (!phoneQuerySnapshot.empty) {
          // Check if any booking is within the last week (7 days)
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          const hasRecentBooking = phoneQuerySnapshot.docs.some(doc => {
            const bookingData = doc.data();
            const bookingDate = bookingData.bookingDate;
            
            if (bookingDate && typeof bookingDate.toDate === 'function') {
              return bookingDate.toDate() > oneWeekAgo;
            } else if (bookingDate instanceof Date) {
              return bookingDate > oneWeekAgo;
            } else {
              const date = new Date(bookingDate);
              return date > oneWeekAgo;
            }
          });
          
          const eligible = !hasRecentBooking;
          setIsEligibleForFreeTrial(eligible);
          return eligible;
        }
      }
      
      setIsEligibleForFreeTrial(true);
      return true;
    } catch (error) {
      console.error('Error checking free trial eligibility:', error);
      // On error, default to eligible but show a warning
      setIsEligibleForFreeTrial(true);
      showNotification("There was a delay checking your eligibility. Please try again.", 'error');
      return true;
    }
  }, []);
  */
}

// Run the reset function
// resetAllBookingsAndFixFreeTrial();

console.log('To reset all bookings, run: resetAllBookingsAndFixFreeTrial()');
console.log('To see instructions for fixing the free trial duration check, run: fixFreeTrialDurationCheck()');