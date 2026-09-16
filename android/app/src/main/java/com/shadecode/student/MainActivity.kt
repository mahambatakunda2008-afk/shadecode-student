package com.shadecode.student

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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
    MaterialTheme(
        colorScheme = androidx.compose.material3.darkColorScheme(
            primary = ShadePrimary,
            background = ShadeBackground,
            surface = ShadeSurface,
        ),
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = ShadeBackground) {
            val store = remember { NativeStore(context) }
            var session by remember { mutableStateOf<NativeSession?>(null) }
            var restoring by remember { mutableStateOf(true) }

            LaunchedEffect(Unit) {
                session = withContext(Dispatchers.IO) { store.readSession() }
                NativeSyncWorker.schedule(context)
                restoring = false
            }

            if (restoring) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (session == null) {
                LoginScreen(onSignedIn = { session = it }, sessionStore = store)
            } else {
                StudentShell(
                    session = session!!,
                    onSignOut = { session = null },
                    sessionStore = store,
                )
            }
        }
    }
}

@Composable
private fun LoginScreen(onSignedIn: (NativeSession) -> Unit, sessionStore: NativeStore) {
    val scope = rememberCoroutineScope()
    val api = remember { NativeApi() }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier.fillMaxSize().padding(28.dp).navigationBarsPadding(),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Shadecode", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
        Text("Student", style = MaterialTheme.typography.headlineMedium, color = ShadePrimary, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        Text("A native learning workspace built around you.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(32.dp))
        OutlinedTextField(email, { email = it; error = null }, label = { Text("Email") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(password, { password = it; error = null }, label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
        if (error != null) {
            Spacer(Modifier.height(10.dp))
            Text(error!!, color = MaterialTheme.colorScheme.error)
        }
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = {
                loading = true
                scope.launch {
                    try {
                        val result = withContext(Dispatchers.IO) { api.signIn(email.trim(), password) }
                        withContext(Dispatchers.IO) { sessionStore.saveSession(result) }
                        NativeSyncWorker.schedule(sessionStore.context())
                        onSignedIn(result)
                    } catch (e: Exception) {
                        error = e.message ?: "Sign in failed."
                    } finally {
                        loading = false
                    }
                }
            },
            enabled = !loading && email.isNotBlank() && password.isNotBlank(),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            if (loading) CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
            else Text("Sign in")
        }
        Spacer(Modifier.height(12.dp))
        Text("Native Android client. No WebView.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun StudentShell(session: NativeSession, onSignOut: () -> Unit, sessionStore: NativeStore) {
    val api = remember { NativeApi() }
    val database = remember { NativeDatabase.get(sessionStore.context()) }
    val subjects = remember { NativeSubjectRepository(database) }
    var profile by remember { mutableStateOf<NativeProfile?>(null) }
    var cachedSubjects by remember { mutableStateOf<List<NativeSubjectEntity>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var selected by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(session.accessToken) {
        cachedSubjects = withContext(Dispatchers.IO) { subjects.cached() }
        try {
            val loaded = withContext(Dispatchers.IO) { api.loadProfile(session) }
            profile = loaded
            withContext(Dispatchers.IO) { subjects.replaceFromProfile(loaded) }
            cachedSubjects = withContext(Dispatchers.IO) { subjects.cached() }
            error = null
        } catch (e: Exception) {
            error = e.message ?: "Could not load your profile."
        } finally {
            loading = false
        }
    }

    Scaffold(
        containerColor = ShadeBackground,
        bottomBar = {
            NavigationBar(containerColor = ShadeSurface) {
                NavigationBarItem(selected == 0, { selected = 0 }, icon = { Icon(Icons.Default.Home, null) }, label = { Text("Home") })
                NavigationBarItem(selected == 1, { selected = 1 }, icon = { Icon(Icons.Default.Book, null) }, label = { Text("Learn") })
                NavigationBarItem(selected == 2, { selected = 2 }, icon = { Icon(Icons.Default.PlayArrow, null) }, label = { Text("Practice") })
                NavigationBarItem(selected == 3, { selected = 3 }, icon = { Icon(Icons.Default.Person, null) }, label = { Text("Profile") })
            }
        },
    ) { padding ->
        when (selected) {
            0 -> DashboardScreen(padding, profile, cachedSubjects, loading, error)
            1 -> LearnNativeScreen(padding, cachedSubjects)
            2 -> PracticeNativeScreen(padding)
            else -> ProfileNativeScreen(padding, profile) {
                scope.launch {
                    withContext(Dispatchers.IO) { sessionStore.clearSession() }
                    onSignOut()
                }
            }
        }
    }
}

@Composable
private fun DashboardScreen(padding: PaddingValues, profile: NativeProfile?, subjects: List<NativeSubjectEntity>, loading: Boolean, error: String?) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Spacer(Modifier.height(18.dp))
            Text("Good to see you.", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(profile?.displayName ?: "Student", color = ShadePrimary, style = MaterialTheme.typography.titleLarge)
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.padding(20.dp)) {
                    Text("Your learning system", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text(if (loading) "Syncing your academic profile…" else if (error != null) "Offline mode: using your last saved subjects." else "Your subjects and learning context are connected.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        item { Text("My subjects", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
        if (subjects.isEmpty()) item { Text("No subjects selected yet. Complete onboarding to start learning.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        else items(subjects) { subject -> SubjectRow(subject.name) }
    }
}

@Composable
private fun SubjectRow(subject: String) {
    Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(16.dp)) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).background(ShadePrimary.copy(alpha = 0.14f), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Book, null, tint = ShadePrimary)
            }
            Spacer(Modifier.width(14.dp))
            Text(subject.replace('_', ' ').replaceFirstChar { it.uppercase() }, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun LearnNativeScreen(padding: PaddingValues, subjects: List<NativeSubjectEntity>) {
    Column(Modifier.fillMaxSize().padding(padding).padding(20.dp)) {
        Text("Learn", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Offline-first native learning workspace", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(20.dp))
        Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(20.dp)) {
            Column(Modifier.padding(20.dp)) {
                Text("Your subjects", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                if (subjects.isEmpty()) {
                    Text("No subjects are configured for this account yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    subjects.forEach { subject ->
                        Text("• ${subject.name.replace('_', ' ').replaceFirstChar { c -> c.uppercase() }}", modifier = Modifier.padding(vertical = 5.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun PracticeNativeScreen(padding: PaddingValues) {
    Column(Modifier.fillMaxSize().padding(padding).padding(20.dp)) {
        Text("Practice", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(14.dp))
        Card(colors = CardDefaults.cardColors(containerColor = ShadeSurface), shape = RoundedCornerShape(20.dp)) {
            Row(Modifier.fillMaxWidth().padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CheckCircle, null, tint = ShadePrimary, modifier = Modifier.size(30.dp))
                Spacer(Modifier.width(14.dp))
                Column { Text("Exam workspace", fontWeight = FontWeight.Bold); Text("Native question, answer and working tools are next in the migration.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
}

@Composable
private fun ProfileNativeScreen(padding: PaddingValues, profile: NativeProfile?, onSignOut: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(padding).padding(20.dp)) {
        Text("Profile", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(18.dp))
        Text(profile?.displayName ?: "Student", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(profile?.email ?: "", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(8.dp))
        Text("Study level: ${profile?.studyLevel ?: "Not set"}")
        Spacer(Modifier.height(24.dp))
        TextButton(onClick = onSignOut) { Text("Sign out") }
    }
}
