package com.shadecode.student

class NativeSubjectRepository(private val database: NativeDatabase) {
    suspend fun cached(): List<NativeSubjectEntity> = database.subjects().all()

    suspend fun replaceFromProfile(profile: NativeProfile) {
        val subjects = profile.subjects
            .map { it.trim() }
            .filter { it.isNotBlank() && !it.equals("general", ignoreCase = true) }
            .distinctBy { NativeSubjectCatalog.codeFor(it) }
            .map { value ->
                val code = NativeSubjectCatalog.codeFor(value)
                NativeSubjectEntity(
                    // Stable IDs match the web catalogue; custom subjects use a
                    // normalized key and remain distinct from known catalogue entries.
                    id = code,
                    name = NativeSubjectCatalog.labelFor(code),
                    normalizedName = NativeSubjectMatcher.key(code),
                )
            }
        database.subjects().clear()
        if (subjects.isNotEmpty()) database.subjects().replaceAll(subjects)
    }
}
