package com.shadecode.student

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

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
    ): JSONObject {
        require(mode == "check" || mode == "help") { "Choose Mark Mode or Help Mode." }
        require(subject.isNotBlank() && subjectId.isNotBlank()) { "Choose one of your enrolled subjects." }
        require(question.isNotBlank() || studentAnswer.isNotBlank()) { "Add a question or extracted working first." }
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
            connection.outputStream.bufferedWriter(Charsets.UTF_8).use { out ->
                fun field(name: String, value: String) {
                    out.append("--").append(boundary).append("\r\n")
                    out.append("Content-Disposition: form-data; name=\"").append(name).append("\"\r\n\r\n")
                    out.append(value).append("\r\n")
                }
                field("mode", mode)
                field("subject", subject)
                field("subjectId", subjectId)
                field("question", question.trim().take(12_000))
                field("studentAnswer", studentAnswer.trim().take(60_000))
                if (mode == "help") field("level", helpLevel)
                out.append("--").append(boundary).append("--\r\n")
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
