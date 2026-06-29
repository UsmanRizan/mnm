CREATE TABLE "credit_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"reference_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gem" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text,
	"weight" numeric(10, 2),
	"shape" text,
	"main_colour" text,
	"origin" text,
	"treatment" text,
	"category" text,
	"description" text,
	"image_urls" json DEFAULT '[]'::json,
	"certificate_data" json,
	"offer_credit_cost" integer DEFAULT 0,
	"max_offers" integer DEFAULT 5,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer" (
	"id" text PRIMARY KEY NOT NULL,
	"gem_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_sender_id" text,
	"history" json DEFAULT '[]'::json,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number_verified" boolean;--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gem" ADD CONSTRAINT "gem_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_gem_id_gem_id_fk" FOREIGN KEY ("gem_id") REFERENCES "public"."gem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_last_sender_id_user_id_fk" FOREIGN KEY ("last_sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_txn_userId_idx" ON "credit_transaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_txn_createdAt_idx" ON "credit_transaction" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "gem_ownerId_idx" ON "gem" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "gem_status_idx" ON "gem" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gem_category_idx" ON "gem" USING btree ("category");--> statement-breakpoint
CREATE INDEX "offer_gemId_idx" ON "offer" USING btree ("gem_id");--> statement-breakpoint
CREATE INDEX "offer_buyerId_idx" ON "offer" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "offer_status_idx" ON "offer" USING btree ("status");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_phone_number_unique" UNIQUE("phone_number");