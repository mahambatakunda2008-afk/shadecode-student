package com.shadecode.student

import android.content.Intent
import android.net.Uri
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun NativeExamHubEntryCard(subjects: List<NativeSubjectEntity>, onClick: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick=onClick), shape=RoundedCornerShape(20.dp), colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(18.dp), verticalArrangement=Arrangement.spacedBy(6.dp)) {
            Text("Exam Hub", style=MaterialTheme.typography.titleLarge, fontWeight=FontWeight.Bold)
            Text("Browse past papers by board, subject, level, session and year.", color=MaterialTheme.colorScheme.onSurfaceVariant)
            Text("${subjects.size} selected subjects · personalized catalog", color=MaterialTheme.colorScheme.primary, style=MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun NativeExamHubScreen(padding: PaddingValues, session: NativeSession, api: NativeApi, subjects: List<NativeSubjectEntity>, onBack: () -> Unit) {
    val context=LocalContext.current
    val scope= rememberCoroutineScope()
    var syllabi by remember(session.userId,subjects) { mutableStateOf<List<NativeExamSyllabus>>(emptyList()) }
    var facets by remember { mutableStateOf<NativeExamFacets?>(null) }
    var papers by remember { mutableStateOf<List<NativeExamPaper>>(emptyList()) }
    var syllabus by remember { mutableStateOf<NativeExamSyllabus?>(null) }
    var level by remember { mutableStateOf<String?>(null) }
    var examSession by remember { mutableStateOf<String?>(null) }
    var year by remember { mutableStateOf<Int?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var status by remember { mutableStateOf<String?>(null) }
    var openingPaperId by remember { mutableStateOf<String?>(null) }
    var downloadingPaperId by remember { mutableStateOf<String?>(null) }
    var offlinePapers by remember(session.userId) { mutableStateOf(NativeOfflinePaperStore.list(context, session.userId)) }
    var activeAttempt by remember(session.userId) { mutableStateOf<NativeExamPaper?>(null) }
    var attemptNotes by remember(session.userId) { mutableStateOf("") }
    var attemptSeconds by remember(session.userId) { mutableIntStateOf(3600) }
    var attemptDurationMinutes by remember(session.userId) { mutableIntStateOf(60) }
    var attemptRunning by remember(session.userId) { mutableStateOf(false) }
    var attemptDeadlineMillis by remember(session.userId) { mutableLongStateOf(0L) }
    var attemptFinished by remember(session.userId) { mutableStateOf(false) }
    var showRestartAttemptConfirm by remember(session.userId) { mutableStateOf(false) }
    var showStarterPackPrompt by remember(session.userId) { mutableStateOf(false) }
    var starterPackBusy by remember(session.userId) { mutableStateOf(false) }
    val attemptPrefs = remember(session.userId) { context.getSharedPreferences("past_paper_attempts_v1", android.content.Context.MODE_PRIVATE) }
    fun load(block:suspend ()->Unit) { loading=true; error=null; scope.launch { try { block() } catch(e:Exception) { error=e.message ?: "Could not load papers." } finally { loading=false } } }
    fun beginAttempt(paper: NativeExamPaper) {
        activeAttempt = paper
        val key = "${session.userId}:${paper.id}"
        attemptNotes = attemptPrefs.getString("notes_$key", "").orEmpty()
        val savedSecondsKey = "seconds_$key"
        attemptDurationMinutes = attemptPrefs.getInt("duration_$key", attemptDurationMinutes).coerceIn(15, 240)
        val storedSeconds = attemptPrefs.getInt(savedSecondsKey, attemptDurationMinutes * 60).coerceAtLeast(0)
        val storedRunning = attemptPrefs.getBoolean("running_$key", false)
        val storedDeadline = attemptPrefs.getLong("deadline_$key", 0L)
        attemptFinished = attemptPrefs.getBoolean("finished_$key", false)
        val now = System.currentTimeMillis()
        attemptSeconds = if (storedRunning && storedDeadline > 0L) (((storedDeadline - now).coerceAtLeast(0L) + 999L) / 1000L).toInt() else storedSeconds
        attemptDeadlineMillis = if (storedRunning && storedDeadline > now && !attemptFinished) storedDeadline else 0L
        attemptRunning = storedRunning && attemptDeadlineMillis > now && attemptSeconds > 0 && !attemptFinished
        if (storedRunning && attemptSeconds == 0 && !attemptFinished) {
            attemptFinished = true
            status = "Time expired while the app was closed. Your saved notes are still available."
        } else status = "Attempt restored. Timer and notes are saved on this device."
    }
    LaunchedEffect(session.userId) {
        offlinePapers = withContext(Dispatchers.IO) { NativeOfflinePaperStore.importBundled(context, session.userId) }
    }
    LaunchedEffect(activeAttempt?.id, attemptNotes, attemptSeconds, attemptFinished, attemptRunning, attemptDeadlineMillis, attemptDurationMinutes) {
        val active = activeAttempt ?: return@LaunchedEffect
        val key = "${session.userId}:${active.id}"
        attemptPrefs.edit().putString("notes_$key", attemptNotes).putInt("seconds_$key", attemptSeconds)
            .putInt("duration_$key", attemptDurationMinutes).putBoolean("finished_$key", attemptFinished)
            .putBoolean("running_$key", attemptRunning && !attemptFinished)
            .putLong("deadline_$key", if (attemptRunning && !attemptFinished) attemptDeadlineMillis else 0L).apply()
    }
    LaunchedEffect(activeAttempt?.id, attemptRunning, attemptFinished, attemptDeadlineMillis) {
        while (attemptRunning && !attemptFinished && attemptDeadlineMillis > 0L) {
            val remaining = (((attemptDeadlineMillis - System.currentTimeMillis()).coerceAtLeast(0L) + 999L) / 1000L).toInt()
            attemptSeconds = remaining
            if (remaining <= 0) {
                attemptRunning = false
                attemptFinished = true
                attemptDeadlineMillis = 0L
                status = "Time is up. Your answer notes have been saved on this device."
                break
            }
            kotlinx.coroutines.delay(1_000L)
        }
    }
    LaunchedEffect(session.userId,subjects) {
        load {
            syllabi=withContext(Dispatchers.IO) { api.loadExamSyllabi(session,subjects.map { it.name }) }
            val onboardingPrefs = context.getSharedPreferences("offline_starter_pack_v1", Context.MODE_PRIVATE)
            if (!onboardingPrefs.getBoolean("prompted_${session.userId}", false) && syllabi.isNotEmpty()) {
                showStarterPackPrompt = true
            }
        }
    }
    if (showStarterPackPrompt) {
        androidx.compose.ui.window.Dialog(
            onDismissRequest = {
                showStarterPackPrompt = false
                context.getSharedPreferences("offline_starter_pack_v1", Context.MODE_PRIVATE).edit().putBoolean("prompted_${session.userId}", true).apply()
            },
            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background
            ) {
                Column(
                    modifier = Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()
                        .padding(horizontal = 24.dp, vertical = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text("SHADECODE STUDENT", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(4.dp))
                    Text("Let's set up your study space", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text("Step 1 of 1 · Get ready to study, even when the internet disappears.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Your study subjects", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            if (subjects.isEmpty()) {
                                Text("Your selected subjects will appear here once your profile is set up.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            } else {
                                subjects.forEach { subject ->
                                    Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)) {
                                            Text(subject.name.take(1).uppercase(), modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                        }
                                        Column(Modifier.weight(1f)) {
                                            Text(subject.name, fontWeight = FontWeight.Medium)
                                            Text("Selected subject", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Prepare offline papers", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text("With your permission, Shadecode will try to save a recent question paper and its matching mark scheme for each available subject. The starter pack is capped at 12 PDFs.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("• Downloads only on Wi-Fi or Ethernet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("• Saved privately on this device", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("• Works offline after download", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("• You can skip this and download papers later", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    if (starterPackBusy) {
                        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            CircularProgressIndicator()
                            Column {
                                Text("Preparing your offline study pack…", fontWeight = FontWeight.SemiBold)
                                Text("Keep Shadecode open while files are saved.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    Button(
                        onClick = {
                            val onboardingPrefs = context.getSharedPreferences("offline_starter_pack_v1", Context.MODE_PRIVATE)
                            onboardingPrefs.edit().putBoolean("prompted_${session.userId}", true).apply()
                            val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                            val network = connectivity.activeNetwork
                            val caps = connectivity.getNetworkCapabilities(network)
                            val unmetered = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true ||
                                caps?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true
                            if (!unmetered) {
                                showStarterPackPrompt = false
                                status = "Starter pack paused: connect to Wi-Fi or Ethernet, then download papers from Exam Hub."
                                return@Button
                            }
                            if (starterPackBusy) return@Button
                            starterPackBusy = true
                            scope.launch {
                                var savedCount = 0
                                var attemptedCount = 0
                                try {
                                    for (subjectItem in syllabi) {
                                        if (savedCount >= 12) break
                                        val available = withContext(Dispatchers.IO) { api.loadExamPaperFacets(session, subjectItem.id) }
                                        val chosenLevel = available.levels.firstOrNull() ?: subjectItem.levels.firstOrNull() ?: continue
                                        val levelFacets = withContext(Dispatchers.IO) { api.loadExamPaperFacets(session, subjectItem.id, chosenLevel) }
                                        val chosenSession = levelFacets.sessions.firstOrNull() ?: continue
                                        val chosenYear = levelFacets.years.maxOrNull() ?: continue
                                        val availablePapers = withContext(Dispatchers.IO) {
                                            api.loadExamPapers(session, subjectItem.id, chosenLevel, chosenSession, chosenYear)
                                        }
                                        val questionPaper = availablePapers.firstOrNull {
                                            it.kind.lowercase() in listOf("qp", "question_paper", "question-paper")
                                        } ?: continue
                                        val matchingComponentKinds = mapOf(
                                            "mark scheme" to setOf("ms", "mark_scheme", "mark-scheme"),
                                            "insert" to setOf("in", "insert", "inserts"),
                                            "data booklet" to setOf("db", "data_booklet", "data-booklet", "formulae_booklet", "formulae-booklet"),
                                        )
                                        val matchingComponents = matchingComponentKinds.values.mapNotNull { kinds ->
                                            availablePapers.firstOrNull { paper ->
                                                paper.kind.lowercase() in kinds &&
                                                    paper.paperNumber == questionPaper.paperNumber &&
                                                    paper.variant == questionPaper.variant
                                            }
                                        }
                                        // Keep the complete matching exam bundle together where the catalogue has it:
                                        // question paper, mark scheme, insert and/or data/formula booklet.
                                        for (paper in (listOf(questionPaper) + matchingComponents).distinctBy { it.id }) {
                                            if (savedCount >= 12) break
                                            if (NativeOfflinePaperStore.find(context, session.userId, paper.id) != null) continue
                                            attemptedCount++
                                            try {
                                                val signed = withContext(Dispatchers.IO) { api.createSignedExamPaperUrl(session, paper.id) }
                                                withContext(Dispatchers.IO) {
                                                    NativeOfflinePaperStore.download(context, session.userId, paper, subjectItem.subject, subjectItem.board, signed)
                                                }
                                                savedCount++
                                            } catch (_: Exception) {
                                                // Keep going so one unavailable file does not block every other subject.
                                            }
                                        }
                                    }
                                    offlinePapers = withContext(Dispatchers.IO) { NativeOfflinePaperStore.list(context, session.userId) }
                                    status = if (savedCount > 0) {
                                        "Offline starter pack ready: saved $savedCount PDF(s). You can now open them without internet."
                                    } else if (attemptedCount == 0) {
                                        "No new starter papers were available to download. Browse the catalogue and try individual papers."
                                    } else {
                                        "The starter pack could not be completed. Check your connection and download papers individually."
                                    }
                                    showStarterPackPrompt = false
                                } catch (e: Exception) {
                                    error = e.message ?: "Could not prepare the offline starter pack."
                                    showStarterPackPrompt = false
                                } finally {
                                    starterPackBusy = false
                                }
                            }
                        },
                        enabled = !starterPackBusy && subjects.isNotEmpty(),
                        modifier = Modifier.fillMaxWidth().height(54.dp)
                    ) { Text(if (starterPackBusy) "Preparing…" else "Set up offline study") }
                    OutlinedButton(
                        onClick = {
                            showStarterPackPrompt = false
                            context.getSharedPreferences("offline_starter_pack_v1", Context.MODE_PRIVATE).edit().putBoolean("prompted_${session.userId}", true).apply()
                            status = "Setup skipped. You can download papers later from Exam Hub."
                        },
                        enabled = !starterPackBusy,
                        modifier = Modifier.fillMaxWidth().height(50.dp)
                    ) { Text("Skip for now") }
                    Text("Downloads do not happen silently during installation. You stay in control of data use.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
    Column(Modifier.fillMaxSize().padding(padding).padding(horizontal=16.dp, vertical=12.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f)) { Text("Exam Hub",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold); Text("Past-paper catalog",color=MaterialTheme.colorScheme.onSurfaceVariant) }
            OutlinedButton(onClick=onBack) { Text("Back") }
        }
        Spacer(Modifier.height(10.dp))
        if (activeAttempt == null) {
            Text("Timed attempt length", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(30, 60, 90, 120).forEach { minutes ->
                    FilterChip(
                        selected = attemptDurationMinutes == minutes,
                        onClick = { attemptDurationMinutes = minutes },
                        label = { Text("${minutes} min") }
                    )
                }
            }
            Text("New attempts use this duration. Existing attempts keep their saved timer.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(4.dp))
        }
        if(loading) LinearProgressIndicator(Modifier.fillMaxWidth())
        error?.let { Text(it,color=MaterialTheme.colorScheme.error) }
        status?.let { Text(it,color=MaterialTheme.colorScheme.primary,style=MaterialTheme.typography.bodySmall) }
        LazyColumn(verticalArrangement=Arrangement.spacedBy(8.dp),contentPadding=PaddingValues(bottom=24.dp)) {
            if (activeAttempt != null) {
                item {
                    val active = activeAttempt!!
                    val matchingMarkScheme = papers.firstOrNull {
                        it.kind.lowercase() in listOf("ms", "mark_scheme", "mark-scheme") &&
                            it.paperNumber == active.paperNumber && it.variant == active.variant &&
                            it.year == active.year && it.session.equals(active.session, ignoreCase = true) &&
                            it.level.equals(active.level, ignoreCase = true)
                    }
                    val matchingOfflineMarkScheme = offlinePapers.firstOrNull {
                        it.kind.lowercase() in listOf("ms", "mark_scheme", "mark-scheme") &&
                            it.paperNumber == active.paperNumber && it.variant == active.variant &&
                            it.year == active.year && it.session.equals(active.session, ignoreCase = true) &&
                            it.level.equals(active.level, ignoreCase = true)
                    }
                    val matchingMarkSchemeId = matchingMarkScheme?.id ?: matchingOfflineMarkScheme?.id
                    Card(Modifier.fillMaxWidth(), shape=RoundedCornerShape(18.dp), colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface)) {
                        Column(Modifier.padding(16.dp), verticalArrangement=Arrangement.spacedBy(10.dp)) {
                            Text("Past-paper attempt", style=MaterialTheme.typography.headlineSmall, fontWeight=FontWeight.Bold)
                            Text("${syllabus?.subject ?: "Exam"} · ${active.level} · ${active.session} ${active.year}", color=MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("Paper ${active.paperNumber} / ${active.variant}", style=MaterialTheme.typography.titleMedium)
                            Text("Time remaining: ${attemptSeconds / 60}:${(attemptSeconds % 60).toString().padStart(2, '0')}", style=MaterialTheme.typography.headlineSmall, color=if (attemptSeconds < 60) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary)
                            Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                                Button(onClick = {
                                    if (attemptRunning) {
                                        attemptSeconds = (((attemptDeadlineMillis - System.currentTimeMillis()).coerceAtLeast(0L) + 999L) / 1000L).toInt()
                                        attemptRunning = false
                                        attemptDeadlineMillis = 0L
                                        status = "Timer paused. Notes are saved locally."
                                    } else if (attemptSeconds > 0 && !attemptFinished) {
                                        attemptDeadlineMillis = System.currentTimeMillis() + attemptSeconds * 1000L
                                        attemptRunning = true
                                        status = "Timer running. It accounts for time spent away from the app."
                                    }
                                }, enabled = attemptSeconds > 0 && !attemptFinished) { Text(if (attemptRunning) "Pause timer" else "Resume timer") }
                                OutlinedButton(onClick = { attemptRunning = false; attemptDeadlineMillis = 0L; attemptFinished = true; status = "Attempt finished. Notes are saved locally; review them against the mark scheme." }) { Text(if (attemptFinished) "Finished" else "Finish attempt") }
                            }
                            Text("Open the PDF, then return here to write your answers. Notes save automatically on this device.", style=MaterialTheme.typography.bodySmall, color=MaterialTheme.colorScheme.onSurfaceVariant)
                            Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                                Button(onClick = {
                                    val cached = NativeOfflinePaperStore.find(context, session.userId, active.id)
                                    if (cached != null) {
                                        try { val uri = NativeOfflinePaperStore.openUri(context, cached); context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)) }
                                        catch (e: Exception) { error = e.message ?: "Could not open saved paper." }
                                    } else scope.launch {
                                        openingPaperId = active.id
                                        try { val url = withContext(Dispatchers.IO) { api.createSignedExamPaperUrl(session, active.id) }; context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                                        catch (e: Exception) { error = e.message ?: "Could not open paper. Download it first for offline use." }
                                        finally { openingPaperId = null }
                                    }
                                }) { Text("Open question paper") }
                                if (matchingMarkSchemeId != null) OutlinedButton(onClick = {
                                    val cached = NativeOfflinePaperStore.find(context, session.userId, matchingMarkSchemeId)
                                    if (cached != null) {
                                        try { val uri = NativeOfflinePaperStore.openUri(context, cached); context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)) }
                                        catch (e: Exception) { error = e.message ?: "Could not open saved mark scheme." }
                                    } else if (matchingMarkScheme != null) scope.launch {
                                        try { val url = withContext(Dispatchers.IO) { api.createSignedExamPaperUrl(session, matchingMarkScheme.id) }; context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                                        catch (e: Exception) { error = e.message ?: "Could not open mark scheme." }
                                    } else {
                                        error = "This mark scheme is not available offline. Connect to the internet to download it."
                                    }
                                }) { Text("Mark scheme") }
                            }
                            OutlinedTextField(value=attemptNotes, onValueChange={ attemptNotes=it }, modifier=Modifier.fillMaxWidth().heightIn(min=220.dp), label={ Text("Answer sheet / working") }, placeholder={ Text("Write answers, working and question numbers here…") }, minLines=8)
                            Text("Self-mark against the official mark scheme. This version does not automatically grade PDFs or award XP.", style=MaterialTheme.typography.bodySmall, color=MaterialTheme.colorScheme.onSurfaceVariant)
                            if (attemptFinished) {
                                OutlinedButton(
                                    onClick = { showRestartAttemptConfirm = true },
                                    modifier = Modifier.fillMaxWidth(),
                                ) { Text("Start a fresh attempt") }
                            }
                            if (showRestartAttemptConfirm) {
                                AlertDialog(
                                    onDismissRequest = { showRestartAttemptConfirm = false },
                                    title = { Text("Start a fresh attempt?") },
                                    text = { Text("This clears the saved answer notes and timer for this paper on this account. Downloaded PDFs are not affected.") },
                                    confirmButton = {
                                        TextButton(onClick = {
                                            val key = "${session.userId}:${active.id}"
                                            attemptPrefs.edit()
                                                .remove("notes_$key")
                                                .remove("seconds_$key")
                                                .remove("duration_$key")
                                                .remove("finished_$key")
                                                .remove("running_$key")
                                                .remove("deadline_$key")
                                                .apply()
                                            attemptNotes = ""
                                            attemptSeconds = attemptDurationMinutes * 60
                                            attemptFinished = false
                                            attemptRunning = false
                                            attemptDeadlineMillis = 0L
                                            showRestartAttemptConfirm = false
                                            status = "Fresh attempt ready. Start the timer when you are ready."
                                        }) { Text("Clear and restart") }
                                    },
                                    dismissButton = {
                                        TextButton(onClick = { showRestartAttemptConfirm = false }) { Text("Cancel") }
                                    },
                                )
                            }
                            OutlinedButton(onClick={ activeAttempt=null }) { Text("Return to paper catalogue") }
                            Text("Timer uses a saved wall-clock deadline, so closing and reopening the app will not reset elapsed time. Pause it if you want it stopped.", style=MaterialTheme.typography.bodySmall, color=MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
            if (offlinePapers.isNotEmpty()) {
                item {
                    Text("Available offline on this device", style=MaterialTheme.typography.titleLarge, fontWeight=FontWeight.Bold)
                    Text("Downloaded PDFs open without internet. They stay private to this app and signed-in account.", color=MaterialTheme.colorScheme.onSurfaceVariant, style=MaterialTheme.typography.bodySmall)
                }
                items(offlinePapers, key = { "offline-${it.id}" }) { saved ->
                    Card(Modifier.fillMaxWidth(), shape=RoundedCornerShape(14.dp), colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface)) {
                        Column(Modifier.padding(14.dp), verticalArrangement=Arrangement.spacedBy(6.dp)) {
                            Text("${saved.subject} · ${saved.board}", fontWeight=FontWeight.SemiBold)
                            Text("${saved.title} · ${saved.session} ${saved.year}", style=MaterialTheme.typography.bodySmall, color=MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(String.format(java.util.Locale.ROOT, "%.1f MB · saved for offline use", saved.bytes / (1024.0 * 1024.0)), style=MaterialTheme.typography.labelSmall, color=MaterialTheme.colorScheme.primary)
                            Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                                Button(onClick = {
                                    try {
                                        val uri = NativeOfflinePaperStore.openUri(context, saved)
                                        context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
                                    } catch (e: Exception) { error = e.message ?: "Could not open saved paper." }
                                }) { Text("Open offline") }
                                OutlinedButton(onClick = {
                                    NativeOfflinePaperStore.delete(context, session.userId, saved.id)
                                    offlinePapers = NativeOfflinePaperStore.list(context, session.userId)
                                }) { Text("Remove") }
                            }
                            if (saved.kind.lowercase() in listOf("qp", "question_paper", "question-paper")) {
                                OutlinedButton(onClick = {
                                    beginAttempt(NativeExamPaper(saved.id, saved.level, saved.session, saved.year, saved.paperNumber, saved.variant, saved.kind, "", null))
                                }, modifier=Modifier.fillMaxWidth()) { Text("Start offline timed attempt") }
                            }
                        }
                    }
                }
            }
            if(syllabus==null) {
                item { Text("Choose one of your selected subjects",style=MaterialTheme.typography.titleMedium) }
                items(syllabi) { item -> ExamCatalogCard("${item.subject} · ${item.board}",item.levels.joinToString(" · ").ifBlank { "Levels available in library" }) {
                    syllabus=item; level=null; examSession=null; year=null; papers=emptyList()
                    load { facets=withContext(Dispatchers.IO) { api.loadExamPaperFacets(session,item.id) } }
                } }
                if(!loading && syllabi.isEmpty() && error==null) item { Text("No syllabuses matched your selected subjects. Update your subjects in Profile.",color=MaterialTheme.colorScheme.onSurfaceVariant) }
            } else {
                item { OutlinedButton(onClick={ syllabus=null; facets=null; level=null; examSession=null; year=null; papers=emptyList() }) { Text("← All subjects") } }
                item { Text("${syllabus!!.subject} · ${syllabus!!.board}",style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold) }
                item { Text("Level",style=MaterialTheme.typography.titleMedium) }
                items((facets?.levels ?: syllabus!!.levels).distinct()) { value -> ExamCatalogCard(value,if(level==value) "Selected" else "Show sessions") {
                    level=value; examSession=null; year=null; papers=emptyList()
                    load { facets=withContext(Dispatchers.IO) { api.loadExamPaperFacets(session,syllabus!!.id,value) } }
                } }
                if(level!=null) {
                    item { Text("Session",style=MaterialTheme.typography.titleMedium) }
                    items(facets?.sessions ?: emptyList()) { value -> ExamCatalogCard(value,if(examSession==value) "Selected" else "Choose session") { examSession=value; year=null; papers=emptyList() } }
                }
                if(examSession!=null) {
                    item { Text("Year",style=MaterialTheme.typography.titleMedium) }
                    items(facets?.years ?: emptyList()) { value -> ExamCatalogCard(value.toString(),if(year==value) "Selected" else "Browse papers") {
                        year=value
                        load { papers=withContext(Dispatchers.IO) { api.loadExamPapers(session,syllabus!!.id,level!!,examSession!!,value) } }
                    } }
                }
                if(year!=null) {
                    item { Text("Papers · ${examSession} ${year}",style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.SemiBold) }
                    items(papers, key = { it.id }) { paper ->
                        val kind=when(paper.kind) { "qp"->"Question Paper"; "ms"->"Mark Scheme"; "in"->"Insert"; "gt"->"Grade Thresholds"; else->paper.kind.uppercase() }
                        val saved = offlinePapers.any { it.id == paper.id }
                        NativeExamPaperCard(
                            title = "Paper ${paper.paperNumber} / ${paper.variant} · $kind",
                            detail = "${paper.level} · ${paper.session} ${paper.year}",
                            isSaved = saved,
                            isOpening = openingPaperId == paper.id,
                            isDownloading = downloadingPaperId == paper.id,
                            onStartAttempt = { beginAttempt(paper) },
                            onOpen = {
                                val cached = NativeOfflinePaperStore.find(context, session.userId, paper.id)
                                if (cached != null) {
                                    try {
                                        val uri = NativeOfflinePaperStore.openUri(context, cached)
                                        context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
                                    } catch (e: Exception) { error = e.message ?: "Could not open saved paper." }
                                } else {
                                    scope.launch {
                                        openingPaperId = paper.id
                                        error = null
                                        try {
                                            val url = withContext(Dispatchers.IO) { api.createSignedExamPaperUrl(session, paper.id) }
                                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                                        } catch (e: Exception) {
                                            error = e.message ?: "Could not open this paper. Check your connection and try again."
                                        } finally { openingPaperId = null }
                                    }
                                }
                            },
                            onDownload = {
                                scope.launch {
                                    downloadingPaperId = paper.id
                                    error = null
                                    try {
                                        val signedUrl = withContext(Dispatchers.IO) { api.createSignedExamPaperUrl(session, paper.id) }
                                        val savedPaper = withContext(Dispatchers.IO) {
                                            NativeOfflinePaperStore.download(context, session.userId, paper, syllabus!!.subject, syllabus!!.board, signedUrl)
                                        }
                                        offlinePapers = NativeOfflinePaperStore.list(context, session.userId)
                                        status = "Saved ${savedPaper.title} for offline use on this device."
                                    } catch (e: Exception) {
                                        error = e.message ?: "Could not save this paper offline."
                                    } finally { downloadingPaperId = null }
                                }
                            }
                        )
                    }
                    if(!loading && papers.isEmpty() && error==null) item { Text("No papers are available for this selection yet.",color=MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }

            item {
                Spacer(Modifier.height(12.dp))
                Text("More learning resources", style=MaterialTheme.typography.headlineSmall, fontWeight=FontWeight.Bold)
                Text("Extra sources from the web. Availability, syllabus alignment and reuse rights differ by provider, so check each source before relying on it for an exam.", color=MaterialTheme.colorScheme.onSurfaceVariant, style=MaterialTheme.typography.bodySmall)
            }
            item { ExternalLearningResourceCard("Cambridge International Resource Centre", "Official syllabus pages, selected past papers, specimen papers, examiner reports and published resources.", "https://www.cambridgeinternational.org/resource-centre/") { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
            item { ExternalLearningResourceCard("ZIMSEC syllabuses", "Official Zimbabwe syllabuses across many subjects and levels.", "https://www5.zimsec.co.zw/syllabi/") { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
            item { ExternalLearningResourceCard("ZIMSEC specimen papers", "Official specimen papers for Grade 7, O Level and A Level.", "https://www5.zimsec.co.zw/specimen-papers/") { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
            item { ExternalLearningResourceCard("ZIMSEC past-paper downloads", "Official published exam paper downloads. Check the individual item and subject before using.", "https://www5.zimsec.co.zw/download-category/o-level/") { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
            item { ExternalLearningResourceCard("Zimfundi", "Zimbabwe-focused O Level and A Level notes, syllabus topics, past papers and marking schemes. Third-party source, not the exam board.", "https://zimfundi.co.zw/") { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
            item { ExternalLearningResourceCard("PhET interactive simulations", "Free interactive mathematics and science simulations, useful for practical understanding and virtual experiments.", "https://phet.colorado.edu/") { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
            item { ExternalLearningResourceCard("Khan Academy", "Free lessons, practice questions and videos across maths, science, humanities and other subjects.", "https://www.khanacademy.org/") { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
            item { ExternalLearningResourceCard("CK-12", "Free digital textbooks, adaptive practice and interactive STEM learning resources.", "https://www.ck12.org/") { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
            item { ExternalLearningResourceCard("OpenStax", "Free, peer-reviewed textbooks in many subjects. Some content is licensed CC BY-NC-SA, so commercial reuse requires care.", "https://openstax.org/subjects") { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
        }
    }
}

 
@Composable
private fun NativeExamPaperCard(
    title: String,
    detail: String,
    isSaved: Boolean,
    isOpening: Boolean,
    isDownloading: Boolean,
    onOpen: () -> Unit,
    onDownload: () -> Unit,
    onStartAttempt: () -> Unit,
) {
    Card(Modifier.fillMaxWidth(), shape=RoundedCornerShape(14.dp), colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(14.dp), verticalArrangement=Arrangement.spacedBy(7.dp)) {
            Text(title, fontWeight=FontWeight.SemiBold)
            Text(detail, style=MaterialTheme.typography.bodySmall, color=MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                Button(onClick=onOpen, enabled=!isOpening && !isDownloading) {
                    Text(when { isOpening -> "Opening…"; isSaved -> "Open offline"; else -> "Open paper" })
                }
                OutlinedButton(onClick=onDownload, enabled=!isSaved && !isDownloading && !isOpening) {
                    Text(when { isDownloading -> "Downloading…"; isSaved -> "Saved offline"; else -> "Download for offline" })
                }
            }
            if (title.contains("Question Paper")) {
                OutlinedButton(onClick=onStartAttempt, modifier=Modifier.fillMaxWidth()) { Text("Start timed attempt") }
            }
            if (isSaved) Text("Stored on this device. No connection needed to reopen it.", style=MaterialTheme.typography.labelSmall, color=MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun ExternalLearningResourceCard(title:String, detail:String, url:String, onOpen:(String)->Unit) {
    Card(Modifier.fillMaxWidth().clickable { onOpen(url) },shape=RoundedCornerShape(14.dp),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(15.dp),verticalArrangement=Arrangement.spacedBy(5.dp)) {
            Text(title,fontWeight=FontWeight.SemiBold)
            Text(detail,style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Open resource ↗",style=MaterialTheme.typography.labelLarge,color=MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun ExamCatalogCard(title:String,detail:String,onClick:()->Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick=onClick),shape=RoundedCornerShape(14.dp),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(15.dp),verticalArrangement=Arrangement.spacedBy(4.dp)) {
            Text(title,fontWeight=FontWeight.SemiBold)
            Text(detail,style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
