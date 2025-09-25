// app/screen/homepage.tsx
import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  Image,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function HomePage() {
  const [fontsLoaded] = useFonts({
    pixel: require("../../assets/fonts/pixel.ttf"),
  });

  const router = useRouter();

  if (!fontsLoaded) return null;

  return (
    <ImageBackground
      source={require("../../assets/images/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Bienvenida */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>WELCOME TO BALATRITO</Text>
        <Text style={styles.subtitle}>Retro vibes. Pixel perfect.</Text>
      </View>

      {/* Botones */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>TUTORIAL</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>PLAY</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={() => router.replace("/screen/login")} // 👈 Logout regresa al login
        >
          <Text style={styles.buttonText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    width: width,
    height: height,
    padding: 20,
  },
  logo: {
    width: 250,
    height: 150,
    marginTop: 40,
    marginBottom: 20,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    color: "#FFA500",
    fontFamily: "pixel",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "pixel",
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    marginTop: 30,
    alignItems: "center",
  },
  button: {
    backgroundColor: "#FFA500",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: "#d9534f", // rojo para destacar logout
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "pixel",
    textAlign: "center",
  },
});
