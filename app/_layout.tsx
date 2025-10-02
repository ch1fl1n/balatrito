// app/_layout.tsx
import { Buffer } from "buffer";
(global as any).Buffer = (global as any).Buffer ?? Buffer;
import "react-native-url-polyfill/auto";
import React from "react";
import { Slot } from "expo-router";
import { AuthProvider } from "../CONTEXTS/authContext";
import { DataProvider } from "../CONTEXTS/DataContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <DataProvider>
        <Slot />
      </DataProvider>
    </AuthProvider>
  );
}