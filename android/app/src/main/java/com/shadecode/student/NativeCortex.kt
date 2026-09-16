package com.shadecode.student

import com.google.mlkit.genai.prompt.FeatureStatus
import com.google.mlkit.genai.prompt.Generation
import kotlinx.coroutines.flow.first
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * On-device Cortex for native Android.
 *
 * Gemini Nano is the first generation path. If AICore is unavailable, callers
 * should fall back to the server Cortex pipeline rather than pretending that
 * a local answer was generated.
 */
class NativeCortex {
    private val model = Generation.getClient()

    suspend fun isAvailable(): Boolean = runCatching {
        model.checkStatus() == FeatureStatus.AVAILABLE
    }.getOrDefault(false)

    suspend fun generateLesson(
        subject: String,
        topic: String,
        level: String,
    ): NativeLessonEntity? {
        if (!isAvailable()) return null

        val safeSubject = subject.trim()
        val safeTopic = topic.trim()
        val safeLevel = level.trim().ifBlank { "student" }
        if (safeSubject.isBlank() || safeTopic.isBlank()) return null

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

Use 8-12 purposeful blocks. Keep the output under 3500 tokens.
""".trimIndent()

        return runCatching {
            val response = model.generateContent(prompt)
            val raw = response.text?.trim().orEmpty()
            parseLesson(raw, safeSubject, safeTopic)
        }.getOrNull()
    }

    suspend fun warmup(): Boolean = runCatching {
        if (!isAvailable()) return false
        model.warmup().first()
        true
    }.getOrDefault(false)

    fun close() = model.close()

    private fun parseLesson(raw: String, subject: String, topic: String): NativeLessonEntity? {
        val candidate = extractObject(raw) ?: return null
        val value = JSONObject(candidate)
        val title = value.optString("title").trim().ifBlank { "$topic" }
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
            when (val ch = text[index]) {
                '"' -> if (!escaped) inString = !inString
                '\\' -> if (inString) escaped = !escaped
                else -> escaped = false
            }
            if (inString) continue
            if (text[index] == '{') depth++
            if (text[index] == '}' && --depth == 0) return text.substring(start, index + 1)
        }
        return null
    }
}
