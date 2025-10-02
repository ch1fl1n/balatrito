// app/UTILS/uploadAvatar.ts
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "./supabase";

// Constants
const MAX_IMAGE_DIMENSION = 1200;
const DEFAULT_AVATAR_BUCKET = "Profiles";

// base64 -> Uint8Array (robusto usando Buffer fallback)
function base64ToUint8Array(base64: string): Uint8Array {
  // prefer Buffer if disponible (instala 'buffer' si necesitas)
  if (typeof globalThis.Buffer === "function") {
    const buf = (globalThis.Buffer as any).from(base64, "base64");
    return new Uint8Array(buf);
  }

  // fallback a atob si existe
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  // último recurso (simple, no ultra-optimizado)
  throw new Error("No hay método para decodificar base64 en este entorno. Instala 'buffer' o añade polyfill de atob.");
}

export async function uploadAvatar(
  userId: string,
  uri: string,
  oldPath: string | null = null,
  bucketName = DEFAULT_AVATAR_BUCKET
): Promise<{ url: string | null; error: any }> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    if (!manipResult.base64) throw new Error("No se pudo obtener base64 de la imagen");

    const uint8 = base64ToUint8Array(manipResult.base64);
    const filePath = `${userId}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uint8, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return { url: null, error: uploadError };
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    const publicUrl = data?.publicUrl ?? null;

    if (!publicUrl) return { url: null, error: new Error("No se pudo obtener publicUrl") };

    // actualiza tabla profiles; ajusta columna si tu esquema es distinto (p.e. user_id)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, avatar_path: filePath })
      .eq("id", userId);

    if (updateError) {
      console.error("Error actualizando perfil:", updateError);
      return { url: null, error: updateError };
    }

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error("Error subiendo avatar:", error);
    return { url: null, error };
  }
}
