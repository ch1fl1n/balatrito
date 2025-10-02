// app/CONTEXTS/DataContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../UTILS/supabase";

type Profile = {
  id: string;
  email?: string;
  username?: string;
  avatar_url?: string | null;
  [k: string]: any;
};

type DataContextValue = {
  users: Profile[];
  contacts: Profile[]; // resolved profiles for contacts
  fetchUsers: () => Promise<void>;
  addContactByEmail: (email: string) => Promise<Profile | null>;
  removeContact: (id: string) => Promise<void>;
  getUserById: (id: string) => Profile | undefined;
  loading: boolean;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

const CONTACTS_KEY = "my_app_contacts_v1";

export const DataProvider = ({ children }: any) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    loadContacts();
    const chan = supabase
      .channel("profiles-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          // simple strategy: refetch all users on profile change
          fetchUsers().catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chan);
    };
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) {
        console.error("fetchUsers", error);
        setUsers([]);
      } else {
        setUsers(data || []);
        // update contacts info to keep avatars/names fresh
        setContacts((cur) =>
          (cur || []).map((c) => {
            const found = (data || []).find((u: any) => u.id === c.id);
            return found || c;
          })
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadContacts() {
    try {
      const raw = await AsyncStorage.getItem(CONTACTS_KEY);
      if (!raw) return;
      const ids: string[] = JSON.parse(raw);
      if (!ids || !ids.length) return;
      // fetch profiles for those ids
      const { data } = await supabase.from("profiles").select("*").in("id", ids);
      setContacts(data || []);
    } catch (e) {
      console.error("loadContacts", e);
    }
  }

  async function persistContacts(ids: string[]) {
    await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(ids));
  }

  async function addContactByEmail(email: string) {
    // buscar profile
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("email", email).limit(1).single();
      if (error) {
        console.error("addContactByEmail error", error);
        return null;
      }
      const profile = data as Profile;
      // evita duplicados
      if (contacts.some((c) => c.id === profile.id)) return profile;
      const next = [...contacts, profile];
      setContacts(next);
      await persistContacts(next.map((c) => c.id));
      return profile;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async function removeContact(id: string) {
    const next = (contacts || []).filter((c) => c.id !== id);
    setContacts(next);
    await persistContacts(next.map((c) => c.id));
  }

  function getUserById(id: string) {
    return users.find((u) => u.id === id) || contacts.find((c) => c.id === id);
  }

  return (
    <DataContext.Provider value={{ users, contacts, fetchUsers, addContactByEmail, removeContact, getUserById, loading }}>
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
