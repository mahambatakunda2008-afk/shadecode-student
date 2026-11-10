package com.shadecode.student

/**
 * Android mirror of src/lib/subjects/catalog.ts.
 *
 * Keep canonical IDs, labels and aliases aligned with the web catalogue.
 * This is selectable catalogue metadata only, not a claim that curriculum,
 * lesson, assessment, tool or offline content coverage is complete.
 */
data class NativeSubjectOption(
    val code: String,
    val label: String,
    val group: String,
    val aliases: List<String> = emptyList(),
)

object NativeSubjectCatalog {
    val all = listOf(
        NativeSubjectOption("mathematics", "Mathematics", "Mathematics & quantitative", listOf("Maths", "Numeracy")),
        NativeSubjectOption("additional-mathematics", "Additional Mathematics", "Mathematics & quantitative"),
        NativeSubjectOption("further-mathematics", "Further Mathematics", "Mathematics & quantitative"),
        NativeSubjectOption("statistics", "Statistics", "Mathematics & quantitative"),
        NativeSubjectOption("quantitative-methods", "Quantitative Methods", "Mathematics & quantitative"),
        NativeSubjectOption("technical-mathematics", "Technical Mathematics", "Mathematics & quantitative"),
        NativeSubjectOption("integrated-science", "Integrated Science", "Sciences", listOf("Science")),
        NativeSubjectOption("general-science", "General Science", "Sciences"),
        NativeSubjectOption("early-literacy", "Early Literacy", "Languages & communication"),
        NativeSubjectOption("early-numeracy", "Early Numeracy", "Mathematics & quantitative"),
        NativeSubjectOption("discovery", "My World and Discovery", "Sciences", listOf("My World & Discovery")),
        NativeSubjectOption("creative-expression", "Creative Expression", "Creative & practical"),
        NativeSubjectOption("movement-wellbeing", "Movement and Wellbeing", "Creative & practical", listOf("Movement & Wellbeing")),
        NativeSubjectOption("biology", "Biology", "Sciences"),
        NativeSubjectOption("chemistry", "Chemistry", "Sciences"),
        NativeSubjectOption("physics", "Physics", "Sciences"),
        NativeSubjectOption("environmental-science", "Environmental Science", "Sciences"),
        NativeSubjectOption("agriculture", "Agriculture", "Sciences"),
        NativeSubjectOption("applied-science", "Applied Science", "Sciences"),
        NativeSubjectOption("earth-science", "Earth Science", "Sciences"),
        NativeSubjectOption("astronomy", "Astronomy", "Sciences"),
        NativeSubjectOption("computer-science", "Computer Science", "Computing & technology"),
        NativeSubjectOption("ict", "ICT", "Computing & technology", listOf("Information and Communication Technology")),
        NativeSubjectOption("computing", "Computing", "Computing & technology"),
        NativeSubjectOption("programming", "Programming / Coding", "Computing & technology"),
        NativeSubjectOption("software-development", "Software Development", "Computing & technology"),
        NativeSubjectOption("digital-literacy", "Digital Literacy", "Computing & technology"),
        NativeSubjectOption("design-technology", "Design and Technology", "Computing & technology"),
        NativeSubjectOption("english-language", "English Language", "Languages & communication", listOf("English")),
        NativeSubjectOption("english-literature", "English Literature", "Languages & communication"),
        NativeSubjectOption("reading-writing", "Reading and Writing", "Languages & communication"),
        NativeSubjectOption("shona", "Shona", "Languages & communication"),
        NativeSubjectOption("ndebele", "Ndebele", "Languages & communication"),
        NativeSubjectOption("academic-writing", "Academic Writing", "Languages & communication"),
        NativeSubjectOption("communication", "Communication Skills", "Languages & communication"),
        NativeSubjectOption("history", "History", "Humanities & social sciences"),
        NativeSubjectOption("geography", "Geography", "Humanities & social sciences"),
        NativeSubjectOption("religious-studies", "Religious Studies", "Humanities & social sciences"),
        NativeSubjectOption("sociology", "Sociology", "Humanities & social sciences"),
        NativeSubjectOption("psychology", "Psychology", "Humanities & social sciences"),
        NativeSubjectOption("philosophy", "Philosophy", "Humanities & social sciences"),
        NativeSubjectOption("global-perspectives", "Global Perspectives", "Humanities & social sciences"),
        NativeSubjectOption("social-studies", "Social Studies", "Humanities & social sciences"),
        NativeSubjectOption("business-studies", "Business Studies", "Business & commerce", listOf("Business")),
        NativeSubjectOption("business-management", "Business Management", "Business & commerce"),
        NativeSubjectOption("economics", "Economics", "Business & commerce"),
        NativeSubjectOption("accounting", "Accounting", "Business & commerce"),
        NativeSubjectOption("commerce", "Commerce", "Business & commerce"),
        NativeSubjectOption("entrepreneurship", "Entrepreneurship", "Business & commerce"),
        NativeSubjectOption("finance", "Finance", "Business & commerce"),
        NativeSubjectOption("marketing", "Marketing", "Business & commerce"),
        NativeSubjectOption("art-design", "Art and Design", "Creative & practical"),
        NativeSubjectOption("music", "Music", "Creative & practical"),
        NativeSubjectOption("drama", "Drama", "Creative & practical"),
        NativeSubjectOption("media-studies", "Media Studies", "Creative & practical"),
        NativeSubjectOption("physical-education", "Physical Education", "Creative & practical"),
        NativeSubjectOption("hospitality", "Hospitality", "Creative & practical"),
        NativeSubjectOption("food-nutrition", "Food and Nutrition", "Creative & practical"),
        NativeSubjectOption("french", "French", "Languages & communication"),
        NativeSubjectOption("portuguese", "Portuguese", "Languages & communication"),
        NativeSubjectOption("spanish", "Spanish", "Languages & communication"),
        NativeSubjectOption("chinese", "Chinese", "Languages & communication"),
        NativeSubjectOption("other-language", "Other Language", "Languages & communication"),
        NativeSubjectOption("government", "Government", "Humanities & social sciences"),
        NativeSubjectOption("law", "Law", "Humanities & social sciences"),
        NativeSubjectOption("data-science", "Data Science", "Computing & technology"),
        NativeSubjectOption("artificial-intelligence", "Artificial Intelligence", "Computing & technology"),
        NativeSubjectOption("cybersecurity", "Cybersecurity", "Computing & technology"),
        NativeSubjectOption("networking", "Networking", "Computing & technology"),
        NativeSubjectOption("software-engineering", "Software Engineering", "Computing & technology"),
        NativeSubjectOption("engineering", "Engineering", "Computing & technology"),
        NativeSubjectOption("electronics", "Electronics", "Computing & technology"),
        NativeSubjectOption("travel-tourism", "Travel and Tourism", "Creative & practical"),
        NativeSubjectOption("sport-science", "Sport Science", "Creative & practical"),
        NativeSubjectOption("fashion-textiles", "Fashion and Textiles", "Creative & practical"),
        NativeSubjectOption("electrical-technology", "Electrical Technology", "Creative & practical"),
        NativeSubjectOption("building-studies", "Building Studies", "Creative & practical"),
        NativeSubjectOption("nursing", "Nursing", "Creative & practical"),
        NativeSubjectOption("public-health", "Public Health", "Sciences"),
        NativeSubjectOption("education", "Education", "Humanities & social sciences"),
        NativeSubjectOption("project-management", "Project Management", "Business & commerce"),
        NativeSubjectOption("research-methods", "Research Methods", "Humanities & social sciences"),
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
}
