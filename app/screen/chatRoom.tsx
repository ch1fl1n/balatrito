// app/screen/ChatRoom.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../UTILS/supabase";
import { useAuth } from "../../CONTEXTS/authContext";

type Message = {
  id: string;
  chat_id: string;
  text: string;
  sent_by: string;
  created_at: string;
};

export default function ChatRoom() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const chatId = (params.chatId as string) ?? null;
  const otherId = (params.otherId as string) ?? null;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!chatId || !user?.id) return;
    fetchMessages();

    // subscribe to messages for this chat
    const chan = supabase
      .channel(`messages-chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((cur) => {
            const exists = cur.find((m) => m.id === newMsg.id);
            if (exists) return cur;
            const next = [...cur, newMsg].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return next;
          });
          // scroll
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chan);
    };
  }, [chatId, user?.id]);

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("fetchMessages", error);
        return;
      }
      setMessages(data || []);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    } catch (e) {
      console.error(e);
    }
  }

  async function sendMessage() {
    if (!text.trim() || !user?.id || !chatId) return;
    const payload = { chat_id: chatId, text: text.trim(), sent_by: user.id };
    setText("");

    // Insert; Supabase RLS requires sent_by === auth.uid()
    const { data, error } = await supabase.from("messages").insert(payload).select().single();
    if (error) {
      console.error("sendMessage error", error);
      // Optionally: show error and re-add message to input
      return;
    }
    // realtime subscription will append the message — but we can optimistically append too
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View style={[styles.msgRow, item.sent_by === user?.id ? styles.myMsg : styles.theirMsg]}>
              <Text style={{ color: item.sent_by === user?.id ? "#000" : "#fff" }}>{item.text}</Text>
              <Text style={styles.msgTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 12 }}
        />

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje..."
            style={styles.input}
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Text style={{ color: "#fff" }}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  msgRow: { marginVertical: 6, padding: 10, maxWidth: "80%", borderRadius: 12 },
  myMsg: { alignSelf: "flex-end", backgroundColor: "#eee" },
  theirMsg: { alignSelf: "flex-start", backgroundColor: "#6a25ff" },
  msgTime: { fontSize: 10, marginTop: 6, color: "#666" },
  composer: { flexDirection: "row", padding: 10, borderTopColor: "#eee", borderTopWidth: 1, alignItems: "flex-end" },
  input: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: "#f6f6f6", borderRadius: 12, padding: 8, marginRight: 8 },
  sendBtn: { backgroundColor: "#6a25ff", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }
});
