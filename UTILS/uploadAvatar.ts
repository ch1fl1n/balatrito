// app/UTILS/uploadAvatar.ts
import { supabase } from "./supabase"; // ajusta la ruta si tu supabase.ts está en otro lugar

function getMimeAndExtFromUri(uri: string) {
  const parts = uri.split(".");
  const ext = (parts[parts.length - 1] || "jpg").toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { ext, mime };
}

export async function uploadAvatarForUser(userId: string, uri: string, oldPath?: string | null) {
  if (!userId || !uri) throw new Error("Missing args");

  const { ext, mime } = getMimeAndExtFromUri(uri);
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const res = await fetch(uri);
  const arrayBuffer = await res.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, arrayBuffer, { contentType: mime });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(filePath);
  const publicUrl = urlData?.publicUrl ?? null;

  if (oldPath) {
    try {
      await supabase.storage.from("profiles").remove([oldPath]);
    } catch (e) {
      console.warn("No se pudo borrar avatar antiguo:", e);
    }
  }

  const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl, avatar_path: filePath }).eq("id", userId);

  if (updateError) throw updateError;

  return { publicUrl, filePath };
}
