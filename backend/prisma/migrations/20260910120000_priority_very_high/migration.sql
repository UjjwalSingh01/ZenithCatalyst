-- Priority gains a fourth level, "Very high", at the top of the scale.
--
-- The scale is ascending-is-more-important, and three queries order by it, so
-- the new level has to take 1 and the rest move down one. Existing rows are
-- SHIFTED rather than relabelled: a habit stored as 1 meant "High" before and
-- still means "High" after, as 2. Renumbering the labels instead would silently
-- promote every habit in the table to the new top priority.
--
--   before            after
--   1 High       ->   2 High
--   2 Medium     ->   3 Medium
--   3 Low        ->   4 Low
--                     1 Very high  (new, nothing lands here)
--
-- This has to be run by hand. `prisma migrate deploy` cannot rebuild this
-- database — the init migration still creates the old User/Date/Todo tables
-- from before the rename to Habit/HabitDate — so the schema is kept in sync
-- with `prisma db push`, and db push only syncs structure. It would apply the
-- new column default and never touch a single row, which is the one outcome
-- that quietly corrupts the meaning of existing data.
--
-- Guarded by its own marker table rather than by the column default, so it is
-- safe to run twice and safe to run either side of `db push`.

CREATE TABLE IF NOT EXISTS "_zenith_data_migrations" (
    "name"       text PRIMARY KEY,
    "applied_at" timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "_zenith_data_migrations" WHERE "name" = 'priority_very_high'
    ) THEN
        UPDATE "Habit" SET "priority" = "priority" + 1;
        INSERT INTO "_zenith_data_migrations" ("name") VALUES ('priority_very_high');
    END IF;
END $$;

-- Medium, which is what the API already defaulted new habits to. The column
-- default said 1 while the create schema said 2; they now agree. Harmless to
-- repeat, and `db push` sets the same value from schema.prisma anyway.
ALTER TABLE "Habit" ALTER COLUMN "priority" SET DEFAULT 3;
