// app/screen/CameraScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { Camera, CameraType, CameraView } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "../../CONTEXTS/authContext";
import { supabase } from "../../UTILS/supabase";

const { width, height } = Dimensions.get("window");

function getMimeAndExtFromUri(uri: string) {
  const parts = uri.split(".");
  const ext = (parts[parts.length - 1] || "jpg").toLowerCase();
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { ext, mime };
}

export default function CameraScreen({ navigation }: any) {
  const cameraRef = useRef<CameraView | null>(null);
  const { user, refreshProfile } = useAuth();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<CameraType>("back");
  const [isReady, setIsReady] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [taking, setTaking] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // toma la foto
  const takePhoto = async () => {
    if (!cameraRef.current || taking) return;
    try {
      setTaking(true);
      // CameraView puede exponer takePictureAsync en runtime
      const photo = await (cameraRef.current as any).takePictureAsync({
        quality: 0.9,
        skipProcessing: true,
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
      } else {
        Alert.alert("Error", "No se obtuvo la ruta de la foto.");
      }
    } catch (e) {
      console.error("takePhoto error", e);
      Alert.alert("Error", "No se pudo tomar la foto.");
    } finally {
      setTaking(false);
    }
  };

  // redimensiona/comprime opcionalmente para reducir peso
  async function prepareImage(uri: string) {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: false }
      );
      return result.uri;
    } catch (e) {
      console.warn("manipulator failed, using original uri", e);
      return uri;
    }
  }

  // subida a Supabase (usa base64 -> blob)
  async function uploadCapturedPhoto(uri: string) {
    if (!user?.id) {
      Alert.alert("Error", "Usuario no autenticado.");
      return;
    }
    setUploading(true);

    try {
      // 1) prepara/comprime
      const finalUri = await prepareImage(uri);

      // 2) obtener mime y ext robusto
      const guess = getMimeAndExtFromUri(finalUri);
      let mime = guess.mime;
      let ext = guess.ext;

      // 3) manipular a base64 (ImageManipulator puede devolver base64)
      const manip = await ImageManipulator.manipulateAsync(finalUri, [], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });

      if (!manip?.base64) throw new Error("No se pudo obtener base64 de la imagen");

      const dataUrl = `data:${mime};base64,${manip.base64}`;

      // 4) convertir dataURL -> blob (funciona en web y RN)
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // 5) nombre y path (ajusta extensión si quieres)
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `${user.id}/${fileName}`;

      // 6) BORRAR avatar antiguo si existe (intentar)
      const oldPath = (user as any).avatar_path ?? null;
      if (oldPath) {
        try {
          // usa nombre EXACTO del bucket (case-sensitive)
          await supabase.storage.from("Profiles").remove([oldPath]);
        } catch (e) {
          console.warn("No se pudo borrar avatar antiguo:", e);
        }
      }

      // 7) SUBIR -- usar Blob directamente
      // Ajusta el BUCKET al nombre exacto de tu console (respeta mayúsculas/minúsculas)
      const bucketName = "Profiles"; // <-- verifica y ajusta según corresponda
      console.log("DEBUG upload start", { userId: user?.id, finalUri, filePath, bucketName });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, blob, { contentType: mime });

      console.log("DEBUG upload result:", { uploadData, uploadError });
      if (uploadError) throw uploadError;

      // 8) obtener public URL
      const { data: urlData } = await supabase.storage.from(bucketName).getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl ?? null;
      console.log("DEBUG publicUrl:", publicUrl);

      // 9) actualizar row profiles en la tabla
      const { data: updateData, error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, avatar_path: filePath })
        .eq("id", user.id);

      console.log("DEBUG update result:", { updateData, updateError });
      if (updateError) throw updateError;

      // 10) refrescar perfil y feedback
      await refreshProfile();
      Alert.alert("Éxito", "Foto subida correctamente.");
      navigation?.goBack();
    } catch (e: any) {
      console.error("uploadCapturedPhoto exception", e);
      Alert.alert("Error inesperado", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  // compute preview dimensions for web vs native
  const previewWidth = Math.min(width - 40, 1000); // cap max width
  const previewHeight = Platform.OS === "web"
    ? Math.min(600, height - 200) // web: limit height so controls are visible
    : (previewWidth * 9) / 16; // mobile keep aspect ratio 16:9

  if (hasPermission === null) return <View style={styles.center}><Text>Cargando permisos...</Text></View>;
  if (hasPermission === false) return <View style={styles.center}><Text>No se otorgaron permisos de cámara.</Text></View>;

  return (
    <View style={styles.container}>
      {!capturedUri ? (
        <>
          <CameraView
            ref={(c) => { cameraRef.current = c; }}
            style={styles.camera}
            facing={type}
            onCameraReady={() => setIsReady(true)}
          />
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={() => setType((t) => (t === "back" ? "front" : "back"))}
              style={styles.smallBtn}
            >
              <Text style={styles.smallBtnText}>Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={takePhoto} style={styles.shutterBtn} disabled={!isReady || taking}>
              {taking ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={[styles.previewWrap, { width: previewWidth, height: previewHeight }]}>
          <Image
            source={{ uri: capturedUri }}
            style={[styles.preview, { width: previewWidth, height: previewHeight }]}
            resizeMode="cover"
          />

          <View style={styles.previewControlsOverlay}>
            <TouchableOpacity onPress={() => setCapturedUri(null)} style={styles.previewBtn}>
              <Text style={styles.previewBtnText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => uploadCapturedPhoto(capturedUri)}
              style={[styles.previewBtn, { backgroundColor: "#0b7a3f" }]}
              disabled={uploading}
            >
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.previewBtnText}>Upload</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  camera: { flex: 1, width: "100%" },
  controls: { position: "absolute", bottom: 32, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  shutterBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#000" },
  smallBtn: { padding: 12, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10 },
  smallBtnText: { color: "#fff" },
  previewWrap: { position: "relative", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 10, backgroundColor: "#111" },
  preview: { borderRadius: 10 },
  previewControlsOverlay: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  previewBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: "#fff", borderRadius: 8, marginHorizontal: 8 },
  previewBtnText: { color: "#000", fontWeight: "600" },
});
