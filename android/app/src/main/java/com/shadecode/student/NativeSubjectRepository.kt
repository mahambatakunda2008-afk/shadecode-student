package com.shadecode.student

class NativeSubjectRepository(private val database: NativeDatabase) {
    suspend fun cached(): List<NativeSubjectEntity> = database.subjects().all()

    suspend fun replaceFromProfile(profile: NativeProfile) {
        val subjects = profile.subjects
            .map { it.trim() }
            .filter { it.isNotBlank() && !it.equals("general", ignoreCase = true) }
            .distinctBy { it.lowercase() }
            .map { name ->
                NativeSubjectEntity(
                    id = name.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-'),
                    name = name,
                    normalizedName = name.trim().lowercase(),
                )
            }
        database.subjects().clear()
        if (subjects.isNotEmpty()) database.subjects().replaceAll(subjects)
    }
}
