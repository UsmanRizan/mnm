import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
} from "react-native";
import { router, Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { gemsApi } from "../../lib/api-client";
import type { Gem } from "../../lib/api-types";
import { Colors } from "../../constants/theme";

const CATEGORIES = [
  "All",
  "Sapphire",
  "Ruby",
  "Emerald",
  "Diamond",
  "Opal",
  "Amethyst",
  "Topaz",
];

export default function ExploreScreen() {
  const [gems, setGems] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const loadGems = useCallback(async () => {
    try {
      const data = await gemsApi.list();
      setGems(data);
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

  const filteredGems = gems.filter((gem) => {
    // Category filter
    if (selectedCategory !== "All" && gem.category !== selectedCategory) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        (gem.title && gem.title.toLowerCase().includes(query)) ||
        (gem.shape && gem.shape.toLowerCase().includes(query)) ||
        (gem.mainColour && gem.mainColour.toLowerCase().includes(query)) ||
        (gem.origin && gem.origin.toLowerCase().includes(query)) ||
        (gem.category && gem.category.toLowerCase().includes(query))
      );
    }

    return true;
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.dark.background }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.1)",
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "900",
            color: Colors.dark.text,
            marginBottom: 8,
          }}
        >
          Explore
        </Text>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.dark.backgroundElement,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 40,
          }}
        >
          <Text style={{ fontSize: 16, marginRight: 8, opacity: 0.5 }}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search gems..."
            placeholderTextColor={Colors.dark.textSecondary}
            style={{
              flex: 1,
              color: Colors.dark.text,
              fontSize: 14,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={{ color: Colors.dark.textSecondary, fontSize: 18 }}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category filters */}
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 8,
            paddingVertical: 12,
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  selectedCategory === item
                    ? "#10B981"
                    : Colors.dark.backgroundElement,
              }}
            >
              <Text
                style={{
                  color: selectedCategory === item ? "white" : Colors.dark.text,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
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
      ) : filteredGems.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🔍</Text>
          <Text
            style={{
              color: Colors.dark.text,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            No results found
          </Text>
          <Text
            style={{
              color: Colors.dark.textSecondary,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Try a different search or category
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredGems}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 8, paddingVertical: 8, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10B981"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/gem/${item.id}` as Href)}
              style={{
                flex: 1,
                backgroundColor: Colors.dark.backgroundElement,
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.05)",
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  height: 140,
                  backgroundColor: "rgba(0,0,0,0.3)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {item.imageUrls && item.imageUrls.length > 0 ? (
                  <Image
                    source={{ uri: item.imageUrls[0] }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 40 }}>💎</Text>
                )}
              </View>
              <View style={{ padding: 10 }}>
                <Text
                  style={{
                    color: Colors.dark.text,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                  numberOfLines={1}
                >
                  {item.title || `${item.weight || "?"}ct ${item.mainColour || ""}`}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 4,
                    marginTop: 4,
                    flexWrap: "wrap",
                  }}
                >
                  {[item.shape, item.origin].filter(Boolean).map((tag) => (
                    <View
                      key={tag}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.1)",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: Colors.dark.textSecondary,
                          fontSize: 9,
                        }}
                      >
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text
                  style={{
                    color: Colors.dark.textSecondary,
                    fontSize: 10,
                    marginTop: 4,
                  }}
                >
                  by {item.ownerName}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
