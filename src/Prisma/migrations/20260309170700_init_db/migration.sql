/*
  Warnings:

  - Added the required column `customerEmail` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "customerEmail" TEXT NOT NULL;
