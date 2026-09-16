package com.shadecode.student

import com.google.mlkit.genai.prompt.FeatureStatus
import com.google.mlkit.genai.prompt.Generation
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * Local Cortex model adapter.
 *
 * This is deliberately only one provider in the Cortex pool. The router keeps
 * provider choice separate from feature code so LiteRT-LM/llama.cpp/custom
 * models can be added without making Gemini Nano a hard dependency of every
 * feature.
 */
class NativeCortex {
    private val model = Generation.getClient()
    private val router = NativeCortexRouter()
    private val inferenceLock = Mutex()
    private val lessonCache = LinkedHashMap<String, NativeLessonEntity>(8, 0.75f, true)
    private var availability: Boolean? = null
    private var availabilityCheckedAt = 0L

    suspend fun isAvailable(forceRefresh: Boolean = false): Boolean {
        val now = System.currentTimeMillis()
        if (!forceRefresh && availability != null && now - availabilityCheckedAt < STATUS_CACHE_MS) {
            return availability == true
        }

        return runCatching {
            model.checkStatus() == FeatureStatus.AVAILABLE
        }.getOrDefault(false).also {
            availability = it
            availabilityCheckedAt = System.currentTimeMillis()
        }
    }

    suspend fun generateLesson(
        subject: String,
        topic: String,
        level: String,
    ): NativeLessonEntity? {
        val safeSubject = subject.trim()
        val safeTopic = topic.trim()
        val safeLevel = level.trim().ifBlank { "student" }
        if (safeSubject.isBlank() || safeTopic.isBlank()) return null

        val key = cacheKey(safeSubject, safeTopic, safeLevel)
        lessonCache[key]?.let { return it }

        val route = router.route(
            CortexTask.LESSON_GENERATION,
            CortexCapabilities(
                localModelAvailable = isAvailable(),
                networkAvailable = false,
                hasCachedResult = false,
            ),
        )
        if (route != CortexRoute.LOCAL_MODEL) return null

        return inferenceLock.withLock {
            lessonCache[key]?.let { return@withLock it }
            runCatching {
                val prompt = """
You are Cortex, the offline teaching engine inside Shadecode Student.
Generate a compact but genuinely useful lesson for a $safeLevel student.
Subject: $safeSubject
Topic: $safeTopic

Teach the requested topic only. Build understanding, not a generic summary.
Use correct definitions, intuition, worked reasoning, misconceptions and a small amount of practice when useful.
If mathematics is involved, use LaTeX inside single dollar signs.
Do not invent syllabus claims or citations.

Return ONLY JSON:
{"title":"specific title","description":"short description","difficulty":"beginner|intermediate|advanced","blocks":[{"type":"objective|prior|concept|definition|formula|example|checkpoint|misconception|application|practice|summary|tip","title":"short heading","content":"substantive student-facing content"}]}

Use 8-12 purposeful blocks. Keep the output under 3000 tokens.
""".trimIndent()

                val response = model.generateContent(prompt)
                val raw = response.text?.trim().orEmpty()
                parseLesson(raw, safeTopic)?.also { lesson ->
                    lessonCache[key] = lesson
                    while (lessonCache.size > 8) lessonCache.remove(lessonCache.entries.first().key)
                }
            }.getOrNull()
        }
    }

    suspend fun warmup(): Boolean = runCatching {
        if (!isAvailable()) return false
        inferenceLock.withLock { model.warmup() }
        true
    }.getOrDefault(false)

    fun clearMemoryCache() = lessonCache.clear()

    fun close() {
        lessonCache.clear()
        availability = null
        model.close()
    }

    private fun cacheKey(subject: String, topic: String, level: String): String =
        "${subject.lowercase().trim()}|${topic.lowercase().trim()}|${level.lowercase().trim()}"

    private fun parseLesson(raw: String, topic: String): NativeLessonEntity? {
        val candidate = extractObject(raw) ?: return null
        val value = runCatching { JSONObject(candidate) }.getOrNull() ?: return null
        val title = value.optString("title").trim().ifBlank { topic }
        val description = value.optString("description").trim()
        val difficulty = value.optString("difficulty").trim().ifBlank { "intermediate" }
        val blocks = value.optJSONArray("blocks") ?: return null
        val valid = JSONArray()

        for (index in 0 until blocks.length()) {
            val block = blocks.optJSONObject(index) ?: continue
            val type = block.optString("type").trim().lowercase()
            val content = block.optString("content").trim()
            if (type.isBlank() || content.length < 12) continue
            val normalized = JSONObject()
            normalized.put("type", type)
            block.optString("title").trim().takeIf { it.isNotBlank() }?.let { normalized.put("title", it) }
            normalized.put("content", content)
            valid.put(normalized)
        }

        if (valid.length() < 8) return null

        return NativeLessonEntity(
            id = "local:${UUID.randomUUID()}",
            subjectId = "",
            topic = topic.take(500),
            title = title.take(255),
            description = description.take(1000),
            difficulty = difficulty.take(40),
            blocksJson = valid.toString(),
            progress = 0f,
        )
    }

    private fun extractObject(raw: String): String? {
        val text = raw.replace(Regex("^\\s*```(?:json)?\\s*", RegexOption.IGNORE_CASE), "")
            .replace(Regex("\\s*```\\s*$"), "")
            .trim()
        val start = text.indexOf('{')
        if (start < 0) return null
        var depth = 0
        var inString = false
        var escaped = false
        for (index in start until text.length) {
            val ch = text[index]
            if (inString) {
                if (escaped) escaped = false
                else if (ch == '\\') escaped = true
                else if (ch == '"') inString = false
                continue
            }
            if (ch == '"') inString = true
            else if (ch == '{') depth++
            else if (ch == '}' && --depth == 0) return text.substring(start, index + 1)
        }
        return null
    }

    companion object {
        private const val STATUS_CACHE_MS = 30_000L
    }
}
