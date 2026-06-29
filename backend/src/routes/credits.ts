import { Router, Request, Response } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { creditTransaction } from "../db/gem-schema.ts";
import { user } from "../db/auth-schema.ts";
import { auth } from "../lib/auth.ts";
import { generateId } from "../lib/utils.ts";

const router = Router();

async function requireAuth(req: Request, res: Response) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session.user;
}

// GET /api/credits/balance — get current user's credit balance
router.get("/balance", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  try {
    // Sum all credit transactions for this user
    const balance = await db
      .select({
        total: sql<number>`COALESCE(SUM(amount), 0)`,
      })
      .from(creditTransaction)
      .where(eq(creditTransaction.userId, currentUser.id))
      .then((rows) => rows[0]);

    res.json({ balance: balance.total });
  } catch (e) {
    console.error("Error fetching balance:", e);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// POST /api/credits/purchase — purchase credits
router.post("/purchase", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  const { amount } = req.body;

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }

  try {
    await db.insert(creditTransaction).values({
      id: generateId("txn"),
      userId: currentUser.id,
      amount,
      type: "purchase",
      description: `Purchased ${amount} credits`,
    });

    const newBalance = await db
      .select({
        total: sql<number>`COALESCE(SUM(amount), 0)`,
      })
      .from(creditTransaction)
      .where(eq(creditTransaction.userId, currentUser.id))
      .then((rows) => rows[0]);

    res.json({ balance: newBalance.total });
  } catch (e) {
    console.error("Error purchasing credits:", e);
    res.status(500).json({ error: "Failed to purchase credits" });
  }
});

// GET /api/credits/transactions — get credit transaction history
router.get("/transactions", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  try {
    const transactions = await db
      .select()
      .from(creditTransaction)
      .where(eq(creditTransaction.userId, currentUser.id))
      .orderBy(desc(creditTransaction.createdAt))
      .limit(100);

    res.json(transactions);
  } catch (e) {
    console.error("Error fetching transactions:", e);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

export default router;
