package com.shadecode.student

import android.content.Context
import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import java.util.UUID

@Entity(tableName = "subjects")
data class NativeSubjectEntity(
    @PrimaryKey val id: String,
    val name: String,
    val normalizedName: String,
    val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "lessons")
data class NativeLessonEntity(
    @PrimaryKey val id: String,
    val subjectId: String,
    val topic: String,
    val title: String,
    val description: String,
    val difficulty: String,
    val blocksJson: String,
    val progress: Float,
    val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "lesson_progress", primaryKeys = ["accountId", "lessonId"])
data class NativeLessonProgressEntity(
    val accountId: String,
    val lessonId: String,
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
    val accountId: String? = null,
    @androidx.room.ColumnInfo(defaultValue = "''") val operationId: String = UUID.randomUUID().toString(),
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
interface NativeLessonDao {
    @androidx.room.Query("SELECT * FROM lessons WHERE subjectId = :subjectId ORDER BY updatedAt DESC")
    suspend fun forSubject(subjectId: String): List<NativeLessonEntity>
    @androidx.room.Query("SELECT * FROM lessons ORDER BY updatedAt DESC")
    suspend fun all(): List<NativeLessonEntity>
    @androidx.room.Insert(onConflict = androidx.room.OnConflictStrategy.REPLACE)
    suspend fun replaceAll(lessons: List<NativeLessonEntity>)
    @androidx.room.Query("DELETE FROM lessons WHERE subjectId = :subjectId AND id NOT LIKE 'local:%'")
    suspend fun clearSubject(subjectId: String)
}

@androidx.room.Dao
interface NativeProgressDao {
    @androidx.room.Query("SELECT * FROM lesson_progress WHERE accountId = :accountId AND lessonId = :lessonId LIMIT 1")
    suspend fun get(accountId: String, lessonId: String): NativeLessonProgressEntity?
    @androidx.room.Insert(onConflict = androidx.room.OnConflictStrategy.REPLACE)
    suspend fun save(progress: NativeLessonProgressEntity)
}

@androidx.room.Dao
interface NativeSyncDao {
    @androidx.room.Query("SELECT * FROM pending_sync WHERE accountId = :accountId ORDER BY createdAt ASC, id ASC")
    suspend fun pendingForAccount(accountId: String): List<NativePendingSyncEntity>
    @androidx.room.Insert
    suspend fun enqueue(item: NativePendingSyncEntity)
    @androidx.room.Delete
    suspend fun delete(item: NativePendingSyncEntity)
}

@Database(
    entities = [NativeSubjectEntity::class, NativeLessonEntity::class, NativeLessonProgressEntity::class, NativePendingSyncEntity::class],
    version = 4,
    exportSchema = false,
)
abstract class NativeDatabase : RoomDatabase() {
    abstract fun subjects(): NativeSubjectDao
    abstract fun lessons(): NativeLessonDao
    abstract fun progress(): NativeProgressDao
    abstract fun sync(): NativeSyncDao

    companion object {
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `lessons` (
                        `id` TEXT NOT NULL,
                        `subjectId` TEXT NOT NULL,
                        `topic` TEXT NOT NULL,
                        `title` TEXT NOT NULL,
                        `description` TEXT NOT NULL,
                        `difficulty` TEXT NOT NULL,
                        `blocksJson` TEXT NOT NULL,
                        `progress` REAL NOT NULL,
                        `updatedAt` INTEGER NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent(),
                )
            }
        }

        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE pending_sync ADD COLUMN accountId TEXT")
                db.execSQL("ALTER TABLE pending_sync ADD COLUMN operationId TEXT NOT NULL DEFAULT ''")
                db.execSQL("UPDATE pending_sync SET operationId = 'legacy-' || id WHERE operationId = ''")
            }
        }

        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS lesson_progress_new (
                        accountId TEXT NOT NULL,
                        lessonId TEXT NOT NULL,
                        subjectId TEXT NOT NULL,
                        progress REAL NOT NULL,
                        completed INTEGER NOT NULL,
                        updatedAt INTEGER NOT NULL,
                        PRIMARY KEY(accountId, lessonId)
                    )
                """.trimIndent())
                // Old progress has no recorded owner. Keep it isolated under an
                // explicit unassigned namespace rather than exposing it to any login.
                db.execSQL("""
                    INSERT INTO lesson_progress_new
                    (accountId, lessonId, subjectId, progress, completed, updatedAt)
                    SELECT '', lessonId, subjectId, progress, completed, updatedAt
                    FROM lesson_progress
                """.trimIndent())
                db.execSQL("DROP TABLE lesson_progress")
                db.execSQL("ALTER TABLE lesson_progress_new RENAME TO lesson_progress")
            }
        }

        @Volatile private var instance: NativeDatabase? = null
        @Volatile private var applicationContext: Context? = null

        fun get(context: Context): NativeDatabase = instance ?: synchronized(this) {
            applicationContext = context.applicationContext
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                NativeDatabase::class.java,
                "shadecode_student.db",
            )
                // Version 1 already contains subjects, lesson_progress and pending_sync.
                // Add the lesson cache without wiping offline progress or queued work.
                .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4)
                .build()
                .also { instance = it }
        }

        fun appContext(): Context = requireNotNull(applicationContext) { "Native database has not been initialized." }
    }
}
