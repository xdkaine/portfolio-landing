CREATE TABLE "test_access_grants" (
 "id" TEXT NOT NULL,
 "proof_hash" TEXT NOT NULL,
 "display_code" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PENDING',
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expires_at" TIMESTAMP(3) NOT NULL,
 "approved_by_id" TEXT,
 "approved_at" TIMESTAMP(3),
 "session_expires_at" TIMESTAMP(3),
 "consumed_at" TIMESTAMP(3),
 "identity_ciphertext" TEXT,
 CONSTRAINT "test_access_grants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "test_access_grants_expires_at_idx" ON "test_access_grants"("expires_at");
