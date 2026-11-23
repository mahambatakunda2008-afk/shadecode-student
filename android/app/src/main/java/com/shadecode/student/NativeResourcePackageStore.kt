package com.shadecode.student

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import java.security.MessageDigest

/**
 * Durable, account-scoped storage for imported Shadecode resource packages.
 *
 * The original bytes are stored as a Room BLOB. The manifest is retained verbatim
 * so future clients can interpret fields without losing provenance or review data.
 * Listing uses a projection that never reads the potentially large payload column.
 */
data class NativeResourcePackageMetadata(
    val ownerId: String,
    val resourceId: String,
    val title: String,
    val mimeType: String,
    val filename: String,
    val byteLength: Long,
    val sha256: String,
    val importedAt: Long,
    val lastReadAt: Long?,
    val lastReadPage: Int,
)

data class NativeStoredResourcePackage(
    val metadata: NativeResourcePackageMetadata,
    val manifestJson: String,
    val payload: ByteArray,
)

object NativeResourcePackageIntegrity {
    const val MAX_PACKAGE_BYTES: Long = 64L * 1024L * 1024L

    fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256")
        .digest(bytes)
        .joinToString("") { "%02x".format(it) }

    fun validate(ownerId: String, resourceId: String, expectedSha256: String, payload: ByteArray) {
        require(ownerId.isNotBlank()) { "Sign in to save resources to this device." }
        require(resourceId.matches(Regex("[a-fA-F0-9]{64}"))) { "The resource identifier is invalid." }
        require(payload.isNotEmpty()) { "This resource package is empty." }
        require(payload.size.toLong() <= MAX_PACKAGE_BYTES) { "This resource exceeds the 64 MB offline package limit." }
        require(expectedSha256.matches(Regex("[a-fA-F0-9]{64}"))) { "The resource checksum is invalid." }
        require(sha256(payload).equals(expectedSha256, ignoreCase = true)) {
            "This resource package failed its integrity check. Import it again from the original source."
        }
        require(resourceId.equals(expectedSha256, ignoreCase = true)) {
            "The resource identifier does not match its content checksum."
        }
    }
}

class NativeResourcePackageStore(private val database: NativeDatabase) {
    private val dao get() = database.resourcePackages()

    suspend fun save(
        ownerId: String,
        resourceId: String,
        title: String,
        mimeType: String,
        filename: String,
        manifestJson: String,
        payload: ByteArray,
        sha256: String,
    ): NativeResourcePackageMetadata {
        NativeResourcePackageIntegrity.validate(ownerId, resourceId, sha256, payload)
        require(title.isNotBlank()) { "A resource title is required." }
        require(mimeType.isNotBlank()) { "A resource MIME type is required." }
        require(filename.isNotBlank()) { "A resource filename is required." }
        require(manifestJson.isNotBlank()) { "The resource manifest is missing." }

        val row = NativeResourcePackageEntity(
            ownerId = ownerId,
            resourceId = resourceId.lowercase(),
            title = title.trim(),
            mimeType = mimeType.trim().lowercase(),
            filename = filename.trim(),
            manifestJson = manifestJson,
            payload = payload.copyOf(),
            byteLength = payload.size.toLong(),
            sha256 = sha256.lowercase(),
            importedAt = System.currentTimeMillis(),
            lastReadAt = null,
            lastReadPage = 0,
        )
        dao.put(row)
        return dao.metadata(ownerId, resourceId.lowercase())
            ?: error("The resource was written but could not be read back.")
    }

    suspend fun list(ownerId: String): List<NativeResourcePackageMetadata> {
        require(ownerId.isNotBlank()) { "An account is required to list saved resources." }
        return dao.listMetadata(ownerId)
    }

    suspend fun read(ownerId: String, resourceId: String): NativeStoredResourcePackage? {
        require(ownerId.isNotBlank()) { "An account is required to read saved resources." }
        val row = dao.get(ownerId, resourceId.lowercase()) ?: return null
        NativeResourcePackageIntegrity.validate(ownerId, row.resourceId, row.sha256, row.payload)
        check(row.byteLength == row.payload.size.toLong()) {
            "The saved resource is incomplete. Import it again from the original source."
        }
        return NativeStoredResourcePackage(
            metadata = row.toMetadata(),
            manifestJson = row.manifestJson,
            payload = row.payload.copyOf(),
        )
    }

    suspend fun markRead(ownerId: String, resourceId: String, page: Int) {
        require(ownerId.isNotBlank()) { "An account is required to update reading progress." }
        require(page >= 0) { "The reading position is invalid." }
        dao.markRead(ownerId, resourceId.lowercase(), System.currentTimeMillis(), page)
    }

    suspend fun delete(ownerId: String, resourceId: String) {
        require(ownerId.isNotBlank()) { "An account is required to delete saved resources." }
        dao.delete(ownerId, resourceId.lowercase())
    }

    private fun NativeResourcePackageEntity.toMetadata() = NativeResourcePackageMetadata(
        ownerId = ownerId,
        resourceId = resourceId,
        title = title,
        mimeType = mimeType,
        filename = filename,
        byteLength = byteLength,
        sha256 = sha256,
        importedAt = importedAt,
        lastReadAt = lastReadAt,
        lastReadPage = lastReadPage,
    )
}
