package com.shadecode.student

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

data class NativeVerifyVisualEvidence(val label: String, val annotation: String, val bytes: ByteArray)

/** Authenticated adapter for the shared web Cortex Verify endpoint. */
class NativeVerifyApi(
    private val baseUrl: String = "https://shadecodestudent.vercel.app",
) {
    fun submit(
        session: NativeSession,
        subject: String,
        subjectId: String,
        mode: String,
        question: String,
        studentAnswer: String,
        helpLevel: String = "hint",
        visualEvidence: List<NativeVerifyVisualEvidence> = emptyList(),
    ): JSONObject {
        require(mode == "check" || mode == "help") { "Choose Mark Mode or Help Mode." }
        require(subject.isNotBlank() && subjectId.isNotBlank()) { "Choose one of your enrolled subjects." }
        require(question.isNotBlank() || studentAnswer.isNotBlank() || visualEvidence.isNotEmpty()) { "Add a question, extracted working or visual evidence first." }
        if (mode == "help") require(helpLevel in setOf("hint", "method", "solution")) { "Choose a valid help level." }

        val boundary = "ShadecodeVerify-${UUID.randomUUID()}"
        val connection = (URL("${baseUrl.trimEnd('/')}/api/cortex/verify").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 65_000
            doOutput = true
            setRequestProperty("Authorization", "Bearer ${session.accessToken}")
            setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            setRequestProperty("Accept", "application/json")
        }
        return try {
            connection.outputStream.buffered().use { out ->
                fun writeText(value: String) = out.write(value.toByteArray(Charsets.UTF_8))
                fun field(name: String, value: String) {
                    writeText("--$boundary\r\n")
                    writeText("Content-Disposition: form-data; name=\"$name\"\r\n\r\n")
                    writeText(value)
                    writeText("\r\n")
                }
                field("mode", mode)
                field("subject", subject)
                field("subjectId", subjectId)
                field("question", question.trim().take(12_000))
                field("studentAnswer", studentAnswer.trim().take(60_000))
                if (mode == "help") field("level", helpLevel)
                visualEvidence.take(5).forEachIndexed { index, evidence ->
                    require(evidence.bytes.isNotEmpty() && evidence.bytes.size <= 4 * 1024 * 1024) { "Each visual crop must be 4 MB or smaller." }
                    writeText("--$boundary\r\n")
                    writeText("Content-Disposition: form-data; name=\"visualEvidence\"; filename=\"visual-$index.webp\"\r\n")
                    writeText("Content-Type: image/webp\r\n\r\n")
                    out.write(evidence.bytes)
                    writeText("\r\n")
                    field("visualEvidenceContext", org.json.JSONObject()
                        .put("label", evidence.label.take(100))
                        .put("annotation", evidence.annotation.take(1000))
                        .toString())
                }
                writeText("--$boundary--\r\n")
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val raw = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            val result = runCatching { JSONObject(raw) }.getOrElse { throw IllegalStateException("Cortex returned an unreadable response.") }
            if (code !in 200..299) throw IllegalStateException(result.optString("error").ifBlank { "Cortex Verify failed ($code)." })
            result
        } finally {
            connection.disconnect()
        }
    }
}
