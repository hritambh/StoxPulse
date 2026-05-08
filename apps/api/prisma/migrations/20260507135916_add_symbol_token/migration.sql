/*
  Warnings:

  - Made the column `exchange` on table `stocks` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "stocks" ADD COLUMN     "symbolToken" TEXT,
ALTER COLUMN "exchange" SET NOT NULL,
ALTER COLUMN "exchange" SET DEFAULT 'NSE';
