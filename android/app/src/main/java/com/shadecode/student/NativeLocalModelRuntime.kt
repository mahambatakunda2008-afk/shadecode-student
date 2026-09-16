package com.shadecode.student

/**
 * Contract for downloadable local LLM runtimes.
 *
 * This keeps model acquisition/inference separate from learning features. The
 * first implementation can be llama.cpp/NDK without changing NativeCortex's
 * public API or the Compose screens.
 */
interface NativeLocalModelRuntime {
    suspend fun installedModels(): List<NativeLocalModelSpec>

    suspend fun isReady(modelId: String): Boolean

    suspend fun generate(
        modelId: String,
        prompt: String,
        maxTokens: Int,
    ): String?

    suspend fun unload(modelId: String)
}

/**
 * Safe placeholder until the native GGUF runtime is linked.
 *
 * Returning null is intentional: Cortex must fall through to its existing
 * Gemini Nano/cloud path rather than pretending a model is installed.
 */
class UnavailableNativeLocalModelRuntime : NativeLocalModelRuntime {
    override suspend fun installedModels(): List<NativeLocalModelSpec> = emptyList()

    override suspend fun isReady(modelId: String): Boolean = false

    override suspend fun generate(modelId: String, prompt: String, maxTokens: Int): String? = null

    override suspend fun unload(modelId: String) = Unit
}
