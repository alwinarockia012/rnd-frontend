import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserEventsPage from './UserEventsPage';

// Mock Firebase authentication
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null);
    return jest.fn();
  }),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  addDoc: jest.fn(),
}));

// Mock firebaseService
jest.mock('../../services/firebaseService', () => ({
  __esModule: true,
  default: {
    getUpcomingEvents: jest.fn().mockResolvedValue([]),
    getPastEvents: jest.fn().mockResolvedValue([]),
  }
}));

// Mock useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('UserEventsPage', () => {
  test('renders without crashing', () => {
    render(
      <BrowserRouter>
        <UserEventsPage />
      </BrowserRouter>
    );
    
    // Check if the main header is rendered
    expect(screen.getByText('Our Events')).toBeInTheDocument();
    
    // Check if tabs are rendered
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('Past Events')).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    render(
      <BrowserRouter>
        <UserEventsPage />
      </BrowserRouter>
    );
    
    // Should show loading spinner
    expect(screen.getByText('Loading events...')).toBeInTheDocument();
  });
});