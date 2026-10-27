package com.shadecode.student

/**
 * A selectable starter catalogue, not a claim that every syllabus or lesson is verified.
 * IDs are stable profile subject codes; display names are for the learner-facing UI.
 */
data class NativeSubjectOption(val code: String, val label: String, val group: String)

object NativeSubjectCatalog {
    val all = listOf(
        NativeSubjectOption("mathematics", "Mathematics", "Mathematics & quantitative"),
        NativeSubjectOption("additional-mathematics", "Additional Mathematics", "Mathematics & quantitative"),
        NativeSubjectOption("further-mathematics", "Further Mathematics", "Mathematics & quantitative"),
        NativeSubjectOption("statistics", "Statistics", "Mathematics & quantitative"),
        NativeSubjectOption("physics", "Physics", "Sciences"),
        NativeSubjectOption("chemistry", "Chemistry", "Sciences"),
        NativeSubjectOption("biology", "Biology", "Sciences"),
        NativeSubjectOption("integrated-science", "Integrated Science", "Sciences"),
        NativeSubjectOption("general-science", "General Science", "Sciences"),
        NativeSubjectOption("agriculture", "Agriculture", "Sciences"),
        NativeSubjectOption("environmental-science", "Environmental Science", "Sciences"),
        NativeSubjectOption("english", "English", "Languages & communication"),
        NativeSubjectOption("english-language", "English Language", "Languages & communication"),
        NativeSubjectOption("english-literature", "English Literature", "Languages & communication"),
        NativeSubjectOption("shona", "Shona", "Languages & communication"),
        NativeSubjectOption("ndebele", "Ndebele", "Languages & communication"),
        NativeSubjectOption("french", "French", "Languages & communication"),
        NativeSubjectOption("history", "History", "Humanities & social sciences"),
        NativeSubjectOption("geography", "Geography", "Humanities & social sciences"),
        NativeSubjectOption("religious-studies", "Religious Studies", "Humanities & social sciences"),
        NativeSubjectOption("global-perspectives", "Global Perspectives", "Humanities & social sciences"),
        NativeSubjectOption("sociology", "Sociology", "Humanities & social sciences"),
        NativeSubjectOption("psychology", "Psychology", "Humanities & social sciences"),
        NativeSubjectOption("business", "Business", "Business & commerce"),
        NativeSubjectOption("business-studies", "Business Studies", "Business & commerce"),
        NativeSubjectOption("economics", "Economics", "Business & commerce"),
        NativeSubjectOption("accounting", "Accounting", "Business & commerce"),
        NativeSubjectOption("commerce", "Commerce", "Business & commerce"),
        NativeSubjectOption("entrepreneurship", "Entrepreneurship", "Business & commerce"),
        NativeSubjectOption("computer-science", "Computer Science", "Computing & technology"),
        NativeSubjectOption("ict", "ICT", "Computing & technology"),
        NativeSubjectOption("programming", "Programming", "Computing & technology"),
        NativeSubjectOption("design-and-technology", "Design & Technology", "Computing & technology"),
        NativeSubjectOption("engineering", "Engineering", "Computing & technology"),
        NativeSubjectOption("art", "Art & Design", "Creative & practical"),
        NativeSubjectOption("music", "Music", "Creative & practical"),
        NativeSubjectOption("drama", "Drama", "Creative & practical"),
        NativeSubjectOption("physical-education", "Physical Education", "Creative & practical"),
        NativeSubjectOption("food-and-nutrition", "Food & Nutrition", "Creative & practical"),
        NativeSubjectOption("hospitality", "Hospitality", "Creative & practical"),
        NativeSubjectOption("communication", "Communication", "Languages & communication"),
        NativeSubjectOption("academic-writing", "Academic Writing", "Languages & communication"),
        NativeSubjectOption("law", "Law", "University & professional"),
        NativeSubjectOption("medicine", "Medicine", "University & professional"),
        NativeSubjectOption("nursing", "Nursing", "University & professional"),
        NativeSubjectOption("psychology", "Psychology", "Humanities & social sciences"),
        NativeSubjectOption("custom", "Other / custom subject", "Other"),
    )

    fun codeFor(value: String): String {
        val normalized = value.trim().lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')
        val alias = when (normalized) {
            "maths", "math", "numeracy" -> "mathematics"
            "computer-science", "computer-science-cs", "coding" -> "computer-science"
            "information-and-communication-technology" -> "ict"
            "english-literature" -> "english-literature"
            "art-and-design" -> "art"
            else -> normalized
        }
        return all.firstOrNull { it.code == alias || it.label.equals(value.trim(), ignoreCase = true) }?.code
            ?: alias
    }

    fun labelFor(code: String): String =
        all.firstOrNull { it.code == codeFor(code) }?.label
            ?: code.replace('-', ' ').replace('_', ' ').replaceFirstChar { it.uppercase() }
}
