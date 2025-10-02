// app/screen/ChatList.tsx
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../UTILS/supabase";
import { useAuth } from "../../CONTEXTS/authContext";

type Chat = {
  id: string;
  user_id: string;
  user_id2: string;
  created_at: string;
  updated_at: string;
  other?: { id: string; username?: string; email?: string; avatar_url?: string | null };
  last_message?: { text: string; created_at: string } | null;
};

export default function ChatList() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);

    if (!user?.id) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Cargando usuario...</Text>
      </View>
    );
  }

  useEffect(() => {
    if (!user?.id) return;
    fetchChats();

    // subscribe to new chats (optional)
    const sub = supabase
      .channel(`chats-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats", filter: `user_id=eq.${user.id}` },
        (payload) => {
          fetchChats();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats", filter: `user_id2=eq.${user.id}` },
        (payload) => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [user?.id]);

  async function fetchChats() {
    setLoading(true);
    try {
      // obtener chats donde user es user_id o user_id2
      const { data: rows, error } = await supabase
        .from("chats")
        .select(`id, user_id, user_id2, created_at, updated_at,
          messages:messages(id, text, created_at)`)
        .or(`user_id.eq.${user?.id},user_id2.eq.${user?.id}`)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("fetchChats error", error);
        setChats([]);
        return;
      }

      const list: Chat[] = (rows || []).map((r: any) => {
        const otherId = user && r.user_id === user.id ? r.user_id2 : r.user_id;
        const lastMsg = (r.messages && r.messages.length) ? r.messages[r.messages.length - 1] : null;
        return {
          id: r.id,
          user_id: r.user_id,
          user_id2: r.user_id2,
          created_at: r.created_at,
          updated_at: r.updated_at,
          last_message: lastMsg ? { text: lastMsg.text, created_at: lastMsg.created_at } : null,
          other: { id: otherId },
        };
      });

      // ahora fetch nombres/avatars de los "other" en batch
      const others = Array.from(new Set(list.map((c) => c.other?.id))).filter(Boolean) as string[];
      if (others.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", others);
        const byId = (profiles || []).reduce((acc: any, p: any) => (acc[p.id] = p, acc), {});
        list.forEach((c) => (c.other = { ...c.other, ...byId[c.other!.id] }));
      }

      setChats(list);
    } catch (e) {
      console.error(e);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }

  function openChat(chatId: string, otherId?: string) {
    router.push({ pathname: "/screen/ChatRoom", params: { chatId, otherId } });
  }

  function renderItem({ item }: { item: Chat }) {
    return (
      <TouchableOpacity style={styles.row} onPress={() => openChat(item.id, item.other?.id)}>
        <View style={styles.circle}>
          <Text style={{ color: "#fff" }}>{(item.other?.username || "U").slice(0,1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.other?.username || "Usuario"}</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{item.last_message?.text ?? "Sin mensajes aún"}</Text>
        </View>
        <Text style={styles.time}>{item.updated_at ? new Date(item.updated_at).toLocaleTimeString() : ""}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : null}
      <FlatList
        data={chats}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#eee" }} />}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={() => !loading ? <Text style={{ textAlign: "center", marginTop: 40 }}>No tienes conversaciones</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  circle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#6a25ff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  title: { fontWeight: "600" },
  subtitle: { color: "#666", fontSize: 13 },
  time: { fontSize: 12, color: "#999", marginLeft: 8 }
});
