import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { payherePayment } from "../db/payment-schema.ts";
import { creditTransaction } from "../db/gem-schema.ts";
import { user } from "../db/auth-schema.ts";
import { auth } from "../lib/auth.ts";
import { generateId } from "../lib/utils.ts";
import {
  getConfig,
  generateHash,
  generateOrderId,
  verifyMd5sig,
  PAYHERE_STATUS,
} from "../services/payhere.ts";

const router = Router();
const PAYHERE_CHECKOUT_URL = "https://www.payhere.lk/pay/checkout";

// Credit packages (amount => price mapping)
const CREDIT_RATES: Record<number, number> = {
  100: 100,   // 100 credits = $1.00 (1 credit = $0.01)
  500: 500,   // 500 credits = $5.00
  1000: 1000, // 1000 credits = $10.00
  2500: 2500, // 2500 credits = $25.00
  5000: 5000, // 5000 credits = $50.00
};

// --- Helpers ---

function getBaseUrl(req: Request): string {
  // Allow override via env for production/public URL
  if (process.env.PAYHERE_BASE_URL) {
    return process.env.PAYHERE_BASE_URL.replace(/\/+$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

async function requireAuth(req: Request, res: Response) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session.user;
}

// --- Routes ---

/**
 * POST /api/payhere/checkout
 *
 * Initialize a PayHere checkout session for purchasing credits.
 * Body: { amount: number }  (credit amount, must be a valid package)
 *
 * Returns checkout parameters the client can use to redirect to PayHere.
 */
router.post("/checkout", async (req: Request, res: Response) => {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  const { amount, address, city, phone } = req.body;

  // Validate amount
  const parsedAmount = parseInt(amount, 10);
  if (!parsedAmount || parsedAmount <= 0) {
    res.status(400).json({ error: "Invalid amount. Must be a positive number." });
    return;
  }

  try {
    // Look up user details for the checkout form
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.id, currentUser.id))
      .then((rows) => rows[0]);

    if (!userRecord) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Save address/city/phone if provided in the request (user filled them on the form)
    // Use the correct column name for phone from user schema
    const updates: Record<string, string> = {};
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (phone !== undefined) updates.phoneNumber = phone;

    if (Object.keys(updates).length > 0) {
      await db.update(user).set(updates).where(eq(user.id, currentUser.id));
    }

    // Determine final values for PayHere checkout
    // Use submitted values first, then saved values, then fallback
    const finalAddress = address || userRecord.address || "";
    const finalCity = city || userRecord.city || "";
    const finalPhone = phone || userRecord.phoneNumber || "";
    const name = userRecord.name || "Customer";

    // Check which required PayHere fields are still missing
    const missingFields: string[] = [];
    if (!finalPhone) missingFields.push("phone");
    if (!finalAddress) missingFields.push("address");
    if (!finalCity) missingFields.push("city");

    if (missingFields.length > 0) {
      res.status(400).json({
        error: "Missing required PayHere fields",
        missingFields,
        // Return current values so the form can pre-fill
        currentValues: {
          phone: userRecord.phoneNumber || "",
          address: userRecord.address || "",
          city: userRecord.city || "",
          name,
        },
      });
      return;
    }

    const orderId = generateOrderId();
    const currency = "LKR";
    const baseUrl = getBaseUrl(req);

    // Create pending payment record
    await db.insert(payherePayment).values({
      id: generateId("phpay"),
      userId: currentUser.id,
      orderId,
      amount: parsedAmount,
      currency,
      status: "pending",
    });

    // Build return and cancel URLs
    const returnUrl = `${baseUrl}/api/payhere/return?order_id=${orderId}`;
    const cancelUrl = `${baseUrl}/api/payhere/cancel?order_id=${orderId}`;

    // Point to our hosted checkout page
    const checkoutUrl = `${baseUrl}/api/payhere/checkout-page/${orderId}`;

    res.json({
      orderId,
      checkoutUrl,
      returnUrl,
      cancelUrl,
      amount: parsedAmount,
    });
  } catch (e) {
    console.error("Error creating PayHere checkout:", e);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

/**
 * GET /api/payhere/checkout-page/:orderId
 *
 * Serves an HTML page that auto-submits a form to PayHere.
 * Used by the mobile app's WebView / in-app browser.
 * This avoids popup blockers and works reliably in WebViews.
 */
router.get("/checkout-page/:orderId", async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    const payment = await db
      .select()
      .from(payherePayment)
      .where(eq(payherePayment.orderId, orderId))
      .then((rows) => rows[0]);

    if (!payment) {
      res.status(404).send("<h1>Checkout not found</h1>");
      return;
    }

    if (payment.status !== "pending") {
      res.status(400).send("<h1>This checkout has already been processed</h1>");
      return;
    }

    // Fetch user details
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.id, payment.userId))
      .then((rows) => rows[0]);

    if (!userRecord) {
      res.status(404).send("<h1>User not found</h1>");
      return;
    }

    const { merchantId, secret } = getConfig();
    const baseUrl = getBaseUrl(req);
    const priceAmount = CREDIT_RATES[payment.amount] ?? payment.amount;
    // PayHere expects the amount with exactly 2 decimal places
    const formattedAmount = priceAmount.toFixed(2);

    const returnUrl = `${baseUrl}/api/payhere/return?order_id=${orderId}`;
    const cancelUrl = `${baseUrl}/api/payhere/cancel?order_id=${orderId}`;
    const notifyUrl = `${baseUrl}/api/payhere/notify`;

    const hash = generateHash(
      merchantId,
      orderId,
      formattedAmount,
      payment.currency,
      secret
    );

    const nameParts = (userRecord.name || "Customer").split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || ".";
    const userAddress = userRecord.address || "N/A";
    const userCity = userRecord.city || "Colombo";
    const userPhone = userRecord.phoneNumber || "";

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    // Build a JSON config for the frontend
    const paymentConfig = JSON.stringify({
      sandbox: true,
      merchant_id: merchantId,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      first_name: firstName,
      last_name: lastName,
      email: userRecord.email,
      phone: userPhone,
      address: userAddress,
      city: userCity,
      country: "Sri Lanka",
      order_id: orderId,
      items: `${payment.amount} Credits`,
      currency: payment.currency,
      amount: formattedAmount,
      hash,
    });

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting to PayHere...</title>
  <script src="https://www.payhere.lk/lib/payhere.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0f;
      color: #e4e4e7;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container { text-align: center; padding: 2rem; }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    p { color: #71717a; font-size: 0.875rem; }
    .amount { color: #10b981; font-weight: 800; font-size: 1.5rem; margin: 0.75rem 0; }
    .fallback { margin-top: 1rem; }
    .fallback a { color: #10b981; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>Opening PayHere Checkout</h1>
    <p>You are purchasing</p>
    <div class="amount">${payment.amount} Credits</div>
    <p class="fallback"><a href="javascript:location.reload()">Click here if payment does not open</a></p>
  </div>
  <script>
    var payment = ${paymentConfig};

    payhere.onCompleted = function onComplete() {
      window.location.href = "${escapeHtml(returnUrl)}";
    };

    payhere.onDismissed = function onDismiss() {
      window.location.href = "${escapeHtml(cancelUrl)}";
    };

    payhere.onError = function onError() {
      window.location.href = "${escapeHtml(cancelUrl)}";
    };

    payhere.startPayment(payment);
  </script>
</body>
</html>`);
  } catch (e) {
    console.error("Error serving checkout page:", e);
    res.status(500).send("<h1>Internal error</h1>");
  }
});

/**
 * POST /api/payhere/notify
 *
 * PayHere payment notification webhook.
 * PayHere sends a server-side POST to this URL after payment processing.
 * This is NOT browser-visible — it's a server-to-server call.
 *
 * IMPORTANT: This URL must be publicly accessible (use ngrok in dev).
 */
router.post("/notify", async (req: Request, res: Response) => {
  // PayHere sends the notification as application/x-www-form-urlencoded
  const notification = req.body;

  console.log("[PayHere] Notification received:", JSON.stringify(notification));

  try {
    const { merchantId, secret } = getConfig();

    const orderId = notification.order_id;
    const statusCode = notification.status_code;

    // Verify merchant_id matches ours
    if (notification.merchant_id !== merchantId) {
      console.error("[PayHere] Merchant ID mismatch");
      res.status(200).send("ERROR: Invalid merchant");
      return;
    }

    // Verify signature
    const isValid = verifyMd5sig(
      {
        merchant_id: notification.merchant_id,
        order_id: notification.order_id,
        payhere_amount: notification.payhere_amount,
        payhere_currency: notification.payhere_currency,
        status_code: notification.status_code,
        md5sig: notification.md5sig,
      },
      secret
    );

    if (!isValid) {
      console.error("[PayHere] Invalid md5sig for order:", orderId);
      res.status(200).send("ERROR: Invalid signature");
      return;
    }

    // Look up the payment record
    const payment = await db
      .select()
      .from(payherePayment)
      .where(eq(payherePayment.orderId, orderId))
      .then((rows) => rows[0]);

    if (!payment) {
      console.error("[PayHere] Unknown order:", orderId);
      res.status(200).send("ERROR: Unknown order");
      return;
    }

    if (payment.status !== "pending") {
      console.log(`[PayHere] Order ${orderId} already processed (${payment.status})`);
      // Still return OK to avoid PayHere retrying
      res.status(200).send("OK: Duplicate");
      return;
    }

    // Process based on status code
    if (statusCode === PAYHERE_STATUS.SUCCESS) {
      // Payment successful — credit the user
      await db.transaction(async (tx) => {
        // Update payment record
        await tx
          .update(payherePayment)
          .set({
            status: "completed",
            paymentId: notification.payment_id,
            method: notification.method || null,
          })
          .where(eq(payherePayment.orderId, orderId));

        // Add credits to user
        await tx.insert(creditTransaction).values({
          id: generateId("txn"),
          userId: payment.userId,
          amount: payment.amount,
          type: "purchase",
          description: `Purchased ${payment.amount} credits via PayHere (${notification.payment_id || "unknown"})`,
          referenceId: orderId,
        });
      });

      console.log(`[PayHere] Order ${orderId}: ${payment.amount} credits credited to user ${payment.userId}`);
      res.status(200).send("OK: Success");
    } else if (statusCode === PAYHERE_STATUS.CANCELED) {
      await db
        .update(payherePayment)
        .set({ status: "cancelled", paymentId: notification.payment_id })
        .where(eq(payherePayment.orderId, orderId));

      console.log(`[PayHere] Order ${orderId}: cancelled`);
      res.status(200).send("OK: Cancelled");
    } else if (
      statusCode === PAYHERE_STATUS.FAILED ||
      statusCode === PAYHERE_STATUS.CHARGEDBACK
    ) {
      await db
        .update(payherePayment)
        .set({ status: "failed", paymentId: notification.payment_id })
        .where(eq(payherePayment.orderId, orderId));

      console.log(`[PayHere] Order ${orderId}: failed (${statusCode})`);
      res.status(200).send("OK: Failed");
    } else {
      // Pending or unknown
      console.log(`[PayHere] Order ${orderId}: status ${statusCode} (no action)`);
      res.status(200).send("OK: Received");
    }
  } catch (e) {
    console.error("[PayHere] Error processing notification:", e);
    // Always return 200 to acknowledge receipt
    res.status(200).send("ERROR: Internal");
  }
});

/**
 * GET /api/payhere/return
 *
 * Return URL — the customer is redirected here after payment.
 * Shows a human-readable result and auto-closes the window/tab.
 */
router.get("/return", async (req: Request, res: Response) => {
  const orderId = req.query.order_id as string;

  let status = "completed";
  let message = "Payment successful! Your credits have been added.";
  let amount = 0;

  if (orderId) {
    try {
      const payment = await db
        .select()
        .from(payherePayment)
        .where(eq(payherePayment.orderId, orderId))
        .then((rows) => rows[0]);

      if (payment) {
        amount = payment.amount;
        if (payment.status === "completed") {
          // Check if credits were actually added
          const txn = await db
            .select()
            .from(creditTransaction)
            .where(eq(creditTransaction.referenceId, orderId))
            .then((rows) => rows[0]);

          if (txn) {
            message = `Payment successful! ${payment.amount} credits have been added to your account.`;
          } else {
            message = "Payment received. Credits will be added shortly.";
          }
        } else if (payment.status === "pending") {
          message = "Payment is being processed. Check your balance in a moment.";
          status = "pending";
        } else if (payment.status === "cancelled") {
          message = "Payment was cancelled.";
          status = "cancelled";
        } else if (payment.status === "failed") {
          message = "Payment failed. Please try again.";
          status = "failed";
        }
      } else {
        message = "Payment processed successfully.";
      }
    } catch {
      message = "Payment processed successfully.";
    }
  }

  const statusColor =
    status === "completed"
      ? "#10b981"
      : status === "cancelled"
      ? "#f59e0b"
      : status === "failed"
      ? "#ef4444"
      : "#f59e0b";

  const icon =
    status === "completed"
      ? "&#9989;"
      : status === "cancelled"
      ? "&#10060;"
      : status === "failed"
      ? "&#10060;"
      : "&#9203;";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment ${status}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0f;
      color: #e4e4e7;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      background: #18181b;
      border-radius: 1rem;
      padding: 2.5rem;
      text-align: center;
      max-width: 400px;
      margin: 1rem;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { color: #71717a; font-size: 0.875rem; line-height: 1.5; }
    .amount { color: ${statusColor}; font-weight: 800; font-size: 1.5rem; margin: 0.75rem 0; }
    .btn {
      display: inline-block;
      margin-top: 1.25rem;
      padding: 0.625rem 1.5rem;
      background: ${statusColor};
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
    .btn:hover { opacity: 0.9; }
    .hint { font-size: 0.75rem; color: #52525b; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>Payment ${status === "completed" ? "Successful" : status.charAt(0).toUpperCase() + status.slice(1)}</h1>
    ${amount > 0 ? `<div class="amount">${amount} Credits</div>` : ""}
    <p>${message}</p>
    <p class="hint">You can close this window and return to the app.</p>
    <button class="btn" onclick="window.close()">Close</button>
  </div>
  <script>
    // Auto-close after 5 seconds if opened as a popup
    setTimeout(() => { try { window.close(); } catch {} }, 5000);
  </script>
</body>
</html>`);
});

/**
 * GET /api/payhere/cancel
 *
 * Cancel URL — the customer is redirected here if they cancel the payment.
 */
router.get("/cancel", async (req: Request, res: Response) => {
  const orderId = req.query.order_id as string;

  if (orderId) {
    try {
      await db
        .update(payherePayment)
        .set({ status: "cancelled" })
        .where(eq(payherePayment.orderId, orderId));
    } catch {
      // Best effort
    }
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Cancelled</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0f;
      color: #e4e4e7;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      background: #18181b;
      border-radius: 1rem;
      padding: 2.5rem;
      text-align: center;
      max-width: 400px;
      margin: 1rem;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { color: #71717a; font-size: 0.875rem; }
    .btn {
      display: inline-block;
      margin-top: 1.25rem;
      padding: 0.625rem 1.5rem;
      background: #f59e0b;
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10060;</div>
    <h1>Payment Cancelled</h1>
    <p>You cancelled the payment. No charges were made.</p>
    <button class="btn" onclick="window.close()">Close</button>
  </div>
</body>
</html>`);
});

export default router;

// --- Utilities ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
