package com.shadecode.student

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class NativeApi {
    private val baseUrl = BuildConfig.SUPABASE_URL.trimEnd('/')
    private val anonKey = BuildConfig.SUPABASE_ANON_KEY

    fun signIn(email: String, password: String): NativeSession {
        require(baseUrl.isNotBlank() && anonKey.isNotBlank()) { "Native Supabase configuration is missing." }
        val response = request(
            method = "POST",
            path = "/auth/v1/token?grant_type=password",
            body = JSONObject().put("email", email).put("password", password).toString(),
        )
        return NativeSession(
            accessToken = response.getString("access_token"),
            refreshToken = response.optString("refresh_token"),
            userId = response.getJSONObject("user").getString("id"),
            email = response.getJSONObject("user").optString("email", email),
        )
    }

    fun loadProfile(session: NativeSession): NativeProfile {
        val rows = request(
            method = "GET",
            path = "/rest/v1/profiles?select=id,display_name,study_level,subjects,onboarding_completed&id=eq.${session.userId}&limit=1",
            accessToken = session.accessToken,
        )
        val array = JSONArray(rows)
        if (array.length() == 0) return NativeProfile(session.userId, session.email, "Student", "upper-secondary", emptyList(), false)
        val row = array.getJSONObject(0)
        val subjects = mutableListOf<String>()
        row.optJSONArray("subjects")?.let { values ->
            for (i in 0 until values.length()) subjects += values.optString(i)
        }
        return NativeProfile(
            id = row.getString("id"),
            email = session.email,
            displayName = row.optString("display_name").ifBlank { "Student" },
            studyLevel = row.optString("study_level").ifBlank { "upper-secondary" },
            subjects = subjects,
            onboardingCompleted = row.optBoolean("onboarding_completed", false),
        )
    }

    fun loadSubjects(session: NativeSession, profile: NativeProfile): List<NativeSubjectEntity> {
        if (profile.subjects.isEmpty()) return emptyList()
        val rows = request(
            method = "GET",
            path = "/rest/v1/subjects?select=id,name&user_id=eq.${session.userId}&order=name.asc",
            accessToken = session.accessToken,
        )
        val array = JSONArray(rows)
        val allowed = profile.subjects.map { it.trim().lowercase() }.toSet()
        val result = mutableListOf<NativeSubjectEntity>()
        for (i in 0 until array.length()) {
            val row = array.getJSONObject(i)
            val name = row.optString("name").trim()
            if (name.isBlank() || name.equals("general", ignoreCase = true)) continue
            if (name.lowercase() !in allowed) continue
            result += NativeSubjectEntity(
                id = row.getString("id"),
                name = name,
                normalizedName = name.lowercase(),
            )
        }
        return result
    }

    fun loadLessons(session: NativeSession, subjectId: String): List<NativeLessonEntity> {
        val rows = request(
            method = "GET",
            path = "/rest/v1/learn_lessons?select=id,subject_id,topic,title,description,difficulty,blocks,progress,updated_at&user_id=eq.${session.userId}&subject_id=eq.$subjectId&order=updated_at.desc&limit=100",
            accessToken = session.accessToken,
        )
        val array = JSONArray(rows)
        val result = mutableListOf<NativeLessonEntity>()
        for (i in 0 until array.length()) {
            val row = array.getJSONObject(i)
            val blocks = row.opt("blocks")
            result += NativeLessonEntity(
                id = row.getString("id"),
                subjectId = row.getString("subject_id"),
                topic = row.optString("topic"),
                title = row.optString("title").ifBlank { row.optString("topic") },
                description = row.optString("description"),
                difficulty = row.optString("difficulty").ifBlank { "standard" },
                blocksJson = blocks?.toString() ?: "[]",
                progress = row.optDouble("progress", 0.0).toFloat().coerceIn(0f, 1f),
            )
        }
        return result
    }

    private fun request(method: String, path: String, body: String? = null, accessToken: String? = null): String {
        val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 10_000
            readTimeout = 10_000
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Authorization", "Bearer ${accessToken ?: anonKey}")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
            doInput = true
        }
        try {
            if (body != null) {
                connection.doOutput = true
                connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in 200..299) {
                val message = runCatching { JSONObject(text).optString("msg").ifBlank { JSONObject(text).optString("message") } }.getOrNull()
                throw IllegalStateException(message?.ifBlank { null } ?: "Request failed ($code)")
            }
            return text
        } finally {
            connection.disconnect()
        }
    }
}

data class NativeSession(
    val accessToken: String,
    val refreshToken: String,
    val userId: String,
    val email: String,
)

data class NativeProfile(
    val id: String,
    val email: String,
    val displayName: String,
    val studyLevel: String,
    val subjects: List<String>,
    val onboardingCompleted: Boolean,
)
