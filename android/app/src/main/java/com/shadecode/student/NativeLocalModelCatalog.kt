package com.shadecode.student

/**
 * Downloadable local-model catalog for Cortex.
 *
 * Model files are deliberately NOT bundled into the APK. The catalog describes
 * compatible candidates so a future GGUF runtime can download, verify and
 * select a model according to device constraints. Gemini Nano remains the
 * currently active Android local runtime through [NativeCortex].
 */
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

enum class NativeLocalModelRole {
    ULTRA_LIGHT,
    CORE,
    STRONG,
}

object NativeLocalModelCatalog {
    val models: List<NativeLocalModelSpec> = listOf(
        NativeLocalModelSpec(
            id = "gemma-3-270m-it-q4",
            displayName = "Gemma 3 270M IT",
            repository = "ggml-org/gemma-3-270m-it-GGUF",
            filePattern = "*Q4*.gguf",
            approximateSizeMb = 250,
            license = "Gemma",
            runtime = "llama.cpp",
            minimumRamMb = 2048,
            role = NativeLocalModelRole.ULTRA_LIGHT,
        ),
        NativeLocalModelSpec(
            id = "qwen3-0.6b-q4",
            displayName = "Qwen3 0.6B",
            repository = "Qwen/Qwen3-0.6B-GGUF",
            filePattern = "*Q4*.gguf",
            approximateSizeMb = 500,
            license = "Apache-2.0",
            runtime = "llama.cpp",
            minimumRamMb = 3072,
            role = NativeLocalModelRole.CORE,
        ),
        NativeLocalModelSpec(
            id = "smollm2-360m-instruct-q4",
            displayName = "SmolLM2 360M Instruct",
            repository = "HuggingFaceTB/SmolLM2-360M-Instruct-GGUF",
            filePattern = "*Q4*.gguf",
            approximateSizeMb = 300,
            license = "Apache-2.0",
            runtime = "llama.cpp",
            minimumRamMb = 2048,
            role = NativeLocalModelRole.ULTRA_LIGHT,
        ),
        NativeLocalModelSpec(
            id = "llama-3.2-1b-instruct-q4",
            displayName = "Llama 3.2 1B Instruct",
            repository = "bartowski/Llama-3.2-1B-Instruct-GGUF",
            filePattern = "*Q4_K_M*.gguf",
            approximateSizeMb = 800,
            license = "Llama 3.2",
            runtime = "llama.cpp",
            minimumRamMb = 4096,
            role = NativeLocalModelRole.STRONG,
        ),
    )

    fun recommendedFor(ramMb: Int): NativeLocalModelSpec? = models
        .filter { it.enabled && it.minimumRamMb <= ramMb }
        .sortedByDescending { it.role.ordinal }
        .firstOrNull()
}
