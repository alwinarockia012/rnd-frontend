import React, { useState, useEffect } from 'react';
import fitnessService from '../../services/fitnessService';

const WorkoutTracker = ({ user }) => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [newWorkout, setNewWorkout] = useState({
    name: '',
    type: 'cardio',
    duration: '',
    calories: '',
    distance: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Load user workouts when component mounts
  useEffect(() => {
    const loadWorkouts = async () => {
      if (user && user.uid) {
        try {
          setLoading(true);
          const userWorkouts = await fitnessService.getUserWorkouts(user.uid);
          setWorkouts(userWorkouts);
        } catch (error) {
          console.error('Error loading workouts:', error);
          setMessage('Error loading workouts: ' + error.message);
        } finally {
          setLoading(false);
        }
      }
    };

    loadWorkouts();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewWorkout(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (user && user.uid) {
        const workoutData = {
          ...newWorkout,
          duration: parseInt(newWorkout.duration) || 0,
          calories: parseInt(newWorkout.calories) || 0,
          distance: parseFloat(newWorkout.distance) || 0
        };
        
        const result = await fitnessService.logWorkout(user.uid, workoutData);
        if (result.success) {
          setMessage('Workout logged successfully!');
          // Refresh workouts list
          const updatedWorkouts = await fitnessService.getUserWorkouts(user.uid);
          setWorkouts(updatedWorkouts);
          // Reset form
          setNewWorkout({
            name: '',
            type: 'cardio',
            duration: '',
            calories: '',
            distance: '',
            date: new Date().toISOString().split('T')[0]
          });
          
          // Dispatch a custom event to notify the dashboard to refresh
          window.dispatchEvent(new CustomEvent('workoutLogged', { detail: { userId: user.uid } }));
        }
      }
    } catch (error) {
      setMessage('Error logging workout: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkout = async (workoutId) => {
    // In a real implementation, you would delete from Firebase
    // For now, we'll just remove from local state
    setWorkouts(workouts.filter(workout => workout.id !== workoutId));
    setMessage('Workout deleted successfully!');
    
    // Dispatch a custom event to notify the dashboard to refresh
    window.dispatchEvent(new CustomEvent('workoutDeleted', { detail: { userId: user.uid } }));
  };

  // Calculate weekly totals
  const calculateWeeklyTotals = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentWorkouts = workouts.filter(workout => {
      // Check if workout has a loggedAt timestamp
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
    
    return recentWorkouts.reduce((totals, workout) => {
      return {
        duration: totals.duration + (workout.duration || 0),
        calories: totals.calories + (workout.calories || 0),
        workouts: totals.workouts + 1
      };
    }, { duration: 0, calories: 0, workouts: 0 });
  };

  const weeklyTotals = calculateWeeklyTotals();

  // Group workouts by date
  const groupWorkoutsByDate = () => {
    const grouped = {};
    workouts.forEach(workout => {
      // Check if workout has a loggedAt timestamp
      let workoutDateStr = 'Unknown date';
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
        workoutDateStr = workoutDate.toISOString().split('T')[0];
      }
      // Fallback to date field if loggedAt is not available
      else if (workout.date) {
        workoutDateStr = workout.date;
      }
      
      if (!grouped[workoutDateStr]) {
        grouped[workoutDateStr] = [];
      }
      grouped[workoutDateStr].push(workout);
    });
    return grouped;
  };

  const groupedWorkouts = groupWorkoutsByDate();

  return (
    <div className="workout-tracker">
      <h2>Workout Tracker</h2>
      
      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
      
      <div className="workout-tracker-content">
        <div className="workout-form-section">
          <h3>Log New Workout</h3>
          <form onSubmit={handleSubmit} className="workout-form">
            <div className="form-row">
              <div className="form-group">
                <label>Workout Name</label>
                <input
                  type="text"
                  name="name"
                  value={newWorkout.name}
                  onChange={handleChange}
                  placeholder="e.g., Morning Run"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Workout Type</label>
                <select
                  name="type"
                  value={newWorkout.type}
                  onChange={handleChange}
                >
                  <option value="cardio">Cardio</option>
                  <option value="strength">Strength Training</option>
                  <option value="hiit">HIIT</option>
                  <option value="yoga">Yoga</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  name="duration"
                  value={newWorkout.duration}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
              
              <div className="form-group">
                <label>Calories Burned</label>
                <input
                  type="number"
                  name="calories"
                  value={newWorkout.calories}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Distance (km)</label>
              <input
                type="number"
                name="distance"
                value={newWorkout.distance}
                onChange={handleChange}
                placeholder="0.0"
                step="0.1"
              />
            </div>
            
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={newWorkout.date}
                onChange={handleChange}
              />
            </div>
            
            <button 
              type="submit" 
              className="log-workout-button"
              disabled={loading}
            >
              {loading ? 'Logging...' : 'Log Workout'}
            </button>
          </form>
        </div>
        
        <div className="weekly-summary">
          <h3>Weekly Summary</h3>
          <div className="summary-cards">
            <div className="summary-card">
              <h4>Workouts</h4>
              <p className="value">{weeklyTotals.workouts}</p>
            </div>
            
            <div className="summary-card">
              <h4>Duration</h4>
              <p className="value">{weeklyTotals.duration} min</p>
            </div>
            
            <div className="summary-card">
              <h4>Calories</h4>
              <p className="value">{weeklyTotals.calories}</p>
            </div>
          </div>
        </div>
        
        <div className="workout-history">
          <h3>Workout History</h3>
          {Object.keys(groupedWorkouts).length === 0 ? (
            <p className="no-workouts">No workouts logged yet. Start by logging your first workout!</p>
          ) : (
            Object.entries(groupedWorkouts)
              .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA)) // Sort by date descending
              .map(([date, workoutsForDate]) => (
                <div key={date} className="workout-date-group">
                  <h4>{date}</h4>
                  {workoutsForDate
                    .sort((a, b) => {
                      // Sort by loggedAt timestamp if available, otherwise by date
                      if (a.loggedAt && b.loggedAt) {
                        const dateA = a.loggedAt.toDate ? a.loggedAt.toDate() : new Date(a.loggedAt);
                        const dateB = b.loggedAt.toDate ? b.loggedAt.toDate() : new Date(b.loggedAt);
                        return dateB - dateA;
                      }
                      return 0;
                    })
                    .map(workout => (
                      <div key={workout.id} className="workout-item">
                        <div className="workout-info">
                          <h5>{workout.name}</h5>
                          <p className="workout-type">{workout.type}</p>
                          <div className="workout-details">
                            <span>{workout.duration || 0} min</span>
                            <span>{workout.calories || 0} cal</span>
                            {workout.distance > 0 && <span>{workout.distance} km</span>}
                          </div>
                        </div>
                        <button 
                          className="delete-workout-button"
                          onClick={() => deleteWorkout(workout.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  }
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutTracker;