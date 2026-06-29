import { authClient } from "./auth-client";
import type {
  Gem,
  Offer,
  CreditTransaction,
  CreateGemInput,
  CreateOfferInput,
  PayHereCheckout,
  UserProfile,
} from "./api-types";

const API_BASE = "http://localhost:8000";

/**
 * Custom error that carries structured data from the API.
 */
export class ApiError extends Error {
  status: number;
  body: any;

  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;

    // Forward structured fields for convenience
    if (body?.missingFields) {
      (this as any).missingFields = body.missingFields;
      (this as any).currentValues = body.currentValues;
    }
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Get session to retrieve auth cookie/token
  const { data: session } = await authClient.getSession();
  if (session) {
    // The better-auth expo client handles cookie/session via SecureStore
    // We need to forward the session token via Authorization header
    // For now, cookies should be handled automatically by fetch
  }

  return headers;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new ApiError(
      json.error || `HTTP ${response.status}`,
      response.status,
      json
    );
    throw error;
  }

  return json as T;
}

// --- Gems ---

export const gemsApi = {
  list: () => request<Gem[]>("GET", "/api/gems"),

  getById: (id: string) => request<Gem>("GET", `/api/gems/${id}`),

  create: (input: CreateGemInput) =>
    request<Gem>("POST", "/api/gems", input),

  getMyGems: () => request<Gem[]>("GET", "/api/gems/my"),

  reactivate: (id: string, durationDays: number) =>
    request<{ success: boolean }>("POST", `/api/gems/${id}/reactivate`, {
      durationDays,
    }),
};

// --- Offers ---

export const offersApi = {
  getForGem: (gemId: string) =>
    request<Offer[]>("GET", `/api/offers/${gemId}`),

  create: (input: CreateOfferInput) =>
    request<Offer>("POST", "/api/offers", input),

  accept: (id: string) =>
    request<{ success: boolean }>("POST", `/api/offers/${id}/accept`),

  counter: (id: string, amount: number) =>
    request<{ success: boolean }>("POST", `/api/offers/${id}/counter`, {
      amount,
    }),
};

// --- Credits ---

export const creditsApi = {
  getBalance: () => request<{ balance: number }>("GET", "/api/credits/balance"),

  purchase: (amount: number) =>
    request<{ balance: number }>("POST", "/api/credits/purchase", { amount }),

  getTransactions: () =>
    request<CreditTransaction[]>("GET", "/api/credits/transactions"),

  // --- PayHere Integration ---

  /** Initialize a PayHere checkout session for buying credits. */
  payhereCheckout: (
    amount: number,
    profile?: { address?: string; city?: string; phone?: string }
  ) =>
    request<PayHereCheckout>("POST", "/api/payhere/checkout", {
      amount,
      ...(profile?.address !== undefined ? { address: profile.address } : {}),
      ...(profile?.city !== undefined ? { city: profile.city } : {}),
      ...(profile?.phone !== undefined ? { phone: profile.phone } : {}),
    }),
};

// --- User Profile ---

export const userApi = {
  getProfile: () => request<UserProfile>("GET", "/api/user/profile"),

  updateProfile: (data: { address?: string; city?: string }) =>
    request<UserProfile>("PUT", "/api/user/profile", data),
};
