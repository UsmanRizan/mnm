import { View, Text, Button } from "react-native";
import { authClient } from "../../lib/auth-client";

export default function Home() {
  const { data: session } = authClient.useSession();

  async function logout() {
    await authClient.signOut();
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Welcome {session?.user.name}</Text>

      <Text>{session?.user.email}</Text>

      <Button title="Logout" onPress={logout} />
    </View>
  );
}
