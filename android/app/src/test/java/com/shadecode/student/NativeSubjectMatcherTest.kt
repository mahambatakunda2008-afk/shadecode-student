package com.shadecode.student

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeSubjectMatcherTest {
    @Test fun mathematicsAliasesMatchExactly() {
        assertTrue(NativeSubjectMatcher.matchesAny("Mathematics", listOf("Maths")))
        assertTrue(NativeSubjectMatcher.matchesAny("Maths", listOf("Mathematics")))
    }

    @Test fun mathematicsDoesNotUnlockSpecialistMathematics() {
        assertFalse(NativeSubjectMatcher.matchesAny("Additional Mathematics", listOf("Mathematics")))
        assertFalse(NativeSubjectMatcher.matchesAny("Further Mathematics", listOf("Mathematics")))
        assertFalse(NativeSubjectMatcher.matchesAny("Mathematics", listOf("Additional Mathematics")))
    }

    @Test fun computerScienceAliasesMatchWithoutSubstringRules() {
        assertTrue(NativeSubjectMatcher.matchesAny("Computer Science", listOf("Coding")))
        assertTrue(NativeSubjectMatcher.matchesAny("ICT", listOf("Information and Communication Technology")))
        assertFalse(NativeSubjectMatcher.matchesAny("Computer Science", listOf("Science")))
    }

    @Test fun blankOrUnselectedSubjectsNeverMatch() {
        assertFalse(NativeSubjectMatcher.matchesAny("", listOf("Mathematics")))
        assertFalse(NativeSubjectMatcher.matchesAny("Mathematics", emptyList()))
    }
}
