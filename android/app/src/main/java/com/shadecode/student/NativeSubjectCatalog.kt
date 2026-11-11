package com.shadecode.student

/**
 * Android mirror of src/lib/subjects/catalog.ts.
 *
 * Keep IDs, labels, groups, pathways and aliases aligned with the web catalogue.
 * This is selectable catalogue metadata only, not a claim that curriculum,
 * lesson, assessment, tool or offline content coverage is complete.
 */
data class NativeSubjectOption(
    val code: String,
    val label: String,
    val group: String,
    val pathways: List<String> = emptyList(),
    val aliases: List<String> = emptyList(),
)

object NativeSubjectCatalog {
    val all = listOf(
        NativeSubjectOption("mathematics", "Mathematics", "Mathematics & quantitative", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent"), listOf("Maths", "Numeracy")),
        NativeSubjectOption("additional-mathematics", "Additional Mathematics", "Mathematics & quantitative", listOf("lower-secondary", "upper-secondary", "a-level")),
        NativeSubjectOption("further-mathematics", "Further Mathematics", "Mathematics & quantitative", listOf("a-level", "university", "independent")),
        NativeSubjectOption("statistics", "Statistics", "Mathematics & quantitative", listOf("lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("quantitative-methods", "Quantitative Methods", "Mathematics & quantitative", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("technical-mathematics", "Technical Mathematics", "Mathematics & quantitative", listOf("tvet", "professional", "independent")),
        NativeSubjectOption("integrated-science", "Integrated Science", "Sciences & environment", listOf("primary", "lower-secondary", "upper-secondary"), listOf("Science")),
        NativeSubjectOption("general-science", "General Science", "Sciences & environment", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("early-literacy", "Early Literacy", "Languages & communication", listOf("early-childhood")),
        NativeSubjectOption("early-numeracy", "Early Numeracy", "Mathematics & quantitative", listOf("early-childhood")),
        NativeSubjectOption("discovery", "My World and Discovery", "Sciences & environment", listOf("early-childhood"), listOf("My World & Discovery")),
        NativeSubjectOption("creative-expression", "Creative Expression", "Creative & practical", listOf("early-childhood")),
        NativeSubjectOption("movement-wellbeing", "Movement and Wellbeing", "Creative & practical", listOf("early-childhood"), listOf("Movement & Wellbeing")),
        NativeSubjectOption("biology", "Biology", "Sciences & environment", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "university", "independent")),
        NativeSubjectOption("chemistry", "Chemistry", "Sciences & environment", listOf("lower-secondary", "upper-secondary", "a-level", "university", "independent")),
        NativeSubjectOption("physics", "Physics", "Sciences & environment", listOf("lower-secondary", "upper-secondary", "a-level", "university", "independent")),
        NativeSubjectOption("environmental-science", "Environmental Science", "Sciences & environment", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("agriculture", "Agriculture", "Sciences & environment", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "tvet", "independent")),
        NativeSubjectOption("applied-science", "Applied Science", "Sciences & environment", listOf("upper-secondary", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("earth-science", "Earth Science", "Sciences & environment", listOf("lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("astronomy", "Astronomy", "Sciences & environment", listOf("upper-secondary", "a-level", "university", "independent")),
        NativeSubjectOption("computer-science", "Computer Science", "Computing & technology", listOf("lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("ict", "ICT", "Computing & technology", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent"), listOf("Information and Communication Technology")),
        NativeSubjectOption("computing", "Computing", "Computing & technology", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("programming", "Programming / Coding", "Computing & technology", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("software-development", "Software Development", "Computing & technology", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("digital-literacy", "Digital Literacy", "Computing & technology", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("design-technology", "Design and Technology", "Computing & technology", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "tvet", "independent")),
        NativeSubjectOption("english-language", "English Language", "Languages & communication", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent"), listOf("English")),
        NativeSubjectOption("english-literature", "English Literature", "Languages & communication", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("reading-writing", "Reading and Writing", "Languages & communication", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("shona", "Shona", "Languages & communication", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("ndebele", "Ndebele", "Languages & communication", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("academic-writing", "Academic Writing", "Languages & communication", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("communication", "Communication Skills", "Languages & communication", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("history", "History", "Humanities & social sciences", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("geography", "Geography", "Humanities & social sciences", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("religious-studies", "Religious Studies", "Humanities & social sciences", listOf("primary", "lower-secondary", "upper-secondary", "a-level")),
        NativeSubjectOption("zimsec-family-religious-studies-o-level", "Family and Religious Studies (ZIMSEC O Level)", "Humanities & social sciences", listOf("upper-secondary"), listOf("FRS", "Family and Religious Studies", "Family & Religious Studies", "ZIMSEC FRS")),
        NativeSubjectOption("cambridge-geography-9696", "Geography (Cambridge 9696)", "Humanities & social sciences", listOf("a-level"), listOf("Geography 9696", "Cambridge Geography 9696")),
        NativeSubjectOption("sociology", "Sociology", "Humanities & social sciences", listOf("lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("psychology", "Psychology", "Humanities & social sciences", listOf("lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("philosophy", "Philosophy", "Humanities & social sciences", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("global-perspectives", "Global Perspectives", "Humanities & social sciences", listOf("primary", "lower-secondary", "upper-secondary", "a-level")),
        NativeSubjectOption("social-studies", "Social Studies", "Humanities & social sciences", listOf("primary", "lower-secondary")),
        NativeSubjectOption("business-studies", "Business Studies", "Business & commerce", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent"), listOf("Business")),
        NativeSubjectOption("cambridge-business-9609", "Business (Cambridge 9609)", "Business & commerce", listOf("a-level"), listOf("Business 9609", "Cambridge Business 9609")),
        NativeSubjectOption("business-management", "Business Management", "Business & commerce", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("economics", "Economics", "Business & commerce", listOf("lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("cambridge-economics-9708", "Economics (Cambridge 9708)", "Business & commerce", listOf("a-level"), listOf("Economics 9708", "Cambridge Economics 9708")),
        NativeSubjectOption("accounting", "Accounting", "Business & commerce", listOf("lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("commerce", "Commerce", "Business & commerce", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "tvet", "independent")),
        NativeSubjectOption("entrepreneurship", "Entrepreneurship", "Business & commerce", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("finance", "Finance", "Business & commerce", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("marketing", "Marketing", "Business & commerce", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("art-design", "Art and Design", "Creative & practical", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("music", "Music", "Creative & practical", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("drama", "Drama", "Creative & practical", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("media-studies", "Media Studies", "Creative & practical", listOf("lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("physical-education", "Physical Education", "Creative & practical", listOf("primary", "lower-secondary", "upper-secondary", "a-level")),
        NativeSubjectOption("hospitality", "Hospitality", "Creative & practical", listOf("upper-secondary", "tvet", "professional", "independent")),
        NativeSubjectOption("food-nutrition", "Food and Nutrition", "Creative & practical", listOf("primary", "lower-secondary", "upper-secondary", "a-level")),
        NativeSubjectOption("french", "French", "Languages & communication", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("portuguese", "Portuguese", "Languages & communication", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("spanish", "Spanish", "Languages & communication", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("chinese", "Chinese", "Languages & communication", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("other-language", "Other Language", "Languages & communication", listOf("early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("government", "Government", "Humanities & social sciences", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("law", "Law", "Humanities & social sciences", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("data-science", "Data Science", "Computing & technology", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("artificial-intelligence", "Artificial Intelligence", "Computing & technology", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("cybersecurity", "Cybersecurity", "Computing & technology", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("networking", "Networking", "Computing & technology", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("software-engineering", "Software Engineering", "Computing & technology", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("engineering", "Engineering", "Computing & technology", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("electronics", "Electronics", "Computing & technology", listOf("lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("travel-tourism", "Travel and Tourism", "Creative & practical", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("sport-science", "Sport Science", "Creative & practical", listOf("lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent")),
        NativeSubjectOption("fashion-textiles", "Fashion and Textiles", "Creative & practical", listOf("primary", "lower-secondary", "upper-secondary", "a-level", "tvet", "independent")),
        NativeSubjectOption("electrical-technology", "Electrical Technology", "Creative & practical", listOf("upper-secondary", "tvet", "professional", "independent")),
        NativeSubjectOption("building-studies", "Building Studies", "Creative & practical", listOf("upper-secondary", "tvet", "professional", "independent")),
        NativeSubjectOption("nursing", "Nursing", "Creative & practical", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("public-health", "Public Health", "Sciences & environment", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("education", "Education", "Humanities & social sciences", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("project-management", "Project Management", "Business & commerce", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("research-methods", "Research Methods", "Humanities & social sciences", listOf("university", "tvet", "professional", "independent")),
        NativeSubjectOption("custom", "Other / custom subject", "Other"),
    )

    fun codeFor(value: String): String {
        val key = NativeSubjectMatcher.key(value)
        return all.firstOrNull { option ->
            NativeSubjectMatcher.key(option.code) == key ||
                NativeSubjectMatcher.key(option.label) == key ||
                option.aliases.any { NativeSubjectMatcher.key(it) == key }
        }?.code ?: key
    }

    fun labelFor(code: String): String {
        val canonical = codeFor(code)
        return all.firstOrNull { it.code == canonical }?.label
            ?: code.trim().replace('-', ' ').replace('_', ' ').replaceFirstChar { it.uppercase() }
    }

    fun isRecommended(option: NativeSubjectOption, pathway: String): Boolean {
        val key = when (NativeSubjectMatcher.key(pathway)) {
            "o-level" -> "upper-secondary"
            "as-level", "a-level" -> "a-level"
            else -> NativeSubjectMatcher.key(pathway)
        }
        return key.isNotBlank() && key in option.pathways
    }

    fun searchMatches(option: NativeSubjectOption, query: String): Boolean {
        val term = NativeSubjectMatcher.key(query)
        if (term.isBlank()) return true
        return listOf(option.code, option.label, option.group, *option.aliases.toTypedArray())
            .any { NativeSubjectMatcher.key(it).contains(term) }
    }

    fun recommendedFirst(options: List<NativeSubjectOption>, pathway: String): List<NativeSubjectOption> =
        options.sortedWith(
            compareByDescending<NativeSubjectOption> { isRecommended(it, pathway) }
                .thenBy { it.label.lowercase() },
        )
}
