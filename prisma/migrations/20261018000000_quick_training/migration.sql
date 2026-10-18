CREATE TABLE "TrainingQuestion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" TEXT[] NOT NULL,
    "correctOptionIndex" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "sourceReference" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "seedKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingQuestion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TrainingQuestion_options_check" CHECK (
        cardinality("options") BETWEEN 3 AND 4 AND
        "correctOptionIndex" >= 0 AND "correctOptionIndex" < cardinality("options")
    ),
    CONSTRAINT "TrainingQuestion_order_check" CHECK ("sortOrder" >= 0 AND "version" > 0)
);

CREATE TABLE "TrainingAttempt" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionVersion" INTEGER NOT NULL,
    "selectedOptionIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "correctOptionIndex" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "sourceReference" TEXT,
    "submissionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingAttempt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TrainingAttempt_index_check" CHECK (
        "selectedOptionIndex" BETWEEN 0 AND 3 AND "correctOptionIndex" BETWEEN 0 AND 3
        AND "questionVersion" > 0
    )
);

CREATE UNIQUE INDEX "TrainingQuestion_seedKey_key" ON "TrainingQuestion"("seedKey");
CREATE INDEX "TrainingQuestion_productId_isPublished_sortOrder_idx" ON "TrainingQuestion"("productId", "isPublished", "sortOrder");
CREATE UNIQUE INDEX "TrainingAttempt_userId_submissionKey_key" ON "TrainingAttempt"("userId", "submissionKey");
CREATE INDEX "TrainingAttempt_userId_questionId_id_idx" ON "TrainingAttempt"("userId", "questionId", "id");
ALTER TABLE "TrainingQuestion" ADD CONSTRAINT "TrainingQuestion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingAttempt" ADD CONSTRAINT "TrainingAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingAttempt" ADD CONSTRAINT "TrainingAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TrainingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
