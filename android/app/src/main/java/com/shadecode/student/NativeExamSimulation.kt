package com.shadecode.student

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

private data class NativeSimQuestion(
    val id: String,
    val type: String,
    val prompt: String,
    val options: List<String>,
    val marks: Int,
    val topic: String,
    val raw: JSONObject,
)

@Composable
fun NativeExamSimulationEntryCard(subjects: List<NativeSubjectEntity>, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        onClick = onClick,
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Exam Simulation", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Generate a timed paper, answer it, and request Cortex marking.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(if (subjects.isEmpty()) "Choose subjects in Profile first" else "${subjects.size} available subjects", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun NativeExamSimulationScreen(
    padding: PaddingValues,
    session: NativeSession,
    api: NativeApi,
    subjects: List<NativeSubjectEntity>,
    onBack: () -> Unit,
    onBrowsePastPapers: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val scroll = rememberScrollState()
    var selectedSubject by remember(subjects) { mutableStateOf(subjects.firstOrNull()?.name.orEmpty()) }
    var count by remember { mutableIntStateOf(10) }
    var difficulty by remember { mutableStateOf("medium") }
    var paper by remember { mutableStateOf<JSONObject?>(null) }
    var questions by remember { mutableStateOf<List<NativeSimQuestion>>(emptyList()) }
    var questionsJson by remember { mutableStateOf(JSONArray()) }
    var answers by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var report by remember { mutableStateOf<JSONObject?>(null) }
    var secondsLeft by remember { mutableIntStateOf(0) }
    var deadlineMillis by remember { mutableLongStateOf(0L) }
    var taking by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var status by remember { mutableStateOf<String?>(null) }
    var attemptRestored by remember { mutableStateOf(false) }

    // Restore an unfinished attempt before enabling autosave, so initial empty Compose state
    // cannot overwrite a saved attempt when Android recreates the activity.
    LaunchedEffect(session.userId) {
        val saved = NativeExamAttemptStore.read(context, session.userId)
        if (saved != null) {
            runCatching {
                val exam = JSONObject(saved.paperJson)
                val rawArray = JSONArray(saved.questionsJson)
                val parsed = mutableListOf<NativeSimQuestion>()
                for (i in 0 until rawArray.length()) {
                    val q = rawArray.optJSONObject(i) ?: continue
                    val id = q.optString("id")
                    val prompt = q.optString("question")
                    val marks = q.optInt("marks", 0)
                    if (id.isBlank() || prompt.isBlank() || marks <= 0) continue
                    val opts = mutableListOf<String>()
                    q.optJSONArray("options")?.let { a -> for (j in 0 until a.length()) opts += a.optString(j) }
                    parsed += NativeSimQuestion(id, q.optString("type", "short_answer"), prompt, opts, marks, q.optString("topic"), q)
                }
                if (parsed.isNotEmpty()) {
                    paper = exam
                    questions = parsed
                    questionsJson = rawArray
                    answers = JSONObject(saved.answersJson).let { objectJson ->
                        buildMap { val keys = objectJson.keys(); while (keys.hasNext()) { val key = keys.next(); put(key, objectJson.optString(key)) } }
                    }
                    selectedSubject = saved.subject
                    val now = System.currentTimeMillis()
                    val restoredSeconds = if (saved.taking && saved.deadlineMillis > 0L) {
                        (((saved.deadlineMillis - now).coerceAtLeast(0L) + 999L) / 1000L).toInt()
                    } else {
                        saved.secondsLeft.coerceAtLeast(0)
                    }
                    secondsLeft = restoredSeconds
                    taking = saved.taking && restoredSeconds > 0
                    deadlineMillis = if (taking) {
                        if (saved.deadlineMillis > now) saved.deadlineMillis else now + restoredSeconds * 1000L
                    } else 0L
                    status = if (saved.taking && restoredSeconds == 0) {
                        "Time expired while the app was closed. Your answers are saved; submit when ready."
                    } else {
                        "Recovered your unfinished exam on this device."
                    }
                }
            }
        }
        attemptRestored = true
    }

    LaunchedEffect(paper, answers, selectedSubject, secondsLeft, taking, deadlineMillis, report, attemptRestored) {
        if (!attemptRestored) return@LaunchedEffect
        if (paper == null || report != null) {
            NativeExamAttemptStore.clear(context, session.userId)
        } else if (questions.isNotEmpty()) {
            NativeExamAttemptStore.write(
                context = context,
                userId = session.userId,
                subject = selectedSubject,
                paperJson = paper.toString(),
                questionsJson = questionsJson.toString(),
                answersJson = JSONObject().apply { answers.forEach { (id, answer) -> put(id, answer) } }.toString(),
                secondsLeft = secondsLeft,
                taking = taking,
                deadlineMillis = deadlineMillis,
            )
        }
    }

    LaunchedEffect(taking, deadlineMillis) {
        if (taking) {
            if (deadlineMillis <= 0L && secondsLeft > 0) {
                deadlineMillis = System.currentTimeMillis() + secondsLeft * 1000L
            }
            while (taking && deadlineMillis > 0L) {
                val remaining = (((deadlineMillis - System.currentTimeMillis()).coerceAtLeast(0L) + 999L) / 1000L).toInt()
                secondsLeft = remaining
                if (remaining <= 0) {
                    taking = false
                    deadlineMillis = 0L
                    status = "Time is up. Your answers are saved on this device. Submit when ready."
                    break
                }
                delay(1000L)
            }
        }
    }

    fun generate() {
        busy = true
        error = null
        status = null
        scope.launch {
            try {
                val response = withContext(Dispatchers.IO) { api.generateNativeExam(session, selectedSubject, count, difficulty) }
                val exam = response.optJSONObject("exam") ?: throw IllegalStateException("Cortex returned an invalid paper.")
                val array = exam.optJSONArray("questions") ?: throw IllegalStateException("The generated paper contains no questions.")
                val parsed = mutableListOf<NativeSimQuestion>()
                val rawArray = JSONArray()
                for (i in 0 until array.length()) {
                    val q = array.optJSONObject(i) ?: continue
                    val id = q.optString("id")
                    val prompt = q.optString("question")
                    val marks = q.optInt("marks", 0)
                    if (id.isBlank() || prompt.isBlank() || marks <= 0) continue
                    val opts = mutableListOf<String>()
                    q.optJSONArray("options")?.let { a -> for (j in 0 until a.length()) opts += a.optString(j) }
                    parsed += NativeSimQuestion(id, q.optString("type", "short_answer"), prompt, opts, marks, q.optString("topic"), q)
                    rawArray.put(q)
                }
                if (parsed.isEmpty()) throw IllegalStateException("No valid questions were returned. Nothing was started.")
                paper = exam
                questions = parsed
                questionsJson = rawArray
                answers = emptyMap()
                report = null
                val durationSeconds = exam.optInt("durationMinutes", 30).coerceIn(1, 180) * 60
                secondsLeft = durationSeconds
                deadlineMillis = System.currentTimeMillis() + durationSeconds * 1000L
                taking = true
                status = "Paper ready. Your answers stay on this screen until you submit."
            } catch (e: Exception) {
                error = e.message ?: "Could not generate the paper."
            } finally {
                busy = false
            }
        }
    }

    fun submit() {
        if (busy || questions.isEmpty() || report != null) return
        busy = true
        error = null
        taking = false
        scope.launch {
            try {
                val answerObject = JSONObject()
                answers.forEach { (id, value) -> answerObject.put(id, value) }
                val response = withContext(Dispatchers.IO) {
                    api.markNativeExam(session, selectedSubject, null, questionsJson, answerObject)
                }
                report = response.optJSONObject("report") ?: throw IllegalStateException("The marking service returned no report.")
                status = "Marking report received."
            } catch (e: Exception) {
                taking = secondsLeft > 0
                error = e.message ?: "Marking failed. Your answers are still on this screen; retry when connected."
            } finally {
                busy = false
            }
        }
    }

    Column(
        Modifier.fillMaxSize().padding(padding).verticalScroll(scroll).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f)) {
                Text("Exam Simulation", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Native timed exam workspace", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            TextButton(onClick = onBack) { Text("Back") }
        }

        if (paper == null) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Set up your paper", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("Use the existing past-paper library first. Cortex-generated questions are optional and may fail while the AI service is unavailable.")
                    OutlinedButton(onClick = onBrowsePastPapers, modifier = Modifier.fillMaxWidth()) {
                        Text("Start with a real past paper")
                    }
                    Text("Past papers use published exam questions. Choose the matching subject, board, level and year in Exam Hub.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                    Text("Subject", fontWeight = FontWeight.Medium)
                    subjects.forEach { item ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(item.name, modifier = Modifier.weight(1f).padding(vertical = 8.dp))
                            RadioButton(selected = selectedSubject == item.name, onClick = { selectedSubject = item.name })
                        }
                    }
                    Text("Question count")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(5, 10, 15, 20).forEach { n ->
                            FilterChip(selected = count == n, onClick = { count = n }, label = { Text("$n") })
                        }
                    }
                    Text("Difficulty")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("easy", "medium", "hard").forEach { d ->
                            FilterChip(selected = difficulty == d, onClick = { difficulty = d }, label = { Text(d.replaceFirstChar { it.uppercase() }) })
                        }
                    }
                    Button(onClick = { generate() }, enabled = !busy && selectedSubject.isNotBlank() && subjects.isNotEmpty(), modifier = Modifier.fillMaxWidth()) {
                        Text(if (busy) "Generating verified paper…" else "Generate paper")
                    }
                }
            }
        } else {
            val currentReport = report
            if (currentReport == null) {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(paper?.optString("title")?.ifBlank { "$selectedSubject practice paper" } ?: "$selectedSubject practice paper", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text("${questions.size} questions · ${questions.sumOf { it.marks }} marks", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Time remaining: ${secondsLeft / 60}:${(secondsLeft % 60).toString().padStart(2, '0')}", style = MaterialTheme.typography.titleMedium, color = if (secondsLeft < 60) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary)
                        if (secondsLeft == 0) Text("Time is up. Submit to request marking; your answers remain available.", color = MaterialTheme.colorScheme.error)
                    }
                }
                questions.forEachIndexed { index, q ->
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Question ${index + 1} · ${q.marks} mark${if (q.marks == 1) "" else "s"}", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                            Text(q.prompt, style = MaterialTheme.typography.bodyLarge)
                            if (q.topic.isNotBlank()) Text(q.topic, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (q.type == "multiple_choice" && q.options.isNotEmpty()) {
                                q.options.forEach { option ->
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Start) {
                                        RadioButton(selected = answers[q.id] == option, onClick = { answers = answers + (q.id to option) }, enabled = taking)
                                        Text(option, modifier = Modifier.weight(1f).padding(top = 12.dp))
                                    }
                                }
                            } else {
                                OutlinedTextField(
                                    value = answers[q.id].orEmpty(),
                                    onValueChange = { answers = answers + (q.id to it) },
                                    modifier = Modifier.fillMaxWidth(),
                                    label = { Text("Your answer") },
                                    minLines = 2,
                                    enabled = taking,
                                )
                            }
                        }
                    }
                }
                Button(onClick = { submit() }, enabled = !busy && questions.isNotEmpty() && report == null, modifier = Modifier.fillMaxWidth()) {
                    Text(if (busy) "Marking…" else "Submit for marking")
                }
            } else {
                val percentage = currentReport.optDouble("percentage", 0.0).toInt()
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Results", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        Text("$percentage%", style = MaterialTheme.typography.displayMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        Text("${currentReport.optDouble("totalScore", 0.0)} / ${currentReport.optDouble("totalMaxMarks", 0.0)} marks")
                        Text(currentReport.optString("overallFeedback", "Review your answers and recommendations."))
                        val weak = currentReport.optJSONArray("weakTopics")
                        if (weak != null && weak.length() > 0) Text("Review next: " + (0 until weak.length()).joinToString(", ") { weak.optString(it) })
                    }
                }
                val results = currentReport.optJSONArray("results")
                if (results != null) for (i in 0 until results.length()) {
                    val item = results.optJSONObject(i) ?: continue
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("Question ${i + 1}: ${item.optDouble("score", 0.0)} / ${item.optDouble("maxMarks", 0.0)}", fontWeight = FontWeight.SemiBold)
                            Text(item.optString("feedback"), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                Button(onClick = { paper = null; questions = emptyList(); report = null; taking = false; deadlineMillis = 0L; answers = emptyMap(); status = null; error = null }, modifier = Modifier.fillMaxWidth()) { Text("Start another exam") }
            }
        }
        if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }
        status?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall) }
    }
}
