package com.shadecode.student

import android.content.Context
import org.json.JSONObject
import java.util.UUID

/** Durable, account-isolated device-local recovery for unfinished exam attempts. */
object NativeExamAttemptStore {
    data class SavedAttempt(
        val attemptId: String, val subject: String, val paperJson: String, val questionsJson: String,
        val answersJson: String, val secondsLeft: Int, val taking: Boolean,
        val savedAt: Long, val deadlineMillis: Long,
    )

    private fun legacyPrefs(context: Context) =
        context.getSharedPreferences("native_exam_attempts_v1", Context.MODE_PRIVATE)
    private fun legacyKey(userId: String) = "attempt_" + userId

    private fun NativeExamAttemptEntity.toSavedAttempt() = SavedAttempt(
        attemptId, subject, paperJson, questionsJson, answersJson, secondsLeft, taking, savedAt, deadlineMillis,
    )

    /** Imports the matching account's old snapshot, deleting it only after Room commits it. */
    suspend fun read(context: Context, userId: String): SavedAttempt? {
        if (userId.isBlank()) return null
        val dao = NativeDatabase.get(context).examAttempts()
        dao.get(userId)?.let { return it.toSavedAttempt() }
        val prefs = legacyPrefs(context)
        val raw = prefs.getString(legacyKey(userId), null) ?: return null
        val imported = runCatching {
            val json = JSONObject(raw)
            NativeExamAttemptEntity(
                accountId = userId,
                attemptId = UUID.randomUUID().toString(),
                subject = json.optString("subject"),
                paperJson = json.getString("paperJson"),
                questionsJson = json.getString("questionsJson"),
                answersJson = json.optString("answersJson", "{}"),
                secondsLeft = json.optInt("secondsLeft", 0).coerceAtLeast(0),
                taking = json.optBoolean("taking", false),
                savedAt = json.optLong("savedAt", System.currentTimeMillis()),
                deadlineMillis = json.optLong("deadlineMillis", 0L),
            )
        }.getOrNull() ?: return null
        dao.save(imported)
        prefs.edit().remove(legacyKey(userId)).commit()
        return imported.toSavedAttempt()
    }

    suspend fun write(
        context: Context, userId: String, attemptId: String, subject: String, paperJson: String,
        questionsJson: String, answersJson: String, secondsLeft: Int,
        taking: Boolean, deadlineMillis: Long,
    ) {
        if (userId.isBlank()) return
        val dao = NativeDatabase.get(context).examAttempts()
        val previous = dao.get(userId)
        dao.save(
            NativeExamAttemptEntity(
                accountId = userId,
                attemptId = attemptId.ifBlank { previous?.attemptId ?: UUID.randomUUID().toString() },
                subject = subject, paperJson = paperJson, questionsJson = questionsJson,
                answersJson = answersJson, secondsLeft = secondsLeft.coerceAtLeast(0),
                taking = taking, savedAt = System.currentTimeMillis(),
                deadlineMillis = if (taking) deadlineMillis.coerceAtLeast(0L) else 0L,
            ),
        )
    }

    suspend fun clear(context: Context, userId: String) {
        if (userId.isBlank()) return
        NativeDatabase.get(context).examAttempts().clear(userId)
        legacyPrefs(context).edit().remove(legacyKey(userId)).commit()
    }
}
