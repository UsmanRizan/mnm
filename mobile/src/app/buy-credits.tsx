import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  AppState,
  AppStateStatus,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { creditsApi } from "../lib/api-client";
import { Colors } from "../constants/theme";

interface CreditPackage {
  credits: number;
  price: number;
  label: string;
  popular?: boolean;
  bestValue?: boolean;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { credits: 100, price: 1.0, label: "Starter" },
  { credits: 500, price: 5.0, label: "Basic", popular: true },
  { credits: 1000, price: 10.0, label: "Standard" },
  { credits: 2500, price: 25.0, label: "Premium" },
  { credits: 5000, price: 50.0, label: "Pro", bestValue: true },
];

export default function BuyCreditsScreen() {
  const [balance, setBalance] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const appState = useRef(AppState.currentState);

  // Missing-fields form state
  const [pendingCredits, setPendingCredits] = useState<number | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formName, setFormName] = useState("");

  const loadBalance = useCallback(async () => {
    try {
      const { balance: bal } = await creditsApi.getBalance();
      setBalance(bal);
    } catch (err) {
      console.error("Failed to load balance:", err);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // Refresh balance when user returns from browser
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          loadBalance();
          setPurchasing(false);
        }
        appState.current = nextAppState;
      }
    );
    return () => subscription.remove();
  }, [loadBalance]);

  const openCheckoutUrl = async (checkoutUrl: string) => {
    const supported = await Linking.canOpenURL(checkoutUrl);
    if (supported) {
      await Linking.openURL(checkoutUrl);
    } else {
      Alert.alert("Error", "Could not open payment page");
      setPurchasing(false);
    }
  };

  const handleBuyCredits = async (credits: number) => {
    setPurchasing(true);
    setPendingCredits(credits);

    try {
      const result = await creditsApi.payhereCheckout(credits);
      await openCheckoutUrl(result.checkoutUrl);
    } catch (err: any) {
      // Check if the error is about missing PayHere fields
      if (err.missingFields && err.missingFields.length > 0) {
        setMissingFields(err.missingFields);
        setFormPhone(err.currentValues?.phone || "");
        setFormAddress(err.currentValues?.address || "");
        setFormCity(err.currentValues?.city || "");
        setFormName(err.currentValues?.name || "");
        setPurchasing(false);
        return;
      }
      Alert.alert("Error", err.message || "Failed to start checkout");
      setPurchasing(false);
    }
  };

  const handleSubmitForm = async () => {
    if (!pendingCredits) return;

    // Validate
    const errors: string[] = [];
    if (missingFields.includes("phone") && !formPhone.trim()) errors.push("Phone number is required");
    if (missingFields.includes("address") && !formAddress.trim()) errors.push("Address is required");
    if (missingFields.includes("city") && !formCity.trim()) errors.push("City is required");

    if (errors.length > 0) {
      Alert.alert("Required", errors.join("\n"));
      return;
    }

    setPurchasing(true);

    try {
      const result = await creditsApi.payhereCheckout(pendingCredits, {
        phone: formPhone.trim(),
        address: formAddress.trim(),
        city: formCity.trim(),
      });
      setMissingFields([]);
      setPendingCredits(null);
      await openCheckoutUrl(result.checkoutUrl);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to start checkout");
      setPurchasing(false);
    }
  };

  if (balance === null && !purchasing && missingFields.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.dark.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

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
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.08)",
            justifyContent: "center", alignItems: "center", marginRight: 12,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.dark.text, fontSize: 20, fontWeight: "900" }}>
            {missingFields.length > 0 ? "Complete Your Details" : "Buy Credits"}
          </Text>
        </View>
        {missingFields.length === 0 && (
          <TouchableOpacity
            onPress={() => router.push("/profile" as any)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6,
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 8,
            }}
          >
            <Text style={{ color: Colors.dark.textSecondary, fontSize: 12, fontWeight: "600" }}>Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {missingFields.length > 0 ? (
          /* --- Missing Fields Form --- */
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <View
              style={{
                backgroundColor: "rgba(250, 204, 21, 0.1)",
                borderRadius: 12, padding: 12, marginBottom: 20,
                borderWidth: 1, borderColor: "rgba(250, 204, 21, 0.2)",
              }}
            >
              <Text style={{ color: "#FACC15", fontSize: 13, fontWeight: "600" }}>
                PayHere requires your contact details before proceeding.
                These will be saved to your profile for future purchases.
              </Text>
            </View>

            {/* Name (read-only) */}
            <Text style={labelStyle}>Name</Text>
            <View style={[inputStyle, { backgroundColor: "rgba(255,255,255,0.04)", opacity: 0.6 }]}>
              <Text style={{ color: Colors.dark.textSecondary, padding: 14 }}>{formName || "—"}</Text>
            </View>

            {/* Phone */}
            {missingFields.includes("phone") && (
              <>
                <Text style={labelStyle}>Phone Number *</Text>
                <TextInput
                  style={inputStyle}
                  value={formPhone}
                  onChangeText={setFormPhone}
                  placeholder="e.g. 0771234567"
                  placeholderTextColor="#52525b"
                  keyboardType="phone-pad"
                />
              </>
            )}

            {/* Address */}
            {missingFields.includes("address") && (
              <>
                <Text style={labelStyle}>Address *</Text>
                <TextInput
                  style={inputStyle}
                  value={formAddress}
                  onChangeText={setFormAddress}
                  placeholder="e.g. 123 Main Street, Colombo 3"
                  placeholderTextColor="#52525b"
                />
              </>
            )}

            {/* City */}
            {missingFields.includes("city") && (
              <>
                <Text style={labelStyle}>City *</Text>
                <TextInput
                  style={inputStyle}
                  value={formCity}
                  onChangeText={setFormCity}
                  placeholder="e.g. Colombo"
                  placeholderTextColor="#52525b"
                />
              </>
            )}

            <TouchableOpacity
              onPress={handleSubmitForm}
              disabled={purchasing}
              style={{
                backgroundColor: "#10B981",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                marginTop: 24,
                opacity: purchasing ? 0.6 : 1,
              }}
              activeOpacity={0.7}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                  Continue to Payment
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* --- Package Selection --- */
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Current Balance */}
            <View
              style={{
                margin: 16, padding: 20,
                backgroundColor: Colors.dark.backgroundElement,
                borderRadius: 16,
                borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
              }}
            >
              <Text style={{ color: Colors.dark.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 4 }}>
                Current Balance
              </Text>
              <Text style={{ color: "#10B981", fontSize: 36, fontWeight: "900" }}>{balance}</Text>
              <Text style={{ color: Colors.dark.textSecondary, fontSize: 12 }}>credits</Text>
            </View>

            <View style={{ paddingHorizontal: 16 }}>
              <Text style={{ color: Colors.dark.text, fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
                Select Package
              </Text>

              {CREDIT_PACKAGES.map((pkg) => (
                <TouchableOpacity
                  key={pkg.credits}
                  onPress={() => handleBuyCredits(pkg.credits)}
                  disabled={purchasing}
                  style={{
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: Colors.dark.backgroundElement,
                    borderRadius: 16, padding: 16, marginBottom: 10,
                    borderWidth: 1,
                    borderColor: pkg.popular ? "rgba(16, 185, 129, 0.4)" : "rgba(255,255,255,0.06)",
                    opacity: purchasing ? 0.6 : 1,
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 48, height: 48, borderRadius: 14,
                      backgroundColor: pkg.popular ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.06)",
                      justifyContent: "center", alignItems: "center", marginRight: 14,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>
                      {pkg.bestValue ? "🏆" : pkg.popular ? "🔥" : "💎"}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ color: Colors.dark.text, fontSize: 16, fontWeight: "700" }}>{pkg.label}</Text>
                      {pkg.popular && (
                        <View style={{ backgroundColor: "rgba(16, 185, 129, 0.2)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ color: "#10B981", fontSize: 9, fontWeight: "800" }}>POPULAR</Text>
                        </View>
                      )}
                      {pkg.bestValue && (
                        <View style={{ backgroundColor: "rgba(250, 204, 21, 0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ color: "#FACC15", fontSize: 9, fontWeight: "800" }}>BEST VALUE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: Colors.dark.textSecondary, fontSize: 13, marginTop: 2 }}>
                      {pkg.credits.toLocaleString()} credits
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: "#10B981", fontSize: 20, fontWeight: "800" }}>
                      ${pkg.price.toFixed(2)}
                    </Text>
                    <Text style={{ color: Colors.dark.textSecondary, fontSize: 10 }}>
                      ${(pkg.price / pkg.credits).toFixed(4)}/cr
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Purchase Loading Overlay */}
            {purchasing && (
              <View
                style={{
                  margin: 16, padding: 24,
                  backgroundColor: Colors.dark.backgroundElement,
                  borderRadius: 16, alignItems: "center",
                  borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.2)",
                }}
              >
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ color: Colors.dark.text, fontSize: 15, fontWeight: "600", marginTop: 12 }}>
                  Opening PayHere...
                </Text>
                <Text style={{ color: Colors.dark.textSecondary, fontSize: 12, marginTop: 4, textAlign: "center" }}>
                  Complete payment in your browser,{"\n"}then return to the app.
                </Text>
              </View>
            )}

            {/* Info */}
            <View
              style={{
                margin: 16, padding: 14,
                backgroundColor: "rgba(250, 204, 21, 0.08)",
                borderRadius: 12,
                borderWidth: 1, borderColor: "rgba(250, 204, 21, 0.15)",
              }}
            >
              <Text style={{ color: "#FACC15", fontSize: 12, fontWeight: "600" }}>
                💡 After completing payment in your browser, return to this app and
                your balance will update automatically.
              </Text>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Shared styles
const labelStyle: any = {
  color: Colors.dark.textSecondary,
  fontSize: 12,
  fontWeight: "600",
  marginBottom: 6,
  marginTop: 12,
};

const inputStyle: any = {
  backgroundColor: Colors.dark.backgroundElement,
  color: Colors.dark.text,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.1)",
  paddingHorizontal: 14,
  paddingVertical: Platform.OS === "ios" ? 14 : 10,
  fontSize: 15,
};
