# Booking System Reset and Free Trial Fix

This document explains how to reset all bookings in the system and fix the free trial duration issue.

## Overview

The system currently has two issues:
1. All existing bookings need to be reset
2. Free trial eligibility is checked against all past bookings rather than just recent ones

## Solution

We've implemented two fixes:
1. Updated the free trial eligibility check to only consider bookings within the last week
2. Created scripts to reset all bookings in the system

## Files Modified

1. `src/Components/Plans/Plans.jsx` - Updated `checkFreeTrialEligibility` function to check for bookings within the last week instead of all bookings

## New Scripts

1. `RESET_BOOKINGS_AND_FIX_FREE_TRIAL.js` - Browser console script to delete all bookings
2. `scripts/reset-bookings.js` - Node.js script to delete all bookings from Firestore
3. `scripts/clear-user-data.js` - Script to clear user data from localStorage

## How to Reset All Bookings

### Option 1: Browser Console (Frontend)

1. Open your web application in the browser
2. Make sure you're logged in as an admin user
3. Open the developer tools (F12 or right-click and select "Inspect")
4. Go to the Console tab
5. Copy and paste the contents of `RESET_BOOKINGS_AND_FIX_FREE_TRIAL.js` into the console
6. Run the function: `resetAllBookingsAndFixFreeTrial()`

### Option 2: Node.js Script (Backend)

1. Navigate to the project root directory
2. Run the reset script:
   ```bash
   node scripts/reset-bookings.js
   ```

## How the Free Trial Fix Works

The updated `checkFreeTrialEligibility` function now:

1. Checks if a user has any bookings within the last 7 days
2. Only marks users as ineligible for free trial if they have a recent booking
3. Users with bookings older than 7 days are eligible again

## Clearing User Data

After resetting bookings, users may still see old data in their browsers due to localStorage caching. To clear this:

1. Users can run `clearUserData()` in their browser console
2. Or they can manually clear their browser's localStorage for the site

## Testing

To test that the fix works:

1. Create a new booking
2. Verify that the user is no longer eligible for free trial
3. Wait 7 days (or simulate by modifying the date check)
4. Verify that the user is eligible for free trial again

## Notes

- The reset operation is irreversible
- Make sure to backup any important data before running the reset
- Notify users before performing a reset as it will affect their experience