package com.shadecode.student

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

@Composable
fun NativeResourceLibraryScreen(
    session: NativeSession,
    database: NativeDatabase,
    subjects: List<NativeSubjectEntity>,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var resources by remember { mutableStateOf<List<NativeOfflineResourceEntity>>(emptyList()) }
    var query by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("") }
    var topic by remember { mutableStateOf("") }
    var selectedSubject by remember { mutableStateOf(subjects.firstOrNull()?.name.orEmpty()) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var activeText by remember { mutableStateOf<String?>(null) }
    var activePdfFile by remember { mutableStateOf<File?>(null) }
    var activeTitle by remember { mutableStateOf("") }
    var activeResource by remember { mutableStateOf<NativeOfflineResourceEntity?>(null) }
    var annotations by remember { mutableStateOf<List<NativeResourceAnnotationEntity>>(emptyList()) }
    var annotationDraft by remember { mutableStateOf("") }

    suspend fun refresh(search: String = query) {
        resources = withContext(Dispatchers.IO) {
            NativeOfflineResourceStore.search(database, session.userId, search)
        }
    }

    LaunchedEffect(session.userId) { refresh("") }
    LaunchedEffect(query) {
        kotlinx.coroutines.delay(180)
        refresh(query)
    }
    LaunchedEffect(activeResource?.resourceId) {
        val resource = activeResource ?: return@LaunchedEffect
        annotations = withContext(Dispatchers.IO) {
            NativeOfflineResourceStore.annotations(database, session.userId, resource.resourceId)
        }
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            scope.launch {
                busy = true
                message = "Importing and verifying the selected file…"
                try {
                    val saved = withContext(Dispatchers.IO) {
                        NativeOfflineResourceStore.importFile(
                            context = context,
                            database = database,
                            accountId = session.userId,
                            uri = uri,
                            metadata = NativeOfflineResourceStore.ImportMetadata(
                                title = title.ifBlank { uri.lastPathSegment?.substringAfterLast('/') ?: "Saved resource" },
                                subject = selectedSubject,
                                topic = topic,
                            ),
                        )
                    }
                    refresh("")
                    query = ""
                    title = ""
                    topic = ""
                    message = "Saved offline: ${saved.title} · ${saved.byteCount / 1024} KB · SHA-256 verified."
                } catch (error: Exception) {
                    message = error.message ?: "The resource could not be saved."
                } finally {
                    busy = false
                }
            }
        }
    }

    val packExporter = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/vnd.shadecode.resource-pack"),
    ) { uri ->
        if (uri != null) scope.launch {
            busy = true
            try {
                val count = withContext(Dispatchers.IO) {
                    NativeResourcePack.export(context, database, session.userId, uri)
                }
                message = "Exported $count verified resource(s) to a Shadecode pack."
            } catch (error: Exception) {
                message = error.message ?: "Could not export the resource pack."
            } finally { busy = false }
        }
    }
    val packImporter = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch {
            busy = true
            try {
                val count = withContext(Dispatchers.IO) {
                    NativeResourcePack.import(context, database, session.userId, uri, selectedSubject)
                }
                refresh("")
                query = ""
                message = "Imported $count resource(s). Their trust status is unverified."
            } catch (error: Exception) {
                message = error.message ?: "Could not import the resource pack."
            } finally { busy = false }
        }
    }

    if (activePdfFile != null) {
        NativeOfflinePdfReader(
            file = activePdfFile!!,
            title = activeTitle,
            initialPage = activeResource?.lastPage ?: 1,
            onPageChanged = { page ->
                val resource = activeResource ?: return@NativeOfflinePdfReader
                scope.launch {
                    withContext(Dispatchers.IO) {
                        NativeOfflineResourceStore.markOpened(database, session.userId, resource.resourceId, page)
                    }
                }
            },
            onBack = { activePdfFile = null; activeResource = null; annotations = emptyList() },
        )
        return
    }

    if (activeText != null) {
        Column(Modifier.fillMaxSize().padding(20.dp)) {
            TextButton(onClick = { activeText = null; activeResource = null; annotations = emptyList() }) { Text("← Back to resources") }
            Text(activeTitle, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { Text(activeText.orEmpty(), style = MaterialTheme.typography.bodyLarge) }
                item {
                    Spacer(Modifier.height(8.dp))
                    Text("My notes", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = annotationDraft,
                        onValueChange = { annotationDraft = it.take(20_000) },
                        label = { Text("Write a note about this resource") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                    )
                    Button(
                        onClick = {
                            val resource = activeResource ?: return@Button
                            val note = annotationDraft.trim()
                            if (note.isNotBlank()) scope.launch {
                                try {
                                    val saved = withContext(Dispatchers.IO) {
                                        NativeOfflineResourceStore.saveAnnotation(
                                            database, session.userId, resource.resourceId,
                                            kind = "note", content = note,
                                        )
                                    }
                                    annotations = (annotations + saved).sortedByDescending { it.updatedAt }
                                    annotationDraft = ""
                                    message = "Note saved on this device."
                                } catch (error: Exception) {
                                    message = error.message ?: "Could not save note."
                                }
                            }
                        },
                        enabled = annotationDraft.isNotBlank(),
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Save note offline") }
                }
                if (annotations.isEmpty()) item {
                    Text("No notes yet. Your notes are stored locally with this resource.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                }
                items(annotations, key = { it.id }) { annotation ->
                    Card(shape = RoundedCornerShape(14.dp)) {
                        Column(Modifier.fillMaxWidth().padding(12.dp)) {
                            Text(annotation.kind.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                            Text(annotation.content, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Spacer(Modifier.height(18.dp))
            TextButton(onClick = onBack) { Text("← Back to Learn") }
            Text("My resource library", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Files saved here stay on this device and can be reopened without internet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Add an offline resource", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Resource title") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(value = topic, onValueChange = { topic = it.take(180) }, label = { Text("Topic (optional)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    Text("Subject", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        subjects.take(3).forEach { subject ->
                            OutlinedButton(onClick = { selectedSubject = subject.name }) {
                                Text(if (selectedSubject == subject.name) "✓ ${subject.name}" else subject.name, maxLines = 1)
                            }
                        }
                    }
                    if (subjects.size > 3) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            subjects.drop(3).forEach { subject ->
                                OutlinedButton(onClick = { selectedSubject = subject.name }) {
                                    Text(if (selectedSubject == subject.name) "✓ ${subject.name}" else subject.name, maxLines = 1)
                                }
                            }
                        }
                    }
                    Button(
                        onClick = { picker.launch(arrayOf("application/pdf", "text/plain", "text/markdown")) },
                        enabled = !busy && selectedSubject.isNotBlank(),
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(if (busy) "Saving resource…" else "Choose PDF or text file") }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = { packImporter.launch(arrayOf("application/vnd.shadecode.resource-pack", "application/octet-stream")) },
                            enabled = !busy,
                            modifier = Modifier.weight(1f),
                        ) { Text("Import .scpack") }
                        OutlinedButton(
                            onClick = { packExporter.launch("Shadecode-Resources.scpack") },
                            enabled = !busy && resources.isNotEmpty(),
                            modifier = Modifier.weight(1f),
                        ) { Text("Export .scpack") }
                    }
                    Text("Resource packs transfer your saved files between web and Android. Imported trust labels reset to unverified.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Supported now: PDF (up to 100 MB), TXT and Markdown (up to 5 MB). Other formats will be added after compatibility testing.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    message?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall) }
                }
            }
        }
        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text("Search saved resources") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Text("${resources.size} resource(s) on this device", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (resources.isEmpty()) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(18.dp)) {
                    Text("Your offline library is empty. Import a PDF or text resource while you have the file available.", Modifier.padding(18.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        items(resources, key = { it.accountId + ":" + it.resourceId }) { resource ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(resource.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(listOf(resource.subject, resource.qualification, resource.syllabus, resource.topic).filter { it.isNotBlank() }.joinToString(" · "), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                    Text("${resource.mimeType} · ${resource.byteCount / 1024} KB · ${resource.reviewStatus}", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = {
                            scope.launch {
                                try {
                                    val file = withContext(Dispatchers.IO) { NativeOfflineResourceStore.file(context, session.userId, resource) }
                                        ?: error("The saved file is missing or has changed. Import it again.")
                                    withContext(Dispatchers.IO) { NativeOfflineResourceStore.markOpened(database, session.userId, resource.resourceId, resource.lastPage) }
                                    if (resource.mimeType == "application/pdf") {
                                        activeTitle = resource.title
                                        activeResource = resource
                                        activePdfFile = file
                                    } else {
                                        activeTitle = resource.title
                                        activeResource = resource
                                        annotationDraft = ""
                                        activeText = withContext(Dispatchers.IO) { file.readText(Charsets.UTF_8).take(250_000) }
                                    }
                                } catch (error: Exception) {
                                    message = error.message ?: "This resource could not be opened."
                                }
                            }
                        }) { Text("Open offline") }
                        TextButton(onClick = {
                            scope.launch {
                                val deleted = withContext(Dispatchers.IO) { NativeOfflineResourceStore.delete(database, context, session.userId, resource.resourceId) }
                                message = if (deleted) "Resource deleted from this device." else "The resource could not be fully deleted."
                                refresh()
                            }
                        }) { Text("Delete") }
                    }
                }
            }
        }
    }
}
