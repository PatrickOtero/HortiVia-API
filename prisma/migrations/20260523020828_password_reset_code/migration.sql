-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordResetAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passwordResetCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetCodeHash" TEXT,
ADD COLUMN     "passwordResetCodeSentAt" TIMESTAMP(3);
