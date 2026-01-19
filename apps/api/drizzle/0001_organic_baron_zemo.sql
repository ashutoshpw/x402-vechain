CREATE TABLE "fee_delegation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"user_address" varchar(42) NOT NULL,
	"vtho_spent" varchar(78) NOT NULL,
	"network" varchar(50) NOT NULL,
	"block_number" bigint,
	"status" varchar(50) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login" timestamp;--> statement-breakpoint
CREATE INDEX "fee_delegation_tx_hash_idx" ON "fee_delegation_logs" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "fee_delegation_user_address_idx" ON "fee_delegation_logs" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "fee_delegation_network_idx" ON "fee_delegation_logs" USING btree ("network");--> statement-breakpoint
CREATE INDEX "fee_delegation_created_at_idx" ON "fee_delegation_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "fee_delegation_status_idx" ON "fee_delegation_logs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_wallet_nonce" ON "nonces" USING btree ("wallet_address","nonce");