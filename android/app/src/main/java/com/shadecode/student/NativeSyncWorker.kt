package com.shadecode.student

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

class NativeSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result {
        val database = NativeDatabase.get(applicationContext)
        val pending = database.sync().pending()

        // Queue processing is deliberately conservative until each operation has
        // a corresponding authenticated API contract. Never discard user work.
        if (pending.isNotEmpty()) return Result.success()
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
