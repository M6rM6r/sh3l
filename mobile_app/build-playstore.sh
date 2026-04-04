#!/bin/bash

# Ygy - Complete Google Play Store Build Script
# This script handles the entire build process for Play Store submission

set -e

echo "🚀 Ygy - Google Play Store Build Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the mobile_app directory
if [ ! -f "pubspec.yaml" ]; then
    print_error "Please run this script from the mobile_app directory"
    exit 1
fi

# Check if Flutter is available
if ! command -v flutter &> /dev/null; then
    print_error "Flutter is not installed or not in PATH"
    exit 1
fi

print_status "Checking Flutter environment..."
flutter doctor --android-licenses
flutter doctor

# Check if keystore exists
KEYSTORE_PATH="android/ygy-upload-key.jks"
SIGNING_PROPS="android/ygy-signing.properties"

if [ ! -f "$KEYSTORE_PATH" ]; then
    print_warning "Keystore not found at $KEYSTORE_PATH"
    print_status "Run ./generate-keystore.sh to create the keystore"
    exit 1
fi

if [ ! -f "$SIGNING_PROPS" ]; then
    print_warning "Signing properties not found at $SIGNING_PROPS"
    print_status "Create the signing properties file with your keystore passwords"
    exit 1
fi

print_status "Installing Flutter dependencies..."
flutter pub get

print_status "Running Flutter analyze..."
flutter analyze

print_status "Running tests..."
flutter test

print_status "Building Android App Bundle..."
flutter build appbundle --release

if [ -f "build/app/outputs/bundle/release/app-release.aab" ]; then
    BUNDLE_SIZE=$(du -h "build/app/outputs/bundle/release/app-release.aab" | cut -f1)
    print_success "App Bundle built successfully!"
    print_success "Location: build/app/outputs/bundle/release/app-release.aab"
    print_success "Size: $BUNDLE_SIZE"
    echo ""
    print_status "Next steps:"
    echo "1. Go to Google Play Console: https://play.google.com/console/"
    echo "2. Create a new app or update existing one"
    echo "3. Upload the app-release.aab file"
    echo "4. Complete the store listing"
    echo "5. Submit for review"
    echo ""
    print_status "See GOOGLE_PLAY_SUBMISSION.md for detailed instructions"
else
    print_error "App Bundle build failed!"
    exit 1
fi