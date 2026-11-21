package com.shadecode.student

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Remote Cortex adapter. The Android client does not choose a cloud model.
 * /api/learn/generate owns the provider chain, quality gates and curriculum
 * grounding, so the native app benefits from the same multi-provider system.
 */
class NativeCloudCortex(
    private val baseUrl: String = "https://shadecodestudent.vercel.app",
) {
    fun generateLesson(
        session: NativeSession,
        subjectId: String,
        subject: String,
        topic: String,
        level: String,
    ): NativeLessonEntity? {
        val connection = (URL("${baseUrl.trimEnd('/')}/api/learn/generate").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 6000
            readTimeout = 55000
            doOutput = true
            setRequestProperty("Authorization", "Bearer ${session.accessToken}")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }

        return try {
            val request = JSONObject()
                .put("subject", subject)
                .put("topic", topic)
                .put("level", level.ifBlank { "student" })
                .put("prompt", "Teach $topic clearly and practically.")

            connection.outputStream.use { it.write(request.toString().toByteArray(Charsets.UTF_8)) }

            // A generated lesson can be returned with 503 when only its cloud
            // insert failed. Read that error body and recover the exact lesson
            // instead of discarding it and forcing the student to regenerate.
            val responseCode = connection.responseCode
            val responseStream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
            val body = responseStream?.bufferedReader()?.use { it.readText() } ?: return null
            val envelope = JSONObject(body)
            val recoverable = responseCode !in 200..299 &&
                envelope.optString("code") == "LESSON_SAVE_FAILED_RECOVERABLE"
            if (responseCode !in 200..299 && !recoverable) return null

            val value = if (recoverable) envelope.optJSONObject("recoverableLesson") ?: return null else envelope
            val id = value.optString("id").trim()
            val title = value.optString("title").trim().ifBlank { topic }
            val blocks = value.optJSONArray("blocks") ?: return null
            if (id.isBlank() || blocks.length() < 8) return null

            val normalizedBlocks = normalizeBlocks(blocks)
            if (JSONArray(normalizedBlocks).length() < 8) return null

            NativeLessonEntity(
                id = id,
                subjectId = subjectId,
                topic = value.optString("topic").trim().ifBlank { topic }.take(500),
                title = title.take(255),
                description = value.optString("description").trim()
                    .ifBlank { "A Cortex lesson on ${topic.trim()}" }.take(1000),
                difficulty = value.optString("difficulty").trim().ifBlank { "adaptive" },
                blocksJson = normalizedBlocks,
                progress = value.optDouble("progress", 0.0).toFloat().coerceIn(0f, 1f),
            )
        } catch (_: Exception) {
            null
        } finally {
            connection.disconnect()
        }
    }

    private fun normalizeBlocks(blocks: JSONArray): String {
        val normalized = JSONArray()
        for (index in 0 until blocks.length()) {
            val block = blocks.optJSONObject(index) ?: continue
            val content = block.optString("content").trim()
            if (content.isBlank()) continue
            val out = JSONObject()
                .put("type", block.optString("type").trim().ifBlank { "concept" })
                .put("content", content)
            block.optString("title").trim().takeIf { it.isNotBlank() }?.let { out.put("title", it) }
            block.optString("formula").trim().takeIf { it.isNotBlank() }?.let { out.put("formula", it) }
            if (block.has("options")) out.put("options", block.opt("options"))
            block.optString("answer").trim().takeIf { it.isNotBlank() }?.let { out.put("answer", it) }
            normalized.put(out)
        }
        return normalized.toString()
    }
}
