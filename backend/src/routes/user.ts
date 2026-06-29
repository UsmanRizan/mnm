import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { user } from "../db/auth-schema.ts";
import { auth } from "../lib/auth.ts";

const router = Router();

async function requireAuth(req: Request, res: Response) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session.user;
}

/**
 * GET /api/user/profile — get current user's profile (phone, address, city)
 */
router.get("/profile", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  try {
    const userRecord = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        phoneNumberVerified: user.phoneNumberVerified,
        address: user.address,
        city: user.city,
      })
      .from(user)
      .where(eq(user.id, currentUser.id))
      .then((rows) => rows[0]);

    if (!userRecord) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(userRecord);
  } catch (e) {
    console.error("Error fetching profile:", e);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * PUT /api/user/profile — update profile fields (address, city)
 */
router.put("/profile", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  const { address, city } = req.body;

  const updates: Record<string, string> = {};
  if (address !== undefined) updates.address = address;
  if (city !== undefined) updates.city = city;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  try {
    await db.update(user).set(updates).where(eq(user.id, currentUser.id));

    const updated = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        city: user.city,
      })
      .from(user)
      .where(eq(user.id, currentUser.id))
      .then((rows) => rows[0]);

    res.json(updated);
  } catch (e) {
    console.error("Error updating profile:", e);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
