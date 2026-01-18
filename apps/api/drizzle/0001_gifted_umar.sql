ALTER TABLE "api_keys" ADD COLUMN "key_prefix" varchar(8) NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "rate_limit" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "allowed_domains" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "revoked_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_wallet_nonce" ON "nonces" USING btree ("wallet_address","nonce");