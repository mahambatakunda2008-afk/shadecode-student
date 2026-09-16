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
        val response = request("POST", "/auth/v1/token?grant_type=password", JSONObject().put("email", email).put("password", password).toString())
        return sessionFromAuthResponse(response, email)
    }

    fun refreshSession(session: NativeSession): NativeSession {
        require(session.refreshToken.isNotBlank()) { "Refresh token is missing." }
        val response = request("POST", "/auth/v1/token?grant_type=refresh_token", JSONObject().put("refresh_token", session.refreshToken).toString())
        return sessionFromAuthResponse(response, session.email)
    }

    fun loadProfile(session: NativeSession): NativeProfile {
        val rows = request("GET", "/rest/v1/profiles?select=id,display_name,study_level,subjects,onboarding_completed&id=eq.${session.userId}&limit=1", accessToken = session.accessToken)
        val array = JSONArray(rows)
        if (array.length() == 0) return NativeProfile(session.userId, session.email, "Student", "upper-secondary", emptyList(), false)
        val row = array.getJSONObject(0)
        val subjects = mutableListOf<String>()
        row.optJSONArray("subjects")?.let { values -> for (i in 0 until values.length()) subjects += values.optString(i) }
        return NativeProfile(row.getString("id"), session.email, row.optString("display_name").ifBlank { "Student" }, row.optString("study_level").ifBlank { "upper-secondary" }, subjects, row.optBoolean("onboarding_completed", false))
    }

    fun loadSubjects(session: NativeSession, profile: NativeProfile): List<NativeSubjectEntity> {
        if (profile.subjects.isEmpty()) return emptyList()
        val rows = request("GET", "/rest/v1/subjects?select=id,name&user_id=eq.${session.userId}&order=name.asc", accessToken = session.accessToken)
        val array = JSONArray(rows)
        val allowed = profile.subjects.map { it.trim().lowercase() }.toSet()
        val result = mutableListOf<NativeSubjectEntity>()
        for (i in 0 until array.length()) {
            val row = array.getJSONObject(i)
            val name = row.optString("name").trim()
            if (name.isBlank() || name.equals("general", ignoreCase = true) || name.lowercase() !in allowed) continue
            result += NativeSubjectEntity(row.getString("id"), name, name.lowercase())
        }
        return result
    }

    fun loadLessons(session: NativeSession, subjectId: String): List<NativeLessonEntity> {
        val rows = request("GET", "/rest/v1/learn_lessons?select=id,subject_id,topic,title,description,difficulty,blocks,progress,updated_at&user_id=eq.${session.userId}&subject_id=eq.$subjectId&order=updated_at.desc&limit=100", accessToken = session.accessToken)
        val array = JSONArray(rows)
        val result = mutableListOf<NativeLessonEntity>()
        for (i in 0 until array.length()) {
            val row = array.getJSONObject(i)
            val rawProgress = row.optDouble("progress", 0.0)
            val normalizedProgress = if (rawProgress > 1.0) rawProgress / 100.0 else rawProgress
            result += NativeLessonEntity(
                id = row.getString("id"), subjectId = row.getString("subject_id"), topic = row.optString("topic"),
                title = row.optString("title").ifBlank { row.optString("topic") }, description = row.optString("description"),
                difficulty = row.optString("difficulty").ifBlank { "standard" }, blocksJson = row.opt("blocks")?.toString() ?: "[]",
                progress = normalizedProgress.toFloat().coerceIn(0f, 1f), updatedAt = System.currentTimeMillis(),
            )
        }
        return result
    }

    fun updateLessonProgress(session: NativeSession, lessonId: String, progress: Float) {
        val percentage = kotlin.math.round(progress.coerceIn(0f, 1f) * 100f).toInt()
        request("PATCH", "/rest/v1/learn_lessons?id=eq.$lessonId&user_id=eq.${session.userId}", JSONObject().put("progress", percentage).toString(), session.accessToken, "return=minimal")
    }

    private fun sessionFromAuthResponse(response: String, fallbackEmail: String): NativeSession {
        val json = JSONObject(response)
        val user = json.optJSONObject("user") ?: error("Supabase did not return a user.")
        return NativeSession(json.getString("access_token"), json.optString("refresh_token"), user.getString("id"), user.optString("email", fallbackEmail))
    }

    private fun request(method: String, path: String, body: String? = null, accessToken: String? = null, prefer: String? = null): String {
        val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method; connectTimeout = 10_000; readTimeout = 10_000
            setRequestProperty("apikey", anonKey); setRequestProperty("Authorization", "Bearer ${accessToken ?: anonKey}")
            setRequestProperty("Content-Type", "application/json"); setRequestProperty("Accept", "application/json")
            if (prefer != null) setRequestProperty("Prefer", prefer)
        }
        try {
            if (body != null) { connection.doOutput = true; connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) } }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in 200..299) {
                val message = runCatching { val json = JSONObject(text); json.optString("msg").ifBlank { json.optString("message") }.ifBlank { json.optString("error_description") } }.getOrNull()
                throw IllegalStateException(message?.ifBlank { null } ?: "Request failed ($code)")
            }
            return text
        } finally { connection.disconnect() }
    }
}

data class NativeSession(val accessToken: String, val refreshToken: String, val userId: String, val email: String)

data class NativeProfile(val id: String, val email: String, val displayName: String, val studyLevel: String, val subjects: List<String>, val onboardingCompleted: Boolean)
