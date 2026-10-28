package com.shadecode.student

import android.content.Context
import org.json.JSONObject

/**
 * Device-local recovery for unfinished exam attempts. Data is scoped by Supabase user ID
 * and stays in private app preferences; it is never uploaded as part of autosave.
 */
object NativeExamAttemptStore {
    data class SavedAttempt(
        val subject: String,
        val paperJson: String,
        val questionsJson: String,
        val answersJson: String,
        val secondsLeft: Int,
        val taking: Boolean,
        val savedAt: Long,
        val deadlineMillis: Long,
    )

    private fun prefs(context: Context) =
        context.getSharedPreferences("native_exam_attempts_v1", Context.MODE_PRIVATE)

    private fun key(userId: String) = "attempt_" + userId

    fun read(context: Context, userId: String): SavedAttempt? {
        if (userId.isBlank()) return null
        val raw = prefs(context).getString(key(userId), null) ?: return null
        return runCatching {
            val json = JSONObject(raw)
            SavedAttempt(
                subject = json.optString("subject"),
                paperJson = json.getString("paperJson"),
                questionsJson = json.getString("questionsJson"),
                answersJson = json.optString("answersJson", "{}"),
                secondsLeft = json.optInt("secondsLeft", 0),
                taking = json.optBoolean("taking", false),
                savedAt = json.optLong("savedAt", 0L),
                deadlineMillis = json.optLong("deadlineMillis", 0L),
            )
        }.getOrNull()
    }

    fun write(
        context: Context,
        userId: String,
        subject: String,
        paperJson: String,
        questionsJson: String,
        answersJson: String,
        secondsLeft: Int,
        taking: Boolean,
        deadlineMillis: Long,
    ) {
        if (userId.isBlank()) return
        val encoded = JSONObject()
            .put("subject", subject)
            .put("paperJson", paperJson)
            .put("questionsJson", questionsJson)
            .put("answersJson", answersJson)
            .put("secondsLeft", secondsLeft.coerceAtLeast(0))
            .put("taking", taking)
            .put("savedAt", System.currentTimeMillis())
            .put("deadlineMillis", if (taking) deadlineMillis.coerceAtLeast(0L) else 0L)
            .toString()
        // apply() schedules disk I/O off the UI thread; this checkpoint may be written each timer tick.
        prefs(context).edit().putString(key(userId), encoded).apply()
    }

    fun clear(context: Context, userId: String) {
        if (userId.isNotBlank()) prefs(context).edit().remove(key(userId)).apply()
    }
}
