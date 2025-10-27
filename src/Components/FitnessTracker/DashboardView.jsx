import React, { useState, useEffect } from 'react';
import fitnessService from '../../services/fitnessService';

const DashboardView = ({ user }) => {
  const [stats, setStats] = useState({
    caloriesConsumed: 0,
    caloriesGoal: 2200,
    workoutsThisWeek: 0,
    workoutsGoal: 5,
    waterIntake: 0,
    waterGoal: 8
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadDashboardData = async () => {
      if (user && user.uid) {
        try {
          setError(null);
          
          // Add timeout to prevent hanging
          const timeout = new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 10000);
          });
          
          // Load user profile to get goals
          const profilePromise = fitnessService.getUserProfile(user.uid);
          const profileResult = await Promise.race([profilePromise, timeout]);
          
          if (isMounted && profileResult.success) {
            const profile = profileResult.data;
            // Calculate calorie goal based on user profile
            const calorieGoal = calculateCalorieNeeds(profile);
            
            if (isMounted) {
              setStats(prev => ({
                ...prev,
                caloriesGoal: calorieGoal
              }));
            }
          }
          
          // Load today's meals to calculate calories consumed
          const mealsPromise = fitnessService.getUserMeals(user.uid);
          const mealsResult = await Promise.race([mealsPromise, timeout]);
          
          if (isMounted && mealsResult) {
            const today = new Date().toISOString().split('T')[0];
            const todayMeals = mealsResult.filter(meal => {
              // Check if meal has a loggedAt timestamp
              if (meal.loggedAt) {
                // Firebase timestamp might be a Firestore Timestamp object or a regular Date
                let mealDate;
                if (meal.loggedAt.toDate) {
                  // Firestore Timestamp
                  mealDate = meal.loggedAt.toDate();
                } else if (meal.loggedAt instanceof Date) {
                  // Regular Date object
                  mealDate = meal.loggedAt;
                } else {
                  // String or number timestamp
                  mealDate = new Date(meal.loggedAt);
                }
                return mealDate.toISOString().split('T')[0] === today;
              }
              // Fallback to date field if loggedAt is not available
              else if (meal.date) {
                return meal.date === today;
              }
              return false;
            });
            
            const caloriesConsumed = todayMeals.reduce((total, meal) => 
              total + (meal.calories || 0), 0
            );
            
            if (isMounted) {
              setStats(prev => ({
                ...prev,
                caloriesConsumed: caloriesConsumed
              }));
            }
          }
          
          // Load this week's workouts
          const workoutsPromise = fitnessService.getUserWorkouts(user.uid);
          const workoutsResult = await Promise.race([workoutsPromise, timeout]);
          
          if (isMounted && workoutsResult) {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const recentWorkouts = workoutsResult.filter(workout => {
              // Check if workout has a loggedAt timestamp (Firebase timestamp)
              if (workout.loggedAt) {
                // Firebase timestamp might be a Firestore Timestamp object or a regular Date
                let workoutDate;
                if (workout.loggedAt.toDate) {
                  // Firestore Timestamp
                  workoutDate = workout.loggedAt.toDate();
                } else if (workout.loggedAt instanceof Date) {
                  // Regular Date object
                  workoutDate = workout.loggedAt;
                } else {
                  // String or number timestamp
                  workoutDate = new Date(workout.loggedAt);
                }
                return workoutDate >= oneWeekAgo;
              }
              // Fallback to date field if loggedAt is not available
              else if (workout.date) {
                const workoutDate = new Date(workout.date);
                return workoutDate >= oneWeekAgo;
              }
              return false;
            });
            
            if (isMounted) {
              setStats(prev => ({
                ...prev,
                workoutsThisWeek: recentWorkouts.length
              }));
            }
          }
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          if (isMounted) {
            setError(error.message || 'Failed to load dashboard data');
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }
    };

    loadDashboardData();
    
    // Listen for workout events to refresh dashboard
    const handleWorkoutEvent = () => {
      // Reload dashboard data when workouts are logged or deleted
      loadDashboardData();
    };

    window.addEventListener('workoutLogged', handleWorkoutEvent);
    window.addEventListener('workoutDeleted', handleWorkoutEvent);
    
    // Cleanup function to prevent state updates after component unmount
    return () => {
      isMounted = false;
      window.removeEventListener('workoutLogged', handleWorkoutEvent);
      window.removeEventListener('workoutDeleted', handleWorkoutEvent);
    };
  }, [user]);

  // Calculate daily calorie needs based on user profile
  const calculateCalorieNeeds = (profile) => {
    const { age, gender, height, currentWeight, activityLevel, goal } = profile;
    
    if (!age || !gender || !height || !currentWeight) return 2200;

    let bmr;
    if (gender === 'male') {
      // Mifflin-St Jeor Equation for men
      bmr = Math.round(10 * currentWeight + 6.25 * height - 5 * age + 5);
    } else {
      // Mifflin-St Jeor Equation for women
      bmr = Math.round(10 * currentWeight + 6.25 * height - 5 * age - 161);
    }

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9
    };
    
    const tdee = Math.round(bmr * (activityMultipliers[activityLevel] || 1.2));
    
    // Adjust based on goal
    switch (goal) {
      case 'lose':
        return tdee - 500; // 500 calorie deficit for weight loss
      case 'gain':
        return tdee + 500; // 500 calorie surplus for muscle gain
      default:
        return tdee; // maintenance
    }
  };

  if (loading) {
    return <div className="dashboard-view">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="dashboard-view">Error: {error}</div>;
  }

  return (
    <div className="dashboard-view">
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Calories Consumed</h3>
          <p className="stat-value">{stats.caloriesConsumed}<span>/{stats.caloriesGoal}</span></p>
        </div>
        <div className="stat-card">
          <h3>Workouts This Week</h3>
          <p className="stat-value">{stats.workoutsThisWeek}<span>/{stats.workoutsGoal}</span></p>
        </div>
        <div className="stat-card">
          <h3>Water Intake</h3>
          <p className="stat-value">{stats.waterIntake}<span>/{stats.waterGoal} glasses</span></p>
        </div>
      </div>
      
      <div className="dashboard-charts">
        <div className="chart-container">
          <h3>Nutrition Overview</h3>
          <div className="chart-placeholder">
            <p>Nutrition chart will appear here</p>
          </div>
        </div>
        
        <div className="chart-container">
          <h3>Workout Progress</h3>
          <div className="chart-placeholder">
            <p>Workout progress chart will appear here</p>
          </div>
        </div>
      </div>
      
      <div className="dashboard-tips">
        <h3>Today's Health Tips</h3>
        <div className="tips-container">
          <div className="tip-card">
            <h4>Stay Hydrated</h4>
            <p>Drink at least 8 glasses of water today to stay hydrated and support your metabolism.</p>
          </div>
          
          <div className="tip-card">
            <h4>Balance Your Macros</h4>
            <p>Aim for a balanced meal with proteins, carbs, and healthy fats for optimal nutrition.</p>
          </div>
          
          <div className="tip-card">
            <h4>Movement Matters</h4>
            <p>Take a 10-minute walk after meals to aid digestion and maintain stable blood sugar.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;