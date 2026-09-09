  }

  const identity = matches[0];
  const learner = toLearnerCurriculumContext(identity);
  const baseFilter = (query: any) => query
    .eq("board_id", identity.boardId)
    .eq("qualification_id", identity.qualificationId)
    .eq("level", identity.level)
    .eq("syllabus_id", identity.syllabusId)
    .eq("syllabus_version", identity.syllabusVersion)
    .eq("subject_id", identity.subjectId);

  const [versionsResult, objectivesResult, mappingsResult, knowledgeResult] = await Promise.all([
    baseFilter(supabase.from("curriculum_versions").select("*")),
    baseFilter(supabase.from("curriculum_objectives").select("*")),
    supabase.from("objective_skill_mappings").select("*"),
    baseFilter(supabase.from("curriculum_knowledge").select("*")),
  ]);

  if (versionsResult.error || objectivesResult.error || mappingsResult.error || knowledgeResult.error) {
    const reason = "Unable to load the verified curriculum knowledge required for this learner.";
    return { identity, blocked: true, reason, resolved: { status: "unverified", reason, objectives: [], mappings: [], knowledge: [], knowledgeByKind: {} } };
  }

  const objectives = (versionsResult.data ?? []).length >= 0
    ? (objectivesResult.data ?? []).map((row: Record<string, unknown>) => asObjective(row, identity))
    : [];
  const mappings = (mappingsResult.data ?? []).map((row: Record<string, unknown>) => asMapping(row));
  const knowledge = (knowledgeResult.data ?? []).map((row: Record<string, unknown>) => asKnowledge(row));
  const versions = (versionsResult.data ?? []).map((row: Record<string, unknown>) => asVersion(row));

  return { identity, ...resolveSystemCurriculum({ learner, versions, objectives, mappings, knowledge }) };
}