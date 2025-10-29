# Complete Netlify Deployment Guide with External Backend

## Overview

This guide explains how to deploy your React application with Razorpay integration to Netlify while hosting the backend on Render.

## Prerequisites

1. GitHub account
2. Netlify account
3. Render account
4. Razorpay account with API keys

## Part 1: Deploy Backend to Render

### Step 1: Prepare Your Repository

1. Ensure your repository includes the [render.yaml](render.yaml) file
2. Commit and push all changes to GitHub

### Step 2: Create Render Account

1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account

### Step 3: Deploy Backend Service

1. In Render dashboard, click "New+" and select "Web Service"
2. Select your repository
3. Configure settings:
   - Name: `razorpay-backend` (or your preferred name)
   - Region: Choose the closest region
   - Branch: `main` (or your default branch)
   - Root Directory: Leave empty (or specify if your project is in a subdirectory)
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm run server`

### Step 4: Configure Environment Variables

In the "Advanced" section, add these environment variables:

```
NODE_ENV=production
RAZORPAY_MODE=test  # Change to 'live' for production
RAZORPAY_KEY_ID_TEST=your_actual_test_key_id_here
RAZORPAY_KEY_SECRET_TEST=your_actual_test_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here  # Optional but recommended
PORT=5001  # Render will automatically set PORT, but we specify a default
```

### Step 5: Deploy

1. Click "Create Web Service"
2. Wait for deployment to complete (usually 5-10 minutes)
3. Note the deployed URL (e.g., `https://your-service-name.onrender.com`)

## Part 2: Update Frontend Configuration

### Step 1: Update Environment Variables

Before deploying to Netlify, update your frontend to point to your Render backend:

1. In your `.env` file, set:
   ```
   REACT_APP_API_BASE_URL=https://your-render-service-name.onrender.com
   ```

2. For Netlify deployment, you'll set this in the Netlify dashboard instead.

### Step 2: Test Locally (Optional)

1. Create a `.env.local` file with your Render backend URL:
   ```
   REACT_APP_API_BASE_URL=https://your-render-service-name.onrender.com
   ```

2. Run your frontend:
   ```bash
   npm start
   ```

3. Test the payment functionality

## Part 3: Deploy Frontend to Netlify

### Step 1: Create Netlify Account

1. Go to [netlify.com](https://netlify.com)
2. Sign up with your GitHub account

### Step 2: Deploy Site

1. Click "Add new site" → "Import an existing project"
2. Select "GitHub" and authorize Netlify
3. Select your repository
4. Configure deployment settings:
   - Branch to deploy: `main` (or your default branch)
   - Build command: `npm run build`
   - Publish directory: `build`

### Step 3: Configure Environment Variables

In Netlify dashboard:

1. Go to "Site settings" → "Environment variables"
2. Add these variables:
   ```
   NODE_VERSION=18
   NODE_ENV=production
   GENERATE_SOURCEMAP=false
   REACT_APP_API_BASE_URL=https://your-render-service-name.onrender.com
   ```

3. Add your Firebase configuration variables:
   ```
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
   ```

4. Add your EmailJS configuration (if used):
   ```
   REACT_APP_EMAILJS_SERVICE_ID=your_service_id
   REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
   REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
   ```

### Step 4: Trigger Deployment

1. Go back to the site overview
2. Trigger a new deployment by:
   - Pushing a new commit to your repository, or
   - Clicking "Trigger deploy" → "Deploy site"

### Step 5: Configure Custom Domain (Optional)

1. In Netlify dashboard, go to "Domain management"
2. Add your custom domain
3. Follow DNS configuration instructions

## Part 4: Configure Webhooks (Optional but Recommended)

To receive real-time payment notifications:

### Step 1: Set Up Webhook in Razorpay Dashboard

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Navigate to "Settings" → "Webhooks"
3. Click "Add New Webhook"
4. Set:
   - URL: `https://your-render-service-name.onrender.com/api/webhook`
   - Events: Select all payment-related events
   - Secret: Your webhook secret (same as RAZORPAY_WEBHOOK_SECRET)
   - Status: Enabled

### Step 2: Update Environment Variables

1. In Render dashboard, add/update:
   ```
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
   ```

## Part 5: Testing Your Deployment

### Test the Complete Flow

1. Visit your Netlify site URL
2. Try to make a payment
3. Verify:
   - Frontend loads correctly
   - Payment button works
   - Backend processes the payment
   - Database updates (if applicable)

### Monitor Logs

1. In Render dashboard, check logs for backend issues
2. In Netlify dashboard, check deploy logs and runtime logs

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure your Render backend has the correct CORS configuration
   - Check that your frontend domain is allowed

2. **API Connection Failures**:
   - Verify REACT_APP_API_BASE_URL is set correctly
   - Check that your Render backend is running

3. **Payment Processing Issues**:
   - Verify Razorpay keys are correct
   - Check that RAZORPAY_MODE matches your key type

4. **Environment Variables Not Set**:
   - Check Netlify and Render dashboards for correct variable names
   - Ensure no extra spaces or quotes

### Useful Commands

1. Test build locally:
   ```bash
   npm run build
   npx serve -s build
   ```

2. Check environment variables:
   ```bash
   # Create a test file to log environment variables
   echo "console.log('API Base URL:', process.env.REACT_APP_API_BASE_URL);" > test-env.js
   node test-env.js
   ```

## Maintenance

### Updating Your Application

1. Push changes to your GitHub repository
2. Netlify will automatically redeploy the frontend
3. For backend changes, Render will automatically redeploy

### Scaling Considerations

1. Render automatically scales your backend based on traffic
2. For high-traffic applications, consider upgrading Render plan
3. Monitor usage in both Netlify and Render dashboards

## Security Best Practices

1. Never commit sensitive keys to version control
2. Use environment variables for all secrets
3. Regularly rotate API keys
4. Use HTTPS (automatically provided by Netlify and Render)
5. Implement proper authentication for admin functions

## Cost Considerations

1. **Netlify**: Free tier includes 100GB bandwidth/month
2. **Render**: Free tier includes 512MB RAM, 100GB bandwidth/month
3. **Razorpay**: Free for first INR 2 lakhs of transaction volume

For production applications with significant traffic, consider upgrading to paid plans on both platforms.