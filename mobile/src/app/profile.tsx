import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { userApi } from "../lib/api-client";
import type { UserProfile } from "../lib/api-types";
import { Colors } from "../constants/theme";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const data = await userApi.getProfile();
      setProfile(data);
      setAddress(data.address || "");
      setCity(data.city || "");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    const updates: { address?: string; city?: string } = {};
    if (address !== profile?.address) updates.address = address;
    if (city !== profile?.city) updates.city = city;

    if (Object.keys(updates).length === 0) {
      Alert.alert("No Changes", "Nothing to save.");
      return;
    }

    setSaving(true);
    try {
      const updated = await userApi.updateProfile(updates);
      setProfile(updated);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
        <Text style={{ color: Colors.dark.text, fontSize: 20, fontWeight: "900", flex: 1 }}>
          Profile
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingHorizontal: 16, paddingVertical: 8,
            backgroundColor: saving ? "rgba(16, 185, 129, 0.4)" : "#10B981",
            borderRadius: 8, opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Name (read-only) */}
        <Text style={labelStyle}>Name</Text>
        <View style={[inputStyle, { backgroundColor: "rgba(255,255,255,0.04)", opacity: 0.6 }]}>
          <Text style={{ color: Colors.dark.textSecondary, padding: Platform.OS === "ios" ? 14 : 10 }}>
            {profile?.name || "—"}
          </Text>
        </View>

        {/* Email (read-only) */}
        <Text style={labelStyle}>Email</Text>
        <View style={[inputStyle, { backgroundColor: "rgba(255,255,255,0.04)", opacity: 0.6 }]}>
          <Text style={{ color: Colors.dark.textSecondary, padding: Platform.OS === "ios" ? 14 : 10 }}>
            {profile?.email || "—"}
          </Text>
        </View>

        {/* Phone (read-only here — can be updated via sign-in) */}
        <Text style={labelStyle}>Phone Number</Text>
        <View style={[inputStyle, { backgroundColor: "rgba(255,255,255,0.04)", opacity: 0.6 }]}>
          <Text style={{ color: Colors.dark.textSecondary, padding: Platform.OS === "ios" ? 14 : 10 }}>
            {profile?.phoneNumber || "—"}
          </Text>
        </View>

        {/* PayHere-specific fields */}
        <View
          style={{
            marginTop: 24, marginBottom: 8,
            padding: 12,
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            borderRadius: 12,
            borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.15)",
          }}
        >
          <Text style={{ color: "#10B981", fontSize: 12, fontWeight: "600" }}>
            💳 These fields are sent to PayHere for payment processing.
          </Text>
        </View>

        {/* Address */}
        <Text style={labelStyle}>Address</Text>
        <TextInput
          style={inputStyle}
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. 123 Main Street, Colombo 3"
          placeholderTextColor="#52525b"
          multiline
        />

        {/* City */}
        <Text style={labelStyle}>City</Text>
        <TextInput
          style={inputStyle}
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Colombo"
          placeholderTextColor="#52525b"
        />

        {/* Hint */}
        <Text style={{ color: "#52525b", fontSize: 11, marginTop: 20, textAlign: "center" }}>
          Address and city are needed when purchasing credits via PayHere.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

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
