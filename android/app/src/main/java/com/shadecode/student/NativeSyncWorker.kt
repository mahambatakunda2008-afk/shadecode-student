package com.shadecode.student

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class NativeSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val store = NativeStore(applicationContext)
        val database = NativeDatabase.get(applicationContext)
        var session = store.readSession() ?: return@withContext Result.success()
        val api = NativeApi()

        // Task creation is queued before completion of that task; keep this order intact.
        for (item in store.pendingOperations(session.userId)) {
            try {
                executePendingOperation(item, session, api, store)
                store.removePendingOperation(session.userId, item.id)
            } catch (error: Exception) {
                if (isAuthenticationFailure(error)) {
                    try {
                        session = api.refreshSession(session)
                        store.saveSession(session)
                        executePendingOperation(item, session, api, store)
                        store.removePendingOperation(session.userId, item.id)
                        continue
                    } catch (_: Exception) {
                        return@withContext Result.retry()
                    }
                }
                return@withContext Result.retry()
            }
        }

        // Keep the existing Room-backed lesson-progress queue working.
        for (item in database.sync().pending()) {
            try {
                if (item.operation != "lesson_progress") {
                    database.sync().delete(item)
                    continue
                }
                val payload = JSONObject(item.payload)
                val lessonId = payload.getString("lessonId")
                val progress = payload.getDouble("progress").toFloat().coerceIn(0f, 1f)
                try {
                    api.updateLessonProgress(session, lessonId, progress)
                } catch (error: Exception) {
                    if (!isAuthenticationFailure(error)) throw error
                    session = api.refreshSession(session)
                    store.saveSession(session)
                    api.updateLessonProgress(session, lessonId, progress)
                }
                database.sync().delete(item)
            } catch (_: Exception) {
                return@withContext Result.retry()
            }
        }
        Result.success()
    }

    private suspend fun executePendingOperation(
        item: NativePendingOperation,
        session: NativeSession,
        api: NativeApi,
        store: NativeStore,
    ) {
        val payload = JSONObject(item.payload)
        when (item.operation) {
            "task_create" -> {
                val localId = payload.getString("localId")
                val remote = api.createTask(
                    session,
                    payload.getString("title"),
                    payload.optString("description"),
                    payload.optString("subjectId"),
                )
                store.reconcileCachedTask(session.userId, localId, remote)
            }
            "task_complete" -> api.completeTask(session, payload.getString("taskId"))
            "timetable_replace" -> {
                val rows = payload.optJSONArray("slots") ?: JSONArray()
                val slots = buildList {
                    for (index in 0 until rows.length()) {
                        val row = rows.getJSONObject(index)
                        add(
                            NativeTimetableSlot(
                                id = row.optString("id", "$index"),
                                subject = row.optString("subject"),
                                startTime = row.optString("startTime"),
                                endTime = row.optString("endTime"),
                                isBreak = row.optBoolean("isBreak", false),
                            ),
                        )
                    }
                }
                api.saveTimetable(session, slots)
            }
            else -> throw IllegalArgumentException("Unsupported queued operation: ${item.operation}")
        }
    }

    private fun isAuthenticationFailure(error: Throwable): Boolean {
        val message = error.message.orEmpty()
        return message.contains("401") || message.contains("JWT", ignoreCase = true) ||
            message.contains("token expired", ignoreCase = true)
    }

    companion object {
        private const val UNIQUE_WORK = "shadecode-native-sync"

        fun schedule(context: Context) {
            val request = OneTimeWorkRequestBuilder<NativeSyncWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                .setInitialDelay(5, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                UNIQUE_WORK,
                ExistingWorkPolicy.REPLACE,
                request,
            )
        }
    }
}
