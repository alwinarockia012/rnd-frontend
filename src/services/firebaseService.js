// Firebase Firestore service for database operations
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

class FirebaseService {
  // Collections
  COLLECTIONS = {
    USERS: 'users',
    USER_EVENTS: 'userEvents',
    USER_STATISTICS: 'userStatistics',
    ACHIEVEMENTS: 'achievements',
    CONTACTS: 'contacts',
    UPCOMING_EVENTS: 'upcomingEvents',
    PAST_EVENTS: 'pastEvents',
    BOOKINGS: 'bookings'
  };

  // User Profile Management
  async saveUserProfile(userId, profileData) {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      
      // Check if user exists
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        // Update existing user
        await updateDoc(userRef, {
          ...profileData,
          updatedAt: serverTimestamp()
        });
        console.log('User profile updated successfully');
      } else {
        // Create new user
        await setDoc(userRef, {
          ...profileData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isActive: true
        });
        
        // Initialize default achievements
        await this.initializeUserAchievements(userId);
        
        // Initialize user statistics
        await this.initializeUserStatistics(userId);
        
        console.log('New user profile created successfully');
      }
      
      return { success: true, message: 'Profile saved successfully' };
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw new Error('Failed to save profile: ' + error.message);
    }
  }

  async getUserProfile(userId) {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return { success: false, message: 'User not found' };
      }
      
      const userData = userSnap.data();
      
      // Get user achievements
      const achievements = await this.getUserAchievements(userId);
      
      // Get user statistics
      const statistics = await this.getUserStatistics(userId);
      
      // Get upcoming events
      const upcomingEvents = await this.getUserUpcomingEvents(userId);
      
      return {
        success: true,
        data: {
          profile: userData,
          achievements: achievements,
          statistics: statistics,
          upcomingEvents: upcomingEvents
        }
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get profile: ' + error.message);
    }
  }

  async deleteUser(userId) {
    try {
      const batch = writeBatch(db);

      // 1. Delete user document from 'users' collection
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      batch.delete(userRef);

      // 2. Delete user statistics
      const statsRef = doc(db, this.COLLECTIONS.USER_STATISTICS, userId);
      batch.delete(statsRef);

      // 3. Delete user achievements
      const achievementsRef = doc(db, this.COLLECTIONS.ACHIEVEMENTS, userId);
      batch.delete(achievementsRef);

      // 4. Find and delete all bookings by the user
      const bookingsQuery = query(collection(db, this.COLLECTIONS.BOOKINGS), where('userId', '==', userId));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      bookingsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Commit the batch
      await batch.commit();

      console.log(`Successfully deleted all data for user ${userId}`);
      return { success: true, message: 'User data deleted successfully' };

    } catch (error) {
      console.error('Error deleting user data:', error);
      throw new Error('Failed to delete user data: ' + error.message);
    }
  }


  // User Achievements Management
  async initializeUserAchievements(userId) {
    try {
      const achievementsRef = doc(db, this.COLLECTIONS.ACHIEVEMENTS, userId);
      const defaultAchievements = [
        { 
          id: 'early_bird', 
          title: 'Early Bird', 
          description: 'Attended 5 morning runs', 
          icon: '🌅', 
          earned: false,
          progress: 0,
          target: 5
        },
        { 
          id: 'consistent_runner', 
          title: 'Consistent Runner', 
          description: 'Attended runs for 4 consecutive weeks', 
          icon: '🏃‍♂️', 
          earned: false,
          progress: 0,
          target: 4
        },
        { 
          id: 'community_builder', 
          title: 'Community Builder', 
          description: 'Brought 3 new members', 
          icon: '👥', 
          earned: false,
          progress: 0,
          target: 3
        },
        { 
          id: 'marathon_ready', 
          title: 'Marathon Ready', 
          description: 'Completed 10km distance', 
          icon: '🏆', 
          earned: false,
          progress: 0,
          target: 10
        }
      ];
      
      await setDoc(achievementsRef, {
        userId: userId,
        achievements: defaultAchievements,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing achievements:', error);
      throw error;
    }
  }

  async getUserAchievements(userId) {
    try {
      const achievementsRef = doc(db, this.COLLECTIONS.ACHIEVEMENTS, userId);
      const achievementsSnap = await getDoc(achievementsRef);
      
      if (achievementsSnap.exists()) {
        return achievementsSnap.data().achievements || [];
      }
      
      // If no achievements exist, initialize them
      await this.initializeUserAchievements(userId);
      return [];
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  async updateUserAchievement(userId, achievementId, progress = null, earned = null) {
    try {
      const achievementsRef = doc(db, this.COLLECTIONS.ACHIEVEMENTS, userId);
      const achievementsSnap = await getDoc(achievementsRef);
      
      if (!achievementsSnap.exists()) {
        await this.initializeUserAchievements(userId);
        return;
      }
      
      const achievementsData = achievementsSnap.data();
      const achievements = achievementsData.achievements.map(achievement => {
        if (achievement.id === achievementId) {
          const updated = { ...achievement };
          if (progress !== null) updated.progress = progress;
          if (earned !== null) updated.earned = earned;
          if (earned) updated.dateEarned = new Date().toISOString();
          return updated;
        }
        return achievement;
      });
      
      await updateDoc(achievementsRef, {
        achievements: achievements,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating achievement:', error);
      throw error;
    }
  }

  // User Statistics Management
  async initializeUserStatistics(userId) {
    try {
      const statsRef = doc(db, this.COLLECTIONS.USER_STATISTICS, userId);
      
      await setDoc(statsRef, {
        userId: userId,
        totalRuns: 0,
        totalDistance: 0,
        totalTime: '00:00:00',
        currentStreak: 0,
        longestStreak: 0,
        averagePace: '00:00',
        lastRunDate: null,
        monthlyStats: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing statistics:', error);
      throw error;
    }
  }

  async getUserStatistics(userId) {
    try {
      const statsRef = doc(db, this.COLLECTIONS.USER_STATISTICS, userId);
      const statsSnap = await getDoc(statsRef);
      
      if (statsSnap.exists()) {
        return statsSnap.data();
      }
      
      // If no statistics exist, initialize them
      await this.initializeUserStatistics(userId);
      return {
        totalRuns: 0,
        totalDistance: 0,
        currentStreak: 0,
        longestStreak: 0
      };
    } catch (error) {
      console.error('Error getting user statistics:', error);
      return {
        totalRuns: 0,
        totalDistance: 0,
        currentStreak: 0,
        longestStreak: 0
      };
    }
  }

  async updateUserStatistics(userId, statsUpdate) {
    try {
      const statsRef = doc(db, this.COLLECTIONS.USER_STATISTICS, userId);
      
      await updateDoc(statsRef, {
        ...statsUpdate,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating statistics:', error);
      throw error;
    }
  }

  // User Events Management
  async addUserEvent(userId, eventData) {
    try {
      const eventsRef = collection(db, this.COLLECTIONS.USER_EVENTS);
      
      await addDoc(eventsRef, {
        userId: userId,
        ...eventData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { success: true, message: 'Event added successfully' };
    } catch (error) {
      console.error('Error adding event:', error);
      throw new Error('Failed to add event: ' + error.message);
    }
  }

  async getUserUpcomingEvents(userId, limitCount = 5) {
    try {
      const eventsRef = collection(db, this.COLLECTIONS.USER_EVENTS);
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      
      const q = query(
        eventsRef,
        where('userId', '==', userId),
        where('eventDate', '>=', today),
        orderBy('eventDate', 'asc'),
        orderBy('eventTime', 'asc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const events = [];
      
      querySnapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return events;
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  async getUserAllEvents(userId) {
    try {
      const eventsRef = collection(db, this.COLLECTIONS.USER_EVENTS);
      
      const q = query(
        eventsRef,
        where('userId', '==', userId),
        orderBy('eventDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const events = [];
      
      querySnapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return events;
    } catch (error) {
      console.error('Error getting all events:', error);
      return [];
    }
  }

  // Batch operations
  async syncUserData(userId, userData) {
    try {
      // Save profile
      if (userData.profile) {
        await this.saveUserProfile(userId, userData.profile);
      }
      
      // Update achievements
      if (userData.achievements) {
        for (const achievement of userData.achievements) {
          await this.updateUserAchievement(
            userId, 
            achievement.id, 
            achievement.progress, 
            achievement.earned
          );
        }
      }
      
      // Update statistics
      if (userData.statistics) {
        await this.updateUserStatistics(userId, userData.statistics);
      }
      
      return { success: true, message: 'User data synced successfully' };
    } catch (error) {
      console.error('Error syncing user data:', error);
      throw new Error('Failed to sync data: ' + error.message);
    }
  }

  // Booking Management
  async createBooking(userId, bookingData) {
    try {
      const bookingsRef = collection(db, this.COLLECTIONS.BOOKINGS);
      
      const booking = {
        userId: userId,
        ...bookingData,
        bookingDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(bookingsRef, booking);
      
      return { 
        success: true, 
        message: 'Booking created successfully',
        bookingId: docRef.id
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      throw new Error('Failed to create booking: ' + error.message);
    }
  }

  async getUserBookings(userId) {
    try {
      const bookingsRef = collection(db, this.COLLECTIONS.BOOKINGS);
      const q = query(
        bookingsRef,
        where('userId', '==', userId),
        orderBy('bookingDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const bookings = [];
      
      querySnapshot.forEach((doc) => {
        bookings.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return bookings;
    } catch (error) {
      console.error('Error getting user bookings:', error);
      return [];
    }
  }

  // Utility methods
  async isUserProfileComplete(userId) {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return false;
      }
      
      const userData = userSnap.data();
      const requiredFields = ['displayName', 'phoneNumber', 'runningLevel'];
      
      return requiredFields.every(field => userData[field]);
    } catch (error) {
      console.error('Error checking profile completion:', error);
      return false;
    }
  }

  // Contact Form Submissions
  async saveContactMessage(contactData) {
    try {
      const contactsRef = collection(db, this.COLLECTIONS.CONTACTS);
      await addDoc(contactsRef, {
        ...contactData,
        createdAt: serverTimestamp()
      });
      return { success: true, message: 'Contact message saved successfully' };
    } catch (error) {
      console.error('Error saving contact message:', error);
      throw new Error('Failed to save contact message: ' + error.message);
    }
  }

  // Check if phone number already exists
  async isPhoneNumberExists(phoneNumber) {
    try {
      const usersRef = collection(db, this.COLLECTIONS.USERS);
      const q = query(usersRef, where('phone', '==', phoneNumber));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking phone number:', error);
      throw new Error('Failed to check phone number: ' + error.message);
    }
  }

  // Event Management
  async getUpcomingEvents() {
    try {
      const eventsRef = collection(db, this.COLLECTIONS.UPCOMING_EVENTS);
      const q = query(eventsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const events = [];
      querySnapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('Fetched upcoming events:', events);
      return events;
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  async getPastEvents() {
    try {
      const eventsRef = collection(db, this.COLLECTIONS.PAST_EVENTS);
      const q = query(eventsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const events = [];
      querySnapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('Fetched past events:', events);
      return events;
    } catch (error) {
      console.error('Error getting past events:', error);
      return [];
    }
  }

  async updateUpcomingEvent(eventId, eventData) {
    try {
      const eventRef = doc(db, this.COLLECTIONS.UPCOMING_EVENTS, eventId);
      await updateDoc(eventRef, {
        ...eventData,
        updatedAt: serverTimestamp()
      });
      return { success: true, message: 'Upcoming event updated successfully' };
    } catch (error) {
      console.error('Error updating upcoming event:', error);
      throw new Error('Failed to update upcoming event: ' + error.message);
    }
  }

  async updatePastEvent(eventId, eventData) {
    try {
      const eventRef = doc(db, this.COLLECTIONS.PAST_EVENTS, eventId);
      await updateDoc(eventRef, {
        ...eventData,
        updatedAt: serverTimestamp()
      });
      return { success: true, message: 'Past event updated successfully' };
    } catch (error) {
      console.error('Error updating past event:', error);
      throw new Error('Failed to update past event: ' + error.message);
    }
  }

  async deleteUpcomingEvent(eventId) {
    try {
      const eventRef = doc(db, this.COLLECTIONS.UPCOMING_EVENTS, eventId);
      await deleteDoc(eventRef);
      return { success: true, message: 'Upcoming event deleted successfully' };
    } catch (error) {
      console.error('Error deleting upcoming event:', error);
      throw new Error('Failed to delete upcoming event: ' + error.message);
    }
  }

  async deletePastEvent(eventId) {
    try {
      const eventRef = doc(db, this.COLLECTIONS.PAST_EVENTS, eventId);
      await deleteDoc(eventRef);
      return { success: true, message: 'Past event deleted successfully' };
    } catch (error) {
      console.error('Error deleting past event:', error);
      throw new Error('Failed to delete past event: ' + error.message);
    }
  }

  // Main Event Management
  async getMainEvent() {
    try {
      const docRef = doc(db, 'config', 'mainEvent');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting main event:', error);
      return null;
    }
  }

  async updateMainEvent(eventData) {
    try {
      const docRef = doc(db, 'config', 'mainEvent');
      await setDoc(docRef, eventData, { merge: true });
      return { success: true, message: 'Main event updated successfully' };
    } catch (error) {
      console.error('Error updating main event:', error);
      throw new Error('Failed to update main event: ' + error.message);
    }
  }

  // Image Upload
  async uploadImage(imageFile, folder) {
    try {
      console.log('Attempting to upload image:', imageFile.name, 'to folder:', folder);
      const storageRef = ref(storage, `${folder}/${imageFile.name}`);
      console.log('Storage reference created:', storageRef.fullPath);
      const uploadTask = await uploadBytes(storageRef, imageFile);
      console.log('Upload task completed:', uploadTask);
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL obtained:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image: ' + error.message);
    }
  }
}

// Export singleton instance
const firebaseService = new FirebaseService();
export default firebaseService;
