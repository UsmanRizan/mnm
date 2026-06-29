export interface Gem {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  weight: string | null;
  shape: string | null;
  mainColour: string | null;
  origin: string | null;
  treatment: string | null;
  category: string | null;
  description: string | null;
  imageUrls: string[];
  certificateData: {
    imageUrl?: string;
    lab?: string;
    reportNumber?: string;
  } | null;
  offerCreditCost: number;
  maxOffers: number;
  status: "active" | "sold" | "expired" | "draft";
  expiresAt: string | null;
  createdAt: string;
}

export interface Offer {
  id: string;
  gemId: string;
  buyerId: string;
  buyerName: string;
  amount: string;
  status:
    | "pending"
    | "countered_by_owner"
    | "countered_by_buyer"
    | "accepted"
    | "rejected"
    | "expired";
  lastSenderId: string | null;
  history: OfferHistoryEvent[];
  expiresAt: string | null;
  createdAt: string;
}

export interface OfferHistoryEvent {
  type: "initial_offer" | "counter_offer" | "acceptance";
  amount: number;
  senderId: string;
  timestamp: string;
  status: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type:
    | "purchase"
    | "posting_fee"
    | "offer_cost"
    | "counter_cost"
    | "reactivation"
    | "weekly_replenish"
    | "offer_payout";
  description: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface CreateGemInput {
  weight?: string;
  shape?: string;
  mainColour?: string;
  origin?: string;
  treatment?: string;
  imageUrls?: string[];
  category?: string;
  title?: string;
  description?: string;
  certificateData?: {
    imageUrl?: string;
    lab?: string;
    reportNumber?: string;
  };
  offerCreditCost?: number;
  durationDays?: number;
  maxOffers?: number;
}

export interface CreateOfferInput {
  gemId: string;
  amount: number;
  validityMinutes?: number;
}
