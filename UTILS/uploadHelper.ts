// app/UTILS/uploadHelpers.ts
import { Platform } from "react-native";

/**
 * Convierte una URI a Blob de forma segura:
 * - en web: fetch(uri).blob()
 * - en mobile (Android/iOS): xhr con responseType = 'blob' (funciona con file:// y content://)
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  if (Platform.OS === "web") {
    const r = await fetch(uri);
    return await r.blob();
  }

  return await new Promise<Blob>((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        // @ts-ignore response será Blob
        resolve(xhr.response);
      };
      xhr.onerror = () => {
        reject(new Error("Failed to convert uri to blob (xhr error)"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    } catch (err) {
      reject(err);
    }
  });
}
