# Razorpay Setup Instructions

This document explains how to obtain and configure your actual Razorpay test keys for the application.

## Getting Your Razorpay Test Keys

1. **Sign up for a Razorpay account:**
   - Go to https://razorpay.com/
   - Click "Sign Up" and create an account

2. **Access your test keys:**
   - Log in to your Razorpay Dashboard at https://dashboard.razorpay.com/
   - In the left sidebar, click on "Settings"
   - Click on "API Keys"
   - You'll see your test keys (Key ID and Secret)

3. **Copy your test keys:**
   - Key ID will look like: `rzp_test_XXXXXXXXXXXXXX`
   - Key Secret will look like: `XXXXXXXXXXXXXXXXXXXXXXXX`

## Configuring Your Application

1. **Update the .env file:**
   - Open the `.env` file in your project root
   - Replace the placeholder values with your actual test keys:
     ```
     RAZORPAY_KEY_ID_TEST=your_actual_test_key_id_here
     RAZORPAY_KEY_SECRET_TEST=your_actual_test_key_secret_here
     REACT_APP_RAZORPAY_KEY_ID=your_actual_test_key_id_here
     ```

2. **Restart your servers:**
   - Stop both the frontend and backend servers
   - Start the backend server: `npm run server`
   - Start the frontend server: `npm start`

## Testing Payments

Once you've configured your actual test keys, you can test payments using Razorpay's test card:

- Card Number: 4111 1111 1111 1111
- Expiry: Any future date
- CVV: 123
- Name: Any name
- Country: India

## Troubleshooting

### Authentication Failed Errors

If you're still getting "Authentication failed" errors:

1. Double-check that your Key ID and Secret are correct
2. Make sure you're using test keys, not live keys
3. Ensure there are no extra spaces in your keys
4. Verify that your keys are properly formatted

### CORS Issues

If you encounter CORS issues:

1. Make sure your frontend is running on http://localhost:3000
2. Ensure the backend CORS configuration includes your frontend URL

### Payment Not Processing

If payments aren't processing:

1. Check the browser console for JavaScript errors
2. Check the backend server logs for error messages
3. Verify that both servers are running on the correct ports

## Security Notes

1. Never commit your actual keys to version control
2. Always use test keys during development
3. Keep your secret key secure and never expose it in frontend code
4. Use environment variables to manage sensitive configuration

## Getting Help

If you continue to experience issues:

1. Check the Razorpay documentation: https://razorpay.com/docs/
2. Contact Razorpay support: https://razorpay.com/support/
3. Review the application logs for specific error messages