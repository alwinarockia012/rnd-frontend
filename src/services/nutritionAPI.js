// Simple nutrition API service
// This is a placeholder that can be expanded to integrate with real nutrition APIs

class NutritionAPI {
  // Mock database of common foods
  foodDatabase = [
    { id: 1, name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
    { id: 2, name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    { id: 3, name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { id: 4, name: 'Salmon', calories: 206, protein: 22, carbs: 0, fat: 13 },
    { id: 5, name: 'Brown Rice', calories: 216, protein: 5, carbs: 45, fat: 1.8 },
    { id: 6, name: 'Broccoli', calories: 55, protein: 3.7, carbs: 11, fat: 0.6 },
    { id: 7, name: 'Greek Yogurt', calories: 100, protein: 10, carbs: 3.6, fat: 0.7 },
    { id: 8, name: 'Almonds', calories: 164, protein: 6, carbs: 6, fat: 14 },
    { id: 9, name: 'Oatmeal', calories: 147, protein: 5, carbs: 25, fat: 2.5 },
    { id: 10, name: 'Egg', calories: 70, protein: 6, carbs: 0.6, fat: 5 }
  ];

  // Search for foods by name
  async searchFoods(query) {
    try {
      // In a real implementation, this would call an external API
      // For now, we'll search our mock database
      const results = this.foodDatabase.filter(food => 
        food.name.toLowerCase().includes(query.toLowerCase())
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

  // Get food details by ID
  async getFoodDetails(foodId) {
    try {
      const food = this.foodDatabase.find(item => item.id === foodId);
      
      if (food) {
        return {
          success: true,
          data: food
        };
      } else {
        return {
          success: false,
          error: 'Food not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calculate nutrition for a meal based on ingredients
  calculateMealNutrition(ingredients) {
    return ingredients.reduce((totals, ingredient) => {
      return {
        calories: totals.calories + (ingredient.calories || 0),
        protein: totals.protein + (ingredient.protein || 0),
        carbs: totals.carbs + (ingredient.carbs || 0),
        fat: totals.fat + (ingredient.fat || 0)
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }
}

// Export singleton instance
const nutritionAPI = new NutritionAPI();
export default nutritionAPI;