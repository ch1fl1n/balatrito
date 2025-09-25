import { Stack } from "expo-router";
import 'react-native-url-polyfill/auto';
import { AuthProvider } from "../CONTEXTS/authContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
// app/_layout.tsx