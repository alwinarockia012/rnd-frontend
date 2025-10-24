// Debug script to check booking data structure
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from './src/firebase';

const debugBookings = async () => {
  try {
    console.log('Fetching bookings for debugging...');
    
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, orderBy('bookingDate', 'desc'));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} bookings`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Booking ${index + 1} ---`);
      console.log('ID:', doc.id);
      console.log('Event ID:', data.eventId);
      console.log('Event Name:', data.eventName);
      console.log('User ID:', data.userId);
      console.log('Payment Method:', data.paymentMethod);
      console.log('Amount:', data.amount);
      console.log('Status:', data.status);
      console.log('Booking Date:', data.bookingDate);
      
      // Check if bookingDate is a Timestamp
      if (data.bookingDate && typeof data.bookingDate.toDate === 'function') {
        console.log('Booking Date (converted):', data.bookingDate.toDate());
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
  }
};

// Run the debug function
debugBookings();