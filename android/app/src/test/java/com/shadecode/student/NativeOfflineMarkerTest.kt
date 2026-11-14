package com.shadecode.student

import org.junit.Assert.*
import org.junit.Test

class NativeOfflineMarkerTest {
    private fun rubric(
        kind: NativeOfflineRubricKind, total: Double = 2.0, answer: String? = null,
        numeric: Double? = null, accepted: List<String> = emptyList(),
        criteria: List<NativeRubricCriterion> = emptyList(), expectedUnit: String? = null,
        rights: NativeMarkingRights = NativeMarkingRights.OPEN_LICENSE, verified: Boolean = true,
    ) = NativeOfflineMarkingRubric(
        1, kind, total, "source-001", "cambridge:as:physics:9702:2025-2027",
        "reviewer-01", "2026-11-14T10:00:00Z", verified, rights,
        listOf("Deterministic answer-key check only."), answer, numeric, 0.0, accepted,
        "Final response", criteria, expectedUnit,
    )

    @Test fun exactNumberAcceptsEquivalentUnitBearingAnswer() {
        val result = NativeOfflineMarker.mark("Calculate force", "2.0 N", rubric(NativeOfflineRubricKind.EXACT_NUMBER, numeric = 2.0, expectedUnit = "N"))
        assertNotNull(result); assertEquals(2.0, result!!.earnedMarks, 0.0); assertEquals(100, result.percentage)
    }
    @Test fun exactNumberRespectsTolerance() {
        val base = rubric(NativeOfflineRubricKind.EXACT_NUMBER, numeric = 2.0, expectedUnit = "N")
        assertTrue(NativeOfflineMarker.mark("Calculate", "2.01", base.copy(tolerance = 0.02))!!.correct)
    }
    @Test fun numericMarkerRejectsMismatchedUnits() {
        val r = rubric(NativeOfflineRubricKind.EXACT_NUMBER, numeric = 2.0, expectedUnit = "m")
        assertNull(NativeOfflineMarker.mark("Calculate", "2 cm", r))
        assertNotNull(NativeOfflineMarker.mark("Calculate", "2 m", r))
    }
    @Test fun multipleChoiceIgnoresCaseAndWhitespace() {
        assertTrue(NativeOfflineMarker.mark("Choose", " OPTION B ", rubric(NativeOfflineRubricKind.MULTIPLE_CHOICE, answer = "option b"))!!.correct)
    }
    @Test fun structuredPointsAwardOnlyApprovedWholePhrases() {
        val r = rubric(NativeOfflineRubricKind.STRUCTURED_POINTS, criteria = listOf(
            NativeRubricCriterion("a", "Zero resultant force", 1.0, listOf("net force is zero")),
            NativeRubricCriterion("b", "Constant velocity", 1.0, listOf("velocity is constant")),
        ))
        val result = NativeOfflineMarker.mark("Explain", "The net force is zero and velocity is constant.", r)
        assertEquals(2.0, result!!.earnedMarks, 0.0)
    }
    @Test fun rejectsUnknownRightsAndUnverifiedSources() {
        val base = rubric(NativeOfflineRubricKind.MULTIPLE_CHOICE, answer = "B")
        assertFalse(NativeOfflineMarker.isValid(base.copy(rights = NativeMarkingRights.UNKNOWN)))
        assertFalse(NativeOfflineMarker.isValid(base.copy(verified = false)))
    }
    @Test fun rejectsRubricWithIncorrectMarkTotal() {
        val invalid = rubric(NativeOfflineRubricKind.STRUCTURED_POINTS, total = 3.0, criteria = listOf(
            NativeRubricCriterion("a", "Criterion", 2.0, listOf("accepted phrase")),
        ))
        assertFalse(NativeOfflineMarker.isValid(invalid))
        assertNull(NativeOfflineMarker.mark("Question", "accepted phrase", invalid))
    }
    @Test fun rejectsEmptyOrUnparseableAnswer() {
        val r = rubric(NativeOfflineRubricKind.EXACT_NUMBER, numeric = 2.0)
        assertNull(NativeOfflineMarker.mark("Question", "", r))
        assertNull(NativeOfflineMarker.mark("Question", "two", r))
    }
}
