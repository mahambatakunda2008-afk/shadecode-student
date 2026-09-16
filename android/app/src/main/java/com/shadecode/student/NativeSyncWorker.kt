package com.shadecode.student

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class NativeSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result {
        val store = NativeStore(applicationContext)
        val database = NativeDatabase.get(applicationContext)
        val pending = database.sync().pending()
        if (pending.isEmpty()) return Result.success()

        var session = store.readSession() ?: return Result.success()
        val api = NativeApi()

        for (item in pending) {
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
                    if (!error.message.orEmpty().contains("401") && !error.message.orEmpty().contains("JWT", ignoreCase = true)) throw error
                    session = api.refreshSession(session)
                    store.saveSession(session)
                    api.updateLessonProgress(session, lessonId, progress)
                }

                database.sync().delete(item)
            } catch (error: Exception) {
                return Result.retry()
            }
        }

        return Result.success()
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
                ExistingWorkPolicy.KEEP,
                request,
            )
        }
    }
}
