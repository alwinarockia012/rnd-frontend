// scripts/reset-bookings.js
// Node.js script to reset all bookings in Firestore

const admin = require('firebase-admin');
const serviceAccount = require('../netlify.env.json'); // Adjust path as needed

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://your-project-id.firebaseio.com' // Replace with your database URL
  });
}

const db = admin.firestore();

async function resetAllBookings() {
  try {
    console.log('Starting reset of all bookings...');
    
    // Confirmation prompt
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('This will delete ALL bookings. Are you sure? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        rl.close();
        return;
      }
      
      try {
        // Delete all documents in the bookings collection
        const bookingsRef = db.collection('bookings');
        const snapshot = await bookingsRef.get();
        
        if (snapshot.empty) {
          console.log('No bookings found to delete.');
          rl.close();
          return;
        }
        
        console.log(`Found ${snapshot.size} bookings to delete.`);
        
        // Batch delete documents
        const batchSize = 500;
        const batches = [];
        let batch = db.batch();
        let count = 0;
        
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          count++;
          
          if (count % batchSize === 0) {
            batches.push(batch.commit());
            batch = db.batch();
          }
        });
        
        // Commit the last batch if it has operations
        if (count % batchSize !== 0) {
          batches.push(batch.commit());
        }
        
        // Execute all batches
        await Promise.all(batches);
        
        console.log(`✅ Successfully deleted ${snapshot.size} bookings.`);
        
        // Reset any related counters or metadata
        console.log('Resetting related metadata...');
        
        // Example: Reset a counter document if you have one
        // await db.collection('counters').doc('bookings').set({ count: 0 });
        
        console.log('✅ Reset completed successfully!');
      } catch (error) {
        console.error('❌ Error during reset:', error);
      } finally {
        rl.close();
      }
    });
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
}

// Run the reset function if this script is executed directly
if (require.main === module) {
  resetAllBookings();
}

module.exports = { resetAllBookings };