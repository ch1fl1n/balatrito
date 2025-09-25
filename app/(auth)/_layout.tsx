import React from "react";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Expo router genera automáticamente las rutas 
          para login.tsx, register.tsx, reset.tsx */}
    </Stack>
  );
}
