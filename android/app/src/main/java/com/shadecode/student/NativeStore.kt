package com.shadecode.student

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import org.json.JSONArray
import org.json.JSONObject
import kotlinx.coroutines.flow.first

private val Context.nativeStore by preferencesDataStore(name = "shadecode_native")

class NativeStore(private val context: Context) {
    private val accessToken = stringPreferencesKey("access_token")
    private val refreshToken = stringPreferencesKey("refresh_token")
    private val userId = stringPreferencesKey("user_id")
    private val email = stringPreferencesKey("email")
    private val cachedProfile = stringPreferencesKey("cached_profile")

    fun context(): Context = context

    suspend fun saveSession(session: NativeSession) {
        context.nativeStore.edit { prefs ->
            prefs[accessToken] = session.accessToken
            prefs[refreshToken] = session.refreshToken
            prefs[userId] = session.userId
            prefs[email] = session.email
        }
    }

    suspend fun readSession(): NativeSession? {
        val prefs = context.nativeStore.data.first()
        val access = prefs[accessToken] ?: return null
        val user = prefs[userId] ?: return null
        return NativeSession(
            accessToken = access,
            refreshToken = prefs[refreshToken].orEmpty(),
            userId = user,
            email = prefs[email].orEmpty(),
        )
    }

    suspend fun saveProfile(profile: NativeProfile) {
        val encoded = JSONObject()
            .put("id", profile.id)
            .put("email", profile.email)
            .put("displayName", profile.displayName)
            .put("studyLevel", profile.studyLevel)
            .put("subjects", JSONArray(profile.subjects))
            .put("onboardingCompleted", profile.onboardingCompleted)
            .toString()
        context.nativeStore.edit { it[cachedProfile] = encoded }
    }

    suspend fun readProfile(): NativeProfile? {
        val encoded = context.nativeStore.data.first()[cachedProfile] ?: return null
        return runCatching {
            val json = JSONObject(encoded)
            val subjectsJson = json.optJSONArray("subjects") ?: JSONArray()
            val subjects = buildList {
                for (index in 0 until subjectsJson.length()) {
                    subjectsJson.optString(index).takeIf { it.isNotBlank() }?.let(::add)
                }
            }
            NativeProfile(
                id = json.getString("id"),
                email = json.optString("email"),
                displayName = json.optString("displayName").ifBlank { "Student" },
                studyLevel = json.optString("studyLevel").ifBlank { "upper-secondary" },
                subjects = subjects,
                onboardingCompleted = json.optBoolean("onboardingCompleted", false),
            )
        }.getOrNull()
    }

    /** Cache task snapshots per account so offline reads never cross learner boundaries. */
    suspend fun saveTasks(accountId: String, tasks: List<NativeTask>) {
        val encoded = JSONArray()
        tasks.forEach { task ->
            encoded.put(
                JSONObject()
                    .put("id", task.id)
                    .put("subjectId", task.subjectId)
                    .put("title", task.title)
                    .put("description", task.description)
                    .put("dueDate", task.dueDate ?: JSONObject.NULL)
                    .put("completed", task.completed),
            )
        }
        context.nativeStore.edit { it[stringPreferencesKey("cached_tasks_$accountId")] = encoded.toString() }
    }

    suspend fun readTasks(accountId: String): List<NativeTask> {
        val encoded = context.nativeStore.data.first()[stringPreferencesKey("cached_tasks_$accountId")] ?: return emptyList()
        return runCatching {
            val rows = JSONArray(encoded)
            buildList {
                for (index in 0 until rows.length()) {
                    val row = rows.getJSONObject(index)
                    val due = row.optString("dueDate").takeIf { it.isNotBlank() && it != "null" }
                    add(
                        NativeTask(
                            id = row.getString("id"),
                            subjectId = row.optString("subjectId"),
                            title = row.optString("title"),
                            description = row.optString("description"),
                            dueDate = due,
                            completed = row.optBoolean("completed", false),
                        ),
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    /** Cache timetable snapshots separately for each signed-in learner. */
    suspend fun saveTimetable(accountId: String, slots: List<NativeTimetableSlot>) {
        val encoded = JSONArray()
        slots.forEach { slot ->
            encoded.put(
                JSONObject()
                    .put("id", slot.id)
                    .put("subject", slot.subject)
                    .put("startTime", slot.startTime)
                    .put("endTime", slot.endTime)
                    .put("isBreak", slot.isBreak),
            )
        }
        context.nativeStore.edit { it[stringPreferencesKey("cached_timetable_$accountId")] = encoded.toString() }
    }

    suspend fun readTimetable(accountId: String): List<NativeTimetableSlot> {
        val encoded = context.nativeStore.data.first()[stringPreferencesKey("cached_timetable_$accountId")] ?: return emptyList()
        return runCatching {
            val rows = JSONArray(encoded)
            buildList {
                for (index in 0 until rows.length()) {
                    val row = rows.getJSONObject(index)
                    add(
                        NativeTimetableSlot(
                            id = row.optString("id", "$index"),
                            subject = row.optString("subject", "Study session"),
                            startTime = row.optString("startTime"),
                            endTime = row.optString("endTime"),
                            isBreak = row.optBoolean("isBreak", false),
                        ),
                    )
                }
            }
        }.getOrDefault(emptyList())
    }


    /** Durable, account-scoped queue for changes created while the network is unavailable. */
    suspend fun enqueuePendingOperation(accountId: String, operation: String, payload: JSONObject): NativePendingOperation {
        val item = NativePendingOperation(
            id = java.util.UUID.randomUUID().toString(),
            accountId = accountId,
            operation = operation,
            payload = payload.toString(),
            createdAt = System.currentTimeMillis(),
        )
        val key = stringPreferencesKey("pending_native_sync_$accountId")
        context.nativeStore.edit { prefs ->
            val rows = runCatching { JSONArray(prefs[key].orEmpty()) }.getOrDefault(JSONArray())
            rows.put(
                JSONObject()
                    .put("id", item.id)
                    .put("accountId", item.accountId)
                    .put("operation", item.operation)
                    .put("payload", item.payload)
                    .put("createdAt", item.createdAt),
            )
            prefs[key] = rows.toString()
        }
        return item
    }

    suspend fun pendingOperations(accountId: String): List<NativePendingOperation> {
        val key = stringPreferencesKey("pending_native_sync_$accountId")
        val encoded = context.nativeStore.data.first()[key] ?: return emptyList()
        return runCatching {
            val rows = JSONArray(encoded)
            buildList {
                for (index in 0 until rows.length()) {
                    val row = rows.getJSONObject(index)
                    add(
                        NativePendingOperation(
                            id = row.getString("id"),
                            accountId = row.optString("accountId", accountId),
                            operation = row.getString("operation"),
                            payload = row.optString("payload", "{}"),
                            createdAt = row.optLong("createdAt"),
                        ),
                    )
                }
            }.sortedBy { it.createdAt }
        }.getOrDefault(emptyList())
    }

    suspend fun removePendingOperation(accountId: String, operationId: String) {
        val key = stringPreferencesKey("pending_native_sync_$accountId")
        context.nativeStore.edit { prefs ->
            val rows = runCatching { JSONArray(prefs[key].orEmpty()) }.getOrDefault(JSONArray())
            val kept = JSONArray()
            for (index in 0 until rows.length()) {
                val row = rows.optJSONObject(index) ?: continue
                if (row.optString("id") != operationId) kept.put(row)
            }
            prefs[key] = kept.toString()
        }
    }

    /** Replace an optimistic local task ID after the server accepts an offline-created task. */
    suspend fun reconcileCachedTask(accountId: String, localId: String, remoteTask: NativeTask) {
        val tasks = readTasks(accountId)
        saveTasks(accountId, tasks.map { if (it.id == localId) remoteTask.copy(completed = it.completed) else it })
        val key = stringPreferencesKey("pending_native_sync_$accountId")
        context.nativeStore.edit { prefs ->
            val rows = runCatching { JSONArray(prefs[key].orEmpty()) }.getOrDefault(JSONArray())
            val updated = JSONArray()
            for (index in 0 until rows.length()) {
                val row = rows.optJSONObject(index) ?: continue
                if (row.optString("operation") == "task_complete") {
                    val payload = runCatching { JSONObject(row.optString("payload", "{}")) }.getOrDefault(JSONObject())
                    if (payload.optString("taskId") == localId) {
                        payload.put("taskId", remoteTask.id)
                        row.put("payload", payload.toString())
                    }
                }
                updated.put(row)
            }
            prefs[key] = updated.toString()
        }
    }

    suspend fun clearSession() {
        context.nativeStore.edit { it.clear() }
    }
}


data class NativePendingOperation(
    val id: String,
    val accountId: String,
    val operation: String,
    val payload: String,
    val createdAt: Long,
)
