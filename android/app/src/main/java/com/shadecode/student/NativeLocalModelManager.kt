package com.shadecode.student

import android.app.ActivityManager
import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/** Optional GGUF asset acquisition. Inference remains behind NativeLocalModelRuntime. */
class NativeLocalModelManager(private val context: Context) {
    data class DownloadResult(val model: NativeLocalModelSpec, val file: File, val bytes: Long)

    data class DeviceReadiness(
        val supported: Boolean,
        val totalRamMb: Long,
        val availableRamMb: Long,
        val reason: String? = null,
    )

    suspend fun gemmaDeviceReadiness(): DeviceReadiness = withContext(Dispatchers.IO) {
        val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memory = ActivityManager.MemoryInfo()
        manager.getMemoryInfo(memory)
        val totalMb = memory.totalMem / (1024L * 1024L)
        val availableMb = memory.availMem / (1024L * 1024L)
        when {
            totalMb < GEMMA_MIN_RAM_MB -> DeviceReadiness(
                false, totalMb, availableMb,
                "This device has ${totalMb} MB RAM. Offline Help needs a device with at least ${GEMMA_MIN_RAM_MB} MB RAM."
            )
            availableMb < GEMMA_MIN_AVAILABLE_RAM_MB -> DeviceReadiness(
                false, totalMb, availableMb,
                "Only ${availableMb} MB RAM is currently available. Close other apps and try again."
            )
            else -> DeviceReadiness(true, totalMb, availableMb)
        }
    }

    suspend fun isInstalled(model: NativeLocalModelSpec): Boolean = withContext(Dispatchers.IO) {
        // Only Gemma currently has a wired downloader, checksum, and runtime path.
        if (model.id != GEMMA_ID) return@withContext false
        val file = modelFile(model)
        if (!file.isFile) return@withContext false
        val bytes = file.length()
        if (bytes !in GEMMA_MIN_BYTES..GEMMA_MAX_BYTES) {
            file.delete()
            return@withContext false
        }
        try {
            verifySha256(file, GEMMA_SHA256)
            true
        } catch (_: IllegalStateException) {
            file.delete()
            false
        }
    }

    suspend fun downloadGemma270m(
        onProgress: (downloaded: Long, total: Long) -> Unit = { _, _ -> },
    ): DownloadResult = withContext(Dispatchers.IO) {
        val model = NativeLocalModelCatalog.models.first { it.id == GEMMA_ID }
        val directory = File(context.filesDir, MODELS_DIRECTORY).apply { mkdirs() }
        val destination = File(directory, GEMMA_FILE)
        val partial = File(directory, "$GEMMA_FILE.part")

        if (destination.isFile) {
            val existingBytes = destination.length()
            if (existingBytes in GEMMA_MIN_BYTES..GEMMA_MAX_BYTES) {
                try {
                    verifySha256(destination, GEMMA_SHA256)
                    return@withContext DownloadResult(model, destination, existingBytes)
                } catch (_: IllegalStateException) {
                    // A corrupt model must not block every future retry.
                    destination.delete()
                }
            } else {
                destination.delete()
            }
        }

        var offset = if (partial.isFile) partial.length() else 0L
        if (offset !in 1 until GEMMA_MAX_BYTES) {
            if (partial.exists()) partial.delete()
            offset = 0L
        }

        val connection = (URL(GEMMA_URL).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 60_000
            instanceFollowRedirects = true
            requestMethod = "GET"
            setRequestProperty("Accept", "application/octet-stream")
            setRequestProperty("User-Agent", "Shadecode-Student/${BuildConfig.VERSION_NAME}")
            if (offset > 0L) setRequestProperty("Range", "bytes=$offset-")
        }

        try {
            val response = connection.responseCode
            val append = offset > 0L && response == HttpURLConnection.HTTP_PARTIAL
            if (append) {
                val contentRange = connection.getHeaderField("Content-Range").orEmpty()
                check(contentRange.startsWith("bytes $offset-")) {
                    "Model server returned an invalid resume range."
                }
            } else {
                check(response == HttpURLConnection.HTTP_OK) {
                    "GGUF download failed: HTTP $response"
                }
                // Some mirrors ignore Range. Restart cleanly rather than corrupting the file.
                offset = 0L
            }

            val remaining = connection.contentLengthLong
            val total = if (remaining >= 0L) offset + remaining else -1L
            check(total <= GEMMA_MAX_BYTES) { "GGUF asset exceeds the safe download limit" }
            var downloaded = offset
            connection.inputStream.use { input ->
                FileOutputStream(partial, append).use { output ->
                    val buffer = ByteArray(BUFFER_SIZE)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        check(downloaded + count <= GEMMA_MAX_BYTES) {
                            "GGUF asset exceeded the safe download limit"
                        }
                        output.write(buffer, 0, count)
                        downloaded += count
                        onProgress(downloaded, total)
                    }
                    output.fd.sync()
                }
            }
            check(partial.length() in GEMMA_MIN_BYTES..GEMMA_MAX_BYTES) {
                "GGUF asset is incomplete or exceeds the safe download limit. Retry to resume."
            }
            try {
                verifySha256(partial, GEMMA_SHA256)
            } catch (error: IllegalStateException) {
                partial.delete()
                throw error
            }
            if (destination.exists()) destination.delete()
            check(partial.renameTo(destination)) { "Could not finalize GGUF asset" }
            DownloadResult(model, destination, destination.length())
        } finally {
            connection.disconnect()
        }
    }

    fun modelFile(model: NativeLocalModelSpec): File {
        require(model.id == GEMMA_ID) { "This model does not have a supported downloader yet" }
        return File(File(context.filesDir, MODELS_DIRECTORY), GEMMA_FILE)
    }

    suspend fun deleteGemma270m(): Boolean = withContext(Dispatchers.IO) {
        modelFile(NativeLocalModelCatalog.models.first { it.id == GEMMA_ID }).delete()
    }

    private fun verifySha256(file: File, expected: String) {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(BUFFER_SIZE)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                digest.update(buffer, 0, count)
            }
        }
        val actual = digest.digest().joinToString("") { "%02x".format(it) }
        check(actual == expected) { "GGUF SHA-256 verification failed" }
    }

    companion object {
        private const val MODELS_DIRECTORY = "cortex-models"
        private const val GEMMA_ID = "gemma-3-270m-it-q4"
        private const val GEMMA_FILE = "gemma-3-270m-it-q4_k_m.gguf"
        private const val GEMMA_URL = "https://huggingface.co/gguf-org/gemma-3-270m-it-gguf/resolve/main/gemma-3-270m-it-q4_k_m.gguf?download=true"
        private const val GEMMA_SHA256 = "55aed1673d2f3014a739732c659c4995fc57abf6e4e9c68462fb2ceee820ea2f"
        private const val GEMMA_MIN_RAM_MB = 2048L
        private const val GEMMA_MIN_AVAILABLE_RAM_MB = 450L
        private const val GEMMA_MIN_BYTES = 240L * 1024L * 1024L
        // The catalog's 250 MB estimate leaves room for metadata while preventing runaway downloads.
        private const val GEMMA_MAX_BYTES = 400L * 1024L * 1024L
        private const val BUFFER_SIZE = 64 * 1024
    }
}
