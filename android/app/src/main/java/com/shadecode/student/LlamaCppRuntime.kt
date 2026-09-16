package com.shadecode.student

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Real GGUF runtime backed by llama.cpp through JNI. */
class LlamaCppRuntime(context: Context) : NativeLocalModelRuntime {
    private val modelManager = NativeLocalModelManager(context.applicationContext)

    init {
        System.loadLibrary("shadecode_cortex_native")
    }

    override suspend fun installedModels(): List<NativeLocalModelSpec> = withContext(Dispatchers.IO) {
        NativeLocalModelCatalog.models.filter { it.enabled && modelManager.isInstalled(it) }
    }

    override suspend fun isReady(modelId: String): Boolean = withContext(Dispatchers.IO) {
        val model = NativeLocalModelCatalog.models.firstOrNull { it.id == modelId && it.enabled } ?: return@withContext false
        if (!modelManager.isInstalled(model)) return@withContext false
        val file = modelManager.modelFile(model)
        if (!nativeIsLoaded()) nativeLoad(file.absolutePath) else true
    }

    override suspend fun generate(modelId: String, prompt: String, maxTokens: Int): String? = withContext(Dispatchers.Default) {
        val model = NativeLocalModelCatalog.models.firstOrNull { it.id == modelId && it.enabled } ?: return@withContext null
        if (!modelManager.isInstalled(model)) return@withContext null
        val file = modelManager.modelFile(model)
        if (!nativeIsLoaded() && !nativeLoad(file.absolutePath)) return@withContext null
        nativeGenerate(prompt.take(MAX_PROMPT_CHARS), maxTokens.coerceIn(16, 512))?.trim()?.takeIf { it.isNotBlank() }
    }

    override suspend fun unload(modelId: String) {
        if (nativeIsLoaded()) nativeUnload()
    }

    private external fun nativeLoad(path: String): Boolean
    private external fun nativeIsLoaded(): Boolean
    private external fun nativeGenerate(prompt: String, maxTokens: Int): String?
    private external fun nativeUnload()

    companion object {
        private const val MAX_PROMPT_CHARS = 12_000
    }
}
