package com.shadecode.student

import android.content.Context
import android.net.Uri
import android.util.AtomicFile
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * Private, device-local storage for Snap & Extract artifacts.
 * When an artifact is saved, its source image is copied into app-private storage so
 * the student can reopen and review it even after Android revokes the picker grant.
 * The original picker URI is retained only as provenance, not as the durable image source.
 */
data class NativeExtractRegion(
    val text: String,
    val left: Float,
    val top: Float,
    val right: Float,
    val bottom: Float,
)

data class NativeVisualRegion(
    val id: String,
    val label: String,
    val annotation: String,
    val left: Float,
    val top: Float,
    val right: Float,
    val bottom: Float,
    val cropFile: String?,
    val linkedOcrRegionIndices: List<Int>,
)

data class NativeExtractArtifact(
    val id: String,
    val title: String,
    val rawOcr: String,
    val editedText: String,
    val sourceUri: String?,
    val sourceImageFile: String?,
    val extractionEngine: String?,
    val extractionPlatform: String?,
    val extractionConfidence: Float?,
    val extractionRegions: List<NativeExtractRegion>,
    val visualRegions: List<NativeVisualRegion>,
    val createdAt: Long,
    val updatedAt: Long,
)

class NativeExtractStore(context: Context) {
    private val directory = File(context.applicationContext.filesDir, "snap_extract_artifacts")
    private val maxArtifacts = 20
    private val maxTextChars = 120_000
    private val maxImageBytes = 8 * 1024 * 1024
    private val maxVisualCropBytes = 4 * 1024 * 1024
    private val maxVisualRegions = 40
    private val imageDirectory = File(directory, "images")
    private val cropDirectory = File(directory, "visual_crops")
    private val appContext = context.applicationContext

    @Synchronized
    fun list(): List<NativeExtractArtifact> {
        if (!directory.exists()) return emptyList()
        return directory.listFiles { file -> file.isFile && file.extension == "json" }
            .orEmpty()
            .mapNotNull { file -> runCatching { decode(file.readText()) }.getOrNull() }
            .sortedByDescending { it.updatedAt }
    }

    @Synchronized
    fun save(
        id: String?,
        title: String,
        rawOcr: String,
        editedText: String,
        sourceUri: Uri?,
        extractionEngine: String? = null,
        extractionConfidence: Float? = null,
        extractionRegions: List<NativeExtractRegion> = emptyList(),
    ): NativeExtractArtifact {
        require(rawOcr.length <= maxTextChars && editedText.length <= maxTextChars) {
            "This extract is too large to save. Copy or split the text into smaller extracts."
        }
        if (!directory.exists() && !directory.mkdirs()) error("Could not create private local storage.")
        val existing = id?.let(::readById)
        val artifactId = existing?.id ?: UUID.randomUUID().toString()
        val storedImage = sourceUri?.let { copySourceImage(it, artifactId) } ?: existing?.sourceImageFile
        val now = System.currentTimeMillis()
        val defaultTitle = "Extract " + java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(java.util.Date(now))
        val artifact = NativeExtractArtifact(
            id = artifactId,
            title = title.trim().take(100).ifBlank { defaultTitle },
            rawOcr = rawOcr,
            editedText = editedText,
            sourceUri = sourceUri?.toString() ?: existing?.sourceUri,
            sourceImageFile = storedImage,
            extractionEngine = extractionEngine ?: existing?.extractionEngine,
            extractionPlatform = if (extractionEngine != null) "android" else existing?.extractionPlatform,
            extractionConfidence = if (extractionEngine != null) extractionConfidence else existing?.extractionConfidence,
            extractionRegions = if (extractionEngine != null) extractionRegions else existing?.extractionRegions.orEmpty(),
            visualRegions = existing?.visualRegions.orEmpty(),
            createdAt = existing?.createdAt ?: now,
            updatedAt = now,
        )
        val atomicFile = AtomicFile(fileFor(artifact.id))
        val output = atomicFile.startWrite()
        try {
            output.write(encode(artifact).toByteArray(Charsets.UTF_8))
            atomicFile.finishWrite(output)
        } catch (error: Exception) {
            atomicFile.failWrite(output)
            throw error
        }
        // Prune through delete() so each evicted artifact's private source image is
        // removed together with its metadata instead of leaking orphaned image files.
        list().drop(maxArtifacts).forEach { old -> delete(old.id) }
        return artifact
    }

    /** Replace visual evidence; crop files are private and metadata is committed last. */
    @Synchronized
    fun saveVisualRegions(id: String, regions: List<NativeVisualRegion>, cropBytes: Map<String, ByteArray>): NativeExtractArtifact {
        require(regions.size <= maxVisualRegions) { "Select no more than $maxVisualRegions visual regions." }
        val artifact = readById(id) ?: error("Save this extract before adding visual regions.")
        if (!cropDirectory.exists() && !cropDirectory.mkdirs()) error("Could not create private visual storage.")
        val safeRegions = regions.map { region ->
            require(region.id.matches(Regex("[a-fA-F0-9-]{36}"))) { "Invalid visual region identifier." }
            require(region.label.length <= 100 && region.annotation.length <= 1000) { "Visual region notes are too long." }
            require(listOf(region.left, region.top, region.right, region.bottom).all { it.isFinite() && it in 0f..1f }) { "Visual region coordinates are invalid." }
            require(region.right > region.left && region.bottom > region.top) { "Visual region has no area." }
            val bytes = cropBytes[region.id]
            val cropName = if (bytes != null) {
                require(bytes.isNotEmpty() && bytes.size <= maxVisualCropBytes) { "Each visual crop must be 4 MB or smaller." }
                val name = id + "-" + region.id + ".webp"
                val atomic = AtomicFile(File(cropDirectory, name)); val output = atomic.startWrite()
                try { output.write(bytes); atomic.finishWrite(output) } catch (error: Exception) { atomic.failWrite(output); throw error }
                name
            } else region.cropFile?.takeIf { it == id + "-" + region.id + ".webp" && File(cropDirectory, it).isFile }
            region.copy(cropFile = cropName, linkedOcrRegionIndices = region.linkedOcrRegionIndices.distinct().filter { it in artifact.extractionRegions.indices })
        }
        val updated = artifact.copy(visualRegions = safeRegions, updatedAt = System.currentTimeMillis())
        val atomic = AtomicFile(fileFor(id)); val output = atomic.startWrite()
        try { output.write(encode(updated).toByteArray(Charsets.UTF_8)); atomic.finishWrite(output) }
        catch (error: Exception) { atomic.failWrite(output); throw error }
        val retained = safeRegions.mapNotNull { it.cropFile }.toSet()
        cropDirectory.listFiles()?.filter { it.isFile && it.name.startsWith(id + "-") && it.name !in retained }?.forEach { it.delete() }
        return updated
    }

    @Synchronized
    fun loadVisualCrop(id: String, regionId: String): ByteArray? {
        val artifact = readById(id) ?: return null
        val region = artifact.visualRegions.firstOrNull { it.id == regionId } ?: return null
        val name = region.cropFile ?: return null
        if (name != id + "-" + regionId + ".webp") return null
        val file = File(cropDirectory, name)
        if (!file.isFile || file.length() > maxVisualCropBytes) return null
        return runCatching { file.readBytes() }.getOrNull()
    }
    @Synchronized
    fun loadSourceImage(id: String): ByteArray? {
        val artifact = readById(id) ?: return null
        val name = artifact.sourceImageFile ?: return null
        if (name != "$id.img") return null
        val file = File(imageDirectory, name)
        if (!file.isFile || file.length() > maxImageBytes) return null
        return runCatching { file.readBytes() }.getOrNull()
    }

    @Synchronized
    fun delete(id: String): Boolean {
        val artifact = readById(id)
        val file = fileFor(id)
        val metadataDeleted = !file.exists() || file.delete()
        val cropsDeleted = cropDirectory.listFiles()?.filter { it.isFile && it.name.startsWith(id + "-") }?.all { it.delete() } ?: true
        val imageDeleted = artifact?.sourceImageFile?.let { name ->
            if (name == "$id.img") {
                val image = File(imageDirectory, name)
                !image.exists() || image.delete()
            } else true
        } ?: true
        return metadataDeleted && imageDeleted && cropsDeleted
    }

    private fun copySourceImage(uri: Uri, id: String): String {
        if (!imageDirectory.exists() && !imageDirectory.mkdirs()) error("Could not create private image storage.")
        val target = File(imageDirectory, "$id.img")
        val atomic = AtomicFile(target)
        val output = atomic.startWrite()
        try {
            val input = appContext.contentResolver.openInputStream(uri)
                ?: error("The selected source image is no longer readable. Choose it again.")
            input.use { stream ->
                val buffer = ByteArray(16 * 1024)
                var total = 0
                while (true) {
                    val count = stream.read(buffer)
                    if (count < 0) break
                    total += count
                    require(total <= maxImageBytes) { "This image is larger than 8 MB. Choose a smaller image." }
                    output.write(buffer, 0, count)
                }
                require(total > 0) { "The selected image is empty." }
            }
            atomic.finishWrite(output)
        } catch (error: Exception) {
            atomic.failWrite(output)
            throw error
        }
        return target.name
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
        .put("sourceUri", artifact.sourceUri)
        .put("sourceImageFile", artifact.sourceImageFile)
        .put("extractionEngine", artifact.extractionEngine)
        .put("extractionPlatform", artifact.extractionPlatform)
        .put("extractionConfidence", artifact.extractionConfidence)
        .put("extractionRegions", org.json.JSONArray().apply {
            artifact.extractionRegions.forEach { region ->
                put(JSONObject().put("text", region.text).put("left", region.left).put("top", region.top)
                    .put("right", region.right).put("bottom", region.bottom))
            }
        })
        .put("visualRegions", org.json.JSONArray().apply {
            artifact.visualRegions.forEach { region ->
                put(JSONObject().put("id", region.id).put("label", region.label).put("annotation", region.annotation)
                    .put("left", region.left).put("top", region.top).put("right", region.right).put("bottom", region.bottom)
                    .put("cropFile", region.cropFile).put("linkedOcrRegionIndices", org.json.JSONArray(region.linkedOcrRegionIndices)))
            }
        })
        .put("createdAt", artifact.createdAt).put("updatedAt", artifact.updatedAt).toString()

    private fun decode(encoded: String): NativeExtractArtifact {
        val json = JSONObject(encoded)
        return NativeExtractArtifact(
            id = json.getString("id"), title = json.optString("title", "Saved extract"),
            rawOcr = json.optString("rawOcr"), editedText = json.optString("editedText"),
            sourceUri = json.optString("sourceUri").takeIf { it.isNotBlank() && it != "null" },
            sourceImageFile = json.optString("sourceImageFile").takeIf { it.isNotBlank() && it != "null" },
            extractionEngine = json.optString("extractionEngine").takeIf { it.isNotBlank() && it != "null" },
            extractionPlatform = json.optString("extractionPlatform").takeIf { it.isNotBlank() && it != "null" },
            extractionConfidence = if (json.isNull("extractionConfidence")) null else json.optDouble("extractionConfidence").toFloat(),
            extractionRegions = json.optJSONArray("extractionRegions")?.let { regions ->
                (0 until regions.length()).mapNotNull { index ->
                    regions.optJSONObject(index)?.let { region ->
                        NativeExtractRegion(
                            text = region.optString("text"),
                            left = region.optDouble("left").toFloat(),
                            top = region.optDouble("top").toFloat(),
                            right = region.optDouble("right").toFloat(),
                            bottom = region.optDouble("bottom").toFloat(),
                        )
                    }
                }
            }.orEmpty(),
            visualRegions = json.optJSONArray("visualRegions")?.let { regions ->
                (0 until regions.length()).mapNotNull { index ->
                    regions.optJSONObject(index)?.let { region ->
                        val regionId = region.optString("id")
                        if (!regionId.matches(Regex("[a-fA-F0-9-]{36}"))) null else NativeVisualRegion(
                            id = regionId, label = region.optString("label", "Visual evidence"), annotation = region.optString("annotation"),
                            left = region.optDouble("left").toFloat(), top = region.optDouble("top").toFloat(),
                            right = region.optDouble("right").toFloat(), bottom = region.optDouble("bottom").toFloat(),
                            cropFile = region.optString("cropFile").takeIf { it == json.optString("id") + "-" + regionId + ".webp" },
                            linkedOcrRegionIndices = region.optJSONArray("linkedOcrRegionIndices")?.let { links ->
                                (0 until links.length()).map { links.optInt(it, -1) }.filter { it >= 0 }
                            }.orEmpty(),
                        )
                    }
                }
            }.orEmpty(),
            createdAt = json.optLong("createdAt"), updatedAt = json.optLong("updatedAt"),
        )
    }
}
