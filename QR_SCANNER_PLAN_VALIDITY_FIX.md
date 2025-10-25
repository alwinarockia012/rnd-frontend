# QR Scanner Plan-Based Validity Fix - Summary

## Issue
The QR scanner module was showing all bookings as active regardless of plan type and validity period:
- Free trial bookings should be valid for 7 days
- Pay-per-run bookings should be valid for 7 days  
- Monthly membership bookings should be valid for 30 days

## Solution
Updated the QR scanner to check booking validity based on plan type and appropriate time limits.

## Changes Made

### 1. Modified QRScanner.jsx

#### Added:
- `getPlanType` function to determine plan type based on event name
- Enhanced `isBookingValid` function to check validity based on plan type
- Updated all sections where `ticketInfo` is set to include plan type and validity information
- Modified display of booking status to show plan-based validity

#### Key Functions:

```javascript
// Function to determine plan type based on event name
const getPlanType = useCallback((eventName) => {
  if (!eventName) return 'unknown';
  
  const name = eventName.toLowerCase();
  if (name.includes('free') && name.includes('trial')) {
    return 'free-trial';
  } else if (name.includes('pay') && name.includes('per') && name.includes('run')) {
    return 'pay-per-run';
  } else if (name.includes('monthly') && name.includes('membership')) {
    return 'monthly-membership';
  } else {
    return 'unknown';
  }
}, []);

// Function to check if a booking is still valid based on plan type
const isBookingValid = useCallback((bookingDate, planType) => {
  if (!bookingDate) return false;
  
  let date;
  if (bookingDate.toDate && typeof bookingDate.toDate === 'function') {
    date = bookingDate.toDate();
  } else if (bookingDate instanceof Date) {
    date = bookingDate;
  } else {
    date = new Date(bookingDate);
  }
  
  // Determine validity period based on plan type
  const now = new Date();
  let validPeriodStart;
  
  switch (planType) {
    case 'free-trial':
    case 'pay-per-run':
      // Both free trial and pay-per-run are valid for 7 days
      validPeriodStart = new Date();
      validPeriodStart.setDate(now.getDate() - 7);
      break;
    case 'monthly-membership':
      // Monthly membership is valid for 30 days
      validPeriodStart = new Date();
      validPeriodStart.setDate(now.getDate() - 30);
      break;
    default:
      // Default to 7 days for unknown plan types
      validPeriodStart = new Date();
      validPeriodStart.setDate(now.getDate() - 7);
  }
  
  return date > validPeriodStart;
}, []);
```

### 2. Modified Display Logic

Updated the ticket information display to show plan-based validity status:
- Shows "Active" (green) if booking is within validity period
- Shows "Expired" (red) if booking is outside validity period
- Works for all plan types with their respective validity periods

## How It Works

1. When a ticket is scanned and verified, the system determines the plan type based on the event name
2. Based on the plan type, the system checks if the booking is still within its validity period:
   - Free Trial: 7 days
   - Pay-Per-Run: 7 days
   - Monthly Membership: 30 days
3. The plan status is displayed in the ticket information section:
   - "Active" (green) if the booking is still valid
   - "Expired" (red) if the booking has expired

## Testing

To test the fix:
1. Scan a QR code for a free trial booking that was claimed within the last 7 days
   - Should show "Active" status
2. Scan a QR code for a free trial booking that was claimed more than 7 days ago
   - Should show "Expired" status
3. Scan a QR code for a pay-per-run booking that was claimed within the last 7 days
   - Should show "Active" status
4. Scan a QR code for a pay-per-run booking that was claimed more than 7 days ago
   - Should show "Expired" status
5. Scan a QR code for a monthly membership booking that was claimed within the last 30 days
   - Should show "Active" status
6. Scan a QR code for a monthly membership booking that was claimed more than 30 days ago
   - Should show "Expired" status

## Files Modified

1. `src/Components/admin/QRScanner.jsx` - Added plan-based validity checking logic

This fix ensures that the QR scanner correctly shows the validity status of all booking types according to their respective validity periods.