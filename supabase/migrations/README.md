Curriculum Migrations - README

Order to run (recommended):
1. Backup database tables (see ../..\backup_db_before_curriculum_migrations.ps1)
2. Run 0009_dedupe_lesson_prerequisites.sql to remove duplicates/self-edges
3. Run 0008_add_constraints_lesson_prerequisites.sql to add UNIQUE and CHECK constraints
4. Run 0007_add_country_examboard_to_user_profiles.sql to add optional onboarding columns

Notes:
- Always run these in a staging environment first.
- 0009 is idempotent; it deletes duplicates and self-referential rows.
- If you have custom RLS policies, verify they still permit the migrations.
- After applying constraints, attempts to insert duplicates or self-links will fail.

Support:
If unsure, create a DB dump before proceeding and verify expected rows are preserved.
