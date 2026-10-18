-- Existing verification approvals must never become real admin permissions.
ALTER TABLE "test_access_grants" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'portfolio:verify';
