package com.shadecode.student

enum class NativeMarkingRights { PERSONAL_STUDY, INSTITUTION_INTERNAL, OPEN_LICENSE, EXPLICIT_PERMISSION, UNKNOWN }
enum class NativeOfflineRubricKind { EXACT_NUMBER, MULTIPLE_CHOICE, ACCEPTED_TEXT, STRUCTURED_POINTS }

data class NativeRubricCriterion(val id: String, val description: String, val marks: Double, val acceptedAnswers: List<String>)
data class NativeOfflineMarkingRubric(
    val version: Int, val kind: NativeOfflineRubricKind, val totalMarks: Double,
    val sourceEvidenceId: String, val syllabusIdentity: String, val reviewerId: String,
    val reviewedAt: String, val verified: Boolean, val rights: NativeMarkingRights,
    val limitations: List<String>, val answer: String? = null, val numericAnswer: Double? = null,
    val tolerance: Double = 0.0, val acceptedAnswers: List<String> = emptyList(),
    val criterion: String? = null, val criteria: List<NativeRubricCriterion> = emptyList(),
)
data class NativeOfflineMarkStep(val description: String, val earnedMarks: Double, val availableMarks: Double, val matched: Boolean, val note: String)
data class NativeOfflineMarkResult(
    val question: String, val earnedMarks: Double, val totalMarks: Double, val percentage: Int,
    val correct: Boolean, val steps: List<NativeOfflineMarkStep>, val feedback: String,
    val sourceEvidenceId: String, val syllabusIdentity: String, val limitations: List<String>,
    val execution: String = "android-local-deterministic",
)

/** Strict, deterministic offline marking. It never guesses a rubric or calls a model. */
object NativeOfflineMarker {
    fun mark(question: String, studentAnswer: String, rubric: NativeOfflineMarkingRubric): NativeOfflineMarkResult? {
        if (question.isBlank() || studentAnswer.isBlank() || !isValid(rubric)) return null
        val steps = when (rubric.kind) {
            NativeOfflineRubricKind.EXACT_NUMBER -> {
                val expected = rubric.numericAnswer ?: return null
                val actual = parseNumber(studentAnswer) ?: return null
                listOf(step(rubric.criterion!!, rubric.totalMarks, kotlin.math.abs(actual - expected) <= rubric.tolerance))
            }
            NativeOfflineRubricKind.MULTIPLE_CHOICE ->
                listOf(step(rubric.criterion!!, rubric.totalMarks, normalize(studentAnswer) == normalize(rubric.answer!!)))
            NativeOfflineRubricKind.ACCEPTED_TEXT -> {
                val matched = rubric.acceptedAnswers.any { normalize(studentAnswer) == normalize(it) }
                listOf(step(rubric.criterion!!, rubric.totalMarks, matched))
            }
            NativeOfflineRubricKind.STRUCTURED_POINTS -> rubric.criteria.map { criterion ->
                val matched = criterion.acceptedAnswers.any { containsApprovedPhrase(studentAnswer, it) }
                step(criterion.description, criterion.marks, matched)
            }
        }
        val earned = steps.sumOf { it.earnedMarks }
        val percentage = ((earned / rubric.totalMarks) * 100.0).toInt().coerceIn(0, 100)
        val allMatched = earned == rubric.totalMarks
        val feedback = if (rubric.kind == NativeOfflineRubricKind.STRUCTURED_POINTS) {
            "Offline criteria check: " + earned + "/" + rubric.totalMarks +
                " marks. Only explicitly approved phrases were matched; unmatched wording may still deserve examiner review."
        } else if (allMatched) {
            "The response matches the reviewed local answer key: " + earned + "/" + rubric.totalMarks + " marks."
        } else {
            "The response does not match the reviewed local answer key: " + earned + "/" + rubric.totalMarks + " marks."
        }
        return NativeOfflineMarkResult(
            question.trim(), earned, rubric.totalMarks, percentage, allMatched, steps, feedback,
            rubric.sourceEvidenceId, rubric.syllabusIdentity, rubric.limitations,
        )
    }

    fun isValid(rubric: NativeOfflineMarkingRubric): Boolean {
        if (rubric.version != 1 || !rubric.totalMarks.isFinite() || rubric.totalMarks <= 0.0) return false
        if (rubric.sourceEvidenceId.isBlank() || rubric.syllabusIdentity.isBlank() ||
            rubric.reviewerId.isBlank() || rubric.reviewedAt.isBlank() ||
            rubric.limitations.isEmpty() || rubric.limitations.any { it.isBlank() } || !rubric.verified
        ) return false
        if (rubric.rights !in setOf(
            NativeMarkingRights.PERSONAL_STUDY, NativeMarkingRights.INSTITUTION_INTERNAL,
            NativeMarkingRights.OPEN_LICENSE, NativeMarkingRights.EXPLICIT_PERMISSION,
        )) return false
        return when (rubric.kind) {
            NativeOfflineRubricKind.EXACT_NUMBER ->
                rubric.numericAnswer?.isFinite() == true && rubric.tolerance.isFinite() && rubric.tolerance >= 0.0 &&
                    !rubric.criterion.isNullOrBlank() && rubric.criteria.isEmpty()
            NativeOfflineRubricKind.MULTIPLE_CHOICE ->
                !rubric.answer.isNullOrBlank() && !rubric.criterion.isNullOrBlank() && rubric.criteria.isEmpty()
            NativeOfflineRubricKind.ACCEPTED_TEXT ->
                rubric.acceptedAnswers.isNotEmpty() && rubric.acceptedAnswers.all { it.isNotBlank() } &&
                    !rubric.criterion.isNullOrBlank() && rubric.criteria.isEmpty()
            NativeOfflineRubricKind.STRUCTURED_POINTS ->
                rubric.criteria.isNotEmpty() && rubric.criteria.all {
                    it.id.isNotBlank() && it.description.isNotBlank() && it.marks.isFinite() && it.marks > 0.0 &&
                        it.acceptedAnswers.isNotEmpty() && it.acceptedAnswers.all { phrase -> phrase.isNotBlank() }
                } && kotlin.math.abs(rubric.criteria.sumOf { it.marks } - rubric.totalMarks) < 1e-8
        }
    }

    private fun step(description: String, marks: Double, matched: Boolean) = NativeOfflineMarkStep(
        description, if (matched) marks else 0.0, marks, matched,
        if (matched) "Matched an explicitly approved answer." else "No explicitly approved answer matched. Manual review may still award credit.",
    )
    private fun parseNumber(value: String): Double? {
        val cleaned = value.trim().replace(",", "")
            .replace(Regex("(?i)\\s*(cm|mm|km|ms|kg|pa|hz|m|s|g|n|v|a|j|w)$"), "").trim()
        return cleaned.toDoubleOrNull()?.takeIf { it.isFinite() }
    }
    private fun normalize(value: String) = value.trim().lowercase().replace(Regex("\\s+"), " ").trimEnd('.', ',', ';', ':', '!', '?')
    private fun containsApprovedPhrase(answer: String, phrase: String): Boolean {
        val escaped = normalize(phrase).split(Regex("\\s+")).joinToString("\\s+") { Regex.escape(it) }
        return Regex("(?<![\\p{L}\\p{N}])" + escaped + "(?![\\p{L}\\p{N}])", RegexOption.IGNORE_CASE)
            .containsMatchIn(normalize(answer))
    }
}
