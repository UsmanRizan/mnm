import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  Platform,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, router, Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { gemsApi, offersApi } from "../../lib/api-client";
import { authClient } from "../../lib/auth-client";
import type { Gem, Offer, OfferHistoryEvent } from "../../lib/api-types";
import { Colors } from "../../constants/theme";

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getStatusColor(status: string): string {
  switch (status) {
    case "accepted":
      return "#10B981";
    case "pending":
      return "#6B7280";
    case "countered_by_owner":
    case "countered_by_buyer":
      return "#3B82F6";
    case "rejected":
    case "expired":
      return "#EF4444";
    default:
      return "#6B7280";
  }
}

function HistoryTimeline({ history }: { history: OfferHistoryEvent[] }) {
  return (
    <View style={{ paddingLeft: 24, position: "relative" }}>
      {/* Vertical line */}
      <View
        style={{
          position: "absolute",
          left: 9,
          top: 8,
          bottom: 8,
          width: 2,
          backgroundColor: "rgba(255,255,255,0.1)",
        }}
      />

      {history.map((event, idx) => {
        const isAcceptance = event.type === "acceptance";
        const isInitial = event.type === "initial_offer";

        return (
          <View key={idx} style={{ marginBottom: 16, position: "relative" }}>
            {/* Dot */}
            <View
              style={{
                position: "absolute",
                left: -19,
                top: 4,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: isAcceptance
                  ? "#10B981"
                  : isInitial
                  ? "#3B82F6"
                  : "#6B7280",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 6, color: "white" }}>
                {isAcceptance ? "✓" : isInitial ? "●" : "↔"}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.05)",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    color: "#60A5FA",
                    fontSize: 10,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {event.type.replace(/_/g, " ")}
                </Text>
                <Text
                  style={{
                    color: Colors.dark.textSecondary,
                    fontSize: 10,
                  }}
                >
                  {formatTimeAgo(event.timestamp)}
                </Text>
              </View>
              <Text
                style={{
                  color: Colors.dark.text,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                ${event.amount.toLocaleString()}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function GemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = authClient.useSession();
  const [gem, setGem] = useState<Gem | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Offer form
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Counter offer
  const [counteringOfferId, setCounteringOfferId] = useState<string | null>(
    null
  );
  const [counterAmount, setCounterAmount] = useState("");

  // History
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [gemData, offersData] = await Promise.all([
        gemsApi.getById(id),
        offersApi.getForGem(id),
      ]);
      setGem(gemData);
      setOffers(offersData);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMakeOffer = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const newOffer = await offersApi.create({
        gemId: id,
        amount: parseFloat(offerAmount),
      });
      setOffers((prev) => [newOffer, ...prev]);
      setShowOfferForm(false);
      setOfferAmount("");
      Alert.alert("Success", "Your offer has been submitted");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    Alert.alert(
      "Accept Offer",
      "Are you sure you want to accept this offer? This will finalize the deal and mark the gem as sold.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          style: "default",
          onPress: async () => {
            try {
              await offersApi.accept(offerId);
              await loadData();
              Alert.alert("Success", "Offer accepted! The deal is finalized.");
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

  const handleCounterOffer = async (offerId: string) => {
    if (!counterAmount || parseFloat(counterAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid counter amount");
      return;
    }

    setSubmitting(true);
    try {
      await offersApi.counter(offerId, parseFloat(counterAmount));
      await loadData();
      setCounteringOfferId(null);
      setCounterAmount("");
      Alert.alert("Success", "Counter-offer sent");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (days: number) => {
    try {
      await gemsApi.reactivate(id, days);
      await loadData();
      Alert.alert("Success", `Gem reactivated for ${days} days`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.dark.background, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  if (!gem) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.dark.background, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ color: Colors.dark.textSecondary }}>Gem not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: "#10B981" }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentUserId = session?.user.id;
  const isOwner = gem.ownerId === currentUserId;
  const isExpired = gem.expiresAt && new Date(gem.expiresAt) < new Date();
  const isSold = gem.status === "sold";
  const hasAcceptedOffer = offers.some((o) => o.status === "accepted");
  const hasUserOffer = offers.some(
    (o) => o.status !== "rejected" && o.status !== "expired"
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.1)",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 8, marginRight: 8 }}
        >
          <Text style={{ color: Colors.dark.text, fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: Colors.dark.text,
            }}
          >
            Gem Details
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
          />
        }
      >
        {/* Images */}
        {gem.imageUrls && gem.imageUrls.length > 0 ? (
          <Image
            source={{ uri: gem.imageUrls[0] }}
            style={{
              width: "100%",
              height: 300,
              backgroundColor: Colors.dark.backgroundElement,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: 200,
              backgroundColor: Colors.dark.backgroundElement,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 48 }}>💎</Text>
            <Text
              style={{
                color: Colors.dark.textSecondary,
                marginTop: 8,
              }}
            >
              No image available
            </Text>
          </View>
        )}

        <View style={{ padding: 16 }}>
          {/* Owner info */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: Colors.dark.backgroundElement,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 18 }}>👤</Text>
            </View>
            <View>
              <Text
                style={{
                  color: Colors.dark.text,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                {gem.ownerName}
              </Text>
              <Text style={{ color: Colors.dark.textSecondary, fontSize: 12 }}>
                Gem Owner
              </Text>
            </View>
          </View>

          {/* Title / Gem ID */}
          <Text
            style={{
              color: "#10B981",
              fontSize: 22,
              fontWeight: "900",
              marginBottom: 16,
            }}
          >
            {gem.title}
          </Text>

          {/* Status badges */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {isExpired && (
              <View
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{ color: "#EF4444", fontSize: 11, fontWeight: "700" }}
                >
                  EXPIRED
                </Text>
              </View>
            )}
            {isSold && (
              <View
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{ color: "#10B981", fontSize: 11, fontWeight: "700" }}
                >
                  SOLD
                </Text>
              </View>
            )}
          </View>

          {/* Specs Grid */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {[
              { label: "Weight", value: gem.weight ? `${gem.weight} ct` : "—" },
              { label: "Shape", value: gem.shape || "—" },
              { label: "Colour", value: gem.mainColour || "—" },
              { label: "Origin", value: gem.origin || "—" },
              { label: "Treatment", value: gem.treatment || "—" },
              { label: "Category", value: gem.category || "—" },
            ].map((spec) => (
              <View
                key={spec.label}
                style={{
                  flex: 1,
                  minWidth: "45%",
                  backgroundColor: Colors.dark.backgroundElement,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.05)",
                }}
              >
                <Text
                  style={{
                    color: Colors.dark.textSecondary,
                    fontSize: 10,
                    fontWeight: "700",
                    textTransform: "lowercase",
                    marginBottom: 4,
                  }}
                >
                  {spec.label}
                </Text>
                <Text
                  style={{
                    color: Colors.dark.text,
                    fontWeight: "700",
                    fontSize: 15,
                  }}
                >
                  {spec.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Description */}
          {gem.description ? (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: Colors.dark.textSecondary,
                  fontSize: 12,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                Description
              </Text>
              <Text style={{ color: Colors.dark.text, fontSize: 14, lineHeight: 20 }}>
                {gem.description}
              </Text>
            </View>
          ) : null}

          {/* Certificate */}
          {gem.certificateData?.imageUrl && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: Colors.dark.textSecondary,
                  fontSize: 12,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                Authenticity Certificate
              </Text>
              <Image
                source={{ uri: gem.certificateData.imageUrl }}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 12,
                  backgroundColor: Colors.dark.backgroundElement,
                }}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Expiry info */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 12,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              marginBottom: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 14, marginRight: 6 }}>📅</Text>
              <Text style={{ color: Colors.dark.textSecondary, fontSize: 13 }}>
                {gem.createdAt
                  ? new Date(gem.createdAt).toLocaleDateString()
                  : "—"}
              </Text>
            </View>
            <Text
              style={{
                color: isExpired ? "#EF4444" : "#10B981",
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              {isExpired
                ? "Expired"
                : `Expires: ${
                    gem.expiresAt
                      ? new Date(gem.expiresAt).toLocaleDateString()
                      : "—"
                  }`}
            </Text>
          </View>

          {/* Expired gem - reactivate */}
          {isExpired && !isSold && isOwner && (
            <View
              style={{
                backgroundColor: Colors.dark.backgroundElement,
                borderRadius: 16,
                padding: 16,
                marginBottom: 24,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <Text
                style={{
                  color: Colors.dark.text,
                  fontWeight: "700",
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                Listing Expired
              </Text>
              <Text
                style={{
                  color: Colors.dark.textSecondary,
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                This gem is no longer receiving offers. Reactivate to continue
                negotiations.
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[1, 5, 10].map((days) => (
                  <TouchableOpacity
                    key={days}
                    onPress={() => handleReactivate(days)}
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      padding: 12,
                      borderRadius: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.dark.text,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {days}d
                    </Text>
                    <Text
                      style={{
                        color: Colors.dark.textSecondary,
                        fontSize: 10,
                      }}
                    >
                      {days * 10} cr
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Offers Section */}
          <View
            style={{
              backgroundColor: Colors.dark.backgroundElement,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 18 }}>💰</Text>
                <Text
                  style={{
                    color: Colors.dark.text,
                    fontWeight: "700",
                    fontSize: 18,
                  }}
                >
                  {isOwner ? "Offers Received" : "Your Offers"}
                </Text>
                <View
                  style={{
                    backgroundColor: "rgba(107, 114, 128, 0.3)",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: Colors.dark.textSecondary,
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {offers.length}/{gem.maxOffers}
                  </Text>
                </View>
              </View>
              {gem.offerCreditCost > 0 && !isOwner && (
                <View
                  style={{
                    backgroundColor: "rgba(107, 114, 128, 0.3)",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: Colors.dark.textSecondary,
                      fontSize: 10,
                    }}
                  >
                    cost: {gem.offerCreditCost} cr
                  </Text>
                </View>
              )}
            </View>

            {/* Accepted banner */}
            {hasAcceptedOffer && (
              <View
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: "rgba(16, 185, 129, 0.2)",
                }}
              >
                <Text
                  style={{
                    color: "#10B981",
                    fontWeight: "700",
                    textAlign: "center",
                    fontSize: 13,
                  }}
                >
                  ✅ Deal Finalized — An offer has been accepted
                </Text>
              </View>
            )}

            {/* Make Offer Button / Form */}
            {!isOwner && !isExpired && !isSold && !hasAcceptedOffer && (
              <>
                {!showOfferForm ? (
                  <TouchableOpacity
                    onPress={() => setShowOfferForm(true)}
                    style={{
                      backgroundColor: "#10B981",
                      padding: 14,
                      borderRadius: 12,
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "700",
                        fontSize: 15,
                      }}
                    >
                      Make an Offer
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={{
                      backgroundColor: "rgba(0,0,0,0.3)",
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: Colors.dark.textSecondary,
                          fontSize: 18,
                          fontWeight: "700",
                          marginRight: 8,
                        }}
                      >
                        $
                      </Text>
                      <TextInput
                        value={offerAmount}
                        onChangeText={setOfferAmount}
                        placeholder="Enter amount"
                        placeholderTextColor={Colors.dark.textSecondary}
                        keyboardType="decimal-pad"
                        style={{
                          flex: 1,
                          backgroundColor: Colors.dark.background,
                          borderRadius: 8,
                          padding: 10,
                          fontSize: 16,
                          color: Colors.dark.text,
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.1)",
                        }}
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowOfferForm(false);
                          setOfferAmount("");
                        }}
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 8,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.2)",
                        }}
                      >
                        <Text style={{ color: Colors.dark.textSecondary }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleMakeOffer}
                        disabled={submitting}
                        style={{
                          flex: 1,
                          backgroundColor: "#10B981",
                          padding: 10,
                          borderRadius: 8,
                          alignItems: "center",
                        }}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text
                            style={{ color: "white", fontWeight: "700" }}
                          >
                            Send Offer
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Offer List */}
            {offers.length === 0 ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ color: Colors.dark.textSecondary, fontStyle: "italic" }}>
                  No offers yet
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {offers.map((offer) => {
                  const isOfferExpired =
                    offer.expiresAt &&
                    new Date(offer.expiresAt) < new Date() &&
                    (offer.status === "pending" ||
                      offer.status.startsWith("countered"));

                  const canOwnerAct =
                    isOwner &&
                    !isExpired &&
                    !isSold &&
                    (offer.status === "pending" ||
                      offer.status === "countered_by_buyer") &&
                    !isOfferExpired;

                  const canBuyerAct =
                    !isOwner &&
                    !isExpired &&
                    !isSold &&
                    offer.status === "countered_by_owner" &&
                    !isOfferExpired;

                  const isOfferBuyer = offer.buyerId === currentUserId;
                  const canCounter =
                    (isOwner || isOfferBuyer) &&
                    !isExpired &&
                    !isSold &&
                    offer.status !== "accepted" &&
                    offer.status !== "rejected" &&
                    !isOfferExpired;

                  return (
                    <View
                      key={offer.id}
                      style={{
                        opacity: isOfferExpired ? 0.5 : 1,
                        backgroundColor: "rgba(0,0,0,0.2)",
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.05)",
                      }}
                    >
                      {/* Offer Header */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: Colors.dark.backgroundElement,
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text style={{ fontSize: 14 }}>👤</Text>
                          </View>
                          <View>
                            <Text
                              style={{
                                color: Colors.dark.text,
                                fontWeight: "700",
                                fontSize: 13,
                              }}
                            >
                              {isOwner ? offer.buyerName : "Your Offer"}
                            </Text>
                            <Text
                              style={{
                                color: Colors.dark.textSecondary,
                                fontSize: 10,
                              }}
                            >
                              {formatTimeAgo(offer.createdAt)}
                              {!isOfferExpired &&
                                (offer.status === "pending" ||
                                  offer.status.startsWith("countered")) &&
                                ` • expires ${formatTimeAgo(offer.expiresAt || "")}`}
                            </Text>
                          </View>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              color: "#10B981",
                              fontWeight: "900",
                              fontSize: 18,
                            }}
                          >
                            ${parseFloat(offer.amount).toLocaleString()}
                          </Text>
                          <Text
                            style={{
                              color: getStatusColor(offer.status),
                              fontSize: 10,
                              fontWeight: "700",
                              textTransform: "uppercase",
                            }}
                          >
                            {isOfferExpired
                              ? "Expired"
                              : offer.status.replace(/_/g, " ")}
                          </Text>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          marginTop: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {(canOwnerAct || canBuyerAct) && (
                          <TouchableOpacity
                            onPress={() => handleAcceptOffer(offer.id)}
                            style={{
                              backgroundColor: "#10B981",
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                            }}
                          >
                            <Text
                              style={{
                                color: "white",
                                fontWeight: "700",
                                fontSize: 11,
                              }}
                            >
                              Accept
                            </Text>
                          </TouchableOpacity>
                        )}

                        {canCounter && offer.lastSenderId !== currentUserId && (
                          <TouchableOpacity
                            onPress={() =>
                              setCounteringOfferId(
                                counteringOfferId === offer.id
                                  ? null
                                  : offer.id
                              )
                            }
                            style={{
                              backgroundColor: Colors.dark.backgroundSelected,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                            }}
                          >
                            <Text
                              style={{
                                color: Colors.dark.text,
                                fontWeight: "700",
                                fontSize: 11,
                              }}
                            >
                              {counteringOfferId === offer.id
                                ? "Cancel"
                                : "Counter"}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() =>
                            setShowHistoryId(
                              showHistoryId === offer.id ? null : offer.id
                            )
                          }
                          style={{
                            backgroundColor: Colors.dark.backgroundSelected,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: Colors.dark.textSecondary,
                              fontWeight: "700",
                              fontSize: 11,
                            }}
                          >
                            {showHistoryId === offer.id
                              ? "Hide History"
                              : "History"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Counter Form */}
                      {counteringOfferId === offer.id && (
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            marginTop: 10,
                            paddingTop: 10,
                            borderTopWidth: 1,
                            borderTopColor: "rgba(255,255,255,0.1)",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              flex: 1,
                              alignItems: "center",
                              backgroundColor: Colors.dark.background,
                              borderRadius: 8,
                              paddingLeft: 8,
                              borderWidth: 1,
                              borderColor: "rgba(255,255,255,0.1)",
                            }}
                          >
                            <Text
                              style={{
                                color: Colors.dark.textSecondary,
                                fontWeight: "700",
                              }}
                            >
                              $
                            </Text>
                            <TextInput
                              value={counterAmount}
                              onChangeText={setCounterAmount}
                              placeholder="Amount"
                              placeholderTextColor={Colors.dark.textSecondary}
                              keyboardType="decimal-pad"
                              style={{
                                flex: 1,
                                padding: 8,
                                color: Colors.dark.text,
                                fontSize: 14,
                              }}
                            />
                          </View>
                          <TouchableOpacity
                            onPress={() => handleCounterOffer(offer.id)}
                            disabled={submitting}
                            style={{
                              backgroundColor: "#10B981",
                              paddingHorizontal: 16,
                              borderRadius: 8,
                              justifyContent: "center",
                            }}
                          >
                            {submitting ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Text
                                style={{
                                  color: "white",
                                  fontWeight: "700",
                                  fontSize: 13,
                                }}
                              >
                                Send
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* History */}
                      {showHistoryId === offer.id && offer.history && offer.history.length > 0 && (
                        <View
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTopWidth: 1,
                            borderTopColor: "rgba(255,255,255,0.1)",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "center",
                              marginBottom: 12,
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: "rgba(59, 130, 246, 0.15)",
                                paddingHorizontal: 12,
                                paddingVertical: 4,
                                borderRadius: 20,
                              }}
                            >
                              <Text
                                style={{
                                  color: "#60A5FA",
                                  fontSize: 9,
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  letterSpacing: 1,
                                }}
                              >
                                Offer History
                              </Text>
                            </View>
                          </View>
                          <HistoryTimeline history={offer.history} />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
