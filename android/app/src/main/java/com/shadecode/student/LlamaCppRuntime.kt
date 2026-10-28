package com.shadecode.student

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Real GGUF runtime backed by llama.cpp through JNI. */
class LlamaCppRuntime(context: Context) : NativeLocalModelRuntime {
    private val modelManager = NativeLocalModelManager(context.applicationContext)

    // llama.cpp state is process-global in the JNI bridge. Serialize every native entry point
    // so overlapping UI requests cannot load, generate, or free the same context concurrently.
    private val nativeLock = Any()

    init { System.loadLibrary("shadecode_cortex_native") }

    override suspend fun installedModels(): List<NativeLocalModelSpec> = withContext(Dispatchers.IO) {
        NativeLocalModelCatalog.models.filter { it.enabled && modelManager.isInstalled(it) }
    }

    override suspend fun isReady(modelId: String): Boolean = withContext(Dispatchers.IO) {
        val model = NativeLocalModelCatalog.models.firstOrNull { it.id == modelId && it.enabled } ?: return@withContext false
        if (!modelManager.isInstalled(model)) return@withContext false
        val modelPath = modelManager.modelFile(model).absolutePath
        synchronized(nativeLock) {
            nativeIsLoaded() || nativeLoad(modelPath)
        }
    }

    override suspend fun generate(modelId: String, prompt: String, maxTokens: Int): String? = withContext(Dispatchers.Default) {
        val model = NativeLocalModelCatalog.models.firstOrNull { it.id == modelId && it.enabled } ?: return@withContext null
        if (!modelManager.isInstalled(model)) return@withContext null
        val modelPath = modelManager.modelFile(model).absolutePath
        synchronized(nativeLock) {
            if (!nativeIsLoaded() && !nativeLoad(modelPath)) return@synchronized null
            nativeGenerate(prompt.take(MAX_PROMPT_CHARS), maxTokens.coerceIn(16, 512))
                ?.trim()
                ?.takeIf { it.isNotBlank() }
        }
    }

    override suspend fun unload(modelId: String) = withContext(Dispatchers.IO) {
        synchronized(nativeLock) {
            if (nativeIsLoaded()) nativeUnload()
        }
    }

    override fun close() {
        synchronized(nativeLock) {
            if (nativeIsLoaded()) nativeUnload()
        }
    }

    private external fun nativeLoad(path: String): Boolean
    private external fun nativeIsLoaded(): Boolean
    private external fun nativeGenerate(prompt: String, maxTokens: Int): String?
    private external fun nativeUnload()

    companion object { private const val MAX_PROMPT_CHARS = 12_000 }
}
