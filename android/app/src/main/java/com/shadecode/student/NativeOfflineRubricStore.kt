package com.shadecode.student

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Private, device-local catalogue of reviewed offline marking rubrics.
 * Entries are keyed by subject, syllabus and a stable question/resource identifier.
 * The catalogue is never synced or exported by this store.
 */
data class NativeOfflineRubricEntry(
    val subjectId: String,
    val questionId: String,
    val syllabusIdentity: String,
    val rubric: NativeOfflineMarkingRubric,
)

class NativeOfflineRubricStore(context: Context) {
    private val file = File(context.applicationContext.filesDir, "offline_marking/rubrics-v1.json")
    private val maxEntries = 500
    private val maxFileBytes = 2 * 1024 * 1024

    @Synchronized
    fun list(): List<NativeOfflineRubricEntry> = readEntries()

    @Synchronized
    fun find(subjectId: String, syllabusIdentity: String, questionId: String): NativeOfflineRubricEntry? {
        if (!validKey(subjectId) || !validKey(syllabusIdentity) || !validKey(questionId)) return null
        return readEntries().firstOrNull {
            it.subjectId == subjectId && it.syllabusIdentity == syllabusIdentity && it.questionId == questionId
        }
    }

    /** Imports a bounded version-1 JSON pack; malformed or partly invalid packs are rejected in full. */
    @Synchronized
    fun installPackJson(jsonText: String): Boolean {
        if (jsonText.toByteArray(Charsets.UTF_8).size !in 1..maxFileBytes) return false
        val entries = runCatching {
            val root = JSONObject(jsonText)
            if (root.optInt("schemaVersion") != 1) return false
            val array = root.optJSONArray("entries") ?: return false
            if (array.length() !in 1..maxEntries) return false
            (0 until array.length()).map { index ->
                decodeEntry(array.getJSONObject(index)) ?: return false
            }
        }.getOrNull() ?: return false
        return installPack(entries)
    }

    /** Installs one explicitly reviewed rubric. Invalid or uncleared content is rejected. */
    @Synchronized
    fun install(entry: NativeOfflineRubricEntry): Boolean {
        if (!isValidEntry(entry)) return false
        val entries = readEntries().toMutableList()
        val existingIndex = entries.indexOfFirst {
            it.subjectId == entry.subjectId &&
                it.syllabusIdentity == entry.syllabusIdentity &&
                it.questionId == entry.questionId
        }
        if (existingIndex >= 0) entries[existingIndex] = entry else {
            if (entries.size >= maxEntries) return false
            entries.add(entry)
        }
        return writeEntries(entries)
    }

    /** Installs a complete reviewed pack atomically; one invalid entry rejects the whole pack. */
    @Synchronized
    fun installPack(pack: List<NativeOfflineRubricEntry>): Boolean {
        if (pack.isEmpty() || pack.size > maxEntries || pack.any { !isValidEntry(it) }) return false
        val packKeys = pack.map { Triple(it.subjectId, it.syllabusIdentity, it.questionId) }
        if (packKeys.distinct().size != packKeys.size) return false
        val merged = readEntries().associateBy {
            Triple(it.subjectId, it.syllabusIdentity, it.questionId)
        }.toMutableMap()
        pack.forEach { entry ->
            merged[Triple(entry.subjectId, entry.syllabusIdentity, entry.questionId)] = entry
        }
        if (merged.size > maxEntries) return false
        return writeEntries(merged.values.toList())
    }

    @Synchronized
    fun remove(subjectId: String, syllabusIdentity: String, questionId: String): Boolean {
        val entries = readEntries().toMutableList()
        val removed = entries.removeAll {
            it.subjectId == subjectId && it.syllabusIdentity == syllabusIdentity && it.questionId == questionId
        }
        return !removed || writeEntries(entries)
    }

    @Synchronized
    fun clear(): Boolean {
        if (!file.exists()) return true
        return file.delete()
    }

    fun isValidEntry(entry: NativeOfflineRubricEntry): Boolean =
        validKey(entry.subjectId) &&
            validKey(entry.questionId) &&
            validKey(entry.syllabusIdentity) &&
            entry.syllabusIdentity == entry.rubric.syllabusIdentity &&
            NativeOfflineMarker.isValid(entry.rubric)

    private fun validKey(value: String): Boolean =
        value.isNotBlank() && value.length <= 180 &&
            value.matches(Regex("[A-Za-z0-9][A-Za-z0-9._:/-]*"))

    private fun readEntries(): List<NativeOfflineRubricEntry> {
        if (!file.isFile || file.length() !in 1..maxFileBytes.toLong()) return emptyList()
        return runCatching {
            val root = JSONObject(file.readText(Charsets.UTF_8))
            if (root.optInt("schemaVersion") != 1) return@runCatching emptyList()
            val array = root.optJSONArray("entries") ?: return@runCatching emptyList()
            if (array.length() > maxEntries) return@runCatching emptyList()
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    val entry = decodeEntry(item) ?: continue
                    if (isValidEntry(entry)) add(entry)
                }
            }.distinctBy { Triple(it.subjectId, it.syllabusIdentity, it.questionId) }
        }.getOrDefault(emptyList())
    }

    private fun writeEntries(entries: List<NativeOfflineRubricEntry>): Boolean {
        if (entries.size > maxEntries || entries.any { !isValidEntry(it) }) return false
        val encoded = JSONObject()
            .put("schemaVersion", 1)
            .put("entries", JSONArray().apply { entries.forEach { put(encodeEntry(it)) } })
            .toString()
        if (encoded.toByteArray(Charsets.UTF_8).size > maxFileBytes) return false
        val parent = file.parentFile ?: return false
        if (!parent.exists() && !parent.mkdirs()) return false
        val atomic = AtomicFile(file)
        val output = runCatching { atomic.startWrite() }.getOrNull() ?: return false
        return try {
            output.write(encoded.toByteArray(Charsets.UTF_8))
            atomic.finishWrite(output)
            true
        } catch (_: Exception) {
            atomic.failWrite(output)
            false
        }
    }

    private fun encodeEntry(entry: NativeOfflineRubricEntry): JSONObject {
        val rubric = entry.rubric
        return JSONObject()
            .put("subjectId", entry.subjectId)
            .put("questionId", entry.questionId)
            .put("syllabusIdentity", entry.syllabusIdentity)
            .put("rubric", JSONObject()
                .put("version", rubric.version)
                .put("kind", rubric.kind.name)
                .put("totalMarks", rubric.totalMarks)
                .put("sourceEvidenceId", rubric.sourceEvidenceId)
                .put("syllabusIdentity", rubric.syllabusIdentity)
                .put("reviewerId", rubric.reviewerId)
                .put("reviewedAt", rubric.reviewedAt)
                .put("verified", rubric.verified)
                .put("rights", rubric.rights.name)
                .put("limitations", JSONArray(rubric.limitations))
                .put("answer", rubric.answer)
                .put("numericAnswer", rubric.numericAnswer)
                .put("tolerance", rubric.tolerance)
                .put("acceptedAnswers", JSONArray(rubric.acceptedAnswers))
                .put("criterion", rubric.criterion)
                .put("criteria", JSONArray().apply {
                    rubric.criteria.forEach { criterion ->
                        put(JSONObject()
                            .put("id", criterion.id)
                            .put("description", criterion.description)
                            .put("marks", criterion.marks)
                            .put("acceptedAnswers", JSONArray(criterion.acceptedAnswers)))
                    }
                }))
    }

    private fun decodeEntry(item: JSONObject): NativeOfflineRubricEntry? = runCatching {
        val json = item.getJSONObject("rubric")
        val criteriaJson = json.optJSONArray("criteria") ?: JSONArray()
        val criteria = (0 until criteriaJson.length()).mapNotNull { index ->
            val criterion = criteriaJson.optJSONObject(index) ?: return@mapNotNull null
            NativeRubricCriterion(
                id = criterion.optString("id"),
                description = criterion.optString("description"),
                marks = criterion.optDouble("marks", Double.NaN),
                acceptedAnswers = strings(criterion.optJSONArray("acceptedAnswers")),
            )
        }
        val numeric = if (json.isNull("numericAnswer")) null else json.optDouble("numericAnswer", Double.NaN)
        NativeOfflineRubricEntry(
            subjectId = item.getString("subjectId"),
            questionId = item.getString("questionId"),
            syllabusIdentity = item.getString("syllabusIdentity"),
            rubric = NativeOfflineMarkingRubric(
                version = json.optInt("version", -1),
                kind = NativeOfflineRubricKind.valueOf(json.getString("kind")),
                totalMarks = json.optDouble("totalMarks", Double.NaN),
                sourceEvidenceId = json.optString("sourceEvidenceId"),
                syllabusIdentity = json.optString("syllabusIdentity"),
                reviewerId = json.optString("reviewerId"),
                reviewedAt = json.optString("reviewedAt"),
                verified = json.optBoolean("verified", false),
                rights = NativeMarkingRights.valueOf(json.getString("rights")),
                limitations = strings(json.optJSONArray("limitations")),
                answer = json.optString("answer").takeIf { it.isNotBlank() && it != "null" },
                numericAnswer = numeric,
                tolerance = json.optDouble("tolerance", 0.0),
                acceptedAnswers = strings(json.optJSONArray("acceptedAnswers")),
                criterion = json.optString("criterion").takeIf { it.isNotBlank() && it != "null" },
                criteria = criteria,
            ),
        )
    }.getOrNull()

    private fun strings(array: JSONArray?): List<String> =
        array?.let { (0 until it.length()).mapNotNull { index -> it.optString(index).takeIf(String::isNotBlank) } }
            .orEmpty()
}
