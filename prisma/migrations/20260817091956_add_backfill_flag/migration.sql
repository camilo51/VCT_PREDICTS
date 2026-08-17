-- AlterTable
ALTER TABLE "MatchEvaluation" ADD COLUMN     "isBackfill" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PredictionSnapshot" ADD COLUMN     "isBackfill" BOOLEAN NOT NULL DEFAULT false;
