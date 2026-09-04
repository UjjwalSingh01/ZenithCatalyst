-- AlterTable: a habit can be committed to as a time-boxed challenge.
-- Additive and defaulted, so every existing habit stays an ordinary habit.
ALTER TABLE "Habit" ADD COLUMN     "isChallenge" BOOLEAN NOT NULL DEFAULT false;
