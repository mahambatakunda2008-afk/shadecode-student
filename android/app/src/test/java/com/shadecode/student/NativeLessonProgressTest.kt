package com.shadecode.student

import org.junit.Assert.assertEquals
import org.junit.Test

class NativeLessonProgressTest {
    @Test fun convertsNormalizedProgressToDatabasePercentage() {
        assertEquals(0, nativeLessonProgressToDatabasePercentage(0f))
        assertEquals(42, nativeLessonProgressToDatabasePercentage(0.42f))
        assertEquals(100, nativeLessonProgressToDatabasePercentage(1f))
    }

    @Test fun clampsProgressToSupportedRange() {
        assertEquals(0, nativeLessonProgressToDatabasePercentage(-0.2f))
        assertEquals(100, nativeLessonProgressToDatabasePercentage(1.2f))
    }

    @Test fun roundsToNearestWholePercentage() {
        assertEquals(43, nativeLessonProgressToDatabasePercentage(0.425f))
    }
}
