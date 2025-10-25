# Main Event Booking Controls Feature - Summary

## Issue
The admin panel's main upcoming event section needed booking controls:
1. Booking buttons (Open Bookings/Closed Bookings) should appear above the "Save Main Event" button
2. When saving the main event, admins should be prompted for booking options before saving

## Solution
Added booking controls directly in the main event form with integrated workflow.

## Changes Made

### 1. Modified ManageEvents.jsx

#### Added:
- State variables for booking status and close booking time
- Booking controls in the main event form
- Updated save logic to include booking information
- User confirmation before saving

#### Key Changes:

1. **State Management**:
   ```javascript
   const [bookingStatus, setBookingStatus] = useState('closed');
   const [closeBookingTime, setCloseBookingTime] = useState('');
   ```

2. **Booking Controls in Form**:
   ```jsx
   {/* Booking Controls */}
   <div className="form-group">
       <label>Booking Status:</label>
       <div className="booking-controls">
           <button 
               type="button"
               className={`booking-btn ${bookingStatus === 'open' ? 'active' : ''}`}
               onClick={() => setBookingStatus('open')}
           >
               Open Bookings
           </button>
           <button 
               type="button"
               className={`booking-btn ${bookingStatus === 'closed' ? 'active' : ''}`}
               onClick={() => {
                   const time = prompt('Enter the time when bookings should close (e.g., 2023-12-31 18:00):');
                   if (time) {
                       const closeTime = new Date(time);
                       if (!isNaN(closeTime.getTime())) {
                           setCloseBookingTime(time);
                           setBookingStatus('closed');
                       } else {
                           alert('Invalid date/time format. Please use YYYY-MM-DD HH:MM format.');
                       }
                   }
               }}
           >
               Close Bookings
           </button>
       </div>
       {bookingStatus === 'closed' && closeBookingTime && (
           <p className="close-time-info">Bookings will close at: {closeBookingTime}</p>
       )}
   </div>
   ```

3. **Updated Save Logic**:
   ```javascript
   const handleSaveMainEvent = async (e) => {
       e.preventDefault();
       
       // Ask for booking options before saving
       const shouldSave = window.confirm('Do you want to save the main event with the selected booking options?');
       if (!shouldSave) return;
       
       try {
           // Prepare event data with booking information
           const eventData = {
               ...mainUpcomingEvent,
               bookingStatus: bookingStatus
           };
           
           // Add close booking time if status is closed and time is set
           if (bookingStatus === 'closed' && closeBookingTime) {
               eventData.bookingCloseTime = new Date(closeBookingTime);
           }
           
           if (mainUpcomingEvent.id) {
               // Update existing event
               await firebaseService.updateUpcomingEvent(mainUpcomingEvent.id, eventData);
           } else {
               // Create new event
               await addDoc(collection(db, 'upcomingEvents'), eventData);
           }
           
           // Reset booking options
           setBookingStatus('closed');
           setCloseBookingTime('');
           
           // Set flag to notify UserEventsPage to refresh
           localStorage.setItem('eventsUpdated', 'true');
           alert('Main upcoming event updated successfully!');
           fetchMainUpcomingEvent(); // Refresh the data
           fetchEvents(); // Refresh the events list
       } catch (error) {
           console.error('Error updating main upcoming event: ', error);
           alert('Failed to update main upcoming event.');
       }
   };
   ```

### 2. Modified ManageEvents.css

#### Added:
- Styles for booking controls
- Active button states
- Close time information display

#### Key Styles:

```css
/* Booking Controls */
.booking-controls {
    display: flex;
    gap: 10px;
    margin-top: 10px;
}

.booking-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
    background-color: #333;
    color: #e0e0e0;
}

.booking-btn:hover {
    background-color: #444;
}

.booking-btn.active {
    background-color: #2ecc71;
    color: white;
    font-weight: bold;
}

.close-time-info {
    margin-top: 10px;
    font-size: 0.9rem;
    color: #F15A24;
    font-style: italic;
}
```

## How It Works

1. Admins fill in the main event details (name, date, time, location, etc.)
2. Booking controls appear above the "Save Main Event" button
3. Admins can choose to "Open Bookings" or "Close Bookings"
4. If closing bookings, they can specify when bookings should close
5. When clicking "Save Main Event", a confirmation prompt appears
6. Event is saved with booking information to Firestore
7. Booking status is displayed in the events list

## Testing

To test the feature:
1. Fill in main event details
2. Click "Open Bookings" - verify button becomes active
3. Click "Close Bookings" - enter a time and verify button becomes active and time is displayed
4. Click "Save Main Event" - confirm save and verify event is saved with booking info
5. Check that the event appears in the upcoming events list with correct booking status

## Files Modified

1. `src/Components/admin/ManageEvents.jsx` - Added booking controls to main event form
2. `src/Components/admin/ManageEvents.css` - Added styling for booking controls

This feature provides admins with an integrated workflow for managing event bookings directly in the main event form.