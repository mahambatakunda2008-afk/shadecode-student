package com.shadecode.student

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID
import java.io.IOException
import java.net.SocketTimeoutException
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

private val ShadeBackground = Color(0xFF06111C)
private val ShadeSurface = Color(0xFF0B1E2D)
private val ShadePrimary = Color(0xFF22D3EE)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { ShadecodeStudentNative(applicationContext) }
    }
}

@Composable
private fun ShadecodeStudentNative(context: Context) {
    MaterialTheme(colorScheme = androidx.compose.material3.darkColorScheme(primary = ShadePrimary, background = ShadeBackground, surface = ShadeSurface)) {
        Surface(Modifier.fillMaxSize(), color = ShadeBackground) {
            val store = remember { NativeStore(context) }
            var session by remember { mutableStateOf<NativeSession?>(null) }
            var restoring by remember { mutableStateOf(true) }
            LaunchedEffect(Unit) {
                session = withContext(Dispatchers.IO) { store.readSession() }
                NativeSyncWorker.schedule(context)
                restoring = false
            }
            when {
                restoring -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                session == null -> LoginScreen({ session = it }, store)
                else -> StudentShell(session!!, { session = null }, store)
            }
        }
    }
}

@Composable
private fun NativeSetupScreen(
    session: NativeSession,
    profile: NativeProfile,
    api: NativeApi,
    sessionStore: NativeStore,
    onComplete: (NativeProfile) -> Unit,
    onSignOut: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var displayName by remember(profile.id) { mutableStateOf(profile.displayName.takeUnless { it == "Student" }.orEmpty()) }
    var studyLevel by remember(profile.id) { mutableStateOf(profile.studyLevel.takeUnless { it == "upper-secondary" }.orEmpty()) }
    var selectedCodes by remember(profile.id) { mutableStateOf(profile.subjects.map { NativeSubjectCatalog.codeFor(it) }.toSet()) }
    var search by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val filtered = remember(search) {
        NativeSubjectCatalog.all.distinctBy { it.code }.filter {
            search.isBlank() || it.label.contains(search, true) || it.group.contains(search, true)
        }
    }
    val stages = listOf("Primary", "Lower secondary", "O Level", "AS Level", "A Level", "University", "TVET / Polytechnic", "Independent study")
    val stageCodes = mapOf(
        "Primary" to "primary", "Lower secondary" to "lower-secondary", "O Level" to "o-level",
        "AS Level" to "as-level", "A Level" to "a-level", "University" to "university",
        "TVET / Polytechnic" to "tvet", "Independent study" to "independent"
    )

    Column(Modifier.fillMaxSize().background(ShadeBackground).navigationBarsPadding()) {
        Column(Modifier.fillMaxWidth().background(ShadeSurface).padding(horizontal = 24.dp, vertical = 22.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(48.dp).background(ShadePrimary.copy(alpha = 0.14f), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                    Text("S", color = ShadePrimary, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                }
                Column {
                    Text("SHADECODE STUDENT", style = MaterialTheme.typography.labelLarge, color = ShadePrimary, fontWeight = FontWeight.Bold)
                    Text("Let’s set up your space", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(12.dp))
            Text("A few details help Cortex shape your learning workspace around your real subjects and study level.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(3) { index ->
                    Box(Modifier.weight(1f).height(4.dp).background(if (index < 3) ShadePrimary else ShadeSurface, RoundedCornerShape(8.dp)))
                }
            }
        }
        LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = 20.dp),
            contentPadding = PaddingValues(top = 18.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Text("01 · YOU", color = ShadePrimary, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                Text("What should we call you?", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                OutlinedTextField(
                    value = displayName, onValueChange = { displayName = it; error = null },
                    modifier = Modifier.fillMaxWidth(), singleLine = true, label = { Text("Your name") },
                    placeholder = { Text("Name or nickname") }
                )
            }
            item {
                Spacer(Modifier.height(8.dp))
                Text("02 · YOUR STAGE", color = ShadePrimary, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                Text("Where are you studying?", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Choose the closest match. You can change it later in Profile.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(8.dp))
                stages.chunked(2).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        row.forEach { stage ->
                            val code = stageCodes.getValue(stage)
                            val selected = studyLevel.equals(code, true)
                            androidx.compose.material3.FilterChip(
                                selected = selected,
                                onClick = { studyLevel = code; error = null },
                                label = { Text(stage) },
                                modifier = Modifier.weight(1f),
                            )
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
            item {
                Spacer(Modifier.height(8.dp))
                Text("03 · YOUR SUBJECTS", color = ShadePrimary, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                Text("Build your subject list", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("${selectedCodes.size} selected · Search across sciences, languages, humanities, business, technology and more.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                OutlinedTextField(
                    value = search, onValueChange = { search = it },
                    modifier = Modifier.fillMaxWidth(), singleLine = true, label = { Text("Search all subjects") }
                )
            }
            items(filtered, key = { it.code }) { option ->
                Row(
                    Modifier.fillMaxWidth().background(ShadeSurface, RoundedCornerShape(14.dp)).padding(horizontal = 10.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Checkbox(
                        checked = option.code in selectedCodes,
                        onCheckedChange = { checked ->
                            selectedCodes = if (checked) selectedCodes + option.code else selectedCodes - option.code
                            error = null
                        }
                    )
                    Column(Modifier.weight(1f).padding(vertical = 8.dp)) {
                        Text(option.label, fontWeight = FontWeight.SemiBold)
                        Text(option.group, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            item {
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Button(
                    onClick = {
                        if (studyLevel.isBlank()) { error = "Choose your study level to continue."; return@Button }
                        if (selectedCodes.isEmpty()) { error = "Choose at least one subject. You can add more later."; return@Button }
                        val updated = profile.copy(
                            displayName = displayName.trim().ifBlank { "Student" },
                            studyLevel = studyLevel,
                            subjects = selectedCodes.toList().sorted(),
                            onboardingCompleted = true,
                        )
                        saving = true
                        error = null
                        scope.launch {
                            try {
                                withContext(Dispatchers.IO) { api.saveLearnerProfile(session, updated) }
                                withContext(Dispatchers.IO) { sessionStore.saveProfile(updated) }
                                onComplete(updated)
                            } catch (e: Exception) {
                                error = e.message ?: "Setup could not be saved. Check your connection and try again."
                            } finally {
                                saving = false
                            }
                        }
                    },
                    enabled = !saving,
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                ) {
                    if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("Build my learning space")
                }
                TextButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) { Text("Sign out") }
                Text("Subject selection personalizes the workspace. It does not mean every syllabus or topic is already verified.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun LoginScreen(onSignedIn: (NativeSession) -> Unit, sessionStore: NativeStore) {
    val scope = rememberCoroutineScope(); val api = remember { NativeApi() }
    var email by remember { mutableStateOf("") }; var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }; var error by remember { mutableStateOf<String?>(null) }
    Column(Modifier.fillMaxSize().padding(28.dp).navigationBarsPadding(), verticalArrangement = Arrangement.Center) {
        Text("Shadecode", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
        Text("Student", style = MaterialTheme.typography.headlineMedium, color = ShadePrimary, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp)); Text("A native learning workspace built around you.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(32.dp))
        OutlinedTextField(email, { email = it; error = null }, label = { Text("Email") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(password, { password = it; error = null }, label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
        if (error != null) { Spacer(Modifier.height(10.dp)); Text(error!!, color = MaterialTheme.colorScheme.error) }
        Spacer(Modifier.height(20.dp))
        Button(onClick = {
            loading = true
            scope.launch {
                try {
                    val result = withContext(Dispatchers.IO) { api.signIn(email.trim(), password) }
                    withContext(Dispatchers.IO) { sessionStore.saveSession(result) }
                    NativeSyncWorker.schedule(sessionStore.context()); onSignedIn(result)
                } catch (e: Exception) { error = e.message ?: "Sign in failed." } finally { loading = false }
            }
        }, enabled = !loading && email.isNotBlank() && password.isNotBlank(), modifier = Modifier.fillMaxWidth().height(52.dp)) {
            if (loading) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp) else Text("Sign in")
        }
        Spacer(Modifier.height(12.dp)); Text("Native Android client. No WebView.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun StudentShell(session: NativeSession, onSignOut: () -> Unit, sessionStore: NativeStore) {
    val api = remember { NativeApi() }; val database = remember { NativeDatabase.get(sessionStore.context()) }
    var profile by remember { mutableStateOf<NativeProfile?>(null) }; var subjects by remember { mutableStateOf<List<NativeSubjectEntity>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }; var error by remember { mutableStateOf<String?>(null) }; var selected by remember { mutableStateOf(0) }
    var showExamHub by remember { mutableStateOf(false) }
    var showExamSimulation by remember { mutableStateOf(false) }
    var focusDuration by remember { mutableStateOf(25 * 60) }
    var focusRemaining by remember { mutableStateOf(25 * 60) }
    var focusRunning by remember { mutableStateOf(false) }
    var focusCompletionHandled by remember { mutableStateOf(false) }
    var focusStatus by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    // Keep the countdown above tab navigation so learners can move into Learn without losing the sprint.
    LaunchedEffect(focusRunning) {
        while (focusRunning && focusRemaining > 0) {
            delay(1_000)
            if (focusRunning && focusRemaining > 0) focusRemaining -= 1
        }
        if (focusRemaining == 0) focusRunning = false
    }

    LaunchedEffect(focusRemaining) {
        if (focusRemaining == 0 && !focusCompletionHandled) {
            focusCompletionHandled = true
            focusRunning = false
            val minutes = (focusDuration / 60).coerceIn(1, 120)
            val earnedXp = if (minutes == 5 || minutes == 15) 0 else kotlin.math.round(minutes * 0.5).toInt()
            focusStatus = "Session complete. Saving progress…"
            scope.launch {
                try {
                    val result = withContext(Dispatchers.IO) {
                        api.completeFocusSession(session, minutes, minutes.toString() + " min", earnedXp)
                    }
                    focusStatus = if (result.optBoolean("persisted", false)) "Session saved. XP awarded: " + result.optInt("xpAwarded", earnedXp) else "Session finished. Sync is pending."
                } catch (_: Exception) {
                    focusStatus = "Session finished, but sync failed. Check your connection."
                }
            }
        }
    }
    LaunchedEffect(session.accessToken) {
        subjects = withContext(Dispatchers.IO) { database.subjects().all() }
        profile = withContext(Dispatchers.IO) { sessionStore.readProfile() }
        try {
            val loaded = withContext(Dispatchers.IO) { api.loadProfile(session) }
            profile = loaded
            withContext(Dispatchers.IO) { sessionStore.saveProfile(loaded) }
            val remoteSubjects = withContext(Dispatchers.IO) { api.loadSubjects(session, loaded) }
            // An explicitly empty profile is authoritative: remove stale cached subjects.
            // If the profile still selects subjects but the catalog has not synced yet,
            // preserve the offline cache until the next successful refresh.
            if (loaded.subjects.isEmpty() || remoteSubjects.isNotEmpty()) {
                withContext(Dispatchers.IO) {
                    database.subjects().clear()
                    if (remoteSubjects.isNotEmpty()) database.subjects().replaceAll(remoteSubjects)
                }
            }
            subjects = withContext(Dispatchers.IO) { database.subjects().all() }
            error = null
        } catch (e: Exception) { error = e.message ?: "Could not refresh your profile." } finally { loading = false }
    }
    if (!loading && profile != null && !profile!!.onboardingCompleted) {
        NativeSetupScreen(
            session = session,
            profile = profile!!,
            api = api,
            sessionStore = sessionStore,
            onComplete = { updated ->
                profile = updated
                scope.launch {
                    try {
                        val refreshed = withContext(Dispatchers.IO) { api.loadSubjects(session, updated) }
                        withContext(Dispatchers.IO) {
                            database.subjects().clear()
                            if (refreshed.isNotEmpty()) database.subjects().replaceAll(refreshed)
                        }
                        subjects = withContext(Dispatchers.IO) { database.subjects().all() }
                    } catch (_: Exception) {
                        // The setup is saved; the normal shell can refresh the subject cache later.
                    }
                }
            },
            onSignOut = onSignOut,
        )
        return
    }

        Scaffold(containerColor = ShadeBackground, bottomBar = {
        if (!showExamHub && !showExamSimulation) NavigationBar(containerColor = ShadeSurface) {
            NavigationBarItem(selected == 0, { selected = 0 }, icon = { Icon(Icons.Default.Home, null) }, label = { Text("Home") })
            NavigationBarItem(selected == 1, { selected = 1 }, icon = { Icon(Icons.Default.Book, null) }, label = { Text("Learn") })
            NavigationBarItem(selected == 2, { selected = 2 }, icon = { Icon(Icons.Default.PlayArrow, null) }, label = { Text("Practice") })
            NavigationBarItem(selected == 3, { selected = 3 }, icon = { Icon(Icons.Default.DocumentScanner, null) }, label = { Text("Extract") })
            NavigationBarItem(selected == 4, { selected = 4 }, icon = { Icon(Icons.Default.Person, null) }, label = { Text("Profile") })
            NavigationBarItem(selected == 5, { selected = 5 }, icon = { Icon(Icons.Default.DateRange, null) }, label = { Text("Plan") })
        }
    }) { padding ->
        if (showExamHub) {
            NativeExamHubScreen(padding, session, api, subjects, onBack = { showExamHub = false })
        } else if (showExamSimulation) {
            NativeExamSimulationScreen(padding, session, api, subjects, onBack = { showExamSimulation = false }, onBrowsePastPapers = { showExamSimulation = false; showExamHub = true })
        } else when (selected) {
            0 -> DashboardScreen(padding, session, api, profile, subjects, loading, error, onOpenExamHub = { showExamHub = true }, onOpenExamSimulation = { showExamSimulation = true })
            5 -> NativeTimetableScreen(padding, session, api, subjects)
            1 -> LearnNativeScreen(padding, session, profile, subjects, database, api)
            2 -> NativePracticeScreen(
                padding = padding,
                subjects = subjects,
                database = database,
                focusDuration = focusDuration,
                focusRemaining = focusRemaining,
                focusRunning = focusRunning,
                onFocusDurationSelected = { seconds ->
                    focusRunning = false
                    focusCompletionHandled = false
                    focusStatus = null
                    focusDuration = seconds
                    focusRemaining = seconds
                },
                onFocusToggle = {
                    if (focusRemaining == 0) {
                        focusRemaining = focusDuration
                        focusCompletionHandled = false
                        focusStatus = null
                    }
                    focusRunning = !focusRunning
                },
                onFocusReset = {
                    focusRunning = false
                    focusCompletionHandled = false
                    focusStatus = null
                    focusRemaining = focusDuration
                },
                focusStatus = focusStatus,
            )
            3 -> SnapExtractScreen(padding)
            else -> ProfileNativeScreen(
                padding = padding,
                session = session,
                profile = profile,
                api = api,
                sessionStore = sessionStore,
                onProfileSaved = { updated ->
                    scope.launch {
                        profile = updated
                        try {
                            val remoteSubjects = withContext(Dispatchers.IO) { api.loadSubjects(session, updated) }
                            withContext(Dispatchers.IO) {
                                database.subjects().clear()
                                if (remoteSubjects.isNotEmpty()) database.subjects().replaceAll(remoteSubjects)
                            }
                            subjects = withContext(Dispatchers.IO) { database.subjects().all() }
                        } catch (e: Exception) {
                            error = "Profile saved. Subject list will refresh when you're online."
                        }
                    }
                },
                onSignOut = {
                    scope.launch { withContext(Dispatchers.IO) { sessionStore.clearSession() }; onSignOut() }
                },
            )
        }
    }
}

@Composable
private fun NativeTimetableScreen(
    padding: PaddingValues,
    session: NativeSession,
    api: NativeApi,
    subjects: List<NativeSubjectEntity>,
) {
    var slots by remember(session.userId) { mutableStateOf<List<NativeTimetableSlot>>(emptyList()) }
    var loading by remember(session.userId) { mutableStateOf(true) }
    var saving by remember(session.userId) { mutableStateOf(false) }
    var error by remember(session.userId) { mutableStateOf<String?>(null) }
    var message by remember(session.userId) { mutableStateOf<String?>(null) }
    var selectedSubjects by remember(session.userId) { mutableStateOf<List<String>>(emptyList()) }
    var startTime by remember(session.userId) { mutableStateOf("08:00") }
    var duration by remember(session.userId) { mutableStateOf("60") }
    var breakDuration by remember(session.userId) { mutableStateOf("10") }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current.applicationContext
    val store = remember(context) { NativeStore(context) }

    LaunchedEffect(session.accessToken) {
        loading = true
        val cached = withContext(Dispatchers.IO) { store.readTimetable(session.userId) }
        if (cached.isNotEmpty()) {
            slots = cached
            message = "Showing your last saved timetable while we check for updates."
        }
        try {
            val latest = withContext(Dispatchers.IO) { api.loadTimetable(session) }
            slots = latest
            withContext(Dispatchers.IO) { store.saveTimetable(session.userId, latest) }
            error = null
            message = null
        } catch (e: Exception) {
            error = e.message ?: "Could not load your timetable."
            if (cached.isNotEmpty()) message = "Offline: showing the last timetable saved on this device. Changes may need syncing."
        } finally {
            loading = false
        }
    }
    LaunchedEffect(subjects) {
        if (selectedSubjects.isEmpty() && subjects.isNotEmpty()) {
            selectedSubjects = subjects.take(4).map { it.name }
        } else {
            selectedSubjects = selectedSubjects.filter { selected -> subjects.any { it.name == selected } }
        }
    }

    fun makeSchedule() {
        val length = duration.toIntOrNull()
        val breakLength = breakDuration.toIntOrNull()
        val timeParts = startTime.split(":")
        val startHour = timeParts.getOrNull(0)?.toIntOrNull()
        val startMinute = timeParts.getOrNull(1)?.toIntOrNull()
        if (selectedSubjects.isEmpty()) {
            error = "Choose at least one subject."
            return
        }
        if (length == null || length !in 1..240 || breakLength == null || breakLength !in 1..60) {
            error = "Study length must be 1–240 minutes and breaks must be 1–60 minutes."
            return
        }
        if (startHour == null || startHour !in 0..23 || startMinute == null || startMinute !in 0..59 || !startTime.matches(Regex("\\d{2}:\\d{2}"))) {
            error = "Enter a start time in 24-hour HH:MM format, for example 08:00."
            return
        }
        var cursor = startHour * 60 + startMinute
        val generated = mutableListOf<NativeTimetableSlot>()
        fun format(total: Int): String {
            val normalized = ((total % 1440) + 1440) % 1440
            return "%02d:%02d".format(normalized / 60, normalized % 60)
        }
        selectedSubjects.forEachIndexed { index, subject ->
            val end = cursor + length
            generated += NativeTimetableSlot("local-study-$index", subject, format(cursor), format(end), false)
            cursor = end
            if (index < selectedSubjects.lastIndex) {
                val breakEnd = cursor + breakLength
                generated += NativeTimetableSlot("local-break-$index", "Break", format(cursor), format(breakEnd), true)
                cursor = breakEnd
            }
        }
        slots = generated
        error = null
        message = "Schedule generated on this device. Save it to sync across Shadecode."
        scope.launch { withContext(Dispatchers.IO) { store.saveTimetable(session.userId, generated) } }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(top = 18.dp, bottom = 24.dp),
    ) {
        item {
            Text("Your study plan", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text("Build a timetable around the subjects you actually study. Saving replaces your current timetable atomically.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Choose subjects", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    if (subjects.isEmpty()) {
                        Text("Add your subjects in Profile before generating a timetable.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        subjects.forEach { subject ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Checkbox(
                                    checked = selectedSubjects.contains(subject.name),
                                    onCheckedChange = { checked ->
                                        selectedSubjects = if (checked) selectedSubjects + subject.name else selectedSubjects - subject.name
                                        message = null
                                    },
                                )
                                Text(subject.name)
                            }
                        }
                    }
                    OutlinedTextField(
                        value = startTime,
                        onValueChange = { startTime = it; error = null },
                        label = { Text("Start time (24-hour)") },
                        placeholder = { Text("08:00") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = duration,
                            onValueChange = { duration = it.filter(Char::isDigit).take(3); error = null },
                            label = { Text("Study minutes") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                        OutlinedTextField(
                            value = breakDuration,
                            onValueChange = { breakDuration = it.filter(Char::isDigit).take(2); error = null },
                            label = { Text("Break minutes") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    Button(onClick = { makeSchedule() }, modifier = Modifier.fillMaxWidth(), enabled = subjects.isNotEmpty()) {
                        Text("Generate timetable")
                    }
                    Button(
                        onClick = {
                            scope.launch {
                                saving = true
                                error = null
                                message = null
                                try {
                                    withContext(Dispatchers.IO) { store.saveTimetable(session.userId, slots) }
                                    withContext(Dispatchers.IO) { api.saveTimetable(session, slots) }
                                    slots = withContext(Dispatchers.IO) { api.loadTimetable(session) }
                                    withContext(Dispatchers.IO) { store.saveTimetable(session.userId, slots) }
                                    message = "Timetable saved and synced to your Shadecode account."
                                } catch (e: Exception) {
                                    withContext(Dispatchers.IO) { store.saveTimetable(session.userId, slots) }
                                    if (isRetryableSyncFailure(e)) {
                                        withContext(Dispatchers.IO) {
                                            val queuedSlots = org.json.JSONArray()
                                            slots.forEach { slot ->
                                                queuedSlots.put(
                                                    org.json.JSONObject()
                                                        .put("id", slot.id)
                                                        .put("subject", slot.subject)
                                                        .put("startTime", slot.startTime)
                                                        .put("endTime", slot.endTime)
                                                        .put("isBreak", slot.isBreak),
                                                )
                                            }
                                            store.enqueuePendingOperation(
                                                session.userId,
                                                "timetable_replace",
                                                org.json.JSONObject().put("slots", queuedSlots),
                                            )
                                        }
                                        NativeSyncWorker.schedule(context)
                                        error = null
                                        message = "Timetable saved on this device. Sync is queued for when your connection returns."
                                    } else {
                                        error = "Could not sync the timetable. Your local copy is safe, but the server rejected the change. Check your access and try again."
                                    }
                                } finally {
                                    saving = false
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = slots.isNotEmpty() && !loading && !saving,
                    ) { Text(if (saving) "Saving…" else "Save and sync timetable") }
                    if (loading) CircularProgressIndicator()
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                    message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
                }
            }
        }
        if (!loading && error == null && slots.isEmpty()) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface)) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Your timetable is empty", fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(4.dp))
                        Text("Choose subjects above and generate your first schedule.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        item { Text("Schedule", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
        items(slots, key = { it.id }) { slot ->
            Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface)) {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.width(94.dp)) {
                        Text(slot.startTime.take(5), fontWeight = FontWeight.Bold, color = ShadePrimary)
                        Text(slot.endTime.take(5), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Column(Modifier.weight(1f)) {
                        Text(slot.subject, fontWeight = FontWeight.SemiBold)
                        Text(if (slot.isBreak) "Break" else "Study session", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
private fun DashboardScreen(padding: PaddingValues, session: NativeSession, api: NativeApi, profile: NativeProfile?, subjects: List<NativeSubjectEntity>, loading: Boolean, error: String?, onOpenExamHub: () -> Unit, onOpenExamSimulation: () -> Unit) {
    var tasks by remember { mutableStateOf<List<NativeTask>>(emptyList()) }
    var taskTitle by remember { mutableStateOf("") }
    var taskDescription by remember { mutableStateOf("") }
    var selectedTaskSubjectId by remember { mutableStateOf<String?>(null) }
    var tasksLoading by remember { mutableStateOf(false) }
    var taskMessage by remember { mutableStateOf<String?>(null) }
    val taskScope = rememberCoroutineScope()
    val context = LocalContext.current.applicationContext
    val store = remember(context) { NativeStore(context) }

    LaunchedEffect(subjects) {
        if (selectedTaskSubjectId == null || subjects.none { it.id == selectedTaskSubjectId }) selectedTaskSubjectId = subjects.firstOrNull()?.id
    }

    LaunchedEffect(session.accessToken) {
        tasksLoading = true
        val cached = withContext(Dispatchers.IO) { store.readTasks(session.userId) }
        if (cached.isNotEmpty()) {
            tasks = cached
            taskMessage = "Showing tasks last saved on this device."
        }
        try {
            val latest = withContext(Dispatchers.IO) { api.loadTasks(session) }
            tasks = latest
            withContext(Dispatchers.IO) { store.saveTasks(session.userId, latest) }
            taskMessage = null
        } catch (_: Exception) {
            taskMessage = if (cached.isNotEmpty()) {
                "Offline: showing cached tasks. New changes require a connection."
            } else {
                "Tasks could not sync. Your other study tools remain available."
            }
        } finally {
            tasksLoading = false
        }
    }

    LazyColumn(Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Spacer(Modifier.height(18.dp)); Text("Good to see you.", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(profile?.displayName ?: "Student", color = ShadePrimary, style = MaterialTheme.typography.titleLarge)
        }
        item { Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(22.dp)) {
            Column(Modifier.padding(20.dp)) { Text("Your learning system", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Spacer(Modifier.height(8.dp))
                Text(if (loading) "Syncing your academic profile…" else if (error != null) "Offline mode: using your last saved subjects." else "Your subjects and learning context are connected.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } }
        item { NativeCortexInsightsCard(session) }
        item { NativeExamHubEntryCard(subjects, onOpenExamHub) }
        item { NativeExamSimulationEntryCard(subjects, onOpenExamSimulation) }
        item { MoreShadecodeToolsCard(context) }
        item { Text("My subjects", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
        if (subjects.isEmpty()) item { Text("No subjects selected yet. Complete onboarding to start learning.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        else items(subjects) { SubjectRow(it.name) }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("My tasks", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("Keep the next small step visible. Tasks are shared with your Shadecode account.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Subject", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    if (subjects.isEmpty()) {
                        Text("Add subjects in Profile before creating subject tasks.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            subjects.forEach { subject ->
                                OutlinedButton(onClick = { selectedTaskSubjectId = subject.id }) {
                                    Text(if (selectedTaskSubjectId == subject.id) "✓ " + subject.name else subject.name, maxLines = 1)
                                }
                            }
                        }
                    }
                    OutlinedTextField(
                        value = taskTitle,
                        onValueChange = { taskTitle = it; taskMessage = null },
                        label = { Text("New task") },
                        placeholder = { Text("e.g. Finish Physics wave questions") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = taskDescription,
                        onValueChange = { taskDescription = it },
                        label = { Text("Notes (optional)") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 3,
                    )
                    Button(
                        onClick = {
                            val title = taskTitle.trim()
                            if (title.isEmpty()) {
                                taskMessage = "Enter a task title first."
                            } else {
                                taskScope.launch {
                                    try {
                                        try {
                                            val created = withContext(Dispatchers.IO) { api.createTask(session, title, taskDescription, selectedTaskSubjectId.orEmpty()) }
                                            tasks = (tasks + created).sortedBy { it.dueDate.orEmpty() }
                                            withContext(Dispatchers.IO) { store.saveTasks(session.userId, tasks) }
                                            taskMessage = "Task saved and synced."
                                        } catch (networkError: Exception) {
                                            if (!isRetryableSyncFailure(networkError)) throw networkError
                                            val localId = "local-task-${UUID.randomUUID()}"
                                            val localTask = NativeTask(localId, selectedTaskSubjectId.orEmpty(), title, taskDescription.trim(), null, false)
                                            tasks = (tasks + localTask).sortedBy { it.dueDate.orEmpty() }
                                            withContext(Dispatchers.IO) {
                                                store.saveTasks(session.userId, tasks)
                                                store.enqueuePendingOperation(
                                                    session.userId,
                                                    "task_create",
                                                    org.json.JSONObject()
                                                        .put("localId", localId)
                                                        .put("title", title)
                                                        .put("description", taskDescription)
                                                        .put("subjectId", selectedTaskSubjectId.orEmpty()),
                                                )
                                            }
                                            NativeSyncWorker.schedule(context)
                                            taskMessage = "Saved on this device. It will sync when your connection returns."
                                        }
                                        taskTitle = ""
                                        taskDescription = ""
                                    } catch (_: Exception) {
                                        taskMessage = "Task could not be saved. Check your connection and permissions."
                                    }
                                }
                            }
                        },
                        enabled = taskTitle.isNotBlank() && !tasksLoading && selectedTaskSubjectId != null,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Add task") }
                    if (tasksLoading) Text("Loading tasks…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (tasks.isEmpty() && !tasksLoading) Text("No tasks yet. Add one small next step above.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    tasks.forEach { task ->
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = task.completed,
                                onCheckedChange = { checked ->
                                    if (checked && !task.completed) {
                                        tasks = tasks.map { if (it.id == task.id) it.copy(completed = true) else it }
                                        taskScope.launch {
                                            try {
                                                withContext(Dispatchers.IO) { api.completeTask(session, task.id) }
                                                withContext(Dispatchers.IO) { store.saveTasks(session.userId, tasks) }
                                                taskMessage = "Task completed and synced."
                                            } catch (syncError: Exception) {
                                                if (isRetryableSyncFailure(syncError)) {
                                                    withContext(Dispatchers.IO) {
                                                        store.saveTasks(session.userId, tasks)
                                                        store.enqueuePendingOperation(
                                                            session.userId,
                                                            "task_complete",
                                                            org.json.JSONObject().put("taskId", task.id),
                                                        )
                                                    }
                                                    NativeSyncWorker.schedule(context)
                                                    taskMessage = "Completion saved on this device. It will sync when your connection returns."
                                                } else {
                                                    tasks = tasks.map { if (it.id == task.id) it.copy(completed = false) else it }
                                                    taskMessage = "Could not complete this task. Check your permissions and try again."
                                                }
                                            }
                                        }
                                    }
                                },
                            )
                            Spacer(Modifier.width(8.dp))
                            Column(Modifier.weight(1f)) {
                                Text(task.title, fontWeight = FontWeight.SemiBold)
                                if (task.description.isNotBlank()) Text(task.description, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                                if (task.dueDate != null) Text("Due " + task.dueDate.take(10), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                    taskMessage?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }
}

private data class NativeToolLink(val title: String, val path: String, val description: String)

@Composable
private fun MoreShadecodeToolsCard(context: Context) {
    val links = listOf(
        NativeToolLink("Exam Hub", "/exam-hub", "Past papers and exam resources"),
        NativeToolLink("Exam Simulation", "/exam-sim", "Timed exam practice"),
        NativeToolLink("Math Checker", "/math-checker", "Work through maths problems"),
        NativeToolLink("Code Lab", "/code-lab", "Programming practice"),
        NativeToolLink("Projects", "/projects", "Build and explore projects"),
        NativeToolLink("Careers", "/careers", "Explore study and career paths"),
        NativeToolLink("Focus", "/focus", "Open the full focus workspace"),
        NativeToolLink("Achievements", "/achievements", "Review milestones and progress"),
        NativeToolLink("Insights", "/insights", "Explore learning analytics"),
        NativeToolLink("Curriculum", "/curriculum", "Browse curriculum resources"),
    )
    var message by remember { mutableStateOf<String?>(null) }
    Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(22.dp)) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("More Shadecode tools", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("These modules open in your browser for now. Native versions are being built in stages, and your signed-in web session may need to be restored there.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
            links.chunked(2).forEach { pair ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    pair.forEach { link ->
                        OutlinedButton(
                            onClick = {
                                val target = Uri.parse(BuildConfig.APP_BASE_URL.trimEnd('/') + link.path)
                                try {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, target).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                                    message = null
                                } catch (_: Exception) {
                                    message = "Could not open ${link.title}. Check that a browser is installed."
                                }
                            },
                            modifier = Modifier.weight(1f),
                        ) { Text(link.title, maxLines = 1) }
                    }
                    if (pair.size == 1) Spacer(Modifier.weight(1f))
                }
            }
            message?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        }
    }
}

@Composable
private fun SubjectRow(subject: String) {
    Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(16.dp)) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).background(ShadePrimary.copy(alpha = 0.14f), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) { Icon(Icons.Default.Book, null, tint = ShadePrimary) }
            Spacer(Modifier.width(14.dp)); Text(subject.replace('_', ' ').replaceFirstChar { it.uppercase() }, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun LearnNativeScreen(
    padding: PaddingValues,
    session: NativeSession,
    profile: NativeProfile?,
    subjects: List<NativeSubjectEntity>,
    database: NativeDatabase,
    api: NativeApi,
) {
    val context = LocalContext.current
    val cortex = remember { NativeCortexOrchestrator() }
    var selectedSubjectId by remember { mutableStateOf<String?>(null) }
    var lessons by remember { mutableStateOf<List<NativeLessonEntity>>(emptyList()) }
    var activeLesson by remember { mutableStateOf<NativeLessonEntity?>(null) }
    var refreshing by remember { mutableStateOf(false) }; var offline by remember { mutableStateOf(false) }
    var localAvailable by remember { mutableStateOf(false) }
    var localTopic by remember { mutableStateOf("") }
    var generating by remember { mutableStateOf(false) }
    var generationMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    DisposableEffect(cortex) { onDispose { cortex.close() } }
    LaunchedEffect(Unit) {
        localAvailable = withContext(Dispatchers.IO) { cortex.warmLocalModel() }
    }
    LaunchedEffect(subjects) { if (selectedSubjectId == null || subjects.none { it.id == selectedSubjectId }) selectedSubjectId = subjects.firstOrNull()?.id }
    LaunchedEffect(selectedSubjectId) {
        val subjectId = selectedSubjectId ?: return@LaunchedEffect
        lessons = withContext(Dispatchers.IO) { database.lessons().forSubject(subjectId) }; refreshing = true
        try {
            val remote = withContext(Dispatchers.IO) { api.loadLessons(session, subjectId) }
            if (remote.isNotEmpty()) {
                withContext(Dispatchers.IO) {
                    database.lessons().clearSubject(subjectId)
                    database.lessons().replaceAll(remote)
                }
            }
            lessons = withContext(Dispatchers.IO) { database.lessons().forSubject(subjectId) }
            offline = false
        } catch (_: Exception) { offline = true } finally { refreshing = false }
    }
    if (activeLesson != null) {
        NativeLessonReader(context, session, activeLesson!!, database, api) { activeLesson = null }; return
    }
    LazyColumn(Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Spacer(Modifier.height(18.dp)); Text("Learn", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold); Text("Your actual courses and lessons, cached for offline study.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        if (subjects.isEmpty()) item { Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(20.dp)) { Text("No subjects are configured for this account yet. Complete onboarding first.", Modifier.padding(20.dp)) } }
        else {
            item { Text("Subjects", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
            items(subjects) { subject ->
                val active = subject.id == selectedSubjectId
                Card(onClick = { selectedSubjectId = subject.id }, colors = CardDefaults.cardColors(containerColor = if (active) ShadePrimary.copy(alpha = 0.16f) else ShadeSurface), shape = RoundedCornerShape(16.dp)) {
                    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.Book, null, tint = if (active) ShadePrimary else MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.width(12.dp)); Text(subject.name, fontWeight = if (active) FontWeight.Bold else FontWeight.Normal) }
                }
            }
            item {
                Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(20.dp)) {
                    Column(Modifier.padding(18.dp)) {
                        Text("Cortex", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            if (localAvailable) "Local-first generation is ready. Cortex tries the on-device model first, then uses cloud Cortex only if needed."
                            else "This device cannot use the local model right now. Cortex will use cloud generation when connected, or stay cached-only offline.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = localTopic,
                            onValueChange = { localTopic = it; generationMessage = null },
                            label = { Text("What do you want to learn?") },
                            placeholder = { Text("e.g. Trigonometric identities") },
                            singleLine = true,
                            enabled = !generating,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Spacer(Modifier.height(10.dp))
                        Button(
                            onClick = {
                                val subject = subjects.firstOrNull { it.id == selectedSubjectId } ?: return@Button
                                val topic = localTopic.trim()
                                if (topic.isBlank()) { generationMessage = "Enter a topic first."; return@Button }
                                generating = true; generationMessage = null
                                scope.launch {
                                    val generated = withContext(Dispatchers.IO) {
                                        cortex.generateLesson(
                                            session = session,
                                            subjectId = subject.id,
                                            subject = subject.name,
                                            topic = topic,
                                            level = profile?.studyLevel.orEmpty(),
                                        )
                                    }
                                    if (generated == null) {
                                        generationMessage = if (localAvailable) "Local Cortex could not complete that lesson, and cloud fallback was unavailable." else "Cloud Cortex could not complete that lesson. Cached lessons remain available offline."
                                    } else {
                                        val saved = generated.copy(subjectId = subject.id)
                                        withContext(Dispatchers.IO) { database.lessons().replaceAll(listOf(saved)) }
                                        lessons = withContext(Dispatchers.IO) { database.lessons().forSubject(subject.id) }
                                        generationMessage = if (saved.id.startsWith("local:")) "Generated on-device and saved locally." else "Generated by cloud Cortex and saved locally for offline study."
                                        activeLesson = saved
                                    }
                                    generating = false
                                }
                            },
                            enabled = !generating && localTopic.isNotBlank(),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            if (generating) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text(if (localAvailable) "Generate with Cortex" else "Generate with Cortex")
                        }
                        if (generationMessage != null) Text(generationMessage!!, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
                    }
                }
            }
            item {
                Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) { Text("Lessons", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold); if (refreshing) { Spacer(Modifier.width(10.dp)); CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) } }
                if (offline) Text("Offline: showing lessons already cached on this device.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 5.dp))
            }
            if (lessons.isEmpty()) item { Text(if (offline) "No cached lessons for this subject yet." else "No saved lessons for this subject yet.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            else items(lessons) { lesson -> NativeLessonRow(lesson) { activeLesson = lesson } }
        }
    }
}

@Composable
private fun NativeLessonRow(lesson: NativeLessonEntity, onOpen: () -> Unit) {
    Card(onClick = onOpen, colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text(lesson.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            if (lesson.description.isNotBlank()) { Spacer(Modifier.height(6.dp)); Text(lesson.description, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            Spacer(Modifier.height(10.dp)); Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { Text(lesson.difficulty.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelMedium, color = ShadePrimary); Text("${(lesson.progress * 100).toInt()}%", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}

@Composable
private fun ProfileNativeScreen(
    padding: PaddingValues,
    session: NativeSession,
    profile: NativeProfile?,
    api: NativeApi,
    sessionStore: NativeStore,
    onProfileSaved: (NativeProfile) -> Unit,
    onSignOut: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var displayName by remember(profile?.id, profile?.displayName) { mutableStateOf(profile?.displayName.orEmpty()) }
    var studyLevel by remember(profile?.id, profile?.studyLevel) { mutableStateOf(profile?.studyLevel ?: "upper-secondary") }
    var selectedCodes by remember(profile?.id, profile?.subjects) {
        mutableStateOf((profile?.subjects ?: emptyList()).map { NativeSubjectCatalog.codeFor(it) }.toSet())
    }
    var query by remember { mutableStateOf("") }
    var customSubject by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var failure by remember { mutableStateOf<String?>(null) }
    val catalogue = remember(selectedCodes) {
        val known = NativeSubjectCatalog.all.distinctBy { it.code }
        known + selectedCodes.filterNot { code -> known.any { it.code == code } }.map { code ->
            NativeSubjectOption(code, NativeSubjectCatalog.labelFor(code), "Custom / saved")
        }
    }
    val filtered = remember(query, catalogue) {
        val term = query.trim()
        if (term.isBlank()) catalogue
        else catalogue.filter {
            it.label.contains(term, ignoreCase = true) || it.group.contains(term, ignoreCase = true)
        }
    }

    LazyColumn(
        Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Spacer(Modifier.height(18.dp))
            Text("Your learning profile", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(profile?.email ?: session.email, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it; message = null },
                label = { Text("Display name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = studyLevel,
                onValueChange = { studyLevel = it; message = null },
                label = { Text("Education stage / study level") },
                supportingText = { Text("Examples: primary, lower-secondary, o-level, a-level, university, tvet, independent") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            Spacer(Modifier.height(8.dp))
            Text("My subjects", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("${selectedCodes.size} selected. Subject availability does not guarantee verified syllabus coverage.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text("Search subjects") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        items(filtered, key = { it.code }) { option ->
            Row(
                Modifier.fillMaxWidth().background(ShadeSurface, RoundedCornerShape(14.dp)).padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(
                    checked = option.code in selectedCodes,
                    onCheckedChange = { checked ->
                        selectedCodes = if (checked) selectedCodes + option.code else selectedCodes - option.code
                        message = null
                    },
                )
                Column(Modifier.weight(1f).padding(vertical = 6.dp)) {
                    Text(option.label, fontWeight = FontWeight.SemiBold)
                    Text(option.group, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        item {
            Spacer(Modifier.height(6.dp))
            Text("Can't find a subject?", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            OutlinedTextField(
                value = customSubject,
                onValueChange = { customSubject = it },
                label = { Text("Add a custom subject") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            TextButton(
                onClick = {
                    val custom = customSubject.trim()
                    if (custom.length >= 2) {
                        selectedCodes = selectedCodes + NativeSubjectCatalog.codeFor(custom)
                        customSubject = ""
                        message = "Custom subject added to your selection. Curriculum coverage is not yet verified."
                        failure = null
                    }
                },
                enabled = customSubject.trim().length >= 2,
            ) { Text("Add subject") }
            if (failure != null) Text(failure!!, color = MaterialTheme.colorScheme.error)
            if (message != null) Text(message!!, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Button(
                onClick = {
                    val current = profile ?: NativeProfile(session.userId, session.email, "Student", "upper-secondary", emptyList(), false)
                    val updated = current.copy(
                        displayName = displayName.trim().ifBlank { "Student" },
                        studyLevel = studyLevel.trim().ifBlank { "upper-secondary" },
                        subjects = selectedCodes.toList().sorted(),
                        onboardingCompleted = true,
                    )
                    saving = true
                    failure = null
                    message = null
                    scope.launch {
                        try {
                            withContext(Dispatchers.IO) { api.saveLearnerProfile(session, updated) }
                            withContext(Dispatchers.IO) { sessionStore.saveProfile(updated) }
                            onProfileSaved(updated)
                            message = "Profile saved. Your selected subjects will sync with Shadecode."
                        } catch (e: Exception) {
                            failure = e.message ?: "Could not save your profile. Check your connection and try again."
                        } finally {
                            saving = false
                        }
                    }
                },
                enabled = !saving && studyLevel.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text("Save learning profile")
            }
            TextButton(onClick = onSignOut) { Text("Sign out") }
            Spacer(Modifier.height(24.dp))
        }
    }
}


@Composable
private fun SnapExtractScreen(padding: PaddingValues) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val extractStore = remember { NativeExtractStore(context) }
    var savedArtifacts by remember { mutableStateOf<List<NativeExtractArtifact>>(emptyList()) }
    var artifactSearch by remember { mutableStateOf("") }
    var activeArtifactId by remember { mutableStateOf<String?>(null) }
    var artifactTitle by remember { mutableStateOf("") }
    LaunchedEffect(Unit) {
        savedArtifacts = withContext(Dispatchers.IO) { extractStore.list() }
    }
    var selectedImage by remember { mutableStateOf<Uri?>(null) }
    var imagePreview by remember { mutableStateOf<ImageBitmap?>(null) }
    var rawOcr by remember { mutableStateOf("") }
    var editableText by remember { mutableStateOf("") }
    var redactionTerms by remember { mutableStateOf("") }
    var processing by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("Choose an image. OCR runs on this device and does not upload it.") }
    val screenActive = remember { AtomicBoolean(true) }
    val activeRecognizer = remember { AtomicReference<com.google.mlkit.vision.text.TextRecognizer?>(null) }
    DisposableEffect(Unit) {
        screenActive.set(true)
        onDispose {
            screenActive.set(false)
            activeRecognizer.getAndSet(null)?.close()
        }
    }
    LaunchedEffect(selectedImage) {
        val uri = selectedImage ?: run { imagePreview = null; return@LaunchedEffect }
        imagePreview = withContext(Dispatchers.IO) {
            try {
                val resolver = context.contentResolver
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
                if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return@withContext null
                var sampleSize = 1
                while (bounds.outWidth / sampleSize > 1200 || bounds.outHeight / sampleSize > 1200) sampleSize *= 2
                val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
                resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options)?.asImageBitmap() }
            } catch (_: Exception) { null }
        }
    }
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            selectedImage = uri
            activeArtifactId = null
            artifactTitle = ""
            rawOcr = ""
            editableText = ""
            processing = true
            message = "Reading image locally…"
            var recognizerToClose: com.google.mlkit.vision.text.TextRecognizer? = null
            try {
                val image = InputImage.fromFilePath(context, uri)
                val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                recognizerToClose = recognizer
                activeRecognizer.getAndSet(recognizer)?.close()
                recognizer.process(image)
                    .addOnSuccessListener { result ->
                        if (screenActive.get()) {
                            rawOcr = result.text
                            editableText = result.text
                            message = if (result.text.isBlank()) {
                                "No readable text found. This OCR pass does not interpret diagrams or graphs."
                            } else {
                                "Extracted locally. Check equations, handwriting, tables and diagram labels before relying on them."
                            }
                            processing = false
                        }
                        if (activeRecognizer.compareAndSet(recognizer, null)) recognizer.close()
                    }
                    .addOnFailureListener { error ->
                        if (screenActive.get()) {
                            message = "Could not read this image: ${error.localizedMessage ?: "OCR failed"}"
                            processing = false
                        }
                        if (activeRecognizer.compareAndSet(recognizer, null)) recognizer.close()
                    }
            } catch (error: Exception) {
                recognizerToClose?.let {
                    if (activeRecognizer.compareAndSet(it, null)) it.close()
                }
                if (screenActive.get()) {
                    message = "Could not open image: ${error.localizedMessage ?: "unsupported image"}"
                    processing = false
                }
            }
        }
    }

    val redactedPreview = remember(editableText, redactionTerms) {
        redactionTerms.split(",")
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .fold(editableText) { text, term ->
                text.replace(Regex(Regex.escape(term), RegexOption.IGNORE_CASE), "[REDACTED]")
            }
    }

    val filteredArtifacts = remember(savedArtifacts, artifactSearch) {
        val query = artifactSearch.trim()
        if (query.isBlank()) savedArtifacts else savedArtifacts.filter { artifact ->
            artifact.title.contains(query, ignoreCase = true) ||
                artifact.editedText.contains(query, ignoreCase = true) ||
                artifact.rawOcr.contains(query, ignoreCase = true)
        }
    }

    fun copyText(value: String) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("Shadecode extracted text", value))
        message = "Copied the selected text representation. The source image was not changed."
    }

    LazyColumn(
        Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Spacer(Modifier.height(18.dp))
            Text("Snap & Extract", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Snipping Tool-inspired capture, local OCR and text cleanup.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.fillMaxWidth().padding(18.dp)) {
                    Text("1. Import an image", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        if (selectedImage == null) "Screenshots, photos and scanned pages are supported as OCR input."
                        else "Image selected. OCR is processed locally; the source image is not uploaded.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    imagePreview?.let { preview ->
                        Spacer(Modifier.height(12.dp))
                        Image(
                            bitmap = preview,
                            contentDescription = "Preview of the selected source image",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxWidth().height(220.dp),
                        )
                    }
                    if (selectedImage != null && imagePreview == null && !processing) {
                        Spacer(Modifier.height(6.dp))
                        Text("Preview unavailable, but you can still retry OCR or choose another image.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { imagePicker.launch("image/*") }, enabled = !processing, modifier = Modifier.fillMaxWidth()) {
                        Text(if (processing) "Extracting locally…" else "Choose image")
                    }
                    if (processing) { Spacer(Modifier.height(8.dp)); CircularProgressIndicator(Modifier.size(24.dp)) }
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.fillMaxWidth().padding(18.dp)) {
                    Text("2. Review and edit", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = editableText,
                        onValueChange = { editableText = it },
                        label = { Text("Extracted text") },
                        placeholder = { Text("OCR text appears here. You can edit it.") },
                        modifier = Modifier.fillMaxWidth().height(240.dp),
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(onClick = { editableText = rawOcr; message = "Restored the original OCR output." }, enabled = rawOcr.isNotEmpty()) { Text("Restore OCR") }
                        TextButton(
                            onClick = {
                                editableText = editableText
                                    .replace(Regex("[ \\t]+"), " ")
                                    .replace(Regex("\\n{3,}"), "\n\n")
                                    .trim()
                                message = "Whitespace cleanup applied. Review the result; mathematical meaning was not corrected."
                            },
                            enabled = editableText.isNotBlank(),
                        ) { Text("Clean spacing") }
                    }
                    Button(onClick = { copyText(editableText) }, enabled = editableText.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
                        Text("Copy extracted text")
                    }
                    TextButton(
                        onClick = {
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, editableText)
                            }
                            context.startActivity(Intent.createChooser(intent, "Share extracted text"))
                        },
                        enabled = editableText.isNotBlank(),
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Share extracted text") }
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = artifactTitle,
                        onValueChange = { artifactTitle = it },
                        label = { Text("Name this extract (optional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = {
                            if (rawOcr.isBlank() && editableText.isBlank()) {
                                message = "Extract or enter some text before saving."
                            } else {
                                scope.launch {
                                    try {
                                        val saved = withContext(Dispatchers.IO) {
                                            extractStore.save(activeArtifactId, artifactTitle, rawOcr, editableText, selectedImage)
                                        }
                                        activeArtifactId = saved.id
                                        artifactTitle = saved.title
                                        savedArtifacts = withContext(Dispatchers.IO) { extractStore.list() }
                                        message = "Saved privately on this device. Source images are not copied into the library."
                                    } catch (error: Exception) {
                                        message = error.message ?: "Could not save this extract."
                                    }
                                }
                            }
                        },
                        enabled = !processing && (rawOcr.isNotBlank() || editableText.isNotBlank()),
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(if (activeArtifactId == null) "Save to this device" else "Update saved extract") }
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.fillMaxWidth().padding(18.dp)) {
                    Text("Saved extracts on this device", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text("Private to this app on this device. Up to 20 recent extracts are kept; older ones are removed automatically. Source images are not stored.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = artifactSearch,
                        onValueChange = { artifactSearch = it },
                        label = { Text("Search saved extracts") },
                        placeholder = { Text("Search titles or extracted text") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    if (savedArtifacts.isEmpty()) {
                        Text("Nothing saved yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else if (filteredArtifacts.isEmpty()) {
                        Text("No saved extracts match that search.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        filteredArtifacts.forEach { artifact ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(artifact.title, fontWeight = FontWeight.SemiBold)
                                    Text(artifact.editedText.lineSequence().firstOrNull().orEmpty().take(90).ifBlank { "Empty text extract" }, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                                }
                                TextButton(onClick = {
                                    // A saved text artifact has no persisted image. Clear any image
                                    // selected in the current session so it cannot be mistaken for
                                    // this artifact's source or accidentally saved against it.
                                    selectedImage = null
                                    activeArtifactId = artifact.id
                                    artifactTitle = artifact.title
                                    rawOcr = artifact.rawOcr
                                    editableText = artifact.editedText
                                    redactionTerms = ""
                                    message = "Loaded saved text. The original source image was not saved."
                                }, enabled = !processing) { Text("Open") }
                                TextButton(onClick = {
                                    scope.launch {
                                        val deleted = withContext(Dispatchers.IO) { extractStore.delete(artifact.id) }
                                        savedArtifacts = withContext(Dispatchers.IO) { extractStore.list() }
                                        if (activeArtifactId == artifact.id) activeArtifactId = null
                                        message = if (deleted) "Saved extract deleted from this device." else "Could not delete that extract."
                                    }
                                }) { Text("Delete") }
                            }
                        }
                    }
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.fillMaxWidth().padding(18.dp)) {
                    Text("3. Redact text before sharing", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Enter exact names or phrases separated by commas. This creates a redacted text copy only; it does not erase pixels or redact the original image.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = redactionTerms,
                        onValueChange = { redactionTerms = it },
                        label = { Text("Phrases to redact") },
                        placeholder = { Text("e.g. student name, phone number") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(10.dp))
                    Text("Redacted preview", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        if (redactedPreview.isBlank()) "The redacted text preview will appear here."
                        else redactedPreview,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(10.dp))
                    Button(
                        onClick = { copyText(redactedPreview) },
                        enabled = editableText.isNotBlank() && redactionTerms.split(",").any { it.trim().isNotEmpty() },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Copy redacted text") }
                }
            }
        }
        item {
            Text(
                "Local-first privacy: the selected image is processed on this device. This first version extracts text only; it does not yet understand graphs/diagrams, translate offline, transcribe audio/video, or redact source-image pixels. Always check OCR output before using it for exam work.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
            )
            Spacer(Modifier.height(24.dp))
        }
    }
}


private fun isRetryableSyncFailure(error: Throwable): Boolean {
    if (error is IOException || error is SocketTimeoutException) return true
    val message = error.message.orEmpty()
    return Regex("Request failed \\((429|5[0-9]{2})\\)").containsMatchIn(message) ||
        message.contains("timed out", ignoreCase = true) ||
        message.contains("unable to resolve host", ignoreCase = true) ||
        message.contains("failed to connect", ignoreCase = true)
}
