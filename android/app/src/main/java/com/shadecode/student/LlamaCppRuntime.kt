package com.shadecode.student

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicBoolean

/** Real GGUF runtime backed by llama.cpp through JNI. */
class LlamaCppRuntime(context: Context) : NativeLocalModelRuntime {
    private val modelManager = NativeLocalModelManager(context.applicationContext)

    private val closed = AtomicBoolean(false)

    init {
        System.loadLibrary("shadecode_cortex_native")
        synchronized(nativeLock) { activeRuntimes++ }
    }

    override suspend fun installedModels(): List<NativeLocalModelSpec> = withContext(Dispatchers.IO) {
        NativeLocalModelCatalog.models.filter { it.enabled && modelManager.isInstalled(it) }
    }

    override suspend fun isReady(modelId: String): Boolean = withContext(Dispatchers.IO) {
        val model = NativeLocalModelCatalog.models.firstOrNull { it.id == modelId && it.enabled } ?: return@withContext false
        if (!modelManager.isInstalled(model)) return@withContext false
        if (!modelManager.gemmaDeviceReadiness().supported) return@withContext false
        val modelPath = modelManager.modelFile(model).absolutePath
        synchronized(nativeLock) {
            nativeIsLoaded() || nativeLoad(modelPath)
        }
    }

    override suspend fun generate(modelId: String, prompt: String, maxTokens: Int): String? = withContext(Dispatchers.Default) {
        val model = NativeLocalModelCatalog.models.firstOrNull { it.id == modelId && it.enabled } ?: return@withContext null
        if (!modelManager.isInstalled(model)) return@withContext null
        if (!modelManager.gemmaDeviceReadiness().supported) return@withContext null
        val modelPath = modelManager.modelFile(model).absolutePath
        synchronized(nativeLock) {
            if (!nativeIsLoaded() && !nativeLoad(modelPath)) return@synchronized null
            nativeGenerate(formatGemmaPrompt(prompt).take(MAX_PROMPT_CHARS), maxTokens.coerceIn(16, 512))
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
        if (!closed.compareAndSet(false, true)) return
        // llama_free() can take noticeable time for a 250 MB model. Do not block
        // Compose disposal / the UI thread while releasing native memory.
        Thread({
            synchronized(nativeLock) {
                activeRuntimes = (activeRuntimes - 1).coerceAtLeast(0)
                // A new Verify screen may have opened before this cleanup ran.
                // Keep the shared process runtime alive while any wrapper is active.
                if (activeRuntimes == 0 && nativeIsLoaded()) nativeUnload()
            }
        }, "cortex-native-unload").start()
    }

    private external fun nativeLoad(path: String): Boolean
    private external fun nativeIsLoaded(): Boolean
    private external fun nativeGenerate(prompt: String, maxTokens: Int): String?
    private external fun nativeUnload()

    private fun formatGemmaPrompt(prompt: String): String = "<start_of_turn>user\\n$prompt<end_of_turn>\\n<start_of_turn>model\\n"

    companion object {
        // JNI owns one process-wide llama.cpp model/context, even if the UI creates
        // multiple runtime wrappers. The lock must therefore be process-wide too.
        private val nativeLock = Any()
        private var activeRuntimes = 0
        private const val MAX_PROMPT_CHARS = 12_000
    }
}
