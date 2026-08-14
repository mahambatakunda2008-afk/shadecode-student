plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.shadecode.student"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.shadecode.student"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "0.2.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
}
