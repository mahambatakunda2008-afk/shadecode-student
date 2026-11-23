package com.shadecode.student

import android.content.Context
import android.net.Uri
import android.webkit.MimeTypeMap
import androidx.room.withTransaction
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.UUID

/**
 * Durable, account-scoped resource payload storage for the native Student client.
 *
 * Payload bytes live in app-private files; Room stores searchable metadata and
 * provenance. A row is committed only after the complete payload is copied,
 * synced, validated and atomically moved into its final location.
 */
object NativeOfflineResourceStore {
    data class ImportMetadata(
        val title: String,
        val subject: String,
        val qualification: String = "",
        val syllabus: String = "",
        val topic: String = "",
        val sourceUrl: String = "",
        val publisher: String = "",
        val reviewStatus: String = "unverified",
    )

    data class StoredResource(
        val metadata: NativeOfflineResourceEntity,
        val file: File,
    )

    private const val MAX_PDF_BYTES = 100L * 1024L * 1024L
    private const val MAX_TEXT_BYTES = 5L * 1024L * 1024L
    private const val MAX_SEARCH_TEXT_CHARS = 250_000
    private val allowedReviewStates = setOf("official", "teacher-verified", "community", "ai-generated", "unverified")

    private fun accountDirectory(context: Context, accountId: String): File {
        require(accountId.isNotBlank()) { "Sign in before saving a private resource." }
        val accountKey = sha256(accountId.toByteArray(Charsets.UTF_8))
        return File(context.applicationContext.filesDir, "offline-resources/$accountKey").apply {
            if (!exists() && !mkdirs()) error("Could not create private resource storage.")
        }
    }

    private fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256")
        .digest(bytes).joinToString("") { "%02x".format(it) }

    private fun hashFile(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(32 * 1024)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                digest.update(buffer, 0, count)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun extensionFor(mimeType: String): String = when (mimeType.lowercase()) {
        "application/pdf" -> "pdf"
        "text/plain" -> "txt"
        "text/markdown", "text/x-markdown" -> "md"
        else -> throw IllegalArgumentException("This file type is not supported for offline resources yet.")
    }

    private fun detectMime(context: Context, uri: Uri): String {
        val declared = context.contentResolver.getType(uri)?.substringBefore(';')?.lowercase()
        if (declared in setOf("application/pdf", "text/plain", "text/markdown", "text/x-markdown")) return declared!!
        val extension = MimeTypeMap.getFileExtensionFromUrl(uri.lastPathSegment.orEmpty()).lowercase()
        return when (extension) {
            "pdf" -> "application/pdf"
            "txt" -> "text/plain"
            "md", "markdown" -> "text/markdown"
            else -> throw IllegalArgumentException("Choose a PDF, plain-text or Markdown file.")
        }
    }

    /**
     * Imports a user-selected local file. The caller should use Android's
     * ACTION_OPEN_DOCUMENT picker and pass the returned content URI.
     */
    suspend fun importFile(
        context: Context,
        database: NativeDatabase,
        accountId: String,
        uri: Uri,
        metadata: ImportMetadata,
    ): NativeOfflineResourceEntity {
        require(metadata.title.isNotBlank()) { "Give this resource a title." }
        require(metadata.subject.isNotBlank()) { "Choose the subject for this resource." }
        val appContext = context.applicationContext
        val mimeType = detectMime(appContext, uri)
        val extension = extensionFor(mimeType)
        val maxBytes = if (mimeType == "application/pdf") MAX_PDF_BYTES else MAX_TEXT_BYTES
        val directory = accountDirectory(appContext, accountId)
        val temporary = File(directory, ".${UUID.randomUUID()}.part")
        var finalFile: File? = null
        var committed = false

        try {
            val digest = MessageDigest.getInstance("SHA-256")
            var total = 0L
            val header = ByteArray(5)
            var headerSize = 0
            val searchText = StringBuilder()

            val input = appContext.contentResolver.openInputStream(uri)
                ?: throw IllegalStateException("Android could not open the selected file. Choose it again.")
            input.use { source ->
                FileOutputStream(temporary).use { output ->
                    val buffer = ByteArray(32 * 1024)
                    while (true) {
                        val count = source.read(buffer)
                        if (count < 0) break
                        total += count
                        require(total <= maxBytes) {
                            if (mimeType == "application/pdf") "This PDF exceeds the 100 MB offline limit."
                            else "This text resource exceeds the 5 MB offline limit."
                        }
                        if (headerSize < header.size) {
                            val copy = minOf(count, header.size - headerSize)
                            buffer.copyInto(header, headerSize, 0, copy)
                            headerSize += copy
                        }
                        digest.update(buffer, 0, count)
                        output.write(buffer, 0, count)
                    }
                    output.fd.sync()
                }
            }
            require(total > 0L) { "The selected file is empty." }
            if (mimeType == "application/pdf") {
                require(headerSize == 5 && String(header, Charsets.US_ASCII) == "%PDF-") {
                    "The selected file is not a valid PDF."
                }
            }

            if (mimeType != "application/pdf") {
                searchText.append(temporary.readText(Charsets.UTF_8).take(MAX_SEARCH_TEXT_CHARS))
            }
            val hash = digest.digest().joinToString("") { "%02x".format(it) }
            val resourceId = hash
            val fileName = "$hash.$extension"
            finalFile = File(directory, fileName)

            val existing = database.offlineResources().get(accountId, resourceId)
            if (existing != null && finalFile.isFile && finalFile.length() == existing.byteCount &&
                hashFile(finalFile) == existing.sha256 && existing.sha256 == hash
            ) {
                temporary.delete()
                return existing
            }

            if (finalFile.exists() && finalFile.length() != total) finalFile.delete()
            if (!temporary.renameTo(finalFile)) {
                temporary.copyTo(finalFile, overwrite = true)
                temporary.delete()
                // A copied fallback is accepted only after verifying the complete bytes.
                val copiedHash = finalFile.inputStream().use { stream ->
                    val md = MessageDigest.getInstance("SHA-256")
                    val bytes = ByteArray(32 * 1024)
                    while (true) {
                        val count = stream.read(bytes)
                        if (count < 0) break
                        md.update(bytes, 0, count)
                    }
                    md.digest().joinToString("") { "%02x".format(it) }
                }
                check(copiedHash == hash) { "The saved resource failed its integrity check. Please import it again." }
            }

            val row = NativeOfflineResourceEntity(
                accountId = accountId,
                resourceId = resourceId,
                title = metadata.title.trim().take(240),
                subject = metadata.subject.trim().take(120),
                qualification = metadata.qualification.trim().take(120),
                syllabus = metadata.syllabus.trim().take(120),
                topic = metadata.topic.trim().take(180),
                sourceUrl = metadata.sourceUrl.trim().take(2048),
                publisher = metadata.publisher.trim().take(240),
                reviewStatus = metadata.reviewStatus.takeIf { it in allowedReviewStates } ?: "unverified",
                mimeType = mimeType,
                fileName = fileName,
                sha256 = hash,
                byteCount = total,
                searchText = searchText.toString(),
                importedAt = System.currentTimeMillis(),
            )

            database.withTransaction {
                database.offlineResources().save(row)
            }
            committed = true
            return row
        } finally {
            temporary.delete()
            if (!committed && finalFile != null) {
                val existing = database.offlineResources().get(accountId, finalFile.name.substringBeforeLast('.'))
                if (existing == null) finalFile.delete()
            }
        }
    }

    suspend fun list(database: NativeDatabase, accountId: String): List<NativeOfflineResourceEntity> {
        require(accountId.isNotBlank())
        return database.offlineResources().all(accountId)
    }

    suspend fun search(database: NativeDatabase, accountId: String, query: String, limit: Int = 50): List<NativeOfflineResourceEntity> {
        require(accountId.isNotBlank())
        val normalized = query.trim().take(120)
        if (normalized.isBlank()) return list(database, accountId).take(limit.coerceIn(1, 100))
        return database.offlineResources().search(accountId, normalized, limit.coerceIn(1, 100))
    }

    fun file(context: Context, accountId: String, resource: NativeOfflineResourceEntity): File? {
        if (accountId.isBlank() || resource.accountId != accountId) return null
        if (!resource.fileName.matches(Regex("[a-f0-9]{64}\\.(pdf|txt|md)"))) return null
        val candidate = File(accountDirectory(context, accountId), resource.fileName)
        if (!candidate.isFile || candidate.length() != resource.byteCount || candidate.length() <= 0L) return null
        // Length alone cannot detect same-size corruption. Verify the content
        // address every time a resource is opened before exposing it to a reader.
        if (runCatching { hashFile(candidate) }.getOrNull() != resource.sha256) return null
        return candidate
    }

    suspend fun markOpened(
        database: NativeDatabase,
        accountId: String,
        resourceId: String,
        page: Int = 1,
    ) {
        require(accountId.isNotBlank())
        database.offlineResources().markOpened(accountId, resourceId, page.coerceAtLeast(1), System.currentTimeMillis())
    }

    suspend fun saveAnnotation(
        database: NativeDatabase,
        accountId: String,
        resourceId: String,
        kind: String,
        content: String,
        pageNumber: Int? = null,
        anchor: String = "",
        annotationId: String = UUID.randomUUID().toString(),
    ): NativeResourceAnnotationEntity {
        require(accountId.isNotBlank())
        require(kind in setOf("bookmark", "note", "highlight"))
        require(content.length <= 20_000 && anchor.length <= 2_000)
        require(database.offlineResources().get(accountId, resourceId) != null) { "This resource is not in this learner's library." }
        val now = System.currentTimeMillis()
        return NativeResourceAnnotationEntity(
            accountId = accountId,
            id = annotationId,
            resourceId = resourceId,
            kind = kind,
            pageNumber = pageNumber?.coerceAtLeast(1),
            anchor = anchor,
            content = content,
            createdAt = now,
            updatedAt = now,
        ).also { database.resourceAnnotations().save(it) }
    }

    suspend fun annotations(database: NativeDatabase, accountId: String, resourceId: String): List<NativeResourceAnnotationEntity> {
        require(accountId.isNotBlank())
        require(database.offlineResources().get(accountId, resourceId) != null) { "This resource is not in this learner's library." }
        return database.resourceAnnotations().forResource(accountId, resourceId)
    }

    suspend fun delete(database: NativeDatabase, context: Context, accountId: String, resourceId: String): Boolean {
        require(accountId.isNotBlank())
        val row = database.offlineResources().get(accountId, resourceId) ?: return false
        database.withTransaction {
            database.resourceAnnotations().deleteForResource(accountId, resourceId)
            database.offlineResources().delete(accountId, resourceId)
        }
        val directory = accountDirectory(context, accountId)
        val candidate = File(directory, row.fileName)
        if (!row.fileName.matches(Regex("[a-f0-9]{64}\\.(pdf|txt|md)"))) return true
        return !candidate.exists() || candidate.delete()
    }
}
