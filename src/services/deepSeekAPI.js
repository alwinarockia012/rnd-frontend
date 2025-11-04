// DeepSeek API Service
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Get response from DeepSeek API
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} userData - User data including meals, workouts, and profile
 * @returns {Promise<string>} - AI response text
 */
export const getDeepSeekResponse = async (messages, userData = {}) => {
  try {
    // Prepare context with user data
    const context = `
User Profile:
- Name: ${userData.user?.displayName || 'User'}
- Age: ${userData.profile?.age || 'Not provided'}
- Weight: ${userData.profile?.currentWeight || 'Not provided'} kg
- Height: ${userData.profile?.height || 'Not provided'} cm
- Goal: ${userData.profile?.goal || 'Not provided'}
- Activity Level: ${userData.profile?.activityLevel || 'Not provided'}

Recent Meals:
${userData.meals?.slice(0, 3).map(meal => `- ${meal.name}: ${meal.calories || 'N/A'} calories`).join('\n') || 'No recent meals'}

Recent Workouts:
${userData.workouts?.slice(0, 3).map(workout => `- ${workout.type}: ${workout.duration || 'N/A'} minutes`).join('\n') || 'No recent workouts'}
    `.trim();

    // Format messages for DeepSeek API
    const formattedMessages = [
      {
        role: "system",
        content: `You are a helpful fitness and nutrition AI assistant. Provide personalized advice based on the user's profile, meals, and workouts. Keep responses concise and relevant to fitness, nutrition, and wellness. Here's the user context:\n\n${context}`
      },
      ...messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))
    ];

    // Get API key from environment variables
    const apiKey = process.env.REACT_APP_DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    // Make API request
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    throw new Error(`Failed to get response from AI: ${error.message}`);
  }
};

const deepSeekAPI = {
  getDeepSeekResponse
};

export default deepSeekAPI;