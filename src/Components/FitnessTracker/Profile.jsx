import React, { useState, useEffect } from 'react';
import fitnessService from '../../services/fitnessService';

const Profile = ({ user, onProfileUpdate }) => {
  const [profile, setProfile] = useState({
    age: '',
    currentWeight: '',
    targetWeight: '',
    height: '',
    gender: '',
    goal: 'maintain', // Will be determined based on weight difference
    activityLevel: 'moderate',
    dietaryPreference: 'none'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1); // Track which step we're on

  // Load user profile when component mounts
  useEffect(() => {
    const loadProfile = async () => {
      if (user && user.uid) {
        try {
          const result = await fitnessService.getUserProfile(user.uid);
          if (result.success) {
            setProfile(result.data);
            // If we already have data, determine which step to show
            if (result.data.age) setStep(2);
            if (result.data.currentWeight) setStep(3);
            if (result.data.targetWeight) setStep(4);
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    };

    loadProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNext = () => {
    // Validate current step before moving to next
    if (step === 1 && profile.age) {
      setStep(2);
    } else if (step === 2 && profile.currentWeight) {
      setStep(3);
    } else if (step === 3 && profile.targetWeight) {
      // Determine goal based on weight difference
      const current = parseFloat(profile.currentWeight);
      const target = parseFloat(profile.targetWeight);
      
      if (!isNaN(current) && !isNaN(target)) {
        let goal = 'maintain';
        if (target < current) {
          goal = 'lose'; // Weight loss program
        } else if (target > current) {
          goal = 'gain'; // Weight gain program
        }
        
        setProfile(prev => ({
          ...prev,
          goal: goal
        }));
      }
      setStep(4);
    } else if (step === 4) {
      // Submit the form
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (user && user.uid) {
        const result = await fitnessService.saveUserProfile(user.uid, profile);
        if (result.success) {
          setMessage('Profile saved successfully!');
          // Notify parent component that profile was updated
          if (onProfileUpdate) {
            onProfileUpdate(profile);
          }
          // Small delay to show success message before potentially redirecting
          setTimeout(() => {
            setMessage('');
          }, 2000);
        }
      }
    } catch (error) {
      setMessage('Error saving profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate BMR and TDEE
  const calculateBMR = () => {
    const { age, gender, height, currentWeight } = profile;
    if (!age || !gender || !height || !currentWeight) return 0;

    if (gender === 'male') {
      // Mifflin-St Jeor Equation for men
      return Math.round(10 * currentWeight + 6.25 * height - 5 * age + 5);
    } else {
      // Mifflin-St Jeor Equation for women
      return Math.round(10 * currentWeight + 6.25 * height - 5 * age - 161);
    }
  };

  const calculateTDEE = () => {
    const bmr = calculateBMR();
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9
    };
    
    return Math.round(bmr * (activityMultipliers[profile.activityLevel] || 1.2));
  };

  const calculateCalorieNeeds = () => {
    const tdee = calculateTDEE();
    switch (profile.goal) {
      case 'lose':
        return tdee - 500; // 500 calorie deficit for weight loss
      case 'gain':
        return tdee + 500; // 500 calorie surplus for muscle gain
      default:
        return tdee; // maintenance
    }
  };

  const bmr = calculateBMR();
  const tdee = calculateTDEE();
  const calorieNeeds = calculateCalorieNeeds();

  return (
    <div className="fitness-profile">
      <h2>Fitness Profile Setup</h2>
      
      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="profile-form">
        {/* Step 1: Age */}
        {step === 1 && (
          <div className="form-step">
            <h3>Step 1: Personal Information</h3>
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                name="age"
                value={profile.age}
                onChange={handleChange}
                placeholder="Enter your age"
                min="1"
                max="120"
                required
              />
            </div>
            <div className="form-navigation">
              <button 
                type="button" 
                className="next-button"
                onClick={handleNext}
                disabled={!profile.age}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Current Weight */}
        {step === 2 && (
          <div className="form-step">
            <h3>Step 2: Current Weight</h3>
            <div className="form-group">
              <label>Current Weight (kg)</label>
              <input
                type="number"
                name="currentWeight"
                value={profile.currentWeight}
                onChange={handleChange}
                placeholder="Enter your current weight"
                step="0.1"
                min="1"
                required
              />
            </div>
            <div className="form-navigation">
              <button 
                type="button" 
                className="back-button"
                onClick={handleBack}
              >
                Back
              </button>
              <button 
                type="button" 
                className="next-button"
                onClick={handleNext}
                disabled={!profile.currentWeight}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Target Weight */}
        {step === 3 && (
          <div className="form-step">
            <h3>Step 3: Target Weight</h3>
            <div className="form-group">
              <label>Target Weight (kg)</label>
              <input
                type="number"
                name="targetWeight"
                value={profile.targetWeight}
                onChange={handleChange}
                placeholder="Enter your target weight"
                step="0.1"
                min="1"
                required
              />
            </div>
            <div className="form-navigation">
              <button 
                type="button" 
                className="back-button"
                onClick={handleBack}
              >
                Back
              </button>
              <button 
                type="button" 
                className="next-button"
                onClick={handleNext}
                disabled={!profile.targetWeight}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Program Summary and Additional Details */}
        {step === 4 && (
          <div className="form-step">
            <h3>Step 4: Program Summary</h3>
            
            <div className="program-summary">
              <div className="summary-item">
                <span className="label">Current Weight:</span>
                <span className="value">{profile.currentWeight} kg</span>
              </div>
              <div className="summary-item">
                <span className="label">Target Weight:</span>
                <span className="value">{profile.targetWeight} kg</span>
              </div>
              <div className="summary-item">
                <span className="label">Program:</span>
                <span className="value program-name">
                  {profile.goal === 'lose' ? 'Weight Loss Program' : 
                   profile.goal === 'gain' ? 'Weight Gain Program' : 'Maintenance Program'}
                </span>
              </div>
            </div>

            <div className="form-section">
              <h3>Additional Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={profile.height}
                    onChange={handleChange}
                    placeholder="Enter your height"
                  />
                </div>
                
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={profile.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Activity Level</label>
                <select
                  name="activityLevel"
                  value={profile.activityLevel}
                  onChange={handleChange}
                >
                  <option value="sedentary">Sedentary (little or no exercise)</option>
                  <option value="light">Light (exercise 1-3 days/week)</option>
                  <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                  <option value="active">Active (exercise 6-7 days/week)</option>
                  <option value="veryActive">Very Active (hard exercise daily)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Dietary Preferences</label>
                <select
                  name="dietaryPreference"
                  value={profile.dietaryPreference}
                  onChange={handleChange}
                >
                  <option value="none">None</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto</option>
                  <option value="paleo">Paleo</option>
                </select>
              </div>
            </div>
            
            {bmr > 0 && (
              <div className="nutrition-calculations">
                <h3>Nutrition Calculations</h3>
                <div className="calculation-cards">
                  <div className="calculation-card">
                    <h4>BMR</h4>
                    <p className="value">{bmr} calories/day</p>
                    <p className="description">Basal Metabolic Rate - calories needed at rest</p>
                  </div>
                  
                  <div className="calculation-card">
                    <h4>TDEE</h4>
                    <p className="value">{tdee} calories/day</p>
                    <p className="description">Total Daily Energy Expenditure</p>
                  </div>
                  
                  <div className="calculation-card">
                    <h4>Daily Calorie Needs</h4>
                    <p className="value">{calorieNeeds} calories/day</p>
                    <p className="description">Based on your goal: {profile.goal}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="form-navigation">
              <button 
                type="button" 
                className="back-button"
                onClick={handleBack}
              >
                Back
              </button>
              <button 
                type="button" 
                className="save-button"
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default Profile;