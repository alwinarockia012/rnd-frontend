# Plans Page Button Transformation Fix - Summary

## Issue
The Plans page needed to be updated so that when a user selects a plan:
- If they choose "Pay-Per-Run", both payable cards should transform to show "Booked for a week"
- If they choose "Monthly Membership", both payable cards should transform to show "Booked for a month"

## Solution
Updated the Plans component to track which plan was purchased and display the appropriate booking status on all plan cards.

## Changes Made

### 1. Modified Plans.jsx

#### Added:
- `purchasedPlan` state variable to track which plan was purchased
- Logic to set `purchasedPlan` when a payment is successful
- Logic to set `purchasedPlan` when new bookings are detected
- Updated button text logic to show booking status based on purchased plan

#### Key Changes:

1. **State Management**:
   ```javascript
   const [purchasedPlan, setPurchasedPlan] = useState(null);
   ```

2. **Payment Success Handler**:
   ```javascript
   // Set the purchased plan
   setPurchasedPlan(selectedPlan?.name || 'Unknown Plan');
   ```

3. **Booking Detection**:
   ```javascript
   // Check if there's a new booking and set purchasedPlan
   const newBooking = localStorage.getItem('newBooking');
   if (newBooking) {
     try {
       const booking = JSON.parse(newBooking);
       setPurchasedPlan(booking.eventName || 'Unknown Plan');
     } catch (e) {
       console.error('Error parsing new booking:', e);
     }
   }
   ```

4. **User Authentication Effect**:
   ```javascript
   // Check if there's a recent booking to set purchasedPlan
   const localBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
   if (localBookings.length > 0) {
     // Get the most recent booking
     const mostRecentBooking = localBookings.reduce((latest, current) => {
       const latestDate = new Date(latest.bookingDate || latest.createdAt);
       const currentDate = new Date(current.bookingDate || current.createdAt);
       return currentDate > latestDate ? current : latest;
     });
     
     // Set the purchased plan based on the most recent booking
     setPurchasedPlan(mostRecentBooking.eventName || 'Unknown Plan');
   }
   ```

5. **Button Text Logic**:
   ```jsx
   <span className="button-text">
     {plan.freeTrial ? (isEligibleForFreeTrial ? "Start Free Trial" : "Already Claimed") : 
      (purchasedPlan ? 
        (purchasedPlan === 'Monthly Membership' ? "Booked for a month" : "Booked for this week") : 
        (hasBookedThisWeek(plan.name) ? 
          (plan.name === 'Monthly Membership' ? "Booked for a month" : "Booked for this week") : 
          "Choose Plan"))}
   </span>
   ```

## How It Works

1. When a user successfully purchases a plan, the `purchasedPlan` state is set to the name of the purchased plan
2. All plan cards now check the `purchasedPlan` state to determine what text to display:
   - If a plan has been purchased, all non-free trial cards show either "Booked for this week" or "Booked for a month" based on the purchased plan
   - If no plan has been purchased, the original logic is used (based on individual plan booking status)
3. The purchased plan status persists across page refreshes by checking localStorage for booking information
4. When a user logs out, the purchased plan state is reset

## Testing

To test the fix:
1. Select and purchase a "Pay-Per-Run" plan
   - Both payable cards should transform to show "Booked for this week"
2. Select and purchase a "Monthly Membership" plan
   - Both payable cards should transform to show "Booked for a month"
3. Refresh the page after purchase
   - The booking status should persist
4. Log out and log back in
   - Previous booking status should be detected and displayed

## Files Modified

1. `src/Components/Plans/Plans.jsx` - Added plan-based button transformation logic

This fix ensures that when a user purchases any plan, both payable cards transform to show the appropriate booking status based on the purchased plan type.