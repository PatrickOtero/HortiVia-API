/*
  Warnings:

  - You are about to drop the column `emailConfirmationTokenExpiresAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emailConfirmationTokenHash` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_emailConfirmationTokenHash_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailConfirmationTokenExpiresAt",
DROP COLUMN "emailConfirmationTokenHash",
ADD COLUMN     "emailConfirmationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailConfirmationCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailConfirmationCodeHash" TEXT,
ADD COLUMN     "emailConfirmationCodeSentAt" TIMESTAMP(3);
