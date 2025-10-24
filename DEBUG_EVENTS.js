// Debug script to check event data structure
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './src/firebase';

const debugEvents = async () => {
  try {
    console.log('Fetching upcoming events for debugging...');
    
    const eventsRef = collection(db, 'upcomingEvents');
    const q = query(eventsRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} upcoming events`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Upcoming Event ${index + 1} ---`);
      console.log('ID:', doc.id);
      console.log('Name:', data.name);
      console.log('Date:', data.date);
      console.log('Time:', data.time);
      console.log('Location:', data.location);
    });
    
    console.log('\n\nFetching past events for debugging...');
    
    const pastEventsRef = collection(db, 'pastEvents');
    const pastQ = query(pastEventsRef, orderBy('date', 'desc'));
    const pastSnapshot = await getDocs(pastQ);
    
    console.log(`Found ${pastSnapshot.size} past events`);
    
    pastSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Past Event ${index + 1} ---`);
      console.log('ID:', doc.id);
      console.log('Name:', data.name);
      console.log('Date:', data.date);
      console.log('Description:', data.description);
    });
  } catch (error) {
    console.error('Error fetching events:', error);
  }
};

// Run the debug function
debugEvents();