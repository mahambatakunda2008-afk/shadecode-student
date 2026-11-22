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

@Entity(tableName = "exam_attempts")
data class NativeExamAttemptEntity(
    @androidx.room.PrimaryKey val accountId: String,
    val attemptId: String,
    val subject: String,
    val paperJson: String,
    val questionsJson: String,
    val answersJson: String,
    val secondsLeft: Int,
    val taking: Boolean,
    val savedAt: Long,
    val deadlineMillis: Long,
    @androidx.room.ColumnInfo(defaultValue = "0") val submissionPending: Boolean = false,
)


@Entity(tableName = "offline_resources", primaryKeys = ["accountId", "resourceId"], indices = [androidx.room.Index(value = ["accountId", "subject"]), androidx.room.Index(value = ["accountId", "importedAt"])])
data class NativeOfflineResourceEntity(
    val accountId: String,
    val resourceId: String,
    val title: String,
    val subject: String,
    val qualification: String,
    val syllabus: String,
    val topic: String,
    val sourceUrl: String,
    val publisher: String,
    val reviewStatus: String,
    val mimeType: String,
    val fileName: String,
    val sha256: String,
    val byteCount: Long,
    val searchText: String,
    val importedAt: Long,
    val lastOpenedAt: Long = 0L,
    val lastPage: Int = 1,
)

@Entity(tableName = "resource_annotations", primaryKeys = ["accountId", "id"], indices = [androidx.room.Index(value = ["accountId", "resourceId"])])
data class NativeResourceAnnotationEntity(
    val accountId: String,
    val id: String,
    val resourceId: String,
    val kind: String,
    val pageNumber: Int?,
    val anchor: String,
    val content: String,
    val createdAt: Long,
    val updatedAt: Long,
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


@androidx.room.Dao
interface NativeOfflineResourceDao {
    @androidx.room.Query("SELECT * FROM offline_resources WHERE accountId = :accountId ORDER BY importedAt DESC")
    suspend fun all(accountId: String): List<NativeOfflineResourceEntity>

    @androidx.room.Query("SELECT * FROM offline_resources WHERE accountId = :accountId AND resourceId = :resourceId LIMIT 1")
    suspend fun get(accountId: String, resourceId: String): NativeOfflineResourceEntity?

    @androidx.room.Query("SELECT * FROM offline_resources WHERE accountId = :accountId AND (title LIKE '%' || :query || '%' COLLATE NOCASE OR subject LIKE '%' || :query || '%' COLLATE NOCASE OR qualification LIKE '%' || :query || '%' COLLATE NOCASE OR syllabus LIKE '%' || :query || '%' COLLATE NOCASE OR topic LIKE '%' || :query || '%' COLLATE NOCASE OR searchText LIKE '%' || :query || '%' COLLATE NOCASE) ORDER BY importedAt DESC LIMIT :limit")
    suspend fun search(accountId: String, query: String, limit: Int = 50): List<NativeOfflineResourceEntity>

    @androidx.room.Insert(onConflict = androidx.room.OnConflictStrategy.REPLACE)
    suspend fun save(resource: NativeOfflineResourceEntity)

    @androidx.room.Query("UPDATE offline_resources SET lastOpenedAt = :openedAt, lastPage = :page WHERE accountId = :accountId AND resourceId = :resourceId")
    suspend fun markOpened(accountId: String, resourceId: String, page: Int, openedAt: Long)

    @androidx.room.Query("DELETE FROM offline_resources WHERE accountId = :accountId AND resourceId = :resourceId")
    suspend fun delete(accountId: String, resourceId: String): Int
}

@androidx.room.Dao
interface NativeResourceAnnotationDao {
    @androidx.room.Query("SELECT * FROM resource_annotations WHERE accountId = :accountId AND resourceId = :resourceId ORDER BY updatedAt DESC")
    suspend fun forResource(accountId: String, resourceId: String): List<NativeResourceAnnotationEntity>

    @androidx.room.Insert(onConflict = androidx.room.OnConflictStrategy.REPLACE)
    suspend fun save(annotation: NativeResourceAnnotationEntity)

    @androidx.room.Query("DELETE FROM resource_annotations WHERE accountId = :accountId AND resourceId = :resourceId AND id = :annotationId")
    suspend fun delete(accountId: String, resourceId: String, annotationId: String): Int

    @androidx.room.Query("DELETE FROM resource_annotations WHERE accountId = :accountId AND resourceId = :resourceId")
    suspend fun deleteForResource(accountId: String, resourceId: String)
}

@androidx.room.Dao
interface NativeExamAttemptDao {
    @androidx.room.Query("SELECT * FROM exam_attempts WHERE accountId = :accountId LIMIT 1")
    suspend fun get(accountId: String): NativeExamAttemptEntity?
    @androidx.room.Insert(onConflict = androidx.room.OnConflictStrategy.REPLACE)
    suspend fun save(attempt: NativeExamAttemptEntity)
    @androidx.room.Query("DELETE FROM exam_attempts WHERE accountId = :accountId")
    suspend fun clear(accountId: String)
}

@Database(
    entities = [NativeSubjectEntity::class, NativeLessonEntity::class, NativeLessonProgressEntity::class, NativePendingSyncEntity::class, NativeExamAttemptEntity::class, NativeOfflineResourceEntity::class, NativeResourceAnnotationEntity::class],
    version = 7,
    exportSchema = false,
)
abstract class NativeDatabase : RoomDatabase() {
    abstract fun subjects(): NativeSubjectDao
    abstract fun lessons(): NativeLessonDao
    abstract fun progress(): NativeProgressDao
    abstract fun sync(): NativeSyncDao
    abstract fun examAttempts(): NativeExamAttemptDao
    abstract fun offlineResources(): NativeOfflineResourceDao
    abstract fun resourceAnnotations(): NativeResourceAnnotationDao

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

        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS exam_attempts (
                        accountId TEXT NOT NULL,
                        attemptId TEXT NOT NULL,
                        subject TEXT NOT NULL,
                        paperJson TEXT NOT NULL,
                        questionsJson TEXT NOT NULL,
                        answersJson TEXT NOT NULL,
                        secondsLeft INTEGER NOT NULL,
                        taking INTEGER NOT NULL,
                        savedAt INTEGER NOT NULL,
                        deadlineMillis INTEGER NOT NULL,
                        PRIMARY KEY(accountId)
                    )
                """.trimIndent())
            }
        }

        private val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE exam_attempts ADD COLUMN submissionPending INTEGER NOT NULL DEFAULT 0")
            }
        }


        private val MIGRATION_6_7 = object : Migration(6, 7) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS offline_resources (
                        accountId TEXT NOT NULL,
                        resourceId TEXT NOT NULL,
                        title TEXT NOT NULL,
                        subject TEXT NOT NULL,
                        qualification TEXT NOT NULL,
                        syllabus TEXT NOT NULL,
                        topic TEXT NOT NULL,
                        sourceUrl TEXT NOT NULL,
                        publisher TEXT NOT NULL,
                        reviewStatus TEXT NOT NULL,
                        mimeType TEXT NOT NULL,
                        fileName TEXT NOT NULL,
                        sha256 TEXT NOT NULL,
                        byteCount INTEGER NOT NULL,
                        searchText TEXT NOT NULL,
                        importedAt INTEGER NOT NULL,
                        lastOpenedAt INTEGER NOT NULL,
                        lastPage INTEGER NOT NULL,
                        PRIMARY KEY(accountId, resourceId)
                    )
                """.trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS index_offline_resources_accountId_subject ON offline_resources(accountId, subject)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_offline_resources_accountId_importedAt ON offline_resources(accountId, importedAt)")
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS resource_annotations (
                        accountId TEXT NOT NULL,
                        id TEXT NOT NULL,
                        resourceId TEXT NOT NULL,
                        kind TEXT NOT NULL,
                        pageNumber INTEGER,
                        anchor TEXT NOT NULL,
                        content TEXT NOT NULL,
                        createdAt INTEGER NOT NULL,
                        updatedAt INTEGER NOT NULL,
                        PRIMARY KEY(accountId, id)
                    )
                """.trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS index_resource_annotations_accountId_resourceId ON resource_annotations(accountId, resourceId)")
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
                .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6, MIGRATION_6_7)
                .build()
                .also { instance = it }
        }

        fun appContext(): Context = requireNotNull(applicationContext) { "Native database has not been initialized." }
    }
}
