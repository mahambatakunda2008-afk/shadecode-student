package com.shadecode.student

import android.content.Intent
import android.net.Uri
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
    var openingPaperId by remember { mutableStateOf<String?>(null) }
    fun load(block:suspend ()->Unit) { loading=true; error=null; scope.launch { try { block() } catch(e:Exception) { error=e.message ?: "Could not load papers." } finally { loading=false } } }
    LaunchedEffect(session.userId,subjects) { load { syllabi=withContext(Dispatchers.IO) { api.loadExamSyllabi(session,subjects.map { it.name }) } } }
    Column(Modifier.fillMaxSize().padding(padding).padding(horizontal=16.dp, vertical=12.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f)) { Text("Exam Hub",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold); Text("Past-paper catalog",color=MaterialTheme.colorScheme.onSurfaceVariant) }
            OutlinedButton(onClick=onBack) { Text("Back") }
        }
        Spacer(Modifier.height(10.dp))
        if(loading) LinearProgressIndicator(Modifier.fillMaxWidth())
        error?.let { Text(it,color=MaterialTheme.colorScheme.error) }
        LazyColumn(verticalArrangement=Arrangement.spacedBy(8.dp),contentPadding=PaddingValues(bottom=24.dp)) {
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
                    items(papers) { paper ->
                        val kind=when(paper.kind) { "qp"->"Question Paper"; "ms"->"Mark Scheme"; "in"->"Insert"; "gt"->"Grade Thresholds"; else->paper.kind.uppercase() }
                        ExamCatalogCard("Paper ${paper.paperNumber} / ${paper.variant} · $kind", if (openingPaperId == paper.id) "Preparing secure paper link…" else "${paper.level} · ${paper.session} ${paper.year}") {
                            scope.launch {
                                openingPaperId = paper.id
                                error = null
                                try {
                                    val url = withContext(Dispatchers.IO) { api.createSignedExamPaperUrl(session, paper.id) }
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                                } catch (e: Exception) {
                                    error = e.message ?: "Could not open this paper. Check your connection and try again."
                                } finally {
                                    openingPaperId = null
                                }
                            }
                        }
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
