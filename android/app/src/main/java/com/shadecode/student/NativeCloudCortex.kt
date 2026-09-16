package com.shadecode.student

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Remote Cortex adapter. The Android client does not choose a cloud model.
 * /api/learn/generate owns the provider chain, quality gates and curriculum
 * grounding, so the native app benefits from the same multi-provider system as
 * the web client.
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
            if (connection.responseCode !in 200..299) return null
            val body = connection.inputStream.bufferedReader().use { it.readText() }
            val value = JSONObject(body)
            val id = value.optString("id").trim()
            val title = value.optString("title").trim().ifBlank { topic }
            val blocks = value.optJSONArray("blocks") ?: return null
            if (id.isBlank() || blocks.length() < 8) return null

            NativeLessonEntity(
                id = id,
                subjectId = subjectId,
                topic = topic.take(500),
                title = title.take(255),
                description = "A Cortex lesson on ${topic.trim()}".take(1000),
                difficulty = "adaptive",
                blocksJson = normalizeBlocks(blocks),
                progress = 0f,
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
