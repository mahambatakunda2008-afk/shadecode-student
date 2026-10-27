package com.shadecode.student

import android.content.Context
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
    Card(Modifier.fillMaxWidth().clickable(onClick=onClick), shape=RoundedCornerShape(20.dp), colors=CardDefaults.cardColors(containerColor=ShadeSurface)) {
        Column(Modifier.padding(18.dp), verticalArrangement=Arrangement.spacedBy(6.dp)) {
            Text("Exam Hub", style=MaterialTheme.typography.titleLarge, fontWeight=FontWeight.Bold)
            Text("Browse past papers by board, subject, level, session and year.", color=MaterialTheme.colorScheme.onSurfaceVariant)
            Text("${subjects.size} selected subjects · personalized catalog", color=ShadePrimary, style=MaterialTheme.typography.bodySmall)
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
                        ExamCatalogCard("Paper ${paper.paperNumber} / ${paper.variant} · $kind","${paper.level} · ${paper.session} ${paper.year}") { openExamPaper(context,paper) }
                    }
                    if(!loading && papers.isEmpty() && error==null) item { Text("No papers are available for this selection yet.",color=MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }
}

@Composable
private fun ExamCatalogCard(title:String,detail:String,onClick:()->Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick=onClick),shape=RoundedCornerShape(14.dp),colors=CardDefaults.cardColors(containerColor=ShadeSurface)) {
        Column(Modifier.padding(15.dp),verticalArrangement=Arrangement.spacedBy(4.dp)) {
            Text(title,fontWeight=FontWeight.SemiBold)
            Text(detail,style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
private fun openExamPaper(context:Context,paper:NativeExamPaper) {
    val url=paper.sourceUrl ?: (BuildConfig.APP_BASE_URL.trimEnd('/')+"/exam-hub/papers/"+Uri.encode(paper.id))
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW,Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}
