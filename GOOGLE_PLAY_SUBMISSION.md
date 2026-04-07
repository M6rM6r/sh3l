# Ygy - Google Play Store Submission Guide

## 📱 Pre-Submission Checklist

### ✅ 1. App Signing Setup
```bash
# Generate keystore
./generate-keystore.sh

# Update signing properties
# Edit android/ygy-signing.properties with your passwords
```

### ✅ 2. Build Signed App Bundle
```bash
cd mobile_app
flutter build appbundle --release
```

### ✅ 3. Test the Release Build
```bash
# Install on device for testing
flutter install --release
```

## 🏪 Google Play Console Setup

### Step 1: Create Google Play Console Account
1. Go to [Google Play Console](https://play.google.com/console/)
2. Sign in with your Google account
3. Pay the $25 registration fee
4. Accept the developer agreement

### Step 2: Create New App
1. Click "Create app"
2. Choose "Production" (or "Internal testing" for beta)
3. App name: "Ygy - Brain Training"
4. Default language: English (en-US)
5. App type: "App" (not game)
6. Free or Paid: Free (with in-app purchases)

### Step 3: App Signing Setup
1. Go to "App signing" in the left menu
2. Choose "Use Google Play app signing"
3. Upload your keystore (android/ygy-upload-key.jks)
4. Google will generate a new signing key for distribution

## 📝 Store Listing Information

### App Details
- **Title**: Ygy - Strategic Cognitive Enhancement
- **Short Description**: Train your brain with 7 scientifically-designed games
- **Full Description**:
```
Ygy is a precision-engineered cognitive enhancement platform designed for analytical minds. Master 7 brain training games including Memory Matrix, Speed Match, and Train of Thought.

Features:
• 7 Brain Training Games
• AI-Powered Difficulty Adjustment
• Real-time Multiplayer
• Advanced Analytics & Insights
• Offline Mode
• Daily Workout Plans
• Cognitive Performance Tracking

Sharpen your mind with Ygy - where science meets strategy.
```

### Screenshots (Required: 2-8, 1080x1920 or higher)
1. Landing screen
2. Game selection
3. Memory Matrix gameplay
4. Analytics dashboard
5. Leaderboard
6. Settings/Profile

### Icon & Graphics
- **App Icon**: 512x512 PNG (with transparent background)
- **Feature Graphic**: 1024x500 PNG (for store listing)
- **Screenshots**: 1080x1920 PNG/JPG

### Categorization
- **Category**: Health & Fitness → Mental Health & Wellness
- **Tags**: brain training, cognitive, memory, focus, games
- **Content Rating**: Everyone

### Contact Information
- **Website**: [Your website URL]
- **Email**: [Your support email]
- **Privacy Policy**: [Required - create one at privacy policy generator]

## 🚀 Upload & Release

### Step 1: Upload App Bundle
1. Go to "Production" → "Create new release"
2. Upload `mobile_app/build/app/outputs/bundle/release/app-release.aab`
3. Add release notes: "Initial release of Ygy brain training platform"

### Step 2: Content Rating
1. Go to "Content rating"
2. Answer the questionnaire (select "Everyone")
3. Submit for review

### Step 3: Pricing & Distribution
1. Go to "Pricing & distribution"
2. Set as Free app
3. Select countries: All countries
4. Device compatibility: All devices

### Step 4: Publish
1. Review all information
2. Click "Start rollout to production"
3. Wait for Google review (usually 1-3 days)

## 📊 Post-Launch Tasks

### Analytics Setup
1. Go to "Statistics" → "Dashboard"
2. Enable Google Analytics
3. Set up conversion tracking

### In-App Purchases (Future)
1. Go to "Monetization" → "In-app products"
2. Create subscription plans
3. Set up premium features

### User Acquisition
1. Create store listing ASO (App Store Optimization)
2. Prepare marketing materials
3. Set up social media presence

## 🔧 Troubleshooting

### Common Issues
- **AAB vs APK**: Always use AAB for new apps
- **Signing Error**: Ensure keystore passwords are correct
- **Min SDK**: Check minimum Android version compatibility
- **Permissions**: Review app permissions in manifest

### Support
- Google Play Console Help: https://support.google.com/googleplay
- Flutter Deployment: https://flutter.dev/deployment/android

## 📋 Checklist Summary
- [ ] Keystore generated and secured
- [ ] App bundle built and tested
- [ ] Google Play Console account created
- [ ] App created in console
- [ ] App signing configured
- [ ] Store listing completed
- [ ] Screenshots and assets prepared
- [ ] Privacy policy created
- [ ] App uploaded and submitted
- [ ] Content rating completed
- [ ] Pricing and distribution set
- [ ] App published

## 🎯 Next Steps After Launch
1. Monitor crash reports and user feedback
2. Plan feature updates and improvements
3. Set up user acquisition campaigns
4. Prepare for iOS App Store submission
5. Implement in-app purchases for monetization
