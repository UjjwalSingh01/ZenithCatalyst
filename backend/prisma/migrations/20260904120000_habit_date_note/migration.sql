-- AlterTable: a free-text note against one habit on one day.
-- Nullable, so every completion record that already exists is untouched and
-- keeps reading exactly as it did.
ALTER TABLE "HabitDate" ADD COLUMN     "note" TEXT;
