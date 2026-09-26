-- 001 · Priority gains a fourth level, "Very high", at the top of the scale.
--
-- Runs automatically: entrypoint.sh applies every file in this directory on
-- each backend start, after `prisma db push` and before the server accepts a
-- request. You should not need to run it by hand.
--
-- The scale is ascending-is-more-important, and three queries order by it, so
-- the new level takes 1 and the rest move down one. Existing rows are SHIFTED
-- rather than relabelled: a habit stored as 1 meant "High" before and still
-- means "High" after, as 2. Relabelling instead would silently promote every
-- habit in the table to the new top priority.
--
--   before            after
--   1 High       ->   2 High
--   2 Medium     ->   3 Medium
--   3 Low        ->   4 Low
--                     1 Very high  (new, nothing lands here)
--
-- It must happen exactly once, which is what the guard is for. The guard table
-- is the DataMigration model in schema.prisma, so `db push` creates it and —
-- unlike a table made only by a script — never drops it. The check, the update
-- and the record of having run are one DO block, and so one transaction: a
-- crash cannot leave the rows shifted but the migration unrecorded.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "_zenith_data_migrations" WHERE "name" = 'priority_very_high'
    ) THEN
        UPDATE "Habit" SET "priority" = "priority" + 1;
        INSERT INTO "_zenith_data_migrations" ("name") VALUES ('priority_very_high');
    END IF;
END $$;
