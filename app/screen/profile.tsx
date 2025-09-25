// app/screen/profile.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  Dimensions,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFonts } from "expo-font";
import { useAuth } from "../../CONTEXTS/authContext";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "../../UTILS/supabase";

const { width, height } = Dimensions.get("window");

function getMimeAndExtFromUri(uri: string) {
  const parts = uri.split(".");
  const ext = (parts[parts.length - 1] || "jpg").toLowerCase();
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { ext, mime };
}

export default function Profile({ navigation }: any) {
  const [fontsLoaded] = useFonts({
    pixel: require("../../assets/fonts/pixel.ttf"),
  });

  const { user, loading, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  // Nota: si useAuth no expone refreshProfile o avatar_path, debes añadirlo al AuthContext.
  if (!fontsLoaded || loading) return null;

  const missingProfile =
    !user ||
    (!user.first_name && !user.last_name && !user.phone && !user.birth && !user.gender);

  const avatarSource = user?.avatar_url
    ? { uri: user.avatar_url }
    : require("../../assets/images/avatar.png");

  // ----------------------------------------
  // Pick image from gallery (inline upload)
  // ----------------------------------------
  // reemplaza la función pickImage existente por esta
async function pickImage() {
  try {
    if (!user?.id) {
      Alert.alert("Error", "Usuario no autenticado.");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permisos", "Necesitamos permiso para acceder a la galería.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    const uri = (res as any).uri ?? (res as any).assets?.[0]?.uri;
    if (!uri) return;

    setUploading(true);
    console.log("DEBUG pickImage start", { userId: user.id, uri });

    // 1) obtener mime/ext de forma robusta
    let mime = "image/jpeg";
    let ext = "jpg";
    // si uri es data: o tiene content-type en el inicio
    if (uri.startsWith("data:")) {
      const m = uri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if (m && m[1]) mime = m[1];
      ext = mime.split("/")[1] ?? ext;
    } else {
      // intentar leer headers si no hay extensión clara
      const lastSeg = uri.split("/").pop() ?? uri;
      if (lastSeg.includes(".")) {
        const candidate = lastSeg.split(".").pop() ?? "";
        if (candidate.length <= 5 && !candidate.includes("?") && !candidate.includes(":")) {
          ext = candidate.toLowerCase();
          mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        }
      }
    }

    // 2) usar ImageManipulator para obtener base64 (más fiable en web y RN)
    const manip = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });

    if (!manip?.base64) throw new Error("No se pudo obtener base64 de la imagen.");

    // si no detectamos mime/extension correcta, intentar con datos base64
    if (!mime || mime === "") mime = "image/jpeg";
    ext = ext || mime.split("/")[1] || "jpg";

    const dataUrl = `data:${mime};base64,${manip.base64}`;
    // convertir data URL a blob
    const dataRes = await fetch(dataUrl);
    const blob = await dataRes.blob();

    // 3) construir filePath seguro
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `${user.id}/${fileName}`;
    console.log("DEBUG pickImage filePath", { filePath, mime });

    // 4) borrar avatar antiguo si existe (intentar)
    const oldPath = (user as any).avatar_path ?? null;
    if (oldPath) {
      try {
        // usa EXACTAMENTE el nombre del bucket (case-sensitive)
        await supabase.storage.from("Profiles").remove([oldPath]);
      } catch (e) {
        console.warn("No se pudo borrar avatar anterior:", e);
      }
    }

    // 5) subir Blob al bucket (usa bucket EXACTO)
    const bucketName = "Profiles"; // <- ajusta si tu bucket tiene otro nombre exacto
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, blob, { contentType: mime });

    console.log("DEBUG pickImage upload result", { uploadData, uploadError });
    if (uploadError) throw uploadError;

    // 6) obtener public url
    const { data: urlData } = await supabase.storage.from(bucketName).getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl ?? null;
    console.log("DEBUG pickImage publicUrl", publicUrl);

    // 7) actualizar tabla profiles
    const { data: updateData, error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, avatar_path: filePath })
      .eq("id", user.id);

    console.log("DEBUG pickImage update result", { updateData, updateError });
    if (updateError) throw updateError;

    // 8) refrescar contexto
    await refreshProfile();
    Alert.alert("Éxito", "Foto subida correctamente.");
  } catch (e: any) {
    console.error("pickImage upload error", e);
    Alert.alert("Error", e?.message ?? "No se pudo subir la imagen");
  } finally {
    setUploading(false);
  }
}


  // ----------------------------------------
  // Navigate to CameraScreen (takes photo + uploads there)
  // ----------------------------------------
  function openCameraScreen() {
    navigation?.navigate("CameraScreen");
  }

  return (
    <ImageBackground
      source={require("../../assets/images/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
            <Text style={styles.backText}>{"‹"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsText}>⚙</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <Image source={avatarSource} style={styles.avatar} />
            <View style={styles.nameBlock}>
              <Text style={styles.nameText}>
                {(user?.full_name ?? `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim()) ||
                  user?.username ||
                  "Usuario"}
              </Text>
              <Text style={styles.emailText}>{user?.email ?? ""}</Text>

              <View style={{ flexDirection: "row", marginTop: 8, alignItems: "center" }}>
                <TouchableOpacity style={styles.editBtn} onPress={() => navigation?.navigate("EditProfile")}>
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editBtn, { marginLeft: 8, backgroundColor: "#2ecc71" }]}
                  onPress={pickImage}
                  disabled={uploading}
                >
                  <Text style={styles.editBtnText}>{uploading ? "Subiendo..." : "Elegir foto"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editBtn, { marginLeft: 8, backgroundColor: "#e67e22" }]}
                  onPress={openCameraScreen}
                  disabled={uploading}
                >
                  <Text style={styles.editBtnText}>Tomar foto</Text>
                </TouchableOpacity>
              </View>

              {uploading && <ActivityIndicator style={{ marginTop: 8 }} />}
            </View>
          </View>

          {missingProfile && (
            <View style={styles.missingBlock}>
              <Text style={styles.missingText}>
                Parece que aún no completaste tu perfil. Por favor actualízalo.
              </Text>
              <TouchableOpacity style={styles.updateBtn} onPress={() => navigation?.navigate("EditProfile")}>
                <Text style={styles.updateBtnText}>Actualizar perfil</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.menuList}>
            <Text style={{ textAlign: "center", marginTop: 16, color: "#999", fontFamily: "pixel" }}>
              App Version 2.3
            </Text>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width, height },
  container: { padding: 20, alignItems: "center" },
  headerRow: { width: "100%", flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 10 },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  backText: { fontSize: 22, color: "#111", fontFamily: "pixel" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, color: "#111", fontFamily: "pixel" },
  settingsButton: { width: 40, alignItems: "center" },
  settingsText: { fontSize: 20, color: "#111" },
  profileCard: { width: "100%", backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 18, padding: 18, marginTop: 10 },
  avatarRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36, marginRight: 12 },
  nameBlock: { flex: 1 },
  nameText: { fontSize: 18, fontFamily: "pixel", color: "#111" },
  emailText: { fontSize: 12, color: "#666", fontFamily: "pixel", marginTop: 4 },
  editBtn: { marginTop: 8, alignSelf: "flex-start", backgroundColor: "#2f9cff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: "#fff", fontFamily: "pixel", fontSize: 12 },
  missingBlock: { marginTop: 8, padding: 12, backgroundColor: "#fff6", borderRadius: 8 },
  missingText: { fontFamily: "pixel", color: "#333", marginBottom: 8 },
  updateBtn: { backgroundColor: "#ff7a00", padding: 8, borderRadius: 8, alignItems: "center" },
  updateBtnText: { fontFamily: "pixel", color: "#fff" },
  menuList: { marginTop: 8 },
});
