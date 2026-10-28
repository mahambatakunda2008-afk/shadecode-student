package com.shadecode.student

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * Account-scoped local paper library. Files live in app-private storage and are not
 * shared between Android users or exposed as public filesystem paths.
 */
object NativeOfflinePaperStore {
    data class SavedPaper(
        val id: String,
        val title: String,
        val subject: String,
        val board: String,
        val level: String,
        val session: String,
        val year: Int,
        val paperNumber: Int,
        val variant: Int,
        val kind: String,
        val fileName: String,
        val bytes: Long,
        val savedAt: Long,
        val userId: String,
    )

    private fun root(context: Context) = File(context.filesDir, "offline-papers").apply { mkdirs() }
    private fun prefs(context: Context) = context.getSharedPreferences("offline_paper_index_v1", Context.MODE_PRIVATE)
    private fun indexKey(userId: String) = "papers_" + digest(userId)

    fun list(context: Context, userId: String): List<SavedPaper> {
        val array = runCatching { JSONArray(prefs(context).getString(indexKey(userId), "[]")) }.getOrNull() ?: JSONArray()
        return buildList {
            for (i in 0 until array.length()) {
                val row = array.optJSONObject(i) ?: continue
                val paper = runCatching {
                    SavedPaper(
                        id = row.getString("id"), title = row.getString("title"), subject = row.getString("subject"),
                        board = row.getString("board"), level = row.optString("level"), session = row.optString("session"),
                        year = row.optInt("year"), paperNumber = row.optInt("paperNumber"), variant = row.optInt("variant"),
                        kind = row.optString("kind"), fileName = row.getString("fileName"), bytes = row.optLong("bytes"),
                        savedAt = row.optLong("savedAt"), userId = row.getString("userId"),
                    )
                }.getOrNull() ?: continue
                if (paper.userId == userId && file(context, paper) != null) add(paper)
            }
        }.sortedByDescending { it.savedAt }
    }

    fun find(context: Context, userId: String, paperId: String): SavedPaper? =
        list(context, userId).firstOrNull { it.id == paperId }

    /**
     * Imports the build-time pack manifest. The APK can contain only papers with documented
     * redistribution rights; every entry must include a SHA-256 checksum and provenance.
     */
    fun importBundled(context: Context, userId: String): List<SavedPaper> {
        if (userId.isBlank()) return emptyList()
        val manifestText = runCatching {
            context.assets.open("offline-papers/index.json").bufferedReader().use { it.readText() }
        }.getOrNull() ?: return list(context, userId)
        val entries = runCatching { JSONArray(manifestText) }.getOrNull() ?: return list(context, userId)
        val saved = list(context, userId).toMutableList()
        for (i in 0 until entries.length()) {
            val entry = entries.optJSONObject(i) ?: continue
            val id = entry.optString("id")
            val assetPath = entry.optString("assetPath")
            val expectedHash = entry.optString("sha256").lowercase()
            val licence = entry.optString("licence").trim()
            val source = entry.optString("source").trim()
            val attribution = entry.optString("attribution").trim()
            if (id.isBlank() || licence.isBlank() || source.isBlank() || attribution.isBlank()) continue
            if (!assetPath.matches(Regex("offline-papers/[A-Za-z0-9._/-]+\\.pdf")) || assetPath.contains("..")) continue
            if (!expectedHash.matches(Regex("[a-f0-9]{64}"))) continue
            if (saved.any { it.id == id }) continue
            val fileName = digest("$userId:$id") + ".pdf"
            val target = File(root(context), fileName)
            val temp = File(root(context), fileName + ".part")
            try {
                context.assets.open(assetPath).use { input ->
                    FileOutputStream(temp).use { output ->
                        input.copyTo(output)
                        output.fd.sync()
                    }
                }
                if (!temp.isFile || temp.length() <= 5 || temp.length() > MAX_PAPER_BYTES) {
                    temp.delete()
                    continue
                }
                val header = temp.inputStream().use { input -> ByteArray(5).also { input.read(it) } }
                if (String(header, Charsets.US_ASCII) != "%PDF-" || hashFile(temp) != expectedHash) {
                    temp.delete()
                    continue
                }
                if (!temp.renameTo(target)) {
                    temp.copyTo(target, overwrite = true)
                    temp.delete()
                }
                val paper = SavedPaper(
                    id = id,
                    title = entry.optString("title").ifBlank { "Paper ${entry.optInt("paperNumber")} / ${entry.optInt("variant")}" },
                    subject = entry.optString("subject"), board = entry.optString("board"), level = entry.optString("level"),
                    session = entry.optString("session"), year = entry.optInt("year"),
                    paperNumber = entry.optInt("paperNumber"), variant = entry.optInt("variant"), kind = entry.optString("kind"),
                    fileName = fileName, bytes = target.length(), savedAt = System.currentTimeMillis(), userId = userId,
                )
                saved += paper
            } catch (_: Exception) {
                temp.delete()
            }
        }
        writeIndex(context, userId, saved)
        return list(context, userId)
    }

    fun file(context: Context, paper: SavedPaper): File? {
        if (!paper.fileName.matches(Regex("[a-f0-9]{64}\\.pdf"))) return null
        return File(root(context), paper.fileName).takeIf { it.isFile && it.length() > 5 }
    }

    fun openUri(context: Context, paper: SavedPaper): Uri {
        val pdf = file(context, paper) ?: throw IllegalStateException("This saved paper is missing. Download it again.")
        return FileProvider.getUriForFile(context, context.packageName + ".files", pdf)
    }

    fun delete(context: Context, userId: String, paperId: String) {
        val current = list(context, userId)
        current.firstOrNull { it.id == paperId }?.let { file(context, it)?.delete() }
        writeIndex(context, userId, current.filterNot { it.id == paperId })
    }

    fun download(
        context: Context,
        userId: String,
        paper: NativeExamPaper,
        subject: String,
        board: String,
        signedUrl: String,
    ): SavedPaper {
        require(userId.isNotBlank()) { "Sign in to save papers to this device." }
        require(signedUrl.startsWith("https://")) { "The paper download must use a secure HTTPS connection." }
        val fileName = digest("$userId:${paper.id}") + ".pdf"
        val target = File(root(context), fileName)
        val temp = File(root(context), fileName + ".part")
        var connection: HttpURLConnection? = null
        try {
            connection = (URL(signedUrl).openConnection() as HttpURLConnection).apply {
                connectTimeout = 20_000
                readTimeout = 45_000
                instanceFollowRedirects = true
                setRequestProperty("Accept", "application/pdf,application/octet-stream;q=0.9")
            }
            val code = connection.responseCode
            if (!connection.url.protocol.equals("https", ignoreCase = true)) {
                throw IllegalStateException("The paper source redirected to an insecure connection. Try again from the catalogue.")
            }
            if (code !in 200..299) throw IllegalStateException("Paper download failed ($code). Try again when connected.")
            val declaredLength = connection.contentLengthLong
            if (declaredLength > MAX_PAPER_BYTES) throw IllegalStateException("This paper is larger than the 50 MB offline limit.")
            var total = 0L
            connection.inputStream.use { input ->
                FileOutputStream(temp).use { output ->
                    val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                    val pdfHeader = ByteArray(5)
                    var headerBytes = 0
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        if (headerBytes < pdfHeader.size) {
                            val copyCount = minOf(count, pdfHeader.size - headerBytes)
                            buffer.copyInto(pdfHeader, destinationOffset = headerBytes, startIndex = 0, endIndex = copyCount)
                            headerBytes += copyCount
                        }
                        total += count
                        if (total > MAX_PAPER_BYTES) throw IllegalStateException("This paper is larger than the 50 MB offline limit.")
                        output.write(buffer, 0, count)
                    }
                    output.fd.sync()
                    if (headerBytes < pdfHeader.size || String(pdfHeader, Charsets.US_ASCII) != "%PDF-") {
                        throw IllegalStateException("The source did not return a valid PDF paper.")
                    }
                }
            }
            if (!temp.renameTo(target)) {
                temp.copyTo(target, overwrite = true)
                temp.delete()
            }
            val saved = SavedPaper(
                id = paper.id,
                title = "Paper ${paper.paperNumber} / ${paper.variant} · ${paper.kind.uppercase()}",
                subject = subject, board = board, level = paper.level, session = paper.session, year = paper.year,
                paperNumber = paper.paperNumber, variant = paper.variant, kind = paper.kind, fileName = fileName,
                bytes = target.length(), savedAt = System.currentTimeMillis(), userId = userId,
            )
            val all = list(context, userId).filterNot { it.id == paper.id } + saved
            writeIndex(context, userId, all)
            return saved
        } catch (e: Exception) {
            temp.delete()
            throw e
        } finally {
            connection?.disconnect()
        }
    }

    private fun writeIndex(context: Context, userId: String, papers: List<SavedPaper>) {
        val array = JSONArray()
        papers.filter { it.userId == userId }.forEach { p ->
            array.put(JSONObject()
                .put("id", p.id).put("title", p.title).put("subject", p.subject).put("board", p.board)
                .put("level", p.level).put("session", p.session).put("year", p.year)
                .put("paperNumber", p.paperNumber).put("variant", p.variant).put("kind", p.kind)
                .put("fileName", p.fileName).put("bytes", p.bytes).put("savedAt", p.savedAt).put("userId", p.userId))
        }
        check(prefs(context).edit().putString(indexKey(userId), array.toString()).commit()) {
            "The paper downloaded, but its offline-library entry could not be saved."
        }
    }

    private fun digest(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }

    private fun hashFile(file: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                md.update(buffer, 0, count)
            }
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }

    private const val MAX_PAPER_BYTES = 50L * 1024L * 1024L
}
