package com.shadecode.student

import org.junit.Assert.assertEquals
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
    @Test fun nativeCatalogueHasUniqueStableIdsAndBroadSubjectCoverage() {
        val ids = NativeSubjectCatalog.all.map { it.code }
        assertEquals(ids.size, ids.toSet().size)
        assertTrue(ids.size >= 80)
        assertTrue(ids.containsAll(listOf(
            "mathematics", "biology", "chemistry", "physics",
            "computer-science", "geography", "history", "business-studies",
            "early-literacy", "quantitative-methods", "nursing", "engineering",
            "art-design", "fashion-textiles", "research-methods", "custom",
        )))
    }

    @Test fun nativeCatalogueResolvesWebAliasesAndCanonicalLabels() {
        assertEquals("mathematics", NativeSubjectCatalog.codeFor("Maths"))
        assertEquals("ict", NativeSubjectCatalog.codeFor("Information and Communication Technology"))
        assertEquals("english-language", NativeSubjectCatalog.codeFor("English"))
        assertEquals("art-design", NativeSubjectCatalog.codeFor("Art and Design"))
        assertEquals("Mathematics", NativeSubjectCatalog.labelFor("maths"))
        assertEquals("Public Health", NativeSubjectCatalog.labelFor("public-health"))
    }

    @Test fun nativeCataloguePathwaysMatchWebRecommendationsWithoutHidingOtherSubjects() {
        val all = NativeSubjectCatalog.all
        assertTrue(NativeSubjectCatalog.isRecommended(all.first { it.code == "mathematics" }, "o-level"))
        assertTrue(NativeSubjectCatalog.isRecommended(all.first { it.code == "chemistry" }, "a-level"))
        assertFalse(NativeSubjectCatalog.isRecommended(all.first { it.code == "nursing" }, "o-level"))
        val ordered = NativeSubjectCatalog.recommendedFirst(all, "o-level")
        assertTrue(ordered.indexOfFirst { it.code == "mathematics" } < ordered.indexOfFirst { it.code == "nursing" })
        assertTrue(ordered.any { it.code == "nursing" })
    }

    @Test fun nativeCatalogueSearchIncludesAliasesAndCustomSubjects() {
        val all = NativeSubjectCatalog.all
        assertTrue(NativeSubjectCatalog.searchMatches(all.first { it.code == "mathematics" }, "Numeracy"))
        assertTrue(NativeSubjectCatalog.searchMatches(all.first { it.code == "ict" }, "Information and Communication Technology"))
    }

}
