package com.shadecode.student

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

private data class NativeLessonBlock(
    val type: String,
    val title: String,
    val content: String,
    val formula: String? = null,
    val exampleQuestion: String? = null,
    val exampleAnswer: String? = null,
    val steps: List<String> = emptyList(),
    val options: List<String> = emptyList(),
    val answer: String? = null,
)

private fun firstText(item: JSONObject, vararg keys: String): String =
    keys.asSequence().map { item.optString(it) }.firstOrNull { it.isNotBlank() }.orEmpty()

private fun parseStringArray(value: Any?): List<String> = when (value) {
    is JSONArray -> buildList { for (i in 0 until value.length()) value.optString(i).takeIf { it.isNotBlank() }?.let(::add) }
    is String -> value.lines().map { it.trim() }.filter { it.isNotBlank() }
    else -> emptyList()
}

private fun parseNativeLessonBlocks(json: String): List<NativeLessonBlock> = runCatching {
    val array = JSONArray(json)
    buildList {
        for (i in 0 until array.length()) {
            val item = array.optJSONObject(i) ?: continue
            val example = item.optJSONObject("example")
            val steps = parseStringArray(item.opt("steps"))
                .ifEmpty { parseStringArray(item.opt("step")) }
            add(
                NativeLessonBlock(
                    type = firstText(item, "type", "kind").ifBlank { "concept" },
                    title = firstText(item, "title", "heading"),
                    content = firstText(item, "content", "text", "body", "explanation", "description"),
                    formula = firstText(item, "formula", "equation").takeIf { it.isNotBlank() },
                    exampleQuestion = example?.let { firstText(it, "question", "prompt") }
                        ?.takeIf { it.isNotBlank() },
                    exampleAnswer = example?.let { firstText(it, "answer", "solution", "reasoning") }
                        ?.takeIf { it.isNotBlank() },
                    steps = steps,
                    options = parseStringArray(item.opt("options")),
                    answer = firstText(item, "answer", "correctAnswer").takeIf { it.isNotBlank() },
                ),
            )
        }
    }
}.getOrDefault(emptyList())

@Composable
fun NativeLessonReader(
    context: Context,
    session: NativeSession,
    lesson: NativeLessonEntity,
    database: NativeDatabase,
    api: NativeApi,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val blocks = remember(lesson.blocksJson) { parseNativeLessonBlocks(lesson.blocksJson) }
    var current by remember { mutableStateOf(0) }
    var progress by remember { mutableStateOf(lesson.progress.coerceIn(0f, 1f)) }
    var saved by remember { mutableStateOf(false) }

    LaunchedEffect(lesson.id) {
        val cached = withContext(Dispatchers.IO) { database.progress().get(lesson.id) }
        if (cached != null) {
            progress = cached.progress.coerceIn(0f, 1f)
            current = if (blocks.isEmpty()) 0 else ((progress * blocks.size).toInt()).coerceIn(0, blocks.lastIndex)
        }
    }

    fun saveProgress(value: Float) {
        val normalized = value.coerceIn(0f, 1f)
        progress = normalized
        val completed = normalized >= 1f
        saved = false
        scope.launch {
            withContext(Dispatchers.IO) {
                database.progress().save(
                    NativeLessonProgressEntity(
                        lessonId = lesson.id,
                        subjectId = lesson.subjectId,
                        progress = normalized,
                        completed = completed,
                    ),
                )
                database.sync().enqueue(
                    NativePendingSyncEntity(
                        operation = "lesson_progress",
                        payload = JSONObject()
                            .put("lessonId", lesson.id)
                            .put("progress", normalized)
                            .toString(),
                    ),
                )
                NativeSyncWorker.schedule(context)
                runCatching { api.updateLessonProgress(session, lesson.id, normalized) }
            }
            saved = true
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            TextButton(onClick = onBack) { Text("← Back to Learn") }
            Text(lesson.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            if (lesson.description.isNotBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(lesson.description, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(4.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${(progress * 100).toInt()}% complete", style = MaterialTheme.typography.labelMedium)
                if (saved) Text("Saved", style = MaterialTheme.typography.labelMedium, color = Color(0xFF34D399))
            }
        }

        if (blocks.isEmpty()) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF0B1E2D)), shape = RoundedCornerShape(18.dp)) {
                    Text(
                        "This lesson has no readable content yet. Open it on the web client to regenerate the lesson content.",
                        modifier = Modifier.padding(20.dp),
                    )
                }
            }
        } else {
            itemsIndexed(blocks) { index, block ->
                NativeLessonBlockCard(index + 1, block, index == current)
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (current > 0) {
                        Button(
                            onClick = {
                                current--
                                saveProgress(current.toFloat() / blocks.size)
                            },
                            modifier = Modifier.weight(1f),
                        ) { Text("Previous") }
                    }
                    Button(
                        onClick = {
                            if (current < blocks.lastIndex) {
                                current++
                                saveProgress((current + 1).toFloat() / blocks.size)
                            } else {
                                saveProgress(1f)
                            }
                        },
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(if (current < blocks.lastIndex) "Continue" else "Complete lesson")
                    }
                }
            }
        }
    }
}

@Composable
private fun NativeLessonBlockCard(number: Int, block: NativeLessonBlock, active: Boolean) {
    val surface = if (active) Color(0xFF102B3C) else Color(0xFF0B1E2D)
    Card(colors = CardDefaults.cardColors(containerColor = surface), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text(
                block.type.replace('_', ' ').replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.labelMedium,
                color = Color(0xFF22D3EE),
                fontWeight = FontWeight.Bold,
            )
            if (block.title.isNotBlank()) {
                Spacer(Modifier.height(5.dp))
                Text("$number. ${block.title}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            }
            if (block.content.isNotBlank()) {
                Spacer(Modifier.height(9.dp))
                Text(block.content, style = MaterialTheme.typography.bodyLarge)
            }
            if (block.formula != null) {
                Spacer(Modifier.height(12.dp))
                Text(
                    block.formula,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF06111C), RoundedCornerShape(12.dp))
                        .padding(14.dp),
                    fontWeight = FontWeight.SemiBold,
                )
            }
            if (block.steps.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                Text("Steps", fontWeight = FontWeight.Bold)
                block.steps.forEachIndexed { index, step ->
                    Row(Modifier.fillMaxWidth().padding(top = 7.dp)) {
                        Text("${index + 1}.", fontWeight = FontWeight.Bold)
                        Spacer(Modifier.width(8.dp))
                        Text(step)
                    }
                }
            }
            if (block.exampleQuestion != null || block.exampleAnswer != null) {
                Spacer(Modifier.height(12.dp))
                Text("Worked example", fontWeight = FontWeight.Bold)
                block.exampleQuestion?.let { Text(it, modifier = Modifier.padding(top = 6.dp)) }
                block.exampleAnswer?.let {
                    Text(
                        "Answer / reasoning: $it",
                        modifier = Modifier.padding(top = 6.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            if (block.options.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                block.options.forEachIndexed { index, option ->
                    Text("${('A'.code + index).toChar()}. $option", modifier = Modifier.padding(top = 4.dp))
                }
                block.answer?.let { Text("Answer: $it", modifier = Modifier.padding(top = 8.dp), fontWeight = FontWeight.Bold) }
            } else if (block.answer != null && block.exampleAnswer == null) {
                Spacer(Modifier.height(8.dp))
                Text("Answer: ${block.answer}", fontWeight = FontWeight.Bold)
            }
        }
    }
}
