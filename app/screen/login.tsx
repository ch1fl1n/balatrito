// app/screen/login.tsx
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
  Alert,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useAuth } from "../../CONTEXTS/authContext";
import { useRouter, Link } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fontsLoaded] = useFonts({
    pixel: require("../../assets/fonts/pixel.ttf"),
  });

  const { login } = useAuth();
  const router = useRouter();

  // Mantén los hooks siempre en el mismo orden; este return temprano está bien
  if (!fontsLoaded) return null;

  const navigateToHome = (target = "/screen/homepage") => {
    try {
      router.replace(target);
    } catch (e) {
      // fallback push
      try {
        router.push(target);
      } catch (err) {
        console.warn("Navigation fallback failed:", err);
      }
    }
  };

  const handleLogin = async () => {
    try {
      console.log("[login] intentando:", { username });
      const { success, reason } = await login(username.trim(), password);
      console.log("[login] resultado:", { success, reason });

      if (!success) {
        const message =
          reason === "invalid_credentials"
            ? "Usuario o contraseña incorrectos"
            : reason === "email_not_confirmed"
            ? "Confirma tu correo antes de iniciar sesión"
            : reason ?? "Error al iniciar sesión";

        if (Platform.OS === "web") {
          window.alert("❌ " + message);
        } else {
          Alert.alert("❌ Error", message);
        }
        return;
      }

      // Login exitoso -> navegar al HOME con mensaje
      const target = "/screen/homepage";
      console.log("[login] redirigiendo a", target);

      if (Platform.OS === "web") {
        window.alert("✅ Bienvenido — Inicio de sesión exitoso");
        navigateToHome(target);
      } else {
        // Alert con callback y fallback por si el callback no se dispara
        let navigated = false;
        Alert.alert("✅ Bienvenido", "Inicio de sesión exitoso", [
          {
            text: "OK",
            onPress: () => {
              navigated = true;
              navigateToHome(target);
            },
          },
        ]);
        setTimeout(() => {
          if (!navigated) navigateToHome(target);
        }, 350);
      }
    } catch (e: any) {
      console.error("Error en handleLogin:", e);
      if (Platform.OS === "web") window.alert("Ocurrió un problema al iniciar sesión");
      else Alert.alert("Error", "Ocurrió un problema al iniciar sesión");
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="USERNAME"
          placeholderTextColor="#fff"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="PASSWORD"
          placeholderTextColor="#fff"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginText}>LOGIN</Text>
      </TouchableOpacity>

      <Link href="../screen/register" asChild>
        <TouchableOpacity>
          <Text style={styles.linkText}>Create Account</Text>
        </TouchableOpacity>
      </Link>

      <Link href="../screen/resetpassword" asChild>
        <TouchableOpacity>
          <Text style={styles.linkText}>Forgot Password?</Text>
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
    fontFamily: "pixel",
  },
  loginButton: {
    backgroundColor: "#FFA500",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 20,
  },
  loginText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "pixel",
  },
  linkText: {
    color: "#fff",
    marginTop: 10,
    textDecorationLine: "underline",
    fontFamily: "pixel",
  },
});
