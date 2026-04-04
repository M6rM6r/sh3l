plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.ygy.braintraining"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        // Ygy Brain Training App
        applicationId = "com.ygy.braintraining"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    // Load signing properties
    val signingProps = Properties().apply {
        val signingFile = rootProject.file("ygy-signing.properties")
        if (signingFile.exists()) {
            load(signingFile.inputStream())
        }
    }

    signingConfigs {
        create("ygyRelease") {
            storeFile = file(signingProps.getProperty("storeFile", "ygy-upload-key.jks"))
            storePassword = signingProps.getProperty("storePassword", "")
            keyAlias = signingProps.getProperty("keyAlias", "ygy-upload-key")
            keyPassword = signingProps.getProperty("keyPassword", "")
        }
    }

    buildTypes {
        release {
            // Use Ygy signing config for release builds
            signingConfig = signingConfigs.getByName("ygyRelease")
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")
}

flutter {
    source = "../.."
}
