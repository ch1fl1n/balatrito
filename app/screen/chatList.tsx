// app/screen/ChatList.tsx (resumido, reemplaza tu archivo)
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../UTILS/supabase";
import { useAuth } from "../../CONTEXTS/authContext";
import { useData } from "../../CONTEXTS/DataContext";
import { getOrCreateChatBetween } from "../../UTILS/ChatHelpers";

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 8,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6a25ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 4,
  },
  subtitle: {
    color: "#666",
    fontSize: 14,
  },
  time: {
    color: "#999",
    fontSize: 12,
  },
});

export default function ChatList() {
  const { user } = useAuth();
  const router = useRouter();
  const { contacts, addContactByEmail, fetchUsers } = useData();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    fetchChats();
    const sub = supabase
      .channel(`chats-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats", filter: `user_id=eq.${user.id}` },
        () => fetchChats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats", filter: `user_id2=eq.${user.id}` },
        () => fetchChats()
      )
      .subscribe();
    return () => {
      (async () => {
        await supabase.removeChannel(sub);
      })();
    };
  }, [user?.id]);

  async function fetchChats() {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("chats")
        .select(`id, user_id, user_id2, created_at, updated_at,
          messages:messages(id, text, created_at, sent_by)`)
        .or(`user_id.eq.${user?.id},user_id2.eq.${user?.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const list = (rows || []).map((r: any) => {
        const otherId = user && r.user_id === user.id ? r.user_id2 : r.user_id;
        const lastMsg = (r.messages && r.messages.length) ? r.messages[r.messages.length - 1] : null;
        return {
          id: r.id,
          user_id: r.user_id,
          user_id2: r.user_id2,
          created_at: r.created_at,
          updated_at: r.updated_at,
          last_message: lastMsg ? { text: lastMsg.text, created_at: lastMsg.created_at, media_url: lastMsg.media_url } : null,
          other: { id: otherId },
        };
      });

      // obtener perfiles en batch
      const others = Array.from(new Set(list.map((c) => c.other?.id))).filter(Boolean) as string[];
      if (others.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, email").in("id", others);
        const byId = (profiles || []).reduce((acc: any, p: any) => ((acc[p.id] = p), acc), {});
        list.forEach((c) => (c.other = { ...c.other, ...byId[c.other!.id] }));
      }

      setChats(list);
    } catch (e) {
      console.error("fetchChats", e);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }

  function openChat(chatId: string, otherId?: string) {
    router.push({ pathname: "/screen/chatRoom", params: { chatId, otherId } });
  }

  async function onAddContact() {
    if (!email.trim()) return Alert.alert("Error", "Ingresa un email");
    const profile = await addContactByEmail(email.trim().toLowerCase());
    setShowAdd(false);
    setEmail("");
    if (!profile) return Alert.alert("No encontrado", "No existe un usuario con ese email");
    // crear chat y abrir
    try {
      const chat = await getOrCreateChatBetween(user!.id, profile.id);
      if (chat?.id) {
        openChat(chat.id, profile.id);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo crear el chat");
    }
  }

  function renderItem({ item }: { item: any }) {
    return (
      <TouchableOpacity style={styles.row} onPress={() => openChat(item.id, item.other?.id)}>
        {/* avatar */}
        <View style={styles.circle}>
          {item.other?.avatar_url ? (
            // usa expo-image o Image simple
            <Image source={{ uri: item.other.avatar_url }} style={{ width: 48, height: 48, borderRadius: 24 }} />
          ) : (
            <Text style={{ color: "#fff" }}>{(item.other?.username || "U").slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.other?.username || item.other?.email || "Usuario"}</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{item.last_message?.text ?? (item.last_message?.media_url ? "📷 Media" : "Sin mensajes aún")}</Text>
        </View>
        <Text style={styles.time}>{item.updated_at ? new Date(item.updated_at).toLocaleTimeString() : ""}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <TouchableOpacity onPress={() => setShowAdd(true)} style={{ padding: 12, backgroundColor: "#6a25ff", margin: 12, borderRadius: 8, alignItems: "center" }}>
        <Text style={{ color: "#fff" }}>+ Agregar contacto por email</Text>
      </TouchableOpacity>

      {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : null}

      <FlatList
        data={chats}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#eee" }} />}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={() => !loading ? <Text style={{ textAlign: "center", marginTop: 40 }}>No tienes conversaciones</Text> : null}
      />

      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ margin: 20, padding: 16, backgroundColor: "#fff", borderRadius: 8 }}>
            <Text style={{ fontWeight: "600", marginBottom: 8 }}>Agregar contacto por email</Text>
            <TextInput placeholder="email@ejemplo.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={{ borderWidth: 1, borderColor: "#eee", padding: 8, borderRadius: 6, marginBottom: 12 }} />
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={{ marginRight: 12 }}><Text>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={onAddContact} style={{ backgroundColor: "#6a25ff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}><Text style={{ color: "#fff" }}>Agregar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
