-- CreateEnum
CREATE TYPE "Region" AS ENUM ('AMERICAS', 'EMEA', 'PACIFIC', 'CHINA', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UPCOMING', 'LIVE', 'FINAL');

-- CreateEnum
CREATE TYPE "MapStatus" AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PredictionKind" AS ENUM ('PRE_MATCH', 'LIVE');

-- CreateEnum
CREATE TYPE "PickBanType" AS ENUM ('PICK', 'BAN', 'DECIDER');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "circuitName" TEXT,
    "description" TEXT,
    "imgUrl" TEXT,
    "prizepool" TEXT,
    "datesText" TEXT,
    "location" TEXT,
    "status" TEXT,
    "sourceUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "datesText" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTeam" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seed" TEXT,
    "placement" TEXT,

    CONSTRAINT "EventTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT,
    "logoUrl" TEXT,
    "country" TEXT,
    "region" "Region",
    "sourceUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "realName" TEXT,
    "country" TEXT,
    "imgUrl" TEXT,
    "currentTeamId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sourceUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "stageId" TEXT,
    "seriesTitle" TEXT,
    "format" TEXT,
    "status" "MatchStatus" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "team1Id" TEXT,
    "team2Id" TEXT,
    "team1Score" INTEGER,
    "team2Score" INTEGER,
    "streamsJson" JSONB,
    "vodsJson" JSONB,
    "sourceUrl" TEXT,
    "mapsAnnounced" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickBan" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "PickBanType" NOT NULL,
    "teamId" TEXT,
    "mapName" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "PickBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapPlayed" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "mapName" TEXT NOT NULL,
    "status" "MapStatus" NOT NULL DEFAULT 'UPCOMING',
    "pickedByTeamId" TEXT,
    "team1Score" INTEGER,
    "team2Score" INTEGER,
    "team1RoundsCt" INTEGER,
    "team1RoundsT" INTEGER,
    "team2RoundsCt" INTEGER,
    "team2RoundsT" INTEGER,
    "winnerTeamId" TEXT,
    "durationMinutes" INTEGER,

    CONSTRAINT "MapPlayed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapPlayerStat" (
    "id" TEXT NOT NULL,
    "mapPlayedId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "agentsJson" JSONB NOT NULL,
    "rating" DOUBLE PRECISION,
    "acs" DOUBLE PRECISION,
    "kills" INTEGER,
    "deaths" INTEGER,
    "assists" INTEGER,
    "kast" DOUBLE PRECISION,
    "adr" DOUBLE PRECISION,
    "hs" DOUBLE PRECISION,
    "firstBloods" INTEGER,
    "firstDeaths" INTEGER,

    CONSTRAINT "MapPlayerStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapEconomy" (
    "id" TEXT NOT NULL,
    "mapPlayedId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "pistolWon" INTEGER,
    "ecoWon" INTEGER,
    "ecoTotal" INTEGER,
    "semiEcoWon" INTEGER,
    "semiEcoTotal" INTEGER,
    "semiBuyWon" INTEGER,
    "semiBuyTotal" INTEGER,
    "fullBuyWon" INTEGER,
    "fullBuyTotal" INTEGER,

    CONSTRAINT "MapEconomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAgentStat" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "timespan" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "mapsPlayed" INTEGER,
    "pickRate" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "acs" DOUBLE PRECISION,
    "kd" DOUBLE PRECISION,
    "kast" DOUBLE PRECISION,
    "adr" DOUBLE PRECISION,
    "fkfd" DOUBLE PRECISION,

    CONSTRAINT "PlayerAgentStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRating" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" DOUBLE PRECISION NOT NULL,
    "matchesConsidered" INTEGER NOT NULL,

    CONSTRAINT "TeamRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionSnapshot" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "kind" "PredictionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "team1WinProb" DOUBLE PRECISION NOT NULL,
    "team2WinProb" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "seriesScoreProbsJson" JSONB NOT NULL,
    "predictedMapsJson" JSONB,
    "factorsForJson" JSONB NOT NULL,
    "factorsAgainstJson" JSONB NOT NULL,
    "dataQuality" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PredictionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvaluation" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "preMatchSnapshotId" TEXT,
    "predictedWinnerTeamId" TEXT,
    "actualWinnerTeamId" TEXT,
    "predictedScore" TEXT,
    "actualScore" TEXT,
    "winnerCorrect" BOOLEAN,
    "scoreCorrect" BOOLEAN,
    "mapsCorrect" INTEGER,
    "mapsTotal" INTEGER,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN,
    "message" TEXT,
    "itemsSynced" INTEGER,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_region_idx" ON "Event"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_eventId_name_key" ON "Stage"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EventTeam_eventId_teamId_key" ON "EventTeam"("eventId", "teamId");

-- CreateIndex
CREATE INDEX "Team_region_idx" ON "Team"("region");

-- CreateIndex
CREATE INDEX "Player_currentTeamId_idx" ON "Player"("currentTeamId");

-- CreateIndex
CREATE INDEX "Match_status_scheduledAt_idx" ON "Match"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Match_eventId_idx" ON "Match"("eventId");

-- CreateIndex
CREATE INDEX "Match_team1Id_idx" ON "Match"("team1Id");

-- CreateIndex
CREATE INDEX "Match_team2Id_idx" ON "Match"("team2Id");

-- CreateIndex
CREATE INDEX "PickBan_matchId_idx" ON "PickBan"("matchId");

-- CreateIndex
CREATE INDEX "MapPlayed_mapName_idx" ON "MapPlayed"("mapName");

-- CreateIndex
CREATE UNIQUE INDEX "MapPlayed_matchId_orderIndex_key" ON "MapPlayed"("matchId", "orderIndex");

-- CreateIndex
CREATE INDEX "MapPlayerStat_playerId_idx" ON "MapPlayerStat"("playerId");

-- CreateIndex
CREATE INDEX "MapPlayerStat_teamId_idx" ON "MapPlayerStat"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "MapPlayerStat_mapPlayedId_playerId_key" ON "MapPlayerStat"("mapPlayedId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MapEconomy_mapPlayedId_teamId_key" ON "MapEconomy"("mapPlayedId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAgentStat_playerId_timespan_agentName_key" ON "PlayerAgentStat"("playerId", "timespan", "agentName");

-- CreateIndex
CREATE INDEX "TeamRating_teamId_asOf_idx" ON "TeamRating"("teamId", "asOf");

-- CreateIndex
CREATE INDEX "PredictionSnapshot_matchId_isActive_idx" ON "PredictionSnapshot"("matchId", "isActive");

-- CreateIndex
CREATE INDEX "PredictionSnapshot_matchId_kind_createdAt_idx" ON "PredictionSnapshot"("matchId", "kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchEvaluation_matchId_key" ON "MatchEvaluation"("matchId");

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTeam" ADD CONSTRAINT "EventTeam_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTeam" ADD CONSTRAINT "EventTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_currentTeamId_fkey" FOREIGN KEY ("currentTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickBan" ADD CONSTRAINT "PickBan_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPlayed" ADD CONSTRAINT "MapPlayed_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPlayed" ADD CONSTRAINT "MapPlayed_pickedByTeamId_fkey" FOREIGN KEY ("pickedByTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPlayed" ADD CONSTRAINT "MapPlayed_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPlayerStat" ADD CONSTRAINT "MapPlayerStat_mapPlayedId_fkey" FOREIGN KEY ("mapPlayedId") REFERENCES "MapPlayed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPlayerStat" ADD CONSTRAINT "MapPlayerStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPlayerStat" ADD CONSTRAINT "MapPlayerStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapEconomy" ADD CONSTRAINT "MapEconomy_mapPlayedId_fkey" FOREIGN KEY ("mapPlayedId") REFERENCES "MapPlayed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapEconomy" ADD CONSTRAINT "MapEconomy_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAgentStat" ADD CONSTRAINT "PlayerAgentStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRating" ADD CONSTRAINT "TeamRating_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionSnapshot" ADD CONSTRAINT "PredictionSnapshot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvaluation" ADD CONSTRAINT "MatchEvaluation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
