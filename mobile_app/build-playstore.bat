@echo off
REM Ygy - Complete Google Play Store Build Script (Windows)
REM This script handles the entire build process for Play Store submission

echo 🚀 Ygy - Google Play Store Build Script
echo ======================================

REM Check if we're in the mobile_app directory
if not exist "pubspec.yaml" (
    echo [ERROR] Please run this script from the mobile_app directory
    pause
    exit /b 1
)

REM Check if Flutter is available
flutter --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Flutter is not installed or not in PATH
    pause
    exit /b 1
)

echo [INFO] Checking Flutter environment...
flutter doctor --android-licenses
flutter doctor

REM Check if keystore exists
if not exist "android\ygy-upload-key.jks" (
    echo [WARNING] Keystore not found at android\ygy-upload-key.jks
    echo [INFO] Run generate-keystore.ps1 to create the keystore
    pause
    exit /b 1
)

if not exist "android\ygy-signing.properties" (
    echo [WARNING] Signing properties not found at android\ygy-signing.properties
    echo [INFO] Create the signing properties file with your keystore passwords
    pause
    exit /b 1
)

echo [INFO] Installing Flutter dependencies...
flutter pub get

echo [INFO] Running Flutter analyze...
flutter analyze

echo [INFO] Running tests...
flutter test

echo [INFO] Building Android App Bundle...
flutter build appbundle --release

if exist "build\app\outputs\bundle\release\app-release.aab" (
    for %%A in ("build\app\outputs\bundle\release\app-release.aab") do set BUNDLE_SIZE=%%~zA
    echo.
    echo [SUCCESS] App Bundle built successfully!
    echo [SUCCESS] Location: build\app\outputs\bundle\release\app-release.aab
    echo [SUCCESS] Size: %BUNDLE_SIZE% bytes
    echo.
    echo [INFO] Next steps:
    echo 1. Go to Google Play Console: https://play.google.com/console/
    echo 2. Create a new app or update existing one
    echo 3. Upload the app-release.aab file
    echo 4. Complete the store listing
    echo 5. Submit for review
    echo.
    echo [INFO] See GOOGLE_PLAY_SUBMISSION.md for detailed instructions
) else (
    echo [ERROR] App Bundle build failed!
    pause
    exit /b 1
)

pause

