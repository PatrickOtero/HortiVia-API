ALTER TABLE "User"
ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "emailConfirmationTokenHash" TEXT,
ADD COLUMN "emailConfirmationTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_emailConfirmationTokenHash_key"
ON "User"("emailConfirmationTokenHash");
