import { authClient } from "./auth-client";
import type {
  Gem,
  Offer,
  CreditTransaction,
  CreateGemInput,
  CreateOfferInput,
} from "./api-types";

const API_BASE = "http://localhost:8000";

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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
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
};
