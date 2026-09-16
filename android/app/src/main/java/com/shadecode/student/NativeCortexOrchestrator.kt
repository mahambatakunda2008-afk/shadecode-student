package com.shadecode.student

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Single entry point for feature code that needs Cortex generation.
 *
 * Order:
 * 1. cached/local deterministic work
 * 2. on-device model
 * 3. server Cortex, whose provider chain is independent of the Android app
 *
 * The feature never needs to know which model or vendor answered.
 */
class NativeCortexOrchestrator(
    private val local: NativeCortex = NativeCortex(),
    private val cloud: NativeCloudCortex = NativeCloudCortex(),
) {
    suspend fun generateLesson(
        session: NativeSession,
        subjectId: String,
        subject: String,
        topic: String,
        level: String,
    ): NativeLessonEntity? {
        val localLesson = local.generateLesson(subject, topic, level)
        if (localLesson != null) return localLesson.copy(subjectId = subjectId)

        return withContext(Dispatchers.IO) {
            cloud.generateLesson(session, subjectId, subject, topic, level)
        }
    }

    suspend fun warmLocalModel(): Boolean = local.warmup()

    fun close() {
        local.close()
    }
}
