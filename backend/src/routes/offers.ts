import { Router, Request, Response } from "express";
import { eq, and, or, ne, lt, gt, sql, count } from "drizzle-orm";
import { db } from "../db/index.ts";
import { gem, offer, creditTransaction } from "../db/gem-schema.ts";
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

// GET /api/offers/:gemId — get offers for a gem (privacy-aware)
router.get("/:gemId", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  const { gemId } = req.params;

  try {
    const gemRecord = await db
      .select({ ownerId: gem.ownerId })
      .from(gem)
      .where(eq(gem.id, gemId))
      .then((rows) => rows[0]);

    if (!gemRecord) {
      res.status(404).json({ error: "Gem not found" });
      return;
    }

    const isOwner = gemRecord.ownerId === currentUser.id;

    if (isOwner) {
      // Owner sees all offers with masked buyer names (unless accepted)
      const offers = await db
        .select({
          id: offer.id,
          gemId: offer.gemId,
          buyerId: offer.buyerId,
          buyerName: sql<string>`CASE WHEN ${offer.status} = 'accepted' THEN ${user.name} ELSE 'Anonymous Buyer' END`,
          amount: offer.amount,
          status: offer.status,
          lastSenderId: offer.lastSenderId,
          history: offer.history,
          expiresAt: offer.expiresAt,
          createdAt: offer.createdAt,
        })
        .from(offer)
        .leftJoin(user, eq(offer.buyerId, user.id))
        .where(eq(offer.gemId, gemId))
        .orderBy(sql`${offer.createdAt} DESC`);

      res.json(offers);
    } else {
      // Buyer sees only their own offers
      const offers = await db
        .select({
          id: offer.id,
          gemId: offer.gemId,
          buyerId: offer.buyerId,
          buyerName: user.name,
          amount: offer.amount,
          status: offer.status,
          lastSenderId: offer.lastSenderId,
          history: offer.history,
          expiresAt: offer.expiresAt,
          createdAt: offer.createdAt,
        })
        .from(offer)
        .leftJoin(user, eq(offer.buyerId, user.id))
        .where(
          and(eq(offer.gemId, gemId), eq(offer.buyerId, currentUser.id))
        )
        .orderBy(sql`${offer.createdAt} DESC`);

      res.json(offers);
    }
  } catch (e) {
    console.error("Error fetching offers:", e);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

// POST /api/offers — create a new offer
router.post("/", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  const { gemId, amount, validityMinutes = 720 } = req.body;

  try {
    const gemRecord = await db
      .select({
        ownerId: gem.ownerId,
        offerCreditCost: gem.offerCreditCost,
        maxOffers: gem.maxOffers,
        expiresAt: gem.expiresAt,
        status: gem.status,
      })
      .from(gem)
      .where(eq(gem.id, gemId))
      .then((rows) => rows[0]);

    if (!gemRecord) {
      res.status(404).json({ error: "Gem not found" });
      return;
    }

    // Check gem is active
    if (gemRecord.status !== "active") {
      res.status(400).json({ error: "This listing is no longer active" });
      return;
    }

    // Check expiration
    if (gemRecord.expiresAt && new Date(gemRecord.expiresAt) < new Date()) {
      res.status(400).json({ error: "This listing has expired" });
      return;
    }

    // Can't offer on your own gem
    if (gemRecord.ownerId === currentUser.id) {
      res.status(400).json({ error: "You cannot make an offer on your own gem" });
      return;
    }

    // Check offer limit
    const offerCount = await db
      .select({ count: count() })
      .from(offer)
      .where(eq(offer.gemId, gemId))
      .then((rows) => rows[0].count);

    if (offerCount >= gemRecord.maxOffers) {
      res.status(400).json({
        error: `This gem has reached its maximum of ${gemRecord.maxOffers} offers`,
      });
      return;
    }

    // Check if already accepted
    const accepted = await db
      .select({ id: offer.id })
      .from(offer)
      .where(
        and(eq(offer.gemId, gemId), eq(offer.status, "accepted"))
      )
      .then((rows) => rows[0]);

    if (accepted) {
      res
        .status(400)
        .json({ error: "An offer has already been accepted for this gem" });
      return;
    }

    // Check buyer doesn't already have an active offer
    const existing = await db
      .select({ id: offer.id })
      .from(offer)
      .where(
        and(
          eq(offer.gemId, gemId),
          eq(offer.buyerId, currentUser.id),
          ne(offer.status, "rejected"),
          ne(offer.status, "expired")
        )
      )
      .then((rows) => rows[0]);

    if (existing) {
      res
        .status(400)
        .json({
          error: "You already have an active offer on this gem. Use counter-offer to negotiate.",
        });
      return;
    }

    // Deduct offer credit cost if set
    if (gemRecord.offerCreditCost > 0) {
      // TODO: check and deduct credits from buyer
    }

    const minutes = Math.min(Math.max(1, validityMinutes || 720), 720);

    const newOffer = await db
      .insert(offer)
      .values({
        id: generateId("offer"),
        gemId,
        buyerId: currentUser.id,
        amount: amount.toString(),
        status: "pending",
        lastSenderId: currentUser.id,
        history: [
          {
            type: "initial_offer",
            amount: parseFloat(amount),
            senderId: currentUser.id,
            timestamp: new Date().toISOString(),
            status: "pending",
          },
        ],
        expiresAt: sql`now() + interval '1 minute' * ${minutes}`,
      })
      .returning();

    res.json(newOffer[0]);
  } catch (e) {
    console.error("Error creating offer:", e);
    res.status(500).json({ error: "Failed to create offer" });
  }
});

// POST /api/offers/:id/counter — counter an offer
router.post("/:id/counter", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  const { amount } = req.body;
  const counterCost = 10;

  try {
    const offerRecord = await db
      .select({
        id: offer.id,
        gemId: offer.gemId,
        buyerId: offer.buyerId,
        amount: offer.amount,
        status: offer.status,
        lastSenderId: offer.lastSenderId,
        history: offer.history,
        expiresAt: offer.expiresAt,
        gemOwnerId: gem.ownerId,
        gemExpiresAt: gem.expiresAt,
        gemStatus: gem.status,
      })
      .from(offer)
      .leftJoin(gem, eq(offer.gemId, gem.id))
      .where(eq(offer.id, req.params.id))
      .then((rows) => rows[0]);

    if (!offerRecord) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    // Check gem is still active
    if (offerRecord.gemStatus !== "active") {
      res.status(400).json({ error: "The gem listing is no longer active" });
      return;
    }

    if (offerRecord.gemExpiresAt && new Date(offerRecord.gemExpiresAt) < new Date()) {
      res.status(400).json({ error: "The gem listing has expired" });
      return;
    }

    // Check offer hasn't expired
    if (
      offerRecord.expiresAt &&
      new Date(offerRecord.expiresAt) < new Date() &&
      (offerRecord.status === "pending" ||
        offerRecord.status.startsWith("countered"))
    ) {
      res.status(400).json({ error: "This offer has expired" });
      return;
    }

    const isOwner = currentUser.id === offerRecord.gemOwnerId;
    const isBuyer = currentUser.id === offerRecord.buyerId;

    if (!isOwner && !isBuyer) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (offerRecord.lastSenderId === currentUser.id) {
      res
        .status(400)
        .json({ error: "Wait for the other party to respond first" });
      return;
    }

    if (
      offerRecord.status !== "pending" &&
      !offerRecord.status.startsWith("countered")
    ) {
      res.status(400).json({ error: "Offer is no longer active" });
      return;
    }

    // TODO: check and deduct counter cost credits

    const newStatus = isOwner ? "countered_by_owner" : "countered_by_buyer";
    const history = [...(offerRecord.history || [])];
    history.push({
      type: "counter_offer",
      amount: parseFloat(amount),
      senderId: currentUser.id,
      timestamp: new Date().toISOString(),
      status: newStatus,
    });

    await db
      .update(offer)
      .set({
        amount: amount.toString(),
        status: newStatus as any,
        lastSenderId: currentUser.id,
        history,
        expiresAt: sql`now() + interval '12 hours'`,
      })
      .where(eq(offer.id, req.params.id));

    await db.insert(creditTransaction).values({
      id: generateId("txn"),
      userId: currentUser.id,
      amount: -counterCost,
      type: "counter_cost",
      description: `Counter-offer on gem ${offerRecord.gemId}`,
      referenceId: offerRecord.gemId,
    });

    res.json({ success: true });
  } catch (e) {
    console.error("Error countering offer:", e);
    res.status(500).json({ error: "Failed to counter offer" });
  }
});

// POST /api/offers/:id/accept — accept an offer
router.post("/:id/accept", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  try {
    const offerRecord = await db
      .select({
        id: offer.id,
        gemId: offer.gemId,
        buyerId: offer.buyerId,
        amount: offer.amount,
        status: offer.status,
        lastSenderId: offer.lastSenderId,
        history: offer.history,
        expiresAt: offer.expiresAt,
        gemOwnerId: gem.ownerId,
        gemExpiresAt: gem.expiresAt,
        gemStatus: gem.status,
      })
      .from(offer)
      .leftJoin(gem, eq(offer.gemId, gem.id))
      .where(eq(offer.id, req.params.id))
      .then((rows) => rows[0]);

    if (!offerRecord) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    if (offerRecord.gemExpiresAt && new Date(offerRecord.gemExpiresAt) < new Date()) {
      res.status(400).json({ error: "This listing has expired" });
      return;
    }

    if (
      offerRecord.expiresAt &&
      new Date(offerRecord.expiresAt) < new Date() &&
      (offerRecord.status === "pending" ||
        offerRecord.status.startsWith("countered"))
    ) {
      res.status(400).json({ error: "This offer has expired" });
      return;
    }

    const isOwner = currentUser.id === offerRecord.gemOwnerId;
    const isBuyer = currentUser.id === offerRecord.buyerId;

    if (!isOwner && !isBuyer) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const canOwnerAccept =
      isOwner &&
      (offerRecord.status === "pending" ||
        offerRecord.status === "countered_by_buyer");
    const canBuyerAccept =
      isBuyer && offerRecord.status === "countered_by_owner";

    if (!canOwnerAccept && !canBuyerAccept) {
      res
        .status(400)
        .json({ error: "You cannot accept this offer in its current state" });
      return;
    }

    const history = [...(offerRecord.history || [])];
    history.push({
      type: "acceptance",
      amount: parseFloat(offerRecord.amount),
      senderId: currentUser.id,
      timestamp: new Date().toISOString(),
      status: "accepted",
    });

    // Accept this offer
    await db
      .update(offer)
      .set({ status: "accepted", history } as any)
      .where(eq(offer.id, req.params.id));

    // Mark gem as sold
    await db
      .update(gem)
      .set({ status: "sold" })
      .where(eq(gem.id, offerRecord.gemId));

    // Reject all other offers on this gem
    await db
      .update(offer)
      .set({ status: "rejected" } as any)
      .where(
        and(
          eq(offer.gemId, offerRecord.gemId),
          ne(offer.id, req.params.id),
          ne(offer.status, "rejected" as any),
          ne(offer.status, "expired" as any)
        )
      );

    res.json({ success: true });
  } catch (e) {
    console.error("Error accepting offer:", e);
    res.status(500).json({ error: "Failed to accept offer" });
  }
});

export default router;
