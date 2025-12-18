# Firebase Hosting Deployment Guide

This guide will help you deploy the Event Sales Summary application to Firebase Hosting.

## Prerequisites

1. A Firebase account (sign up at [firebase.google.com](https://firebase.google.com))
2. Node.js and npm installed
3. Firebase CLI installed globally

## Step 1: Install Firebase CLI

If you haven't already, install the Firebase CLI:

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window for you to authenticate with your Google account.

## Step 3: Initialize Firebase in Your Project

Run the following command in your project root:

```bash
firebase init hosting
```

When prompted:

1. **Select an existing Firebase project** or create a new one
2. **What do you want to use as your public directory?** → Enter `dist`
3. **Configure as a single-page app?** → **Yes** (this is important for Svelte SPAs)
4. **Set up automatic builds and deploys with GitHub?** → Choose based on your preference (No is fine for manual deploys)
5. **File dist/index.html already exists. Overwrite?** → **No** (keep your existing file)

This will create a `.firebaserc` file with your project configuration.

## Step 4: Build Your Application

Build your Svelte application:

```bash
npm run build
```

This creates the production-ready files in the `dist` directory.

## Step 5: Deploy to Firebase

Deploy your application:

```bash
npm run deploy
```

Or deploy only hosting:

```bash
npm run deploy:hosting
```

Alternatively, you can use:

```bash
firebase deploy
```

## Step 6: Verify Deployment

After deployment, Firebase will provide you with a hosting URL like:
```
https://your-project-id.web.app
```

You can also find this URL in the [Firebase Console](https://console.firebase.google.com) under Hosting.

## Configuration Files

- `firebase.json` - Contains Firebase Hosting configuration
  - Points to `dist` as the public directory
  - Configures SPA rewrites (all routes serve index.html)
  - Sets up caching headers for optimal performance

## Troubleshooting

### Build fails
- Ensure all dependencies are installed: `npm install`
- Check for TypeScript or linting errors

### 404 errors on routes
- Ensure `firebase.json` has the SPA rewrite rule configured
- Verify you answered "Yes" to "Configure as a single-page app?" during init

### Deployment fails
- Verify you're logged in: `firebase login`
- Check that you have the correct project selected: `firebase use --add`
- Ensure the `dist` directory exists and contains built files

## Continuous Deployment (Optional)

If you want to set up automatic deployments:

1. During `firebase init hosting`, choose to set up GitHub Actions
2. Or manually create `.github/workflows/firebase-deploy.yml` with your CI/CD configuration

## Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

