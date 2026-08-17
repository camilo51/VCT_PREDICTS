/*
  Warnings:

  - You are about to drop the `MapEconomy` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MapEconomy" DROP CONSTRAINT "MapEconomy_mapPlayedId_fkey";

-- DropForeignKey
ALTER TABLE "MapEconomy" DROP CONSTRAINT "MapEconomy_teamId_fkey";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "economyJson" JSONB;

-- DropTable
DROP TABLE "MapEconomy";
