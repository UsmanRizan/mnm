import { useState } from "react";
import {
  View,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
} from "react-native";

import { authClient } from "../lib/auth-client";
import { router } from "expo-router";

type Step = "phone" | "otp";

export default function SignIn() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    try {
      setLoading(true);

      const { error } = await authClient.phoneNumber.sendOtp({
        phoneNumber,
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      setStep("otp");
      Alert.alert("Success", "OTP sent successfully");
    } catch {
      Alert.alert("Error", "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    try {
      setLoading(true);

      const { error } = await authClient.phoneNumber.verify({
        phoneNumber,
        code: otp,
      });

      if (error) {
        Alert.alert("Sign In Failed", error.message);
        return;
      }

      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ padding: 20, gap: 12 }}>
      {step === "phone" ? (
        <>
          <TextInput
            placeholder="+94771234567"
            keyboardType="phone-pad"
            autoCapitalize="none"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            style={{
              borderWidth: 1,
              padding: 12,
              borderRadius: 8,
            }}
          />

          {loading ? (
            <ActivityIndicator />
          ) : (
            <Button title="Send OTP" onPress={handleSendOtp} />
          )}
        </>
      ) : (
        <>
          <TextInput
            placeholder="Enter OTP"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            style={{
              borderWidth: 1,
              padding: 12,
              borderRadius: 8,
            }}
          />

          {loading ? (
            <ActivityIndicator />
          ) : (
            <Button title="Verify OTP" onPress={handleVerifyOtp} />
          )}

          <Button
            title="Change Phone Number"
            onPress={() => {
              setOtp("");
              setStep("phone");
            }}
          />
        </>
      )}
    </View>
  );
}
