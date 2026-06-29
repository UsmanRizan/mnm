import { Router, Request, Response } from "express";
import { eq, and, desc, sql, lt, gte, count } from "drizzle-orm";
import { db } from "../db/index.ts";
import { gem, offer, creditTransaction } from "../db/gem-schema.ts";
import { user } from "../db/auth-schema.ts";
import { auth } from "../lib/auth.ts";
import { generateId } from "../lib/utils.ts";

const router = Router();

// Middleware to require auth
async function requireAuth(req: Request, res: Response) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session.user;
}

// --- Gems ---

// GET /api/gems — list all active gems
router.get("/", async (req: Request, res: Response) => {
  try {
    const gems = await db
      .select({
        id: gem.id,
        ownerId: gem.ownerId,
        ownerName: user.name,
        title: gem.title,
        weight: gem.weight,
        shape: gem.shape,
        mainColour: gem.mainColour,
        origin: gem.origin,
        treatment: gem.treatment,
        category: gem.category,
        description: gem.description,
        imageUrls: gem.imageUrls,
        certificateData: gem.certificateData,
        offerCreditCost: gem.offerCreditCost,
        maxOffers: gem.maxOffers,
        status: gem.status,
        expiresAt: gem.expiresAt,
        createdAt: gem.createdAt,
      })
      .from(gem)
      .leftJoin(user, eq(gem.ownerId, user.id))
      .where(eq(gem.status, "active"))
      .orderBy(desc(gem.createdAt));

    res.json(gems);
  } catch (e) {
    console.error("Error fetching gems:", e);
    res.status(500).json({ error: "Failed to fetch gems" });
  }
});

// GET /api/gems/my — get current user's gems
router.get("/my", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  try {
    const gems = await db
      .select()
      .from(gem)
      .where(eq(gem.ownerId, currentUser.id))
      .orderBy(desc(gem.createdAt));

    res.json(gems);
  } catch (e) {
    console.error("Error fetching user gems:", e);
    res.status(500).json({ error: "Failed to fetch your gems" });
  }
});

// POST /api/gems — create a new gem listing
router.post("/", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  const {
    weight,
    shape,
    mainColour,
    origin,
    treatment,
    imageUrls,
    category,
    title,
    description,
    certificateData,
    offerCreditCost = 0,
    durationDays = 5,
    maxOffers = 5,
  } = req.body;

  try {
    const gemId = generateId("gem");

    const newGem = await db
      .insert(gem)
      .values({
        id: gemId,
        ownerId: currentUser.id,
        title: title || gemId,
        weight: weight?.toString(),
        shape,
        mainColour,
        origin,
        treatment,
        imageUrls: imageUrls || [],
        category,
        description,
        certificateData: certificateData || null,
        offerCreditCost: offerCreditCost || 0,
        maxOffers: maxOffers || 5,
        status: "active",
        expiresAt: sql`now() + interval '1 day' * ${durationDays}`,
      })
      .returning();

    // Calculate cost and log credit transaction
    const extraDays = Math.max(0, durationDays - 5);
    const extraDaysCost = extraDays * 10;
    const extraOffers = Math.max(0, maxOffers - 5);
    const extraOffersCost = Math.ceil(extraOffers / 5) * 10;
    const totalCost = 50 + extraDaysCost + extraOffersCost;

    await db.insert(creditTransaction).values({
      id: generateId("txn"),
      userId: currentUser.id,
      amount: -totalCost,
      type: "posting_fee",
      description: `Posted ${category} gem (${durationDays}d, ${maxOffers} offers)`,
      referenceId: gemId,
    });

    res.json(newGem[0]);
  } catch (e) {
    console.error("Error creating gem:", e);
    res.status(500).json({ error: "Failed to create gem listing" });
  }
});

// GET /api/gems/:id — get a single gem
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await db
      .select({
        id: gem.id,
        ownerId: gem.ownerId,
        ownerName: user.name,
        title: gem.title,
        weight: gem.weight,
        shape: gem.shape,
        mainColour: gem.mainColour,
        origin: gem.origin,
        treatment: gem.treatment,
        category: gem.category,
        description: gem.description,
        imageUrls: gem.imageUrls,
        certificateData: gem.certificateData,
        offerCreditCost: gem.offerCreditCost,
        maxOffers: gem.maxOffers,
        status: gem.status,
        expiresAt: gem.expiresAt,
        createdAt: gem.createdAt,
      })
      .from(gem)
      .leftJoin(user, eq(gem.ownerId, user.id))
      .where(eq(gem.id, req.params.id));

    if (!result.length) {
      res.status(404).json({ error: "Gem not found" });
      return;
    }

    // Increment view count or similar could go here

    res.json(result[0]);
  } catch (e) {
    console.error("Error fetching gem:", e);
    res.status(500).json({ error: "Failed to fetch gem" });
  }
});

// POST /api/gems/:id/reactivate — reactivate an expired listing
router.post("/:id/reactivate", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  const { durationDays = 5 } = req.body;

  try {
    const existing = await db
      .select()
      .from(gem)
      .where(and(eq(gem.id, req.params.id), eq(gem.ownerId, currentUser.id)))
      .then((rows) => rows[0]);

    if (!existing) {
      res.status(404).json({ error: "Gem not found or not yours" });
      return;
    }

    const cost = durationDays * 10;
    // TODO: check credits

    await db
      .update(gem)
      .set({
        status: "active",
        expiresAt: sql`now() + interval '1 day' * ${durationDays}`,
      })
      .where(eq(gem.id, req.params.id));

    await db.insert(creditTransaction).values({
      id: generateId("txn"),
      userId: currentUser.id,
      amount: -cost,
      type: "reactivation",
      description: `Reactivated gem for ${durationDays} days`,
      referenceId: req.params.id,
    });

    res.json({ success: true });
  } catch (e) {
    console.error("Error reactivating gem:", e);
    res.status(500).json({ error: "Failed to reactivate gem" });
  }
});

export default router;
