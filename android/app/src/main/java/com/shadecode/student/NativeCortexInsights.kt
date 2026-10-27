package com.shadecode.student

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL

private data class NativeCortexInsight(val id: String, val text: String, val createdAt: String)

private class NativeCortexInsightsApi {
    fun load(session: NativeSession): List<NativeCortexInsight> {
        val base = BuildConfig.SUPABASE_URL.trimEnd('/')
        require(base.isNotBlank() && BuildConfig.SUPABASE_ANON_KEY.isNotBlank()) {
            "Supabase configuration is missing."
        }
        val url = URL("$base/rest/v1/cortex_insights?select=id,insight,created_at&user_id=eq.${session.userId}&order=created_at.desc&limit=10")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 10_000
            readTimeout = 10_000
            setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer ${session.accessToken}")
            setRequestProperty("Accept", "application/json")
        }
        try {
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val response = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in 200..299) throw IllegalStateException("Cortex insights could not load ($code).")
            val rows = JSONArray(response)
            return buildList {
                for (i in 0 until rows.length()) {
                    val row = rows.optJSONObject(i) ?: continue
                    val text = row.optString("insight").trim()
                    if (text.isNotBlank()) add(
                        NativeCortexInsight(
                            id = row.optString("id", "insight-$i"),
                            text = text,
                            createdAt = row.optString("created_at"),
                        )
                    )
                }
            }
        } finally {
            connection.disconnect()
        }
    }
}

@Composable
fun NativeCortexInsightsCard(session: NativeSession) {
    val api = remember { NativeCortexInsightsApi() }
    val scope = rememberCoroutineScope()
    var insights by remember(session.userId) { mutableStateOf<List<NativeCortexInsight>>(emptyList()) }
    var loading by remember(session.userId) { mutableStateOf(true) }
    var error by remember(session.userId) { mutableStateOf<String?>(null) }

    fun refresh() {
        scope.launch {
            loading = true
            try {
                insights = withContext(Dispatchers.IO) { api.load(session) }
                error = null
            } catch (e: Exception) {
                error = e.message ?: "Cortex insights are temporarily unavailable."
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(session.accessToken) { refresh() }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Cortex insights", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("Patterns and reminders saved to your account.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                OutlinedButton(onClick = { refresh() }, enabled = !loading) { Text("Refresh") }
            }
            if (loading) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    CircularProgressIndicator()
                    Text("Reading your learning history…")
                }
            } else if (error != null) {
                Text(error!!, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Button(onClick = { refresh() }) { Text("Try again") }
            } else if (insights.isEmpty()) {
                Text(
                    "No saved insights yet. As Shadecode records learning patterns, useful observations will appear here.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                insights.take(4).forEach { insight ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(insight.text, style = MaterialTheme.typography.bodyMedium)
                            if (insight.createdAt.isNotBlank()) {
                                Text(
                                    insight.createdAt.replace("T", " ").take(16),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(2.dp))
        }
    }
}
