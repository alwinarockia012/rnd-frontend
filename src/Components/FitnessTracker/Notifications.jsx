import React, { useState, useEffect } from 'react';

const Notifications = ({ user, meals, workouts, profile }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const generateSmartNotifications = () => {
      const newNotifications = [];
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's meals
      const todayMeals = meals.filter(meal => {
        if (meal.loggedAt) {
          let mealDate;
          if (meal.loggedAt.toDate) {
            mealDate = meal.loggedAt.toDate();
          } else if (meal.loggedAt instanceof Date) {
            mealDate = meal.loggedAt;
          } else {
            mealDate = new Date(meal.loggedAt);
          }
          return mealDate.toISOString().split('T')[0] === today;
        } else if (meal.date) {
          return meal.date === today;
        }
        return false;
      });
      
      // Calculate today's nutrition totals
      const nutritionTotals = todayMeals.reduce((totals, meal) => {
        return {
          calories: totals.calories + (meal.calories || 0),
          protein: totals.protein + (meal.protein || 0),
          carbs: totals.carbs + (meal.carbs || 0),
          fat: totals.fat + (meal.fat || 0)
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
      
      // Get user's calorie goal from profile
      const calorieGoal = profile?.calorieGoal || 2200;
      
      // Smart reminder: Low on protein
      if (nutritionTotals.protein < 50) {
        newNotifications.push({
          id: 'low-protein',
          type: 'info',
          title: 'Low Protein Intake',
          message: 'You\'ve only consumed ' + nutritionTotals.protein + 'g of protein today. Consider adding a protein-rich snack!',
          priority: 'high'
        });
      }
      
      // Smart reminder: High on calories
      if (nutritionTotals.calories > calorieGoal * 1.2) {
        newNotifications.push({
          id: 'high-calories',
          type: 'warning',
          title: 'Calorie Intake',
          message: 'You\'ve consumed ' + nutritionTotals.calories + ' calories today, which is above your goal of ' + calorieGoal + '.',
          priority: 'medium'
        });
      }
      
      // Smart reminder: Low on calories
      if (nutritionTotals.calories < calorieGoal * 0.7) {
        newNotifications.push({
          id: 'low-calories',
          type: 'info',
          title: 'Low Calorie Intake',
          message: 'You\'ve only consumed ' + nutritionTotals.calories + ' calories today. Make sure you\'re eating enough to fuel your activities!',
          priority: 'high'
        });
      }
      
      // Smart reminder: No workouts logged today
      const todayWorkouts = workouts.filter(workout => {
        if (workout.loggedAt) {
          let workoutDate;
          if (workout.loggedAt.toDate) {
            workoutDate = workout.loggedAt.toDate();
          } else if (workout.loggedAt instanceof Date) {
            workoutDate = workout.loggedAt;
          } else {
            workoutDate = new Date(workout.loggedAt);
          }
          return workoutDate.toISOString().split('T')[0] === today;
        } else if (workout.date) {
          return workout.date === today;
        }
        return false;
      });
      
      if (todayWorkouts.length === 0 && todayMeals.length > 0) {
        newNotifications.push({
          id: 'no-workout',
          type: 'info',
          title: 'No Workout Today',
          message: 'You haven\'t logged any workouts today. Consider adding some physical activity to your routine!',
          priority: 'medium'
        });
      }
      
      // Smart reminder: Hydration
      // This would typically come from a water intake tracker
      newNotifications.push({
        id: 'hydration',
        type: 'info',
        title: 'Stay Hydrated',
        message: 'Remember to drink at least 8 glasses of water today!',
        priority: 'low'
      });
      
      setNotifications(newNotifications);
    };
    
    if (user && meals && workouts && profile) {
      generateSmartNotifications();
    }
  }, [user, meals, workouts, profile]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notifications-panel">
      <h3>Smart Notifications</h3>
      <div className="notifications-list">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`notification-item notification-${notification.type}`}
          >
            <div className="notification-content">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
            </div>
            <button 
              className="dismiss-button"
              onClick={() => {
                setNotifications(notifications.filter(n => n.id !== notification.id));
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;