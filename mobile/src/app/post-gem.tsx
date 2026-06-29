import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { gemsApi } from "../lib/api-client";
import { Colors, Spacing } from "../constants/theme";

const CATEGORIES = [
  "Sapphire",
  "Ruby",
  "Emerald",
  "Diamond",
  "Opal",
  "Amethyst",
  "Topaz",
  "Garnet",
  "Tourmaline",
  "Peridot",
];

const SHAPES = [
  "Oval",
  "Round",
  "Cushion",
  "Pear",
  "Emerald Cut",
  "Heart",
  "Marquise",
  "Princess",
  "Radiant",
  "Asscher",
];

const COLOURS = [
  "Blue",
  "Colorless",
  "Green",
  "Orange",
  "Peach",
  "Pink",
  "Purple",
  "Red",
  "Violet",
  "Yellow",
  "Bi-colour",
  "Black",
  "White",
];

const ORIGINS = [
  "Sri Lanka",
  "Myanmar",
  "Madagascar",
  "Colombia",
  "Brazil",
  "Thailand",
  "Tanzania",
  "Mozambique",
  "Ethiopia",
  "Australia",
  "Zambia",
  "Afghanistan",
];

const TREATMENTS = [
  "None",
  "Heat Treated",
  "Beryllium Diffusion",
  "Fracture Filled",
  "Irradiated",
];

const DURATIONS = [
  { label: "5 Days", value: 5, cost: 50 },
  { label: "7 Days", value: 7, cost: 70 },
  { label: "10 Days", value: 10, cost: 100 },
  { label: "14 Days", value: 14, cost: 140 },
  { label: "30 Days", value: 30, cost: 300 },
];

const OFFER_LIMITS = [
  { label: "5 Offers", value: 5, cost: 50 },
  { label: "10 Offers", value: 10, cost: 60 },
  { label: "15 Offers", value: 15, cost: 80 },
  { label: "20 Offers", value: 20, cost: 100 },
  { label: "50 Offers", value: 50, cost: 200 },
];

function PickerSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: Colors.dark.textSecondary,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={{
          backgroundColor: Colors.dark.backgroundElement,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: open ? "#10B981" : "rgba(255,255,255,0.1)",
        }}
      >
        <Text style={{ color: Colors.dark.text, fontSize: 15 }}>
          {value || `Select ${label}`}
        </Text>
      </TouchableOpacity>
      {open && (
        <View
          style={{
            backgroundColor: Colors.dark.backgroundElement,
            borderRadius: 12,
            marginTop: 4,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            maxHeight: 200,
          }}
        >
          <ScrollView>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255,255,255,0.05)",
                  backgroundColor:
                    opt.value === value
                      ? "rgba(16, 185, 129, 0.15)"
                      : "transparent",
                }}
              >
                <Text
                  style={{
                    color:
                      opt.value === value ? "#10B981" : Colors.dark.text,
                    fontWeight: opt.value === value ? "700" : "400",
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function PostGemScreen() {
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [certImageUri, setCertImageUri] = useState<string | null>(null);
  const [hasCertificate, setHasCertificate] = useState(false);

  // Form fields
  const [category, setCategory] = useState("Sapphire");
  const [weight, setWeight] = useState("");
  const [shape, setShape] = useState("Oval");
  const [mainColour, setMainColour] = useState("Blue");
  const [origin, setOrigin] = useState("Sri Lanka");
  const [treatment, setTreatment] = useState("None");
  const [description, setDescription] = useState("");
  const [offerCreditCost, setOfferCreditCost] = useState("0");
  const [durationDays, setDurationDays] = useState(5);
  const [maxOffers, setMaxOffers] = useState(5);

  const totalCost = 50 + Math.max(0, durationDays - 5) * 10;

  const pickImage = async (isCert: boolean) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (isCert) {
        setCertImageUri(result.assets[0].uri);
      } else {
        setImageUri(result.assets[0].uri);
      }
    }
  };

  const handleSubmit = async () => {
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert("Error", "Please enter a valid weight");
      return;
    }

    setLoading(true);
    try {
      // Convert images to base64 for the API
      let imageUrls: string[] = [];
      if (imageUri) {
        // In a real app, you'd upload to a storage service
        // For now, we'll use the local URI
        imageUrls = [imageUri];
      }

      const certificateData = hasCertificate && certImageUri
        ? { imageUrl: certImageUri }
        : undefined;

      await gemsApi.create({
        weight,
        shape,
        mainColour,
        origin,
        treatment,
        imageUrls,
        category,
        title: `${category} - ${weight}ct`,
        description,
        certificateData,
        offerCreditCost: parseInt(offerCreditCost) || 0,
        durationDays,
        maxOffers,
      });

      Alert.alert("Success", "Your gem has been listed!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.message || "Failed to post gem. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.dark.background }}>
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
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: Colors.dark.text,
          }}
        >
          Post New Gem
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Cost Banner */}
        <View
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: "rgba(16, 185, 129, 0.2)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#10B981",
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                Posting Fee
              </Text>
              <Text
                style={{
                  color: "rgba(16, 185, 129, 0.6)",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {totalCost} credits will be deducted from your balance
              </Text>
            </View>
            <Text
              style={{
                color: "#10B981",
                fontWeight: "700",
                fontSize: 18,
                fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
              }}
            >
              -{totalCost}
            </Text>
          </View>
        </View>

        {/* Gem Image */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: Colors.dark.textSecondary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Gemstone Photo
        </Text>
        <TouchableOpacity
          onPress={() => pickImage(false)}
          style={{
            backgroundColor: Colors.dark.backgroundElement,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.1)",
            borderStyle: "dashed",
            height: 200,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 24,
            overflow: "hidden",
          }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 32, color: Colors.dark.textSecondary }}>
                +
              </Text>
              <Text
                style={{
                  color: Colors.dark.textSecondary,
                  marginTop: 8,
                  fontSize: 14,
                }}
              >
                Tap to upload image
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Category & Weight */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <PickerSelect
              label="Category"
              value={category}
              options={CATEGORIES.map((c) => ({ label: c, value: c }))}
              onChange={setCategory}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: Colors.dark.textSecondary,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Weight (ct)
            </Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder="5.25"
              placeholderTextColor={Colors.dark.textSecondary}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: Colors.dark.backgroundElement,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: Colors.dark.text,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
                marginBottom: 16,
              }}
            />
          </View>
        </View>

        {/* Shape & Colour */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <PickerSelect
              label="Shape"
              value={shape}
              options={SHAPES.map((s) => ({ label: s, value: s }))}
              onChange={setShape}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PickerSelect
              label="Colour"
              value={mainColour}
              options={COLOURS.map((c) => ({ label: c, value: c }))}
              onChange={setMainColour}
            />
          </View>
        </View>

        {/* Origin & Treatment */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <PickerSelect
              label="Origin"
              value={origin}
              options={ORIGINS.map((o) => ({ label: o, value: o }))}
              onChange={setOrigin}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PickerSelect
              label="Treatment"
              value={treatment}
              options={TREATMENTS.map((t) => ({ label: t, value: t }))}
              onChange={setTreatment}
            />
          </View>
        </View>

        {/* Description */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: Colors.dark.textSecondary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Description (optional)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your gemstone..."
          placeholderTextColor={Colors.dark.textSecondary}
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: Colors.dark.backgroundElement,
            borderRadius: 12,
            padding: 14,
            fontSize: 15,
            color: Colors.dark.text,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            marginBottom: 24,
            minHeight: 80,
            textAlignVertical: "top",
          }}
        />

        {/* Certificate Toggle */}
        <TouchableOpacity
          onPress={() => setHasCertificate(!hasCertificate)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: Colors.dark.backgroundElement,
            borderRadius: 12,
            padding: 14,
            marginBottom: hasCertificate ? 12 : 24,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 18 }}>📜</Text>
            <View>
              <Text
                style={{
                  color: Colors.dark.text,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                Authenticity Certificate
              </Text>
              <Text
                style={{
                  color: Colors.dark.textSecondary,
                  fontSize: 11,
                }}
              >
                Include a lab report with your listing
              </Text>
            </View>
          </View>
          <View
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              backgroundColor: hasCertificate ? "#10B981" : Colors.dark.backgroundSelected,
              justifyContent: "center",
              padding: 2,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: "white",
                alignSelf: hasCertificate ? "flex-end" : "flex-start",
              }}
            />
          </View>
        </TouchableOpacity>

        {hasCertificate && (
          <TouchableOpacity
            onPress={() => pickImage(true)}
            style={{
              backgroundColor: Colors.dark.backgroundElement,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.1)",
              borderStyle: "dashed",
              height: 160,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 24,
              overflow: "hidden",
            }}
          >
            {certImageUri ? (
              <Image
                source={{ uri: certImageUri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            ) : (
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 24, color: Colors.dark.textSecondary }}>
                  📄
                </Text>
                <Text
                  style={{
                    color: Colors.dark.textSecondary,
                    marginTop: 8,
                    fontSize: 13,
                  }}
                >
                  Upload lab report image
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Offer Credit Cost */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: Colors.dark.textSecondary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Offer Credit Cost
        </Text>
        <TextInput
          value={offerCreditCost}
          onChangeText={setOfferCreditCost}
          placeholder="0"
          placeholderTextColor={Colors.dark.textSecondary}
          keyboardType="number-pad"
          style={{
            backgroundColor: Colors.dark.backgroundElement,
            borderRadius: 12,
            padding: 14,
            fontSize: 15,
            color: Colors.dark.text,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            marginBottom: 4,
          }}
        />
        <Text
          style={{
            color: Colors.dark.textSecondary,
            fontSize: 11,
            marginBottom: 24,
            marginLeft: 4,
          }}
        >
          Credits buyers must pay to make an offer on this gem
        </Text>

        {/* Duration */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: Colors.dark.textSecondary,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Listing Duration
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d.value}
              onPress={() => setDurationDays(d.value)}
              style={{
                flex: 1,
                minWidth: "30%",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor:
                  durationDays === d.value
                    ? "rgba(16, 185, 129, 0.15)"
                    : Colors.dark.backgroundElement,
                borderColor:
                  durationDays === d.value
                    ? "#10B981"
                    : "rgba(255,255,255,0.1)",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color:
                    durationDays === d.value ? "#10B981" : Colors.dark.text,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {d.label}
              </Text>
              <Text
                style={{
                  color: Colors.dark.textSecondary,
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                {d.cost} cr
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Max Offers */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: Colors.dark.textSecondary,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Offer Limit
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 32,
          }}
        >
          {OFFER_LIMITS.map((ol) => (
            <TouchableOpacity
              key={ol.value}
              onPress={() => setMaxOffers(ol.value)}
              style={{
                flex: 1,
                minWidth: "30%",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor:
                  maxOffers === ol.value
                    ? "rgba(16, 185, 129, 0.15)"
                    : Colors.dark.backgroundElement,
                borderColor:
                  maxOffers === ol.value
                    ? "#10B981"
                    : "rgba(255,255,255,0.1)",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: maxOffers === ol.value ? "#10B981" : Colors.dark.text,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {ol.label}
              </Text>
              <Text
                style={{
                  color: Colors.dark.textSecondary,
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                {ol.cost} cr
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#065F46" : "#10B981",
            padding: 16,
            borderRadius: 16,
            alignItems: "center",
            shadowColor: "#10B981",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "800", fontSize: 17 }}>
              Post Gemstone
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
