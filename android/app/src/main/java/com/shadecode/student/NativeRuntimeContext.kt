package com.shadecode.student

import android.content.Context

/** Application context used by native model management without coupling Compose screens to runtime construction. */
object NativeRuntimeContext {
    @Volatile
    private var appContext: Context? = null

    fun initialize(context: Context) {
        appContext = context.applicationContext
    }

    fun require(): Context = appContext ?: error("NativeRuntimeContext has not been initialized")
}
