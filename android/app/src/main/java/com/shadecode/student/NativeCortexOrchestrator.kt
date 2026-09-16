package com.shadecode.student

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Single Cortex generation entry point. */
class NativeCortexOrchestrator(
    private val local: NativeCortex = NativeCortex(),
    private val gguf: NativeLocalModelRuntime = LlamaCppRuntime(NativeRuntimeContext.require()),
    private val cloud: NativeCloudCortex = NativeCloudCortex(),
) {
    suspend fun generateLesson(
        session: NativeSession,
        subjectId: String,
        subject: String,
        topic: String,
        level: String,
    ): NativeLessonEntity? {
        val model = NativeLocalModelCatalog.recommendedFor(availableRamMb())
        if (model != null && gguf.isReady(model.id)) {
            val prompt = buildLessonPrompt(subject, topic, level)
            val raw = gguf.generate(model.id, prompt, 420)
            raw?.let { parseLocalLesson(it, subjectId, topic) }?.let { return it }
        }

        val localLesson = local.generateLesson(subject, topic, level)
        if (localLesson != null) return localLesson.copy(subjectId = subjectId)

        return withContext(Dispatchers.IO) {
            cloud.generateLesson(session, subjectId, subject, topic, level)
        }
    }

    suspend fun warmLocalModel(): Boolean {
        val model = NativeLocalModelCatalog.recommendedFor(availableRamMb())
        if (model != null && gguf.isReady(model.id)) return true
        return local.warmup()
    }

    fun close() {
        runCatching { gguf.unload("") }
        local.close()
    }

    private fun buildLessonPrompt(subject: String, topic: String, level: String): String = """
You are Cortex, Shadecode Student's offline teaching engine.
Teach $topic in $subject to a $level student.
Return ONLY JSON with this shape:
{"title":"specific title","description":"short description","difficulty":"intermediate","blocks":[{"type":"concept|definition|formula|example|checkpoint|misconception|application|practice|summary|tip","title":"heading","content":"substantive teaching content"}]}
Use 8-12 useful blocks. Teach understanding, not a generic summary. Include precise definitions, intuition, worked reasoning, common mistakes and practice. Use LaTeX for mathematics. Do not invent citations.
""".trimIndent()

    private fun parseLocalLesson(raw: String, subjectId: String, topic: String): NativeLessonEntity? {
        val candidate = raw.substringAfter('{', "").let { if (it.isBlank()) return null else "{$it" }
        val json = runCatching { org.json.JSONObject(candidate.substringBeforeLast('}') + "}") }.getOrNull() ?: return null
        val blocks = json.optJSONArray("blocks") ?: return null
        if (blocks.length() < 8) return null
        val normalized = org.json.JSONArray()
        for (i in 0 until blocks.length()) {
            val block = blocks.optJSONObject(i) ?: continue
            val type = block.optString("type").trim().lowercase()
            val content = block.optString("content").trim()
            if (type.isBlank() || content.length < 12) continue
            normalized.put(org.json.JSONObject().apply {
                put("type", type)
                block.optString("title").trim().takeIf { it.isNotBlank() }?.let { put("title", it) }
                put("content", content)
            })
        }
        if (normalized.length() < 8) return null
        return NativeLessonEntity(
            id = "local:gguf:${java.util.UUID.randomUUID()}",
            subjectId = subjectId,
            topic = topic.take(500),
            title = json.optString("title").ifBlank { topic }.take(255),
            description = json.optString("description").take(1000),
            difficulty = json.optString("difficulty").ifBlank { "intermediate" }.take(40),
            blocksJson = normalized.toString(),
            progress = 0f,
        )
    }

    private fun availableRamMb(): Int =
        (Runtime.getRuntime().maxMemory() / 1024L / 1024L).toInt()
}
