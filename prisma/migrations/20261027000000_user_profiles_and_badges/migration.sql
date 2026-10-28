CREATE TYPE "UserBadge" AS ENUM ('FOUNDER', 'CO_FOUNDER', 'SPECIALIST');

ALTER TABLE "User"
  ADD COLUMN "store" TEXT,
  ADD COLUMN "jobTitle" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "specialBadge" "UserBadge";
