package com.shadecode.student

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

private data class PracticeQuestion(
    val id: String,
    val lessonTitle: String,
    val prompt: String,
    val options: List<String>,
    val answer: String?,
    val explanation: String?,
)

private fun firstText(obj: JSONObject, vararg keys: String): String =
    keys.asSequence().map { obj.optString(it) }.firstOrNull { it.isNotBlank() }.orEmpty()

private fun stringList(value: Any?): List<String> = when (value) {
    is JSONArray -> buildList { for (i in 0 until value.length()) value.optString(i).takeIf { it.isNotBlank() }?.let(::add) }
    is String -> value.lines().map { it.trim() }.filter { it.isNotBlank() }
    else -> emptyList()
}

private fun extractPractice(lesson: NativeLessonEntity): List<PracticeQuestion> = runCatching {
    val blocks = JSONArray(lesson.blocksJson)
    buildList {
        for (i in 0 until blocks.length()) {
            val block = blocks.optJSONObject(i) ?: continue
            val type = firstText(block, "type", "kind").lowercase()
            if (type !in setOf("practice", "checkpoint", "exam", "question")) continue
            val example = block.optJSONObject("example")
            val prompt = firstText(block, "question", "prompt", "content", "text")
                .ifBlank { example?.let { firstText(it, "question", "prompt") }.orEmpty() }
            if (prompt.isBlank()) continue
            val options = stringList(block.opt("options")).ifEmpty { example?.let { stringList(it.opt("options")) }.orEmpty() }
            val answer = firstText(block, "answer", "correctAnswer").takeIf { it.isNotBlank() }
                ?: example?.let { firstText(it, "answer", "correctAnswer", "solution") }?.takeIf { it.isNotBlank() }
            val explanation = firstText(block, "explanation", "reasoning", "content")
                .takeIf { it.isNotBlank() && it != prompt }
            add(PracticeQuestion("${lesson.id}:$i", lesson.title, prompt, options, answer, explanation))
        }
    }
}.getOrDefault(emptyList())

@Composable
fun NativePracticeScreen(
    padding: androidx.compose.foundation.layout.PaddingValues,
    subjects: List<NativeSubjectEntity>,
    database: NativeDatabase,
) {
    var selectedSubject by remember { mutableStateOf<String?>(null) }
    var lessons by remember { mutableStateOf<List<NativeLessonEntity>>(emptyList()) }
    var questions by remember { mutableStateOf<List<PracticeQuestion>>(emptyList()) }
    var questionIndex by remember { mutableStateOf(0) }
    var selectedOption by remember { mutableStateOf<Int?>(null) }
    var revealed by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }

    LaunchedEffect(subjects) {
        if (selectedSubject == null || subjects.none { it.id == selectedSubject }) selectedSubject = subjects.firstOrNull()?.id
    }
    LaunchedEffect(selectedSubject) {
        val id = selectedSubject ?: return@LaunchedEffect
        loading = true
        lessons = withContext(Dispatchers.IO) { database.lessons().forSubject(id) }
        questions = lessons.flatMap(::extractPractice)
        questionIndex = 0
        selectedOption = null
        revealed = false
        loading = false
    }

    val current = questions.getOrNull(questionIndex)
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Spacer(Modifier.height(18.dp))
            Text("Practice", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Practice from your actual saved lessons, not a generic question bank.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (subjects.isEmpty()) {
            item { Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) { Text("No subjects are configured for this account yet. Complete onboarding first.", Modifier.padding(20.dp)) } }
        } else {
            item { Text("Subject", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
            items(subjects) { subject ->
                OutlinedButton(onClick = { selectedSubject = subject.id }, modifier = Modifier.fillMaxWidth()) {
                    Text(subject.name)
                }
            }
            item {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(18.dp)) {
                        Text("Practice set", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(5.dp))
                        Text(if (loading) "Loading cached questions…" else "${questions.size} questions from ${lessons.size} saved lessons", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (current == null && !loading) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(Modifier.padding(20.dp)) {
                            Text("No practice questions cached yet.", fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(6.dp))
                            Text("Generate or save lessons on Learn first. Practice will automatically use supported practice, checkpoint and exam blocks from those lessons.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            } else if (current != null) {
                item {
                    val progress = (questionIndex + 1).toFloat() / questions.size.coerceAtLeast(1)
                    LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth())
                    Text("Question ${questionIndex + 1} of ${questions.size}", style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 5.dp))
                }
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(Modifier.padding(20.dp)) {
                            Text(current.lessonTitle, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                            Spacer(Modifier.height(10.dp))
                            Text(current.prompt, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            if (current.options.isNotEmpty()) {
                                Spacer(Modifier.height(14.dp))
                                current.options.forEachIndexed { index, option ->
                                    val chosen = selectedOption == index
                                    OutlinedButton(onClick = { if (!revealed) selectedOption = index }, modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
                                        Text("${('A'.code + index).toChar()}. $option${if (chosen) "  ✓" else ""}")
                                    }
                                }
                            }
                            Spacer(Modifier.height(14.dp))
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Button(onClick = { revealed = true }, enabled = !revealed, modifier = Modifier.weight(1f)) { Text("Check") }
                                OutlinedButton(onClick = {
                                    questionIndex = (questionIndex + 1) % questions.size
                                    selectedOption = null
                                    revealed = false
                                }, modifier = Modifier.weight(1f)) { Text("Next") }
                            }
                            if (revealed) {
                                Spacer(Modifier.height(14.dp))
                                Text("Answer: ${current.answer ?: "See the lesson explanation."}", fontWeight = FontWeight.Bold)
                                current.explanation?.let { Text(it, modifier = Modifier.padding(top = 7.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            }
                        }
                    }
                }
            }
        }
    }
}
