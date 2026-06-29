import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth-schema.ts";

/**
 * Tracks PayHere payment sessions for credit purchases.
 */
export const payherePayment = pgTable(
  "payhere_payment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Unique order ID sent to PayHere (visible in PayHere dashboard) */
    orderId: text("order_id").notNull().unique(),
    /** Credit amount to add (e.g. 100 = 100 credits) */
    amount: integer("amount").notNull(),
    /** Currency code passed to PayHere (defaults to LKR) */
    currency: text("currency").default("LKR").notNull(),
    status: text("status", {
      enum: ["pending", "completed", "failed", "cancelled"],
    })
      .default("pending")
      .notNull(),
    /** PayHere's own payment ID (populated on notification) */
    paymentId: text("payment_id"),
    /** Payment method used (VISA, MASTER, EZCASH, etc.) */
    method: text("method"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("payhere_payment_userId_idx").on(table.userId),
    index("payhere_payment_orderId_idx").on(table.orderId),
    index("payhere_payment_status_idx").on(table.status),
  ]
);

export const payherePaymentRelations = relations(
  payherePayment,
  ({ one }) => ({
    user: one(user, {
      fields: [payherePayment.userId],
      references: [user.id],
    }),
  })
);
