package com.shadecode.student

/** Downloadable local-model catalog for Cortex. */
data class NativeLocalModelSpec(
    val id: String,
    val displayName: String,
    val repository: String,
    val filePattern: String,
    val approximateSizeMb: Int,
    val license: String,
    val runtime: String,
    val minimumRamMb: Int,
    val role: NativeLocalModelRole,
    val enabled: Boolean = false,
)

enum class NativeLocalModelRole { ULTRA_LIGHT, CORE, STRONG }

object NativeLocalModelCatalog {
    val models: List<NativeLocalModelSpec> = listOf(
        NativeLocalModelSpec("gemma-3-270m-it-q4", "Gemma 3 270M IT", "ggml-org/gemma-3-270m-it-GGUF", "*Q4_K_M*.gguf", 250, "Gemma", "llama.cpp", 2048, NativeLocalModelRole.ULTRA_LIGHT, enabled = true),
        NativeLocalModelSpec("qwen3-0.6b-q4", "Qwen3 0.6B", "Qwen/Qwen3-0.6B-GGUF", "*Q4*.gguf", 500, "Apache-2.0", "llama.cpp", 3072, NativeLocalModelRole.CORE),
        NativeLocalModelSpec("smollm2-360m-instruct-q4", "SmolLM2 360M Instruct", "HuggingFaceTB/SmolLM2-360M-Instruct-GGUF", "*Q4*.gguf", 300, "Apache-2.0", "llama.cpp", 2048, NativeLocalModelRole.ULTRA_LIGHT),
        NativeLocalModelSpec("llama-3.2-1b-instruct-q4", "Llama 3.2 1B Instruct", "bartowski/Llama-3.2-1B-Instruct-GGUF", "*Q4_K_M*.gguf", 800, "Llama 3.2", "llama.cpp", 4096, NativeLocalModelRole.STRONG),
    )

    fun recommendedFor(ramMb: Int): NativeLocalModelSpec? = models
        .filter { it.enabled && it.minimumRamMb <= ramMb }
        .sortedByDescending { it.role.ordinal }
        .firstOrNull()
}
