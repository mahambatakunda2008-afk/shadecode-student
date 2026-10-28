package com.shadecode.student

/**
 * Canonical subject identity for client-side filtering.
 *
 * Deliberately uses exact canonical keys, never substring matching: selecting
 * Mathematics must not silently unlock Additional Mathematics or Further Mathematics.
 * Server-side authorization remains the security boundary.
 */
object NativeSubjectMatcher {
    fun key(value: String): String {
        val normalized = value.trim().lowercase()
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')
        return when (normalized) {
            "math", "maths", "numeracy" -> "mathematics"
            "additional-maths", "additional-math" -> "additional-mathematics"
            "further-maths", "further-math" -> "further-mathematics"
            "computer-science-cs", "computer-science", "coding" -> "computer-science"
            "information-and-communication-technology", "information-technology" -> "ict"
            "english-language" -> "english-language"
            "english-lit" -> "english-literature"
            "art-and-design", "art-design" -> "art"
            "business-studies" -> "business-studies"
            "religious-education", "religious-studies" -> "religious-studies"
            else -> normalized
        }
    }

    fun matchesAny(subject: String, allowedSubjects: Collection<String>): Boolean {
        if (subject.isBlank() || allowedSubjects.isEmpty()) return false
        val subjectKey = key(subject)
        return allowedSubjects.any { it.isNotBlank() && key(it) == subjectKey }
    }
}
