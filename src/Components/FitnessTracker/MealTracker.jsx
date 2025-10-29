import React, { useState, useEffect } from 'react';
import fitnessService from '../../services/fitnessService';

const MealTracker = ({ user }) => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingNutrition, setFetchingNutrition] = useState(false);
  const [message, setMessage] = useState('');
  
  const [newMeal, setNewMeal] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    mealType: 'breakfast',
    date: new Date().toISOString().split('T')[0]
  });

  // Load user meals when component mounts
  useEffect(() => {
    const loadMeals = async () => {
      if (user && user.uid) {
        try {
          setLoading(true);
          const userMeals = await fitnessService.getUserMeals(user.uid);
          setMeals(userMeals);
        } catch (error) {
          console.error('Error loading meals:', error);
          setMessage('Error loading meals: ' + error.message);
        } finally {
          setLoading(false);
        }
      }
    };

    loadMeals();
  }, [user]);

  const fetchNutritionData = async (foodName) => {
    if (!foodName.trim()) return;
    
    setFetchingNutrition(true);
    setMessage('');
    
    try {
      // DeepSeek API configuration
      const apiKey = 'sk-1116ca52ef05484c83f0b8b3603f7ad0'; // Your DeepSeek API key
      const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "user",
              content: `Given a food name, return approximate nutrition facts per 100 grams in strict JSON format with keys: food, calories, protein_g, carbs_g, fat_g. Only return valid JSON without any markdown formatting. Food: ${foodName}`
            }
          ],
          temperature: 0.1,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      const nutritionInfo = data.choices[0].message.content.trim();
      
      // Clean the response to remove any markdown formatting
      let cleanedNutritionInfo = nutritionInfo;
      if (cleanedNutritionInfo.startsWith('```json')) {
        cleanedNutritionInfo = cleanedNutritionInfo.substring(7);
      }
      if (cleanedNutritionInfo.startsWith('```')) {
        cleanedNutritionInfo = cleanedNutritionInfo.substring(3);
      }
      if (cleanedNutritionInfo.endsWith('```')) {
        cleanedNutritionInfo = cleanedNutritionInfo.slice(0, -3);
      }
      cleanedNutritionInfo = cleanedNutritionInfo.trim();
      
      // Try to parse the JSON response
      try {
        const nutritionData = JSON.parse(cleanedNutritionInfo);
        
        // Update the form fields with the fetched nutrition data
        setNewMeal(prev => ({
          ...prev,
          calories: nutritionData.calories || '',
          protein: nutritionData.protein_g || '',
          carbs: nutritionData.carbs_g || '',
          fat: nutritionData.fat_g || ''
        }));
        
        setMessage(`Nutrition facts for ${nutritionData.food} fetched successfully!`);
      } catch (parseError) {
        console.error('Error parsing nutrition data:', parseError);
        console.error('Raw nutrition info:', nutritionInfo);
        setMessage('Failed to parse nutrition data. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
      setMessage('Error fetching nutrition data: ' + error.message);
    } finally {
      setFetchingNutrition(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewMeal(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Fetch nutrition data when meal name is updated
    if (name === 'name') {
      // Debounce the API call to avoid too many requests
      clearTimeout(window.nutritionFetchTimeout);
      window.nutritionFetchTimeout = setTimeout(() => {
        if (value.trim()) {
          fetchNutritionData(value);
        }
      }, 500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (user && user.uid) {
        const mealData = {
          ...newMeal,
          calories: parseInt(newMeal.calories) || 0,
          protein: parseInt(newMeal.protein) || 0,
          carbs: parseInt(newMeal.carbs) || 0,
          fat: parseInt(newMeal.fat) || 0
        };
        
        const result = await fitnessService.logMeal(user.uid, mealData);
        if (result.success) {
          setMessage('Meal logged successfully!');
          // Refresh meals list
          const updatedMeals = await fitnessService.getUserMeals(user.uid);
          setMeals(updatedMeals);
          // Reset form
          setNewMeal({
            name: '',
            calories: '',
            protein: '',
            carbs: '',
            fat: '',
            mealType: 'breakfast',
            date: new Date().toISOString().split('T')[0]
          });
          
          // Dispatch a custom event to notify the dashboard to refresh
          window.dispatchEvent(new CustomEvent('mealLogged', { detail: { userId: user.uid } }));
        }
      }
    } catch (error) {
      setMessage('Error logging meal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteMeal = async (mealId) => {
    // In a real implementation, you would delete from Firebase
    // For now, we'll just remove from local state
    setMeals(meals.filter(meal => meal.id !== mealId));
    setMessage('Meal deleted successfully!');
    
    // Dispatch a custom event to notify the dashboard to refresh
    window.dispatchEvent(new CustomEvent('mealDeleted', { detail: { userId: user.uid } }));
  };

  // Calculate daily totals
  const calculateDailyTotals = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayMeals = meals.filter(meal => {
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
    
    return todayMeals.reduce((totals, meal) => {
      return {
        calories: totals.calories + (meal.calories || 0),
        protein: totals.protein + (meal.protein || 0),
        carbs: totals.carbs + (meal.carbs || 0),
        fat: totals.fat + (meal.fat || 0)
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const dailyTotals = calculateDailyTotals();

  // Group meals by date
  const groupMealsByDate = () => {
    const grouped = {};
    meals.forEach(meal => {
      // Check if meal has a loggedAt timestamp
      let mealDateStr = 'Unknown date';
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
        mealDateStr = mealDate.toISOString().split('T')[0];
      }
      // Fallback to date field if loggedAt is not available
      else if (meal.date) {
        mealDateStr = meal.date;
      }
      
      if (!grouped[mealDateStr]) {
        grouped[mealDateStr] = [];
      }
      grouped[mealDateStr].push(meal);
    });
    return grouped;
  };

  const groupedMeals = groupMealsByDate();

  return (
    <div className="meal-tracker">
      <h2>Meal Tracker</h2>
      
      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
      
      <div className="meal-tracker-content">
        <div className="meal-form-section">
          <h3>Log New Meal</h3>
          <form onSubmit={handleSubmit} className="meal-form">
            <div className="form-row">
              <div className="form-group">
                <label>Meal Name</label>
                <input
                  type="text"
                  name="name"
                  value={newMeal.name}
                  onChange={handleChange}
                  placeholder="e.g., Oatmeal with Berries"
                  required
                />
                {fetchingNutrition && <span className="loading-text">Fetching nutrition data...</span>}
              </div>
              
              <div className="form-group">
                <label>Meal Type</label>
                <select
                  name="mealType"
                  value={newMeal.mealType}
                  onChange={handleChange}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Calories</label>
                <input
                  type="number"
                  name="calories"
                  value={newMeal.calories}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
              
              <div className="form-group">
                <label>Protein (g)</label>
                <input
                  type="number"
                  name="protein"
                  value={newMeal.protein}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Carbs (g)</label>
                <input
                  type="number"
                  name="carbs"
                  value={newMeal.carbs}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
              
              <div className="form-group">
                <label>Fat (g)</label>
                <input
                  type="number"
                  name="fat"
                  value={newMeal.fat}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={newMeal.date}
                onChange={handleChange}
              />
            </div>
            
            <button 
              type="submit" 
              className="log-meal-button"
              disabled={loading || fetchingNutrition}
            >
              {loading ? 'Logging...' : 'Log Meal'}
            </button>
          </form>
        </div>
        
        <div className="daily-summary">
          <h3>Today's Nutrition Summary</h3>
          <div className="summary-cards">
            <div className="summary-card">
              <h4>Calories</h4>
              <p className="value">{dailyTotals.calories}</p>
            </div>
            
            <div className="summary-card">
              <h4>Protein</h4>
              <p className="value">{dailyTotals.protein}g</p>
            </div>
            
            <div className="summary-card">
              <h4>Carbs</h4>
              <p className="value">{dailyTotals.carbs}g</p>
            </div>
            
            <div className="summary-card">
              <h4>Fat</h4>
              <p className="value">{dailyTotals.fat}g</p>
            </div>
          </div>
        </div>
        
        <div className="meal-history">
          <h3>Meal History</h3>
          {Object.keys(groupedMeals).length === 0 ? (
            <p className="no-meals">No meals logged yet. Start by logging your first meal!</p>
          ) : (
            Object.entries(groupedMeals)
              .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA)) // Sort by date descending
              .map(([date, mealsForDate]) => (
                <div key={date} className="meal-date-group">
                  <h4>{date}</h4>
                  {mealsForDate
                    .sort((a, b) => {
                      // Sort by loggedAt timestamp if available, otherwise by date
                      if (a.loggedAt && b.loggedAt) {
                        const dateA = a.loggedAt.toDate ? a.loggedAt.toDate() : new Date(a.loggedAt);
                        const dateB = b.loggedAt.toDate ? b.loggedAt.toDate() : new Date(b.loggedAt);
                        return dateB - dateA;
                      }
                      return 0;
                    })
                    .map(meal => (
                      <div key={meal.id} className="meal-item">
                        <div className="meal-info">
                          <h5>{meal.name}</h5>
                          <p className="meal-type">{meal.mealType}</p>
                          <div className="meal-details">
                            <span>{meal.calories || 0} cal</span>
                            <span>{meal.protein || 0}g protein</span>
                            <span>{meal.carbs || 0}g carbs</span>
                            <span>{meal.fat || 0}g fat</span>
                          </div>
                        </div>
                        <button 
                          className="delete-meal-button"
                          onClick={() => deleteMeal(meal.id)}
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

export default MealTracker;