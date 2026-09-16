package com.shadecode.student

import android.content.Context
import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Room
import androidx.room.RoomDatabase

@Entity(tableName = "subjects")
data class NativeSubjectEntity(
    @PrimaryKey val id: String,
    val name: String,
    val normalizedName: String,
    val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "lesson_progress")
data class NativeLessonProgressEntity(
    @PrimaryKey val lessonId: String,
    val subjectId: String,
    val progress: Float,
    val completed: Boolean,
    val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "pending_sync")
data class NativePendingSyncEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val operation: String,
    val payload: String,
    val createdAt: Long = System.currentTimeMillis(),
)

@androidx.room.Dao
interface NativeSubjectDao {
    @androidx.room.Query("SELECT * FROM subjects ORDER BY name COLLATE NOCASE")
    suspend fun all(): List<NativeSubjectEntity>

    @androidx.room.Insert(onConflict = androidx.room.OnConflictStrategy.REPLACE)
    suspend fun replaceAll(subjects: List<NativeSubjectEntity>)

    @androidx.room.Query("DELETE FROM subjects")
    suspend fun clear()
}

@androidx.room.Dao
interface NativeProgressDao {
    @androidx.room.Query("SELECT * FROM lesson_progress WHERE lessonId = :lessonId LIMIT 1")
    suspend fun get(lessonId: String): NativeLessonProgressEntity?

    @androidx.room.Insert(onConflict = androidx.room.OnConflictStrategy.REPLACE)
    suspend fun save(progress: NativeLessonProgressEntity)
}

@androidx.room.Dao
interface NativeSyncDao {
    @androidx.room.Query("SELECT * FROM pending_sync ORDER BY createdAt ASC")
    suspend fun pending(): List<NativePendingSyncEntity>

    @androidx.room.Insert
    suspend fun enqueue(item: NativePendingSyncEntity)

    @androidx.room.Delete
    suspend fun delete(item: NativePendingSyncEntity)
}

@Database(
    entities = [NativeSubjectEntity::class, NativeLessonProgressEntity::class, NativePendingSyncEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class NativeDatabase : RoomDatabase() {
    abstract fun subjects(): NativeSubjectDao
    abstract fun progress(): NativeProgressDao
    abstract fun sync(): NativeSyncDao

    companion object {
        @Volatile private var instance: NativeDatabase? = null

        fun get(context: Context): NativeDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                NativeDatabase::class.java,
                "shadecode_student.db",
            ).build().also { instance = it }
        }
    }
}

class NativeSubjectRepository(private val database: NativeDatabase) {
    suspend fun cached(): List<NativeSubjectEntity> = database.subjects().all()

    suspend fun replaceFromProfile(profile: NativeProfile) {
        val subjects = profile.subjects
            .map { it.trim() }
            .filter { it.isNotBlank() && !it.equals("general", ignoreCase = true) }
            .distinctBy { normalize(it) }
            .map { subject ->
                val normalized = normalize(subject)
                NativeSubjectEntity(
                    id = "profile:${profile.id}:$normalized",
                    name = subject,
                    normalizedName = normalized,
                )
            }
        database.subjects().clear()
        if (subjects.isNotEmpty()) database.subjects().replaceAll(subjects)
    }

    private fun normalize(value: String): String = value
        .lowercase()
        .replace(Regex("[^a-z0-9]+"), "-")
        .trim('-')
}
