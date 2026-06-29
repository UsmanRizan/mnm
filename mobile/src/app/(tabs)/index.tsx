import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { router, Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { gemsApi, creditsApi } from "../../lib/api-client";
import { authClient } from "../../lib/auth-client";
import type { Gem } from "../../lib/api-types";
import { Colors } from "../../constants/theme";

async function handleLogout() {
  // Cross-platform confirm: window.confirm on web, Alert.alert on native
  const confirmed = Platform.OS === "web"
    ? window.confirm("Sign out of your account?")
    : await new Promise<boolean>((resolve) => {
        Alert.alert("Sign Out", "Sign out of your account?", [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Sign Out", style: "destructive", onPress: () => resolve(true) },
        ]);
      });

  if (!confirmed) return;

  try {
    await authClient.signOut();
  } catch {
    // Offline or server error — session may persist, but we navigate away anyway
  }

  // Unconditionally navigate to sign-in
  router.replace("/sign-in" as Href);
}

function GemListItem({ gem }: { gem: Gem }) {
  const isExpired = gem.expiresAt && new Date(gem.expiresAt) < new Date();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/gem/${gem.id}` as Href)}
      style={{
        flexDirection: "row",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.08)",
        opacity: isExpired ? 0.6 : 1,
      }}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 12,
          backgroundColor: Colors.dark.backgroundElement,
          overflow: "hidden",
          marginRight: 12,
        }}
      >
        {gem.imageUrls && gem.imageUrls.length > 0 ? (
          <Image
            source={{ uri: gem.imageUrls[0] }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 28 }}>💎</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            style={{
              color: Colors.dark.text,
              fontWeight: "700",
              fontSize: 15,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {gem.title || `${gem.category || "Gem"} - ${gem.weight || "?"}ct`}
          </Text>
          {isExpired && (
            <Text
              style={{
                color: "#EF4444",
                fontSize: 9,
                fontWeight: "700",
              }}
            >
              EXPIRED
            </Text>
          )}
          {gem.status === "sold" && (
            <Text
              style={{
                color: "#10B981",
                fontSize: 9,
                fontWeight: "700",
              }}
            >
              SOLD
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
          {[
            gem.weight && `${gem.weight}ct`,
            gem.shape,
            gem.mainColour,
            gem.origin,
          ]
            .filter(Boolean)
            .slice(0, 3)
            .map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: Colors.dark.backgroundElement,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: Colors.dark.textSecondary,
                    fontSize: 10,
                  }}
                >
                  {tag}
                </Text>
              </View>
            ))}
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <Text
            style={{
              color: Colors.dark.textSecondary,
              fontSize: 11,
            }}
          >
            by {gem.ownerName}
          </Text>
          {gem.offerCreditCost > 0 && (
            <Text
              style={{
                color: "#10B981",
                fontSize: 10,
                fontWeight: "700",
              }}
            >
              {gem.offerCreditCost} cr
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// --- User footer with sign-out and credits ---
function UserFooter({
  session,
  balance,
  onBuyCredits,
}: {
  session: any;
  balance: number | null;
  onBuyCredits: () => void;
}) {
  return (
    <View
      style={{
        marginTop: 24,
        marginHorizontal: 16,
        padding: 16,
        backgroundColor: Colors.dark.backgroundElement,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.1)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.dark.text, fontWeight: "700", fontSize: 15 }}>
            {session?.user.name || "User"}
          </Text>
          <Text style={{ color: Colors.dark.textSecondary, fontSize: 12 }}>
            {session?.user.phoneNumber || session?.user.email || ""}
          </Text>
        </View>
      </View>

      {/* Credit Balance */}
      {balance !== null && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "rgba(16, 185, 129, 0.2)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 18 }}>🪙</Text>
            <Text style={{ color: Colors.dark.text, fontWeight: "700", fontSize: 14 }}>
              Credits
            </Text>
          </View>
          <Text
            style={{
              color: "#10B981",
              fontWeight: "900",
              fontSize: 20,
            }}
          >
            {balance}
          </Text>
        </View>
      )}

      {/* Buy Credits */}
      <TouchableOpacity
        onPress={onBuyCredits}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "rgba(16, 185, 129, 0.2)",
          marginBottom: 8,
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 16 }}>💳</Text>
        <Text style={{ color: "#10B981", fontWeight: "700", fontSize: 14 }}>
          Buy Credits
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleLogout}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: "rgba(239,68,68,0.12)",
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "rgba(239,68,68,0.2)",
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 16 }}>🚪</Text>
        <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 14 }}>
          Sign Out
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const [gems, setGems] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const { data: session } = authClient.useSession();

  const loadGems = useCallback(async () => {
    try {
      const [data, { balance: bal }] = await Promise.all([
        gemsApi.list(),
        creditsApi.getBalance(),
      ]);
      setGems(data);
      setBalance(bal);
    } catch (err) {
      console.error("Failed to load gems:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGems();
  }, [loadGems]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGems();
  };

  const handleBuyCredits = () => {
    const presets = [
      { label: "100 credits — $1.00", value: 100 },
      { label: "500 credits — $5.00", value: 500 },
      { label: "1000 credits — $10.00", value: 1000 },
    ];

    if (Platform.OS === "web") {
      const amountStr = window.prompt("Enter credit amount to purchase:", "100");
      if (!amountStr) return;
      const amount = parseInt(amountStr);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert("Error", "Please enter a valid amount");
        return;
      }
      creditsApi.purchase(amount).then(({ balance: newBal }) => {
        setBalance(newBal);
        Alert.alert("Success", `Purchased ${amount} credits!`);
      }).catch((err) => {
        Alert.alert("Error", err.message);
      });
    } else {
      Alert.alert("Buy Credits", "Choose an amount to purchase", [
        ...presets.map((p) => ({
          text: p.label,
          onPress: () => {
            creditsApi.purchase(p.value).then(({ balance: newBal }) => {
              setBalance(newBal);
              Alert.alert("Success", `Purchased ${p.value} credits!`);
            }).catch((err) => {
              Alert.alert("Error", err.message);
            });
          },
        })),
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.dark.background }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.1)",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "900",
              color: Colors.dark.text,
            }}
          >
            Gemstones
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: Colors.dark.textSecondary, fontSize: 12 }}>
              {gems.length} listing{gems.length !== 1 ? "s" : ""} available
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>·</Text>
            <Text
              style={{ color: Colors.dark.textSecondary, fontSize: 12 }}
              numberOfLines={1}
            >
              {session?.user.name}
            </Text>
            {balance !== null && (
              <>
                <Text style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>·</Text>
                <Text
                  style={{
                    color: "#10B981",
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {balance} cr
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push("/post-gem" as Href)}
            style={{
              backgroundColor: "#10B981",
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#10B981",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Text style={{ color: "white", fontSize: 24, fontWeight: "300" }}>
              +
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : gems.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
          }}
        >
          <Text style={{ fontSize: 64, marginBottom: 16 }}>💎</Text>
          <Text
            style={{
              color: Colors.dark.text,
              fontSize: 18,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            No Gems Listed Yet
          </Text>
          <Text
            style={{
              color: Colors.dark.textSecondary,
              textAlign: "center",
              marginTop: 8,
              marginBottom: 24,
            }}
          >
            Be the first to post a gemstone for sale!
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/post-gem" as Href)}
            style={{
              backgroundColor: "#10B981",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "700",
                fontSize: 15,
              }}
            >
              Post a Gem
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={gems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <GemListItem gem={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10B981"
            />
          }
          ListFooterComponent={<UserFooter session={session} balance={balance} onBuyCredits={handleBuyCredits} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
}
