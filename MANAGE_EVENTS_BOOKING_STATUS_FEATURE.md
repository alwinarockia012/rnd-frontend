# Manage Events Booking Status Feature - Summary

## Issue
The admin panel's Manage Events section needed functionality to control event bookings:
1. "Open Bookings" button to allow users to book events
2. "Close Bookings" button to prevent bookings with an option to specify when bookings should close

## Solution
Added booking status management functionality to the Manage Events component with proper UI controls.

## Changes Made

### 1. Modified ManageEvents.jsx

#### Added:
- State variable for close booking time
- Functions to handle booking status changes:
  - `handleToggleBookingStatus` - Opens/closes bookings for events
  - `handleSetCloseBookingTime` - Sets when bookings should close
- UI elements in the upcoming events list:
  - Booking status indicators
  - "Open Bookings" button
  - "Close Bookings" button
  - "Delete" button

#### Key Functions:

1. **Handle Toggle Booking Status**:
   ```javascript
   const handleToggleBookingStatus = async (eventId, status) => {
     try {
       const eventRef = doc(db, 'upcomingEvents', eventId);
       await updateDoc(eventRef, {
         bookingStatus: status,
         updatedAt: new Date()
       });
       
       // Set flag to notify UserEventsPage to refresh
       localStorage.setItem('eventsUpdated', 'true');
       alert(`Bookings ${status === 'open' ? 'opened' : 'closed'} successfully!`);
       fetchEvents();
     } catch (error) {
       console.error(`Error ${status === 'open' ? 'opening' : 'closing'} bookings: `, error);
       alert(`Failed to ${status === 'open' ? 'open' : 'close'} bookings.`);
     }
   };
   ```

2. **Handle Set Close Booking Time**:
   ```javascript
   const handleSetCloseBookingTime = async (eventId) => {
     const time = prompt('Enter the time when bookings should close (e.g., 2023-12-31 18:00):');
     if (time) {
       try {
         const closeTime = new Date(time);
         if (isNaN(closeTime.getTime())) {
           alert('Invalid date/time format. Please use YYYY-MM-DD HH:MM format.');
           return;
         }
         
         const eventRef = doc(db, 'upcomingEvents', eventId);
         await updateDoc(eventRef, {
           bookingStatus: 'closed',
           bookingCloseTime: closeTime,
           updatedAt: new Date()
         });
         
         // Set flag to notify UserEventsPage to refresh
         localStorage.setItem('eventsUpdated', 'true');
         alert('Bookings closed successfully!');
         fetchEvents();
       } catch (error) {
         console.error('Error closing bookings: ', error);
         alert('Failed to close bookings.');
       }
     }
   };
   ```

### 2. Modified ManageEvents.css

#### Added:
- Styles for booking status indicators
- Styles for active booking buttons
- Proper spacing and visual hierarchy

#### Key Styles:

```css
.booking-status {
    margin-left: 10px;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
}

.booking-status.open {
    background-color: #2ecc71;
    color: white;
}

.booking-status.closed {
    background-color: #e74c3c;
    color: white;
}

.events-list li button.active {
    background-color: #2ecc71;
    color: white;
    font-weight: bold;
}
```

## How It Works

1. Admins can see the current booking status for each upcoming event
2. "Open Bookings" button allows users to book the event
3. "Close Bookings" button prevents new bookings and allows admins to specify when bookings should close
4. Visual indicators show the current booking status (green for open, red for closed)
5. Active buttons are highlighted for better UX
6. All changes are saved to the database and trigger a refresh on the user events page

## Testing

To test the feature:
1. Create a new upcoming event
2. Click "Open Bookings" - verify the button becomes active and status shows "Bookings Open"
3. Click "Close Bookings" - enter a time and verify the button becomes active and status shows "Bookings Closed"
4. Check that users can no longer book closed events
5. Reopen bookings and verify users can book again

## Files Modified

1. `src/Components/admin/ManageEvents.jsx` - Added booking status functionality
2. `src/Components/admin/ManageEvents.css` - Added styling for booking controls

This feature gives admins full control over event bookings with a clear and intuitive interface.