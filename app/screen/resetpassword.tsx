import React from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Link } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function ResetPassword() {
  const [fontsLoaded] = useFonts({
    pixel: require("../../assets/fonts/pixel.ttf"),
  });

  if (!fontsLoaded) {
    return null; 
  }

  return (
    <ImageBackground
      source={require("../../assets/images/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Logo */}
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Texto guía */}
      <Text style={styles.infoText}>
        Enter your email to reset your password
      </Text>

      {/* Input correo */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="EMAIL"
          placeholderTextColor="#fff"
          style={styles.input}
          keyboardType="email-address"
        />
      </View>

      {/* Botón reset */}
      <TouchableOpacity style={styles.resetButton}>
        <Text style={styles.resetText}>SEND RESET LINK</Text>
      </TouchableOpacity>

      {/* Volver al login */}
      <Link href="../screen/login" asChild>
        <TouchableOpacity>
          <Text style={styles.backToLogin}>Back to Login</Text>
        </TouchableOpacity>
      </Link>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    width: width,
    height: height,
  },
  logo: {
    width: 400,
    height: 200,
    marginBottom: 30,
  },
  infoText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "pixel",
  },
  inputContainer: {
    width: "100%",
    marginBottom: 15,
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 2,
    borderColor: "#FFA500",
    color: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    textAlign: "center",
    fontFamily: "pixel",
  },
  resetButton: {
    backgroundColor: "#FFA500",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 20,
  },
  resetText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "pixel",
  },
  backToLogin: {
    color: "#fff",
    marginTop: 10,
    textDecorationLine: "underline",
    fontFamily: "pixel",
  },
});
