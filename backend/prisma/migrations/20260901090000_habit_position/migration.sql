-- AlterTable: manual ordering for the habits list.
-- Defaulted, so existing habits keep falling back to priority then age until
-- the user actually drags something.
ALTER TABLE "Habit" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;
