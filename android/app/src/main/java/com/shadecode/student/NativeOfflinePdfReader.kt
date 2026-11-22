package com.shadecode.student

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

private data class RenderedPdfPage(val bitmap: Bitmap, val pageCount: Int)

@Composable
fun NativeOfflinePdfReader(
    file: File,
    title: String,
    initialPage: Int = 1,
    onPageChanged: (Int) -> Unit = {},
    onBack: () -> Unit,
) {
    var pageIndex by remember(file.absolutePath) { mutableStateOf((initialPage - 1).coerceAtLeast(0)) }
    var pageCount by remember(file.absolutePath) { mutableStateOf(0) }
    var rendered by remember(file.absolutePath) { mutableStateOf<Bitmap?>(null) }
    var error by remember(file.absolutePath) { mutableStateOf<String?>(null) }
    var loading by remember(file.absolutePath) { mutableStateOf(true) }

    LaunchedEffect(file.absolutePath, pageIndex) {
        loading = true
        error = null
        try {
            val result = withContext(Dispatchers.IO) {
                ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
                    PdfRenderer(descriptor).use { renderer ->
                        require(renderer.pageCount > 0) { "This PDF has no readable pages." }
                        val safeIndex = pageIndex.coerceIn(0, renderer.pageCount - 1)
                        renderer.openPage(safeIndex).use { page ->
                            val targetWidth = 1400
                            val targetHeight = (targetWidth.toFloat() * page.height / page.width).toInt().coerceAtLeast(1)
                            val bitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
                            bitmap.eraseColor(android.graphics.Color.WHITE)
                            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            RenderedPdfPage(bitmap, renderer.pageCount)
                        }
                    }
                }
            }
            rendered = result.bitmap
            pageCount = result.pageCount
            onPageChanged(pageIndex.coerceIn(0, result.pageCount - 1) + 1)
        } catch (failure: Exception) {
            error = failure.message ?: "This PDF page could not be rendered."
        } finally {
            loading = false
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        OutlinedButton(onClick = onBack) { Text("← Back to resources") }
        Text(title, style = MaterialTheme.typography.titleLarge)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            OutlinedButton(
                onClick = { pageIndex = (pageIndex - 1).coerceAtLeast(0) },
                enabled = !loading && pageIndex > 0,
                modifier = Modifier.weight(1f),
            ) { Text("Previous") }
            Text(
                if (pageCount > 0) "Page ${pageIndex + 1} of $pageCount" else "Loading pages",
                modifier = Modifier.padding(top = 12.dp),
                style = MaterialTheme.typography.labelLarge,
            )
            Button(
                onClick = { pageIndex = (pageIndex + 1).coerceAtMost(pageCount - 1) },
                enabled = !loading && pageCount > 0 && pageIndex < pageCount - 1,
                modifier = Modifier.weight(1f),
            ) { Text("Next") }
        }
        if (loading) Text("Rendering page…", color = MaterialTheme.colorScheme.onSurfaceVariant)
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        rendered?.let { bitmap ->
            Column(
                modifier = Modifier.fillMaxWidth().weight(1f).verticalScroll(rememberScrollState()),
            ) {
                Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = "PDF page ${pageIndex + 1}",
                    modifier = Modifier.fillMaxWidth(),
                    contentScale = ContentScale.FillWidth,
                )
            }
        }
    }
}
