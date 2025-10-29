# 🚀 Deployment Guide

## 📋 **Quick Setup**

### **1. Create Netlify Account**
- Go to [netlify.com](https://netlify.com)
- Sign up with GitHub
- Connect your `TechVaseegrahHub/Run-Development` repository

### **2. Deploy Your Site**
- Click "New site from Git"
- Select GitHub → `TechVaseegrahHub/Run-Development`
- Click "Deploy site"

### **3. Configure Environment Variables**
Your build settings are already configured in `netlify.toml`. For any secret keys, like for Firebase, add them in the Netlify dashboard:

**Netlify UI**: `Site settings > Build & deploy > Environment > Environment variables`

```
NODE_VERSION=18
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

**Firebase Variables (optional):**
```
REACT_APP_FIREBASE_API_KEY=AIzaSyAc0WzUsgae17Zyo4dN3WfuBIvgpVBrTQA
REACT_APP_FIREBASE_AUTH_DOMAIN=techvaseegrah-runanddevelop.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=techvaseegrah-runanddevelop
REACT_APP_FIREBASE_STORAGE_BUCKET=techvaseegrah-runanddevelop.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=876140121414
REACT_APP_FIREBASE_APP_ID=1:876140121414:web:4bc391bcb17cbe35c32947
REACT_APP_FIREBASE_MEASUREMENT_ID=G-GZJS335Y7G
```

**EmailJS Variables (required for contact form):**
```
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
```

**API Base URL (required for Razorpay integration):**
```
REACT_APP_API_BASE_URL=https://your-render-service-name.onrender.com
```

## 🔧 **Build Settings**
- **Build command**: `npm run build`
- **Publish directory**: `build`
- **Node version**: 18

## 🎯 **Result**
Your site will be available at: `https://your-site-name.netlify.app`

## 📚 **Complete Deployment Guide**

For a detailed step-by-step guide on deploying both the frontend and backend with Razorpay integration, please refer to the [Complete Netlify Deployment Guide](NETLIFY_DEPLOYMENT_FULL_GUIDE.md).

## 🆘 **Troubleshooting**
- Check build logs in Netlify dashboard
- Verify environment variables are set
- Ensure Firebase domain is authorized
- Refer to the detailed [Netlify Deployment Checklist](NETLIFY_DEPLOYMENT_CHECKLIST.md) for step-by-step guidance
- Check the [Firebase Authentication Troubleshooting Guide](FIREBASE_AUTH_TROUBLESHOOTING.md) for authentication-specific issues
- Review the [Netlify Optimization Guide](NETLIFY_OPTIMIZATION_GUIDE.md) for performance best practices

---

**Your React app is optimized and ready for deployment!** 🎉