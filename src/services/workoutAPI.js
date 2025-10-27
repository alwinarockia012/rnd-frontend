// Simple workout API service
// This is a placeholder that can be expanded to integrate with real workout APIs

class WorkoutAPI {
  // Mock database of common workouts
  workoutDatabase = [
    { 
      id: 1, 
      name: 'Running', 
      type: 'cardio', 
      MET: 8.0, // Metabolic Equivalent of Task
      description: 'Jogging at a steady pace'
    },
    { 
      id: 2, 
      name: 'Cycling', 
      type: 'cardio', 
      MET: 7.5,
      description: 'Moderate cycling on flat terrain'
    },
    { 
      id: 3, 
      name: 'Swimming', 
      type: 'cardio', 
      MET: 6.0,
      description: 'Moderate swimming, freestyle'
    },
    { 
      id: 4, 
      name: 'Weight Lifting', 
      type: 'strength', 
      MET: 6.0,
      description: 'General weight lifting'
    },
    { 
      id: 5, 
      name: 'Yoga', 
      type: 'flexibility', 
      MET: 2.5,
      description: 'Hatha yoga practice'
    },
    { 
      id: 6, 
      name: 'HIIT', 
      type: 'cardio', 
      MET: 12.0,
      description: 'High-intensity interval training'
    },
    { 
      id: 7, 
      name: 'Walking', 
      type: 'cardio', 
      MET: 3.5,
      description: 'Brisk walking at 3.5 mph'
    },
    { 
      id: 8, 
      name: 'Pilates', 
      type: 'strength', 
      MET: 3.0,
      description: 'Mat pilates workout'
    }
  ];

  // Search for workouts by name
  async searchWorkouts(query) {
    try {
      // In a real implementation, this would call an external API
      // For now, we'll search our mock database
      const results = this.workoutDatabase.filter(workout => 
        workout.name.toLowerCase().includes(query.toLowerCase()) ||
        workout.type.toLowerCase().includes(query.toLowerCase())
      );
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get workout details by ID
  async getWorkoutDetails(workoutId) {
    try {
      const workout = this.workoutDatabase.find(item => item.id === workoutId);
      
      if (workout) {
        return {
          success: true,
          data: workout
        };
      } else {
        return {
          success: false,
          error: 'Workout not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calculate calories burned for a workout
  // Formula: Calories = MET * weight(kg) * time(hours)
  calculateCaloriesBurned(workout, weight, durationMinutes) {
    if (!workout || !weight || !durationMinutes) {
      return 0;
    }
    
    const durationHours = durationMinutes / 60;
    return Math.round(workout.MET * weight * durationHours);
  }

  // Get recommended workouts based on user goals
  getRecommendedWorkouts(goal, fitnessLevel) {
    let recommended = [];
    
    switch (goal) {
      case 'lose':
        // For weight loss, recommend cardio and HIIT
        recommended = this.workoutDatabase.filter(w => 
          w.type === 'cardio' || w.type === 'hiit'
        );
        break;
      case 'gain':
        // For muscle gain, recommend strength training
        recommended = this.workoutDatabase.filter(w => 
          w.type === 'strength'
        );
        break;
      case 'maintain':
        // For maintenance, recommend a mix
        recommended = this.workoutDatabase;
        break;
      default:
        recommended = this.workoutDatabase;
    }
    
    // Adjust based on fitness level
    if (fitnessLevel === 'beginner') {
      // Filter out high-intensity workouts for beginners
      recommended = recommended.filter(w => 
        w.name !== 'HIIT' && w.MET < 8.0
      );
    } else if (fitnessLevel === 'advanced') {
      // Include more challenging workouts for advanced users
      recommended = [...recommended, ...this.workoutDatabase];
    }
    
    // Remove duplicates
    const uniqueRecommended = Array.from(
      new Set(recommended.map(w => w.id))
    ).map(id => {
      return recommended.find(w => w.id === id);
    });
    
    return uniqueRecommended.slice(0, 5); // Return top 5 recommendations
  }
}

// Export singleton instance
const workoutAPI = new WorkoutAPI();
export default workoutAPI;