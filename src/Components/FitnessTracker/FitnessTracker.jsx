import React, { useState, useEffect } from 'react';
import './FitnessTracker.css';
import DashboardNav from '../DashboardNav/DashboardNav';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Profile from './Profile';
import MealTracker from './MealTracker';
import WorkoutTracker from './WorkoutTracker';
import DashboardView from './DashboardView';
import fitnessService from '../../services/fitnessService';

const FitnessTracker = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ userProfile, setUserProfile ] = useState(null);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force refresh of dashboard

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check if user has completed profile setup
        checkProfileSetup(currentUser);
      } else {
        setUser(null);
        setProfileSetupComplete(false);
        setLoading(false);
      }
    });

    // Listen for workout events to refresh dashboard
    const handleWorkoutEvent = () => {
      // Increment refresh key to force re-render of dashboard
      setRefreshKey(prev => prev + 1);
    };

    // Listen for meal events to refresh dashboard
    const handleMealEvent = () => {
      // Increment refresh key to force re-render of dashboard
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('workoutLogged', handleWorkoutEvent);
    window.addEventListener('workoutDeleted', handleWorkoutEvent);
    window.addEventListener('mealLogged', handleMealEvent);
    window.addEventListener('mealDeleted', handleMealEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('workoutLogged', handleWorkoutEvent);
      window.removeEventListener('workoutDeleted', handleWorkoutEvent);
      window.removeEventListener('mealLogged', handleMealEvent);
      window.removeEventListener('mealDeleted', handleMealEvent);
    };
  }, []);

  const checkProfileSetup = async (currentUser) => {
    if (currentUser && currentUser.uid) {
      try {
        const result = await fitnessService.getUserProfile(currentUser.uid);
        if (result.success && result.data.age && result.data.currentWeight && result.data.targetWeight) {
          setUserProfile(result.data);
          setProfileSetupComplete(true);
        } else {
          setProfileSetupComplete(false);
        }
      } catch (error) {
        console.error('Error checking profile setup:', error);
        setProfileSetupComplete(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleProfileUpdate = (profile) => {
    setUserProfile(profile);
    // Check if profile setup is complete
    if (profile.age && profile.currentWeight && profile.targetWeight) {
      setProfileSetupComplete(true);
    }
  };

  const switchToDashboard = () => {
    setActiveTab('dashboard');
  };

  if (loading) {
    return <div className="fitness-tracker">Loading...</div>;
  }

  if (!user) {
    return <div className="fitness-tracker">Please log in to access the fitness tracker.</div>;
  }

  // If profile setup is not complete, show only the profile setup
  if (!profileSetupComplete) {
    return (
      <div className="fitness-tracker">
        <DashboardNav />
        <div className="fitness-tracker-content">
          <div className="fitness-header">
            <h1>Fitness & Nutrition Tracker</h1>
            <p>Welcome, {user.displayName || 'User'}! Let's set up your profile.</p>
          </div>
          <div className="fitness-content">
            <Profile user={user} onProfileUpdate={handleProfileUpdate} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fitness-tracker">
      <DashboardNav />
      <div className="fitness-tracker-content">
        <div className="fitness-header">
          <h1>Fitness & Nutrition Tracker</h1>
          <p>Welcome back, {user.displayName || 'User'}!</p>
        </div>

        <div className="fitness-tabs">
          <button 
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`tab-button ${activeTab === 'meals' ? 'active' : ''}`}
            onClick={() => setActiveTab('meals')}
          >
            Meal Tracker
          </button>
          <button 
            className={`tab-button ${activeTab === 'workouts' ? 'active' : ''}`}
            onClick={() => setActiveTab('workouts')}
          >
            Workouts
          </button>
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
        </div>

        <div className="fitness-content">
          {activeTab === 'dashboard' && <DashboardView key={refreshKey} user={user} />}
          {activeTab === 'meals' && <MealTracker user={user} />}
          {activeTab === 'workouts' && <WorkoutTracker user={user} onSwitchToDashboard={switchToDashboard} />}
          {activeTab === 'profile' && <Profile user={user} onProfileUpdate={handleProfileUpdate} />}
        </div>
      </div>
    </div>
  );
};

export default FitnessTracker;