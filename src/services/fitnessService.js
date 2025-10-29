// Fitness tracking service for database operations
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
  getDocs,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

class FitnessService {
  COLLECTIONS = {
    USER_PROFILES: 'userProfiles',
    MEAL_LOGS: 'mealLogs',
    WORKOUT_LOGS: 'workoutLogs',
    USER_GOALS: 'userGoals',
    NUTRITION_DATA: 'nutritionData'
  };

  // User Profile Management
  async saveUserProfile(userId, profileData) {
    try {
      const profileRef = doc(db, this.COLLECTIONS.USER_PROFILES, userId);
      
      // Check if profile exists
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        // Update existing profile
        await updateDoc(profileRef, {
          ...profileData,
          updatedAt: serverTimestamp()
        });
        console.log('User profile updated successfully');
      } else {
        // Create new profile
        await setDoc(profileRef, {
          userId: userId,
          ...profileData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
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
      const profileRef = doc(db, this.COLLECTIONS.USER_PROFILES, userId);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        return { success: false, message: 'Profile not found' };
      }
      
      return {
        success: true,
        data: profileSnap.data()
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get profile: ' + error.message);
    }
  }

  // Meal Logging
  async logMeal(userId, mealData) {
    try {
      const mealsRef = collection(db, this.COLLECTIONS.MEAL_LOGS);
      
      const meal = {
        userId: userId,
        ...mealData,
        loggedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(mealsRef, meal);
      
      return { 
        success: true, 
        message: 'Meal logged successfully',
        mealId: docRef.id
      };
    } catch (error) {
      console.error('Error logging meal:', error);
      throw new Error('Failed to log meal: ' + error.message);
    }
  }

  async getUserMeals(userId, limitCount = 50) {
    try {
      const mealsRef = collection(db, this.COLLECTIONS.MEAL_LOGS);
      // Remove the orderBy clause that requires a composite index
      const q = query(
        mealsRef,
        where('userId', '==', userId)
        // Removed orderBy('loggedAt', 'desc') to avoid index requirement
      );
      
      const querySnapshot = await getDocs(q);
      const meals = [];
      
      querySnapshot.forEach((doc) => {
        meals.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort manually in JavaScript instead of using Firestore orderBy
      meals.sort((a, b) => {
        // Handle cases where loggedAt might not exist
        const dateA = a.loggedAt ? (a.loggedAt.toDate ? a.loggedAt.toDate() : new Date(a.loggedAt)) : new Date(0);
        const dateB = b.loggedAt ? (b.loggedAt.toDate ? b.loggedAt.toDate() : new Date(b.loggedAt)) : new Date(0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      // Apply limit manually
      return meals.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting user meals:', error);
      return [];
    }
  }

  // Workout Logging
  async logWorkout(userId, workoutData) {
    try {
      const workoutsRef = collection(db, this.COLLECTIONS.WORKOUT_LOGS);
      
      const workout = {
        userId: userId,
        ...workoutData,
        loggedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(workoutsRef, workout);
      
      return { 
        success: true, 
        message: 'Workout logged successfully',
        workoutId: docRef.id
      };
    } catch (error) {
      console.error('Error logging workout:', error);
      throw new Error('Failed to log workout: ' + error.message);
    }
  }

  async getUserWorkouts(userId, limitCount = 50) {
    try {
      const workoutsRef = collection(db, this.COLLECTIONS.WORKOUT_LOGS);
      // Remove the orderBy clause that requires a composite index
      const q = query(
        workoutsRef,
        where('userId', '==', userId)
        // Removed orderBy('loggedAt', 'desc') to avoid index requirement
      );
      
      const querySnapshot = await getDocs(q);
      const workouts = [];
      
      querySnapshot.forEach((doc) => {
        workouts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort manually in JavaScript instead of using Firestore orderBy
      workouts.sort((a, b) => {
        // Handle cases where loggedAt might not exist
        const dateA = a.loggedAt ? (a.loggedAt.toDate ? a.loggedAt.toDate() : new Date(a.loggedAt)) : new Date(0);
        const dateB = b.loggedAt ? (b.loggedAt.toDate ? b.loggedAt.toDate() : new Date(b.loggedAt)) : new Date(0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      // Apply limit manually
      return workouts.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting user workouts:', error);
      return [];
    }
  }

  // User Goals Management
  async saveUserGoals(userId, goalsData) {
    try {
      const goalsRef = doc(db, this.COLLECTIONS.USER_GOALS, userId);
      
      // Check if goals exist
      const goalsSnap = await getDoc(goalsRef);
      
      if (goalsSnap.exists()) {
        // Update existing goals
        await updateDoc(goalsRef, {
          ...goalsData,
          updatedAt: serverTimestamp()
        });
        console.log('User goals updated successfully');
      } else {
        // Create new goals
        await setDoc(goalsRef, {
          userId: userId,
          ...goalsData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('New user goals created successfully');
      }
      
      return { success: true, message: 'Goals saved successfully' };
    } catch (error) {
      console.error('Error saving user goals:', error);
      throw new Error('Failed to save goals: ' + error.message);
    }
  }

  async getUserGoals(userId) {
    try {
      const goalsRef = doc(db, this.COLLECTIONS.USER_GOALS, userId);
      const goalsSnap = await getDoc(goalsRef);
      
      if (!goalsSnap.exists()) {
        return { success: false, message: 'Goals not found' };
      }
      
      return {
        success: true,
        data: goalsSnap.data()
      };
    } catch (error) {
      console.error('Error getting user goals:', error);
      throw new Error('Failed to get goals: ' + error.message);
    }
  }

  // Nutrition Data Management
  async saveNutritionData(userId, nutritionData) {
    try {
      const nutritionRef = doc(db, this.COLLECTIONS.NUTRITION_DATA, userId);
      
      // Check if nutrition data exists
      const nutritionSnap = await getDoc(nutritionRef);
      
      if (nutritionSnap.exists()) {
        // Update existing nutrition data
        await updateDoc(nutritionRef, {
          ...nutritionData,
          updatedAt: serverTimestamp()
        });
        console.log('Nutrition data updated successfully');
      } else {
        // Create new nutrition data
        await setDoc(nutritionRef, {
          userId: userId,
          ...nutritionData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('New nutrition data created successfully');
      }
      
      return { success: true, message: 'Nutrition data saved successfully' };
    } catch (error) {
      console.error('Error saving nutrition data:', error);
      throw new Error('Failed to save nutrition data: ' + error.message);
    }
  }

  async getNutritionData(userId) {
    try {
      const nutritionRef = doc(db, this.COLLECTIONS.NUTRITION_DATA, userId);
      const nutritionSnap = await getDoc(nutritionRef);
      
      if (!nutritionSnap.exists()) {
        return { success: false, message: 'Nutrition data not found' };
      }
      
      return {
        success: true,
        data: nutritionSnap.data()
      };
    } catch (error) {
      console.error('Error getting nutrition data:', error);
      throw new Error('Failed to get nutrition data: ' + error.message);
    }
  }

  // Calculate BMR (Basal Metabolic Rate)
  calculateBMR(profile) {
    const { age, gender, height, weight } = profile;
    
    if (!age || !gender || !height || !weight) return 2200;

    let bmr;
    if (gender === 'male') {
      // Mifflin-St Jeor Equation for men
      bmr = Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    } else {
      // Mifflin-St Jeor Equation for women
      bmr = Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }

    return bmr;
  }

  // Calculate TDEE (Total Daily Energy Expenditure)
  calculateTDEE(bmr, activityLevel) {
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9
    };
    
    return bmr * (activityMultipliers[activityLevel] || 1.2);
  }

  // Calculate daily calorie needs based on goals
  calculateCalorieNeeds(tdee, goal) {
    switch (goal) {
      case 'lose':
        return tdee - 500; // 500 calorie deficit for weight loss
      case 'gain':
        return tdee + 500; // 500 calorie surplus for muscle gain
      default:
        return tdee; // maintenance
    }
  }
}

// Export singleton instance
const fitnessService = new FitnessService();
export default fitnessService;