package com.shadecode.student

import android.content.Context
import android.net.Uri
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * Private, device-local storage for derived Snap & Extract text.
 * Source images are deliberately not copied. A stored source URI is informational only
 * and may no longer be readable after Android revokes the picker grant.
 */
data class NativeExtractArtifact(
    val id: String,
    val title: String,
    val rawOcr: String,
    val editedText: String,
    val sourceUri: String?,
    val createdAt: Long,
    val updatedAt: Long,
)

class NativeExtractStore(context: Context) {
    private val directory = File(context.applicationContext.filesDir, "snap_extract_artifacts")
    private val maxArtifacts = 20
    private val maxTextChars = 120_000

    @Synchronized
    fun list(): List<NativeExtractArtifact> {
        if (!directory.exists()) return emptyList()
        return directory.listFiles { file -> file.isFile && file.extension == "json" }
            .orEmpty()
            .mapNotNull { file -> runCatching { decode(file.readText()) }.getOrNull() }
            .sortedByDescending { it.updatedAt }
    }

    @Synchronized
    fun save(id: String?, title: String, rawOcr: String, editedText: String, sourceUri: Uri?): NativeExtractArtifact {
        require(rawOcr.length <= maxTextChars && editedText.length <= maxTextChars) {
            "This extract is too large to save. Copy or split the text into smaller extracts."
        }
        if (!directory.exists() && !directory.mkdirs()) error("Could not create private local storage.")
        val existing = id?.let(::readById)
        val now = System.currentTimeMillis()
        val defaultTitle = "Extract " + java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(java.util.Date(now))
        val artifact = NativeExtractArtifact(
            id = existing?.id ?: UUID.randomUUID().toString(),
            title = title.trim().take(100).ifBlank { defaultTitle },
            rawOcr = rawOcr,
            editedText = editedText,
            sourceUri = sourceUri?.toString() ?: existing?.sourceUri,
            createdAt = existing?.createdAt ?: now,
            updatedAt = now,
        )
        val target = fileFor(artifact.id)
        val temporary = File(directory, artifact.id + ".json.tmp")
        try {
            temporary.writeText(encode(artifact))
            if (target.exists() && !target.delete()) error("Could not replace the saved extract.")
            if (!temporary.renameTo(target)) error("Could not finish saving the extract.")
        } finally { if (temporary.exists()) temporary.delete() }
        list().drop(maxArtifacts).forEach { old -> fileFor(old.id).delete() }
        return artifact
    }

    @Synchronized
    fun delete(id: String): Boolean {
        val file = fileFor(id)
        return !file.exists() || file.delete()
    }

    @Synchronized
    private fun readById(id: String): NativeExtractArtifact? =
        runCatching { fileFor(id).takeIf { it.isFile }?.readText()?.let(::decode) }.getOrNull()

    private fun fileFor(id: String): File {
        require(id.matches(Regex("[a-fA-F0-9-]{36}"))) { "Invalid extract identifier." }
        return File(directory, "$id.json")
    }

    private fun encode(artifact: NativeExtractArtifact): String = JSONObject()
        .put("id", artifact.id).put("title", artifact.title)
        .put("rawOcr", artifact.rawOcr).put("editedText", artifact.editedText)
        .put("sourceUri", artifact.sourceUri).put("createdAt", artifact.createdAt)
        .put("updatedAt", artifact.updatedAt).toString()

    private fun decode(encoded: String): NativeExtractArtifact {
        val json = JSONObject(encoded)
        return NativeExtractArtifact(
            id = json.getString("id"), title = json.optString("title", "Saved extract"),
            rawOcr = json.optString("rawOcr"), editedText = json.optString("editedText"),
            sourceUri = json.optString("sourceUri").takeIf { it.isNotBlank() && it != "null" },
            createdAt = json.optLong("createdAt"), updatedAt = json.optLong("updatedAt"),
        )
    }
}
