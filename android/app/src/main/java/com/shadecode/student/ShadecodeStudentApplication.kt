package com.shadecode.student

import android.app.Application

class ShadecodeStudentApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        NativeRuntimeContext.initialize(this)
    }
}
