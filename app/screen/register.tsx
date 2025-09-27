// app/screen/register.tsx
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useAuth } from "../../CONTEXTS/authContext";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";

const { width, height } = Dimensions.get("window");

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState(""); // muestra mensajes en UI
  const { register } = useAuth();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    pixel: require("../../assets/fonts/pixel.ttf"),
  });

  if (!fontsLoaded) return null;

  const handleRegister = async () => {
    setFeedback("");
    if (!username || !email || !password) {
      setFeedback("⚠️ Todos los campos son obligatorios");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFeedback("⚠️ Ingresa un correo válido (ej: usuario@dominio.com)");
      return;
    }

    console.log("📩 Enviando registro:", { username, email });

    const { success, message } = await register(username.trim(), email.trim(), password);
    console.log("📥 Resultado register:", { success, message });

    if (!success) {
      const errMsg = message || "No se pudo registrar";
      setFeedback(`❌ ${errMsg}`);
      if (Platform.OS === "web") window.alert("❌ " + errMsg);
    } else {
      const okMsg = message || "Registro exitoso";
      setFeedback("✅ " + okMsg + " — redirigiendo...");
            if (Platform.OS === "web") {
        window.alert("✅ " + okMsg);
        // Forzamos recarga y navegamos a login (full page load)
        window.location.replace("/screen/login");
      } else {
        setTimeout(() => router.replace("/screen/login"), 1200);
      }

    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="USERNAME"
          placeholderTextColor="#fff"
          style={[styles.input, { fontFamily: "pixel" }]}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="EMAIL"
          placeholderTextColor="#fff"
          style={[styles.input, { fontFamily: "pixel" }]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="PASSWORD"
          placeholderTextColor="#fff"
          style={[styles.input, { fontFamily: "pixel" }]}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={[styles.registerText, { fontFamily: "pixel" }]}>REGISTER</Text>
      </TouchableOpacity>

      {feedback !== "" && (
        <Text style={{ color: "white", marginTop: 10, fontFamily: "pixel" }}>{feedback}</Text>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    width,
    height,
  },
  logo: {
    width: 400,
    height: 200,
    marginBottom: 30,
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
  },
  registerButton: {
    backgroundColor: "#FFA500",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 20,
  },
  registerText: {
    color: "#000",
    fontSize: 16,
    textAlign: "center",
  },
});
