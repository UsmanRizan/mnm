CREATE TABLE "payhere_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"order_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'LKR' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_id" text,
	"method" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payhere_payment_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
ALTER TABLE "payhere_payment" ADD CONSTRAINT "payhere_payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payhere_payment_userId_idx" ON "payhere_payment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payhere_payment_orderId_idx" ON "payhere_payment" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payhere_payment_status_idx" ON "payhere_payment" USING btree ("status");