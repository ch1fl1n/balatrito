// app/UTILS/chatHelpers.ts
import { supabase } from "./supabase";

export async function getOrCreateChatBetween(userA: string, userB: string) {
  if (!userA || !userB) throw new Error("Missing args");
  // buscar chat existente (ambos ordenes)
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .or(`and(user_id.eq.${userA},user_id2.eq.${userB}),and(user_id.eq.${userB},user_id2.eq.${userA})`)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 -> no rows when using single()
    console.error("getOrCreateChatBetween error", error);
  }
  if (data && data.id) return data;

  // crear nuevo chat (inserta con userA como auth.uid() si corresponde)
  const { data: created, error: createErr } = await supabase
    .from("chats")
    .insert([{ user_id: userA, user_id2: userB }])
    .select()
    .single();

  if (createErr) throw createErr;
  return created;
}
