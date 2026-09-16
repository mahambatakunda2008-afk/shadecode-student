package com.shadecode.student

/**
 * Capability-first routing for the native Cortex runtime.
 *
 * Cortex deliberately does not equate "AI" with "an LLM". Fast deterministic
 * work stays local, on-device generation uses whatever local model is available,
 * and only work that genuinely needs remote reasoning should reach the cloud.
 *
 * Providers are intentionally small adapters so additional local runtimes such
 * as llama.cpp/MediaPipe or future Android on-device models can be added without
 * rewriting the learning features.
 */
enum class CortexTask {
    LESSON_GENERATION,
    PRACTICE_GENERATION,
    CHAT,
    EXPLANATION,
    MATH_CHECK,
    FORMULA_EVALUATION,
    CURRICULUM_MATCH,
    DOCUMENT_ANALYSIS,
}

enum class CortexRoute {
    LOCAL_RULES,
    LOCAL_MODEL,
    CACHE,
    CLOUD,
}

data class CortexCapabilities(
    val localModelAvailable: Boolean,
    val networkAvailable: Boolean,
    val hasCachedResult: Boolean = false,
)

class NativeCortexRouter {
    /**
     * Choose the cheapest reliable execution path before any model is called.
     * This keeps latency and data usage low and gives every feature the same
     * routing policy instead of inventing its own fallback chain.
     */
    fun route(task: CortexTask, capabilities: CortexCapabilities): CortexRoute {
        if (capabilities.hasCachedResult && task in setOf(
                CortexTask.CURRICULUM_MATCH,
                CortexTask.EXPLANATION,
            )
        ) {
            return CortexRoute.CACHE
        }

        if (task in setOf(
                CortexTask.MATH_CHECK,
                CortexTask.FORMULA_EVALUATION,
                CortexTask.CURRICULUM_MATCH,
            )) {
            return CortexRoute.LOCAL_RULES
        }

        if (capabilities.localModelAvailable) {
            return CortexRoute.LOCAL_MODEL
        }

        return if (capabilities.networkAvailable) CortexRoute.CLOUD else CortexRoute.CACHE
    }
}
