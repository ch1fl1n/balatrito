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
  Modal,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFonts } from "expo-font";
import { useAuth } from "../../CONTEXTS/authContext";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "../../UTILS/supabase";
import { uploadAvatar } from "../../UTILS/uploadAvatar";

const { width, height } = Dimensions.get("window");

export default function Profile({ navigation }: any) {
  const [fontsLoaded] = useFonts({
    pixel: require("../../assets/fonts/pixel.ttf"),
  });

  const { user, loading, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  // --- NEW modal & preview states ---
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  if (!fontsLoaded || loading) return null;

  const missingProfile =
    !user ||
    (!user.first_name && !user.last_name && !user.phone && !user.birth && !user.gender);

  const avatarSource = user?.avatar_url
    ? { uri: user.avatar_url }
    : require("../../assets/images/avatar.png");

  // helper to optionally resize/compress then return uri
  async function normalizeImageUri(uri: string) {
    try {
      const manip = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manip?.uri ?? uri;
    } catch (e) {
      console.warn("normalizeImageUri failed, returning original uri", e);
      return uri;
    }
  }

  // -------------------------
  // PICKER MODAL FLOW
  // -------------------------
  function openPickerModal() {
    setPreviewUri(null);
    setPickerModalVisible(true);
  }

  async function handlePickFromGalleryModal() {
    try {
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

      // normalize (compress/resize) for upload
      const finalUri = await normalizeImageUri(uri);
      setPreviewUri(finalUri);
    } catch (e: any) {
      console.error("handlePickFromGalleryModal error", e);
      Alert.alert("Error", e?.message ?? "No se pudo seleccionar la imagen");
    }
  }

  // -------------------------
  // CAMERA MODAL FLOW
  // -------------------------
  function openCameraModal() {
    setPreviewUri(null);
    setCameraModalVisible(true);
  }

  async function handleTakePhotoModal() {
    try {
      // expo-image-picker camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permisos", "Necesitamos permiso para usar la cámara.");
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      const uri = (res as any).uri ?? (res as any).assets?.[0]?.uri;
      if (!uri) return;

      const finalUri = await normalizeImageUri(uri);
      setPreviewUri(finalUri);
    } catch (e: any) {
      console.error("handleTakePhotoModal error", e);
      Alert.alert("Error", e?.message ?? "No se pudo tomar la foto");
    }
  }

  // -------------------------
  // UPLOAD previewUri -> Supabase using your helper
  // -------------------------
  async function uploadPreview() {
    if (!user?.id) {
      Alert.alert("Error", "Usuario no autenticado.");
      return;
    }
    if (!previewUri) {
      Alert.alert("Error", "No hay imagen para subir.");
      return;
    }

    setUploading(true);
    try {
      // uploadAvatarForUser expects (userId string, uri, oldPath?, bucketName?)
      const oldPath = (user as any).avatar_path ?? null;
      const finalUri = previewUri;

      // Call centralized helper (handles web / RN)
      await uploadAvatar(String(user.id), finalUri, oldPath, "Profiles");

      // refresh profile in context
      await refreshProfile();

      Alert.alert("Éxito", "Foto subida correctamente.");
      // close modals & clear preview
      setPreviewUri(null);
      setPickerModalVisible(false);
      setCameraModalVisible(false);
    } catch (e: any) {
      console.error("uploadPreview error", e);
      Alert.alert("Error", e?.message ?? "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  // Cancel preview & modal
  function cancelPreviewAndClose() {
    setPreviewUri(null);
    setPickerModalVisible(false);
    setCameraModalVisible(false);
  }

  // -------------------------
  // Reuse existing button handlers to open modals (keeps UI identical)
  // -------------------------
  async function pickImage() {
    openPickerModal();
  }

  function openCameraScreen() {
    openCameraModal();
  }

  // -------------------------
  // Render
  // -------------------------
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

              <View style={{ flexDirection: "column", marginTop: 8, alignItems: "flex-start" }}>
  <TouchableOpacity style={[styles.editBtn, { marginBottom: 8 }]} onPress={() => navigation?.navigate("EditProfile")}>
    <Text style={styles.editBtnText}>Edit Profile</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.editBtn, { backgroundColor: "#2ecc71", marginBottom: 8 }]}
    onPress={pickImage}
    disabled={uploading}
  >
    <Text style={styles.editBtnText}>{uploading ? "Subiendo..." : "Elegir foto"}</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.editBtn, { backgroundColor: "#e67e22" }]}
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

      {/* --------- PICKER MODAL --------- */}
      <Modal visible={pickerModalVisible} transparent animationType="slide" onRequestClose={() => setPickerModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar desde galería</Text>

            {!previewUri ? (
              <>
                <Text style={{ marginBottom: 8 }}>Elige una opción:</Text>
                <TouchableOpacity style={[styles.saveButton, { marginBottom: 10 }]} onPress={handlePickFromGalleryModal}>
                  <Text style={{ color: "#fff" }}>Abrir galería</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setPickerModalVisible(false)}>
                  <Text style={{ color: "#fff" }}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Image source={{ uri: previewUri }} style={{ width: 250, height: 250, borderRadius: 12, marginBottom: 10 }} resizeMode="cover" />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <TouchableOpacity style={styles.cancelButton} onPress={cancelPreviewAndClose}>
                    <Text style={{ color: "#fff" }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={uploadPreview} disabled={uploading}>
                    <Text style={{ color: "#fff" }}>{uploading ? "Subiendo..." : "Subir"}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* --------- CAMERA MODAL --------- */}
      <Modal visible={cameraModalVisible} transparent animationType="slide" onRequestClose={() => setCameraModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tomar foto</Text>

            {!previewUri ? (
              <>
                <Text style={{ marginBottom: 8 }}>Toma una foto con la cámara:</Text>
                <TouchableOpacity style={[styles.saveButton, { marginBottom: 10 }]} onPress={handleTakePhotoModal}>
                  <Text style={{ color: "#fff" }}>Abrir cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setCameraModalVisible(false)}>
                  <Text style={{ color: "#fff" }}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Image source={{ uri: previewUri }} style={{ width: 250, height: 250, borderRadius: 12, marginBottom: 10 }} resizeMode="cover" />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <TouchableOpacity style={styles.cancelButton} onPress={cancelPreviewAndClose}>
                    <Text style={{ color: "#fff" }}>Retomar / Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={uploadPreview} disabled={uploading}>
                    <Text style={{ color: "#fff" }}>{uploading ? "Subiendo..." : "Subir"}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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

  // modal styles (kept same as your previous)
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  saveButton: { backgroundColor: "#28a745", padding: 10, borderRadius: 5 },
  cancelButton: { backgroundColor: "#dc3545", padding: 10, borderRadius: 5 },

});
