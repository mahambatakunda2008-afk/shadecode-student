package com.shadecode.student

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

    suspend fun isInstalled(model: NativeLocalModelSpec): Boolean = withContext(Dispatchers.IO) {
        val file = modelFile(model)
        file.isFile && file.length() >= model.approximateSizeMb * 1024L * 1024L / 2L
    }

    suspend fun downloadGemma270m(
        onProgress: (downloaded: Long, total: Long) -> Unit = { _, _ -> },
    ): DownloadResult = withContext(Dispatchers.IO) {
        val model = NativeLocalModelCatalog.models.first { it.id == GEMMA_ID }
        val directory = File(context.filesDir, MODELS_DIRECTORY).apply { mkdirs() }
        val destination = File(directory, GEMMA_FILE)
        val partial = File(directory, "$GEMMA_FILE.part")

        if (destination.isFile && destination.length() >= GEMMA_MIN_BYTES) {
            verifySha256(destination, GEMMA_SHA256)
            return@withContext DownloadResult(model, destination, destination.length())
        }

        val connection = (URL(GEMMA_URL).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 60_000
            instanceFollowRedirects = true
            requestMethod = "GET"
            setRequestProperty("Accept", "application/octet-stream")
            setRequestProperty("User-Agent", "Shadecode-Student/${BuildConfig.VERSION_NAME}")
        }

        try {
            check(connection.responseCode in 200..299) { "GGUF download failed: HTTP ${connection.responseCode}" }
            val total = connection.contentLengthLong
            var downloaded = 0L
            connection.inputStream.use { input ->
                FileOutputStream(partial).use { output ->
                    val buffer = ByteArray(BUFFER_SIZE)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        output.write(buffer, 0, count)
                        downloaded += count
                        onProgress(downloaded, total)
                    }
                    output.fd.sync()
                }
            }
            check(partial.length() >= GEMMA_MIN_BYTES) { "GGUF asset is unexpectedly small" }
            verifySha256(partial, GEMMA_SHA256)
            if (destination.exists()) destination.delete()
            check(partial.renameTo(destination)) { "Could not finalize GGUF asset" }
            DownloadResult(model, destination, destination.length())
        } finally {
            connection.disconnect()
            if (partial.exists()) partial.delete()
        }
    }

    fun modelFile(model: NativeLocalModelSpec): File =
        File(File(context.filesDir, MODELS_DIRECTORY), "$GEMMA_FILE")

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
        private const val GEMMA_MIN_BYTES = 240L * 1024L * 1024L
        private const val BUFFER_SIZE = 64 * 1024
    }
}
