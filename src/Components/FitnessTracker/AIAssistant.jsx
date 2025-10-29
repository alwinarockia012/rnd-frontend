import React, { useState } from 'react';

const AIAssistant = ({ user, meals, workouts, profile }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hi ' + (user?.displayName || 'there') + '! I\'m your AI Fitness Assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Simple rule-based AI responses
  const getAIResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    // Protein-related queries
    if (message.includes('protein') || message.includes('muscle')) {
      return "Protein is essential for muscle repair and growth. Aim for 1.2-2.0g per kg of body weight. Good sources include lean meats, fish, eggs, dairy, legumes, and nuts.";
    }
    
    // Calorie-related queries
    if (message.includes('calorie') || message.includes('calories') || message.includes('lose weight')) {
      const calorieGoal = profile?.calorieGoal || 2200;
      return `Your daily calorie goal is approximately ${calorieGoal} calories. To lose weight, aim for a 500-calorie deficit per day through diet and exercise.`;
    }
    
    // Workout-related queries
    if (message.includes('workout') || message.includes('exercise')) {
      return "For beginners, I recommend starting with 3 sessions per week combining cardio and strength training. Try 30 minutes of brisk walking or jogging, followed by bodyweight exercises like push-ups and squats.";
    }
    
    // Meal suggestions
    if (message.includes('meal') || message.includes('food') || message.includes('eat')) {
      const recentMeals = meals.slice(0, 5); // Get 5 most recent meals
      const proteinMeals = recentMeals.filter(meal => 
        meal.protein > 20 && meal.name.toLowerCase().includes('chicken|fish|beef|tofu|beans|lentils'.split('|').some(protein => meal.name.toLowerCase().includes(protein)))
      );
      
      if (proteinMeals.length > 0) {
        return "Based on your recent meals, I see you enjoy protein-rich foods. For a balanced meal, try grilled salmon with quinoa and steamed vegetables. It's packed with omega-3s, protein, and fiber!";
      } else {
        return "How about trying a balanced meal with lean protein, complex carbs, and vegetables? For example: grilled chicken breast with brown rice and broccoli. This combination provides sustained energy and supports muscle recovery.";
      }
    }
    
    // Water intake
    if (message.includes('water') || message.includes('hydrate')) {
      return "Aim for at least 8 glasses (64 oz) of water daily. If you're active or in a hot climate, you may need more. Try carrying a water bottle and setting hourly reminders to drink.";
    }
    
    // General fitness advice
    if (message.includes('fitness') || message.includes('health') || message.includes('wellness')) {
      return "Consistency is key to fitness success. Focus on building sustainable habits rather than drastic changes. Aim for 150 minutes of moderate exercise per week and 7-9 hours of sleep for optimal recovery.";
    }
    
    // Default response
    return "I'm here to help with your fitness journey! You can ask me about nutrition, workouts, meal suggestions, or general health tips. What would you like to know?";
  };

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;
    
    // Add user message
    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        sender: 'ai',
        text: getAIResponse(inputValue),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <h3>AI Fitness Assistant</h3>
        <p>Your personal nutrition and fitness advisor</p>
      </div>
      
      <div className="chat-container">
        <div className="messages-container">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.sender}`}
            >
              <div className="message-content">
                <p>{message.text}</p>
                <span className="timestamp">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message ai">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="input-container">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about meals, workouts, nutrition, or fitness tips..."
            rows="3"
          />
          <button 
            onClick={handleSendMessage}
            disabled={isLoading || inputValue.trim() === ''}
            className="send-button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;