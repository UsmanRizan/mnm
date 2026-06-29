import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  json,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.ts";

// --- Gems ---
export const gem = pgTable(
  "gem",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    weight: numeric("weight", { precision: 10, scale: 2 }),
    shape: text("shape"),
    mainColour: text("main_colour"),
    origin: text("origin"),
    treatment: text("treatment"),
    category: text("category"),
    description: text("description"),
    imageUrls: json("image_urls").default([]).$type<string[]>(),
    certificateData: json("certificate_data").$type<{
      imageUrl?: string;
      lab?: string;
      reportNumber?: string;
    }>(),
    offerCreditCost: integer("offer_credit_cost").default(0),
    maxOffers: integer("max_offers").default(5),
    status: text("status", {
      enum: ["active", "sold", "expired", "draft"],
    })
      .default("active")
      .notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("gem_ownerId_idx").on(table.ownerId),
    index("gem_status_idx").on(table.status),
    index("gem_category_idx").on(table.category),
  ],
);

// --- Offers ---
export const offer = pgTable(
  "offer",
  {
    id: text("id").primaryKey(),
    gemId: text("gem_id")
      .notNull()
      .references(() => gem.id, { onDelete: "cascade" }),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: text("status", {
      enum: [
        "pending",
        "countered_by_owner",
        "countered_by_buyer",
        "accepted",
        "rejected",
        "expired",
      ],
    })
      .default("pending")
      .notNull(),
    lastSenderId: text("last_sender_id").references(() => user.id),
    history: json("history").default([]).$type<
      {
        type: "initial_offer" | "counter_offer" | "acceptance";
        amount: number;
        senderId: string;
        timestamp: string;
        status: string;
      }[]
    >(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("offer_gemId_idx").on(table.gemId),
    index("offer_buyerId_idx").on(table.buyerId),
    index("offer_status_idx").on(table.status),
  ],
);

// --- Credits Transactions (audit log) ---
export const creditTransaction = pgTable(
  "credit_transaction",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    type: text("type", {
      enum: [
        "purchase",
        "posting_fee",
        "offer_cost",
        "counter_cost",
        "reactivation",
        "weekly_replenish",
        "offer_payout",
      ],
    }).notNull(),
    description: text("description"),
    referenceId: text("reference_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("credit_txn_userId_idx").on(table.userId),
    index("credit_txn_createdAt_idx").on(table.createdAt),
  ],
);

// --- Relations ---
export const gemRelations = relations(gem, ({ one, many }) => ({
  owner: one(user, {
    fields: [gem.ownerId],
    references: [user.id],
  }),
  offers: many(offer),
}));

export const offerRelations = relations(offer, ({ one }) => ({
  gem: one(gem, {
    fields: [offer.gemId],
    references: [gem.id],
  }),
  buyer: one(user, {
    fields: [offer.buyerId],
    references: [user.id],
  }),
  lastSender: one(user, {
    fields: [offer.lastSenderId],
    references: [user.id],
  }),
}));

export const creditTransactionRelations = relations(
  creditTransaction,
  ({ one }) => ({
    user: one(user, {
      fields: [creditTransaction.userId],
      references: [user.id],
    }),
  }),
);

export const gemSchema = {
  gem,
  offer,
  creditTransaction,
};
