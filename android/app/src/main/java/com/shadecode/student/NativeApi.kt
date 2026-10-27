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
        val allowed = profile.subjects.flatMap { code ->
            val label = NativeSubjectCatalog.labelFor(code)
            val mappedLabel = when {
                code.equals("maths", true) || code.equals("mathematics", true) -> "Mathematics"
                code.equals("computer-science", true) || code.equals("computer_science", true) || code.equals("coding", true) -> "Computer Science"
                code.equals("english", true) && profile.studyLevel.equals("a-level", true) -> "English Language"
                code.equals("business", true) && profile.studyLevel.equals("lower-secondary", true) -> "Business Studies"
                else -> label
            }
            listOf(code, label, mappedLabel)
        }.map { normalizeSubjectKey(it) }.toSet()
        val result = mutableListOf<NativeSubjectEntity>()
        for (i in 0 until array.length()) {
            val row = array.getJSONObject(i)
            val name = row.optString("name").trim()
            if (name.isBlank() || name.equals("general", ignoreCase = true) || normalizeSubjectKey(name) !in allowed) continue
            result += NativeSubjectEntity(row.getString("id"), name, normalizeSubjectKey(name))
        }
        return result
    }

    /** Update only learner-editable profile fields; the database trigger synchronizes the subject catalog. */
    fun saveLearnerProfile(session: NativeSession, profile: NativeProfile) {
        val body = JSONObject()
            .put("display_name", profile.displayName.trim().ifBlank { "Student" })
            .put("study_level", profile.studyLevel.trim().ifBlank { "upper-secondary" })
            .put("subjects", JSONArray(profile.subjects.map { NativeSubjectCatalog.codeFor(it) }.distinct()))
            .put("onboarding_completed", true)
        val response = request(
            "PATCH",
            "/rest/v1/profiles?id=eq.${session.userId}",
            body.toString(),
            accessToken = session.accessToken,
            prefer = "return=representation",
        )
        if (JSONArray(response).length() == 0) {
            throw IllegalStateException("Profile was not updated. Please sign in again and retry.")
        }
    }

    private fun normalizeSubjectKey(value: String): String =
        value.trim().lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')

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

    /** Atomically replace the authenticated learner's timetable using the existing RLS-protected RPC. */
    fun saveTimetable(session: NativeSession, slots: List<NativeTimetableSlot>) {
        require(slots.isNotEmpty() && slots.size <= 100) { "Generate between 1 and 100 timetable slots." }
        val payload = JSONArray()
        slots.forEach { slot ->
            payload.put(
                JSONObject()
                    .put("subject", slot.subject.trim().take(120))
                    .put("start_time", slot.startTime.take(5))
                    .put("end_time", slot.endTime.take(5))
                    .put("is_break", slot.isBreak)
            )
        }
        request(
            "POST",
            "/rest/v1/rpc/replace_own_timetable",
            JSONObject().put("p_slots", payload).toString(),
            accessToken = session.accessToken,
            prefer = "return=minimal",
        )
    }

    fun loadTimetable(session: NativeSession): List<NativeTimetableSlot> {
        val rows = request(
            "GET",
            "/rest/v1/timetable?select=id,subject,start_time,end_time,is_break&user_id=eq.${session.userId}&order=start_time.asc&limit=200",
            accessToken = session.accessToken,
        )
        val array = JSONArray(rows)
        return buildList {
            for (i in 0 until array.length()) {
                val row = array.getJSONObject(i)
                add(
                    NativeTimetableSlot(
                        id = row.optString("id", "$i"),
                        subject = row.optString("subject").ifBlank { if (row.optBoolean("is_break")) "Break" else "Study session" },
                        startTime = row.optString("start_time"),
                        endTime = row.optString("end_time"),
                        isBreak = row.optBoolean("is_break", false),
                    )
                )
            }
        }
    }

    fun loadTasks(session: NativeSession): List<NativeTask> {
        val rows = request(
            "GET",
            "/rest/v1/tasks?select=id,subject_id,title,description,due_date,completed,completed_at,updated_at&user_id=eq.${session.userId}&order=due_date.asc.nullslast&limit=100",
            accessToken = session.accessToken,
        )
        val array = JSONArray(rows)
        return buildList {
            for (i in 0 until array.length()) {
                val row = array.getJSONObject(i)
                add(
                    NativeTask(
                        id = row.getString("id"),
                        subjectId = row.optString("subject_id"),
                        title = row.optString("title"),
                        description = row.optString("description"),
                        dueDate = row.optString("due_date").takeIf { it.isNotBlank() && it != "null" },
                        completed = row.optBoolean("completed", false),
                    )
                )
            }
        }
    }

    fun createTask(session: NativeSession, title: String, description: String = "", linkedSubjectId: String = ""): NativeTask {
        require(title.trim().isNotEmpty()) { "Enter a task title." }
        val body = JSONObject()
            .put("user_id", session.userId)
            .put("subject_id", linkedSubjectId)
            .put("title", title.trim().take(180))
            .put("description", description.trim().take(2000))
            .put("completed", false)
            .put("updated_at", java.time.Instant.now().toString())
        val response = request(
            "POST",
            "/rest/v1/tasks",
            body.toString(),
            accessToken = session.accessToken,
            prefer = "return=representation",
        )
        val rows = JSONArray(response)
        if (rows.length() == 0) throw IllegalStateException("Task was not saved.")
        val row = rows.getJSONObject(0)
        return NativeTask(
            id = row.getString("id"),
            subjectId = row.optString("subject_id"),
            title = row.optString("title"),
            description = row.optString("description"),
            dueDate = row.optString("due_date").takeIf { it.isNotBlank() && it != "null" },
            completed = row.optBoolean("completed", false),
        )
    }

    fun completeTask(session: NativeSession, taskId: String) {
        request(
            "PUT",
            "/api/tasks/$taskId/complete",
            "{}",
            accessToken = session.accessToken,
            urlBase = BuildConfig.APP_BASE_URL.trimEnd('/'),
        )
    }

    /** Persist a completed native focus session through the same server route used by the web app. */
    fun completeFocusSession(session: NativeSession, durationMinutes: Int, mode: String, xpEarned: Int): JSONObject {
        require(durationMinutes in 1..120) { "Focus duration must be between 1 and 120 minutes." }
        val body = JSONObject()
            .put("durationMinutes", durationMinutes)
            .put("mode", mode.take(40))
            .put("xpEarned", xpEarned.coerceIn(0, 200))
        val response = request(
            "POST",
            "/api/focus/complete",
            body.toString(),
            accessToken = session.accessToken,
            urlBase = BuildConfig.APP_BASE_URL.trimEnd('/'),
        )
        return JSONObject(response)
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

    private fun request(method: String, path: String, body: String? = null, accessToken: String? = null, prefer: String? = null, urlBase: String = baseUrl): String {
        val connection = (URL(urlBase + path).openConnection() as HttpURLConnection).apply {
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

data class NativeTask(val id: String, val subjectId: String, val title: String, val description: String, val dueDate: String?, val completed: Boolean)

data class NativeSession(val accessToken: String, val refreshToken: String, val userId: String, val email: String)

data class NativeProfile(val id: String, val email: String, val displayName: String, val studyLevel: String, val subjects: List<String>, val onboardingCompleted: Boolean)

data class NativeTimetableSlot(val id: String, val subject: String, val startTime: String, val endTime: String, val isBreak: Boolean)
