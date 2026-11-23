package com.shadecode.student

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.RandomAccessFile
import java.security.MessageDigest
import java.util.UUID

/**
 * Reader/writer for the browser-compatible SCRES01 .scpack container.
 * Imports validate the complete manifest and every payload before adding any
 * resource rows. Imported provenance is deliberately reset to unverified.
 */
object NativeResourcePack {
    private const val MAGIC = "SCRES01\n"
    private const val MAX_PACK_BYTES = 512L * 1024L * 1024L
    private const val MAX_MANIFEST_BYTES = 8 * 1024 * 1024
    private const val MAX_ENTRIES = 1000
    private const val MAX_RESOURCE_BYTES = 150L * 1024L * 1024L
    private val allowedMime = setOf("application/pdf", "text/plain", "text/markdown")

    private fun accountDirectory(context: Context, accountId: String): File {
        val key = MessageDigest.getInstance("SHA-256")
            .digest(accountId.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
        return File(context.filesDir, "offline-resources/$key").apply {
            if (!exists() && !mkdirs()) error("Could not create private resource storage.")
        }
    }

    private fun digest(file: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(32 * 1024)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                md.update(buffer, 0, count)
            }
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }

    private fun mimeFor(fileName: String): String = when (fileName.substringAfterLast('.', "").lowercase()) {
        "pdf" -> "application/pdf"
        "txt" -> "text/plain"
        "md", "markdown" -> "text/markdown"
        else -> error("Unsupported saved resource format.")
    }

    suspend fun export(
        context: Context,
        database: NativeDatabase,
        accountId: String,
        destination: Uri,
    ): Int {
        require(accountId.isNotBlank()) { "Sign in before exporting private resources." }
        val rows = NativeOfflineResourceStore.list(database, accountId)
        require(rows.isNotEmpty()) { "There are no resources to export." }
        require(rows.size <= MAX_ENTRIES) { "This library has too many resources for one pack." }

        val root = accountDirectory(context, accountId)
        val entries = JSONArray()
        val files = mutableListOf<File>()
        var offset = 0L
        rows.forEach { row ->
            val file = File(root, row.fileName)
            require(file.isFile && file.length() == row.byteCount && digest(file) == row.sha256) {
                "Integrity check failed for ${row.title}. Export stopped."
            }
            require(file.length() in 1..MAX_RESOURCE_BYTES && offset + file.length() <= MAX_PACK_BYTES - MAX_MANIFEST_BYTES - 12) {
                "The resource collection exceeds the 512 MB pack limit."
            }
            val metadata = JSONObject()
                .put("id", row.resourceId)
                .put("title", row.title)
                .put("mimeType", mimeFor(row.fileName))
                .put("byteLength", row.byteCount)
                .put("sha256", row.sha256)
                .put("subject", row.subject)
                .put("qualification", row.qualification)
                .put("syllabus", row.syllabus)
                .put("topic", row.topic)
                .put("source", row.sourceUrl)
                .put("publisher", row.publisher)
                .put("trust", row.reviewStatus)
                .put("importedAt", java.time.Instant.ofEpochMilli(row.importedAt).toString())
            entries.put(JSONObject().put("metadata", metadata).put("offset", offset).put("length", file.length()))
            files += file
            offset += file.length()
        }
        val manifest = JSONObject()
            .put("format", "shadecode-resource-pack")
            .put("version", 1)
            .put("entries", entries)
            .toString()
            .toByteArray(Charsets.UTF_8)
        require(manifest.size <= MAX_MANIFEST_BYTES) { "The resource-pack manifest is too large." }

        val output = context.contentResolver.openOutputStream(destination, "wt")
            ?: error("Android could not create the resource pack.")
        output.use { stream ->
            stream.write(MAGIC.toByteArray(Charsets.US_ASCII))
            stream.write(byteArrayOf(
                (manifest.size and 0xff).toByte(),
                ((manifest.size ushr 8) and 0xff).toByte(),
                ((manifest.size ushr 16) and 0xff).toByte(),
                ((manifest.size ushr 24) and 0xff).toByte(),
            ))
            stream.write(manifest)
            files.forEach { file ->
                file.inputStream().use { input -> input.copyTo(stream, 64 * 1024) }
            }
            stream.flush()
        }
        return rows.size
    }

    suspend fun import(
        context: Context,
        database: NativeDatabase,
        accountId: String,
        source: Uri,
        defaultSubject: String,
    ): Int {
        require(accountId.isNotBlank()) { "Sign in before importing private resources." }
        require(defaultSubject.isNotBlank()) { "Choose a subject before importing this pack." }
        val root = accountDirectory(context, accountId)
        val stagedPack = File(root, ".pack-${UUID.randomUUID()}.part")
        // Keep the staging registry outside the parse block so malformed packs
        // cannot strand already-extracted payloads in app-private storage.
        val prepared = mutableListOf<PreparedEntry>()
        try {
            val input = context.contentResolver.openInputStream(source)
                ?: error("Android could not open this resource pack.")
            input.use { sourceStream ->
                stagedPack.outputStream().use { output ->
                    val buffer = ByteArray(64 * 1024)
                    var total = 0L
                    while (true) {
                        val count = sourceStream.read(buffer)
                        if (count < 0) break
                        total += count
                        require(total <= MAX_PACK_BYTES) { "The resource pack exceeds the 512 MB limit." }
                        output.write(buffer, 0, count)
                    }
                }
            }
            require(stagedPack.length() >= 12) { "The resource pack is incomplete." }

            RandomAccessFile(stagedPack, "r").use { pack ->
                val magic = ByteArray(8)
                pack.readFully(magic)
                require(String(magic, Charsets.US_ASCII) == MAGIC) { "This is not a Shadecode resource pack." }
                val manifestLength = Integer.reverseBytes(pack.readInt())
                val payloadStart = 12L + manifestLength
                require(manifestLength in 1..MAX_MANIFEST_BYTES && payloadStart <= pack.length()) {
                    "The resource pack manifest is damaged or too large."
                }
                val manifestBytes = ByteArray(manifestLength)
                pack.readFully(manifestBytes)
                val manifest = JSONObject(String(manifestBytes, Charsets.UTF_8))
                require(manifest.optString("format") == "shadecode-resource-pack" &&
                    manifest.optInt("version") == 1) { "This resource-pack version is not supported." }
                val entries = manifest.optJSONArray("entries")
                    ?: error("The resource pack has no resource entries.")
                require(entries.length() in 1..MAX_ENTRIES) { "The resource pack entry count is invalid." }

                var expectedOffset = 0L
                val seenHashes = mutableSetOf<String>()
                for (index in 0 until entries.length()) {
                    val entry = entries.getJSONObject(index)
                    val metadata = entry.getJSONObject("metadata")
                    val offset = entry.getLong("offset")
                    val length = entry.getLong("length")
                    val mime = metadata.optString("mimeType")
                    val title = metadata.optString("title").trim()
                    val hash = metadata.optString("sha256").lowercase()
                    require(title.isNotBlank() && title.length <= 500 && mime in allowedMime &&
                        hash.matches(Regex("[a-f0-9]{64}")) && seenHashes.add(hash) &&
                        metadata.optLong("byteLength", -1) == length &&
                        offset == expectedOffset && length in 1..(if (mime == "application/pdf") 100L * 1024L * 1024L else 5L * 1024L * 1024L) &&
                        payloadStart + offset + length <= pack.length()) {
                        "The resource pack contains an invalid entry."
                    }
                    val extension = when (mime) { "application/pdf" -> "pdf"; "text/plain" -> "txt"; else -> "md" }
                    val temp = File(root, ".resource-${UUID.randomUUID()}.$extension")
                    pack.seek(payloadStart + offset)
                    temp.outputStream().use { output ->
                        val buffer = ByteArray(64 * 1024)
                        var remaining = length
                        while (remaining > 0) {
                            val count = pack.read(buffer, 0, minOf(buffer.size.toLong(), remaining).toInt())
                            if (count < 0) error("The resource pack is truncated.")
                            output.write(buffer, 0, count)
                            remaining -= count
                        }
                    }
                    require(temp.length() == length && digest(temp) == hash) {
                        temp.delete()
                        "The resource pack contains corrupted data for $title. Nothing was imported."
                    }
                    if (mime == "application/pdf") {
                        val signature = temp.inputStream().use { stream -> ByteArray(5).also { stream.read(it) } }
                        require(String(signature, Charsets.US_ASCII) == "%PDF-") {
                            temp.delete()
                            "The resource pack contains an invalid PDF."
                        }
                    }
                    prepared += PreparedEntry(temp, title, mime, hash, metadata.optString("subject").ifBlank { defaultSubject },
                        metadata.optString("qualification"), metadata.optString("syllabus"), metadata.optString("topic"),
                        metadata.optString("source"), metadata.optString("publisher"))
                    expectedOffset += length
                }
                require(payloadStart + expectedOffset == pack.length()) {
                    "The resource pack contains trailing or unreferenced data."
                }
            }

            // All entries have been structurally and cryptographically verified before this point.
            var imported = 0
            val newlyCommittedIds = mutableListOf<String>()
            try {
                prepared.forEach { entry ->
                    val existedBefore = database.offlineResources().get(accountId, entry.sha256) != null
                    val uri = FileProvider.getUriForFile(context, context.packageName + ".files", entry.file)
                    val saved = NativeOfflineResourceStore.importFile(
                        context, database, accountId, uri,
                        NativeOfflineResourceStore.ImportMetadata(
                            title = entry.title,
                            subject = entry.subject,
                            qualification = entry.qualification,
                            syllabus = entry.syllabus,
                            topic = entry.topic,
                            sourceUrl = entry.source,
                            publisher = entry.publisher,
                            reviewStatus = "unverified",
                        ),
                    )
                    if (!existedBefore) newlyCommittedIds += saved.resourceId
                    imported += 1
                }
                return imported
            } catch (failure: Exception) {
                // Best-effort compensating rollback: do not leave earlier pack
                // entries behind if a later per-file Room/file commit fails.
                newlyCommittedIds.asReversed().forEach { resourceId ->
                    runCatching { NativeOfflineResourceStore.delete(database, context, accountId, resourceId) }
                }
                throw failure
            } finally {
                prepared.forEach { it.file.delete() }
            }
        } finally {
            prepared.forEach { it.file.delete() }
            stagedPack.delete()
        }
    }

    private data class PreparedEntry(
        val file: File,
        val title: String,
        val mime: String,
        val sha256: String,
        val subject: String,
        val qualification: String,
        val syllabus: String,
        val topic: String,
        val source: String,
        val publisher: String,
    )
}
