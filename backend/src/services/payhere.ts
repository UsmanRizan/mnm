import crypto from "crypto";

// --- Types ---

export interface PayHereConfig {
  merchantId: string;
  secret: string;
}

export interface CheckoutParams {
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  order_id: string;
  items: string;
  currency: string;
  amount: string;
  hash: string;
}

export interface PayHereNotification {
  merchant_id: string;
  order_id: string;
  payment_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
  custom_1?: string;
  custom_2?: string;
  method?: string;
  status_message?: string;
  card_holder_name?: string;
  card_no?: string;
  card_expiry?: string;
}

// --- Configuration ---

export function getConfig(): PayHereConfig {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const secret = process.env.PAYHERE_SECRET;

  if (!merchantId || !secret) {
    throw new Error(
      "PayHere not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_SECRET in .env"
    );
  }

  return { merchantId, secret };
}

// --- Hash Generation ---

/**
 * Generate the hash required for PayHere checkout.
 *
 * Formula:
 *   hash = strtoupper(md5(merchant_id + order_id + amount + currency + strtoupper(md5(merchant_secret))))
 */
export function generateHash(
  merchantId: string,
  orderId: string,
  amount: string,
  currency: string,
  secret: string
): string {
  const inner = crypto
    .createHash("md5")
    .update(secret)
    .digest("hex")
    .toUpperCase();

  return crypto
    .createHash("md5")
    .update(merchantId + orderId + amount + currency + inner)
    .digest("hex")
    .toUpperCase();
}

// --- Signature Verification ---

/**
 * Verify the md5sig from a payment notification.
 *
 * Formula:
 *   md5sig = strtoupper(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + strtoupper(md5(merchant_secret))))
 */
export function verifyMd5sig(
  params: {
    merchant_id: string;
    order_id: string;
    payhere_amount: string;
    payhere_currency: string;
    status_code: string;
    md5sig: string;
  },
  secret: string
): boolean {
  const inner = crypto
    .createHash("md5")
    .update(secret)
    .digest("hex")
    .toUpperCase();

  const expected = crypto
    .createHash("md5")
    .update(
      params.merchant_id +
        params.order_id +
        params.payhere_amount +
        params.payhere_currency +
        params.status_code +
        inner
    )
    .digest("hex")
    .toUpperCase();

  return expected === params.md5sig.toUpperCase();
}

// --- Helpers ---

/**
 * Generate a unique order ID for PayHere transactions.
 */
export function generateOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "PH";
  for (let i = 0; i < 14; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Status codes returned by PayHere.
 */
export const PAYHERE_STATUS = {
  SUCCESS: "2",
  PENDING: "0",
  CANCELED: "-1",
  FAILED: "-2",
  CHARGEDBACK: "-3",
} as const;
