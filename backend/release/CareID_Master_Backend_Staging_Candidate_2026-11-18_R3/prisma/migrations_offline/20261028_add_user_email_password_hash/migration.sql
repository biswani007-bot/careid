-- AlterTable
-- CareID Schema Migration: Add email and password_hash to users table for Admin email/password authentication
-- Ensures backward-compatibility: both columns are nullable so existing OTP accounts remain functional.
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
