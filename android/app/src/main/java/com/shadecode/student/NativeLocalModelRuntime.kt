package com.shadecode.student

/** Contract for downloadable local LLM runtimes. */
interface NativeLocalModelRuntime {
    suspend fun installedModels(): List<NativeLocalModelSpec>
    suspend fun isReady(modelId: String): Boolean
    suspend fun generate(modelId: String, prompt: String, maxTokens: Int): String?
    suspend fun unload(modelId: String)
    fun close()
}

class UnavailableNativeLocalModelRuntime : NativeLocalModelRuntime {
    override suspend fun installedModels(): List<NativeLocalModelSpec> = emptyList()
    override suspend fun isReady(modelId: String): Boolean = false
    override suspend fun generate(modelId: String, prompt: String, maxTokens: Int): String? = null
    override suspend fun unload(modelId: String) = Unit
    override fun close() = Unit
}
