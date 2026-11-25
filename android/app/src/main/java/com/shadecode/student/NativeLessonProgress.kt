package com.shadecode.student

/**
 * Native lesson progress is normalized to 0.0..1.0; Supabase stores percentages (0..100).
 * Keep this conversion explicit at the persistence boundary.
 */
import kotlin.math.roundToInt

internal fun nativeLessonProgressToDatabasePercentage(progress: Float): Int =
    (progress.coerceIn(0f, 1f) * 100f).roundToInt()
