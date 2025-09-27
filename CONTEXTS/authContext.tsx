// CONTEXTS/authContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../UTILS/supabase";

export type Profile = {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string | null;
  created_at?: string;
  role?: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  birth?: string | null; // YYYY-MM-DD
  gender?: string | null;
};

type AuthContextValue = {
  user: Profile | null;
  loading: boolean;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; reason?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: Partial<Profile>) => Promise<{ success: boolean; message?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (session?.user) await fetchProfileAndSet(session.user.id);
      } catch (e) {
        console.error("Error al obtener sesión inicial:", e);
      } finally {
        setLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("🔁 onAuthStateChange:", _event);
        if (session?.user) {
          await fetchProfileAndSet(session.user.id);
        } else {
          setUser(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfileAndSet(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`id, username, email, avatar_url, created_at, role,
           full_name, first_name, last_name, phone, birth, gender`)
        .eq("id", userId)
        .single();

      if (error) {
        console.log("fetchProfile error:", error.message);
        setUser(null);
      } else {
        setUser(data as Profile);
      }
    } catch (e) {
      console.error("fetchProfileAndSet error:", e);
      setUser(null);
    }
  }

  const refreshProfile = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (session?.user?.id) {
        await fetchProfileAndSet(session.user.id);
      }
    } catch (e) {
      console.error("refreshProfile error:", e);
    }
  };

  // REGISTER (ya probaste que funciona)
  const register = async (username: string, email: string, password: string) => {
    try {
      const usernameNormalized = username.trim().toLowerCase();

      console.log("[register] enviando signUp", { username: usernameNormalized, email });

      const signUpRes = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: usernameNormalized } },
      });

      console.log("[register] signUpRes:", signUpRes);

      if (signUpRes.error) {
        return { success: false, message: signUpRes.error.message };
      }

      const createdUser = signUpRes.data?.user ?? null;

      if (!createdUser?.id) {
        return {
          success: true,
          message:
            "Registro recibido. Revisa tu correo para confirmar la cuenta (si aplica). El perfil aparecerá cuando se cree la cuenta.",
        };
      }

      // Intentar leer/insertar profile (trigger server-side idealmente)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .eq("id", createdUser.id)
        .single();

      if (profileError || !profileData) {
        console.warn("[register] profile no encontrado tras signUp:", profileError?.message);
        // intentar insertar desde cliente (puede fallar por RLS)
        const { error: insertErr } = await supabase.from("profiles").insert({
          id: createdUser.id,
          username: usernameNormalized,
          email,
        });

        if (insertErr) {
          console.error("[register] error al insertar profile desde cliente:", insertErr);
          return {
            success: true,
            message:
              "Usuario creado. El perfil puede tardar en aparecer o requiere confirmación de email. Revisa configuración de RLS/trigger.",
          };
        }

        await fetchProfileAndSet(createdUser.id);
        return { success: true, message: "Registro exitoso 🎉" };
      }

      await fetchProfileAndSet(createdUser.id);
      return { success: true, message: "Registro exitoso 🎉" };
    } catch (e: any) {
      console.error("[register] excepción:", e);
      return { success: false, message: "Error inesperado en el registro" };
    }
  };

  // LOGIN (case-insensitive)
  const login = async (username: string, password: string) => {
    try {
      const usernameNormalized = username.trim().toLowerCase();

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("username", usernameNormalized)
        .single();

      console.log("Profile para login:", profile, profileError);

      if (profileError || !profile?.email) {
        return { success: false, reason: "user_not_found" };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      console.log("signInWithPassword result:", data, error);

      if (error) {
        if (error.message?.toLowerCase().includes("email not confirmed")) {
          return { success: false, reason: "email_not_confirmed" };
        }
        return { success: false, reason: "invalid_credentials" };
      }

      if (data.user?.id) {
        await fetchProfileAndSet(data.user.id);
        return { success: true };
      }

      return { success: false, reason: "no_user" };
    } catch (e: any) {
      console.error("Error en login:", e);
      return { success: false, reason: "error" };
    }
  };

  // UPDATE PROFILE: centraliza actualización de profiles (y email en auth si aplica)
  const updateProfile = async (payload: Partial<Profile>) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      const userId = session?.user?.id ?? user?.id;
      if (!userId) return { success: false, message: "Usuario no autenticado" };

      // preparar payload para DB
      const updatePayload: any = { ...payload };

      // normalizar username si viene
      if (updatePayload.username) {
        updatePayload.username = (updatePayload.username as string).trim().toLowerCase();
      }

      // 1) si email cambió, actualizar en Auth primero
      if (updatePayload.email && updatePayload.email !== user?.email) {
        const { data: updateAuthData, error: updateAuthError } = await supabase.auth.updateUser({
          email: updatePayload.email,
        });
        if (updateAuthError) {
          console.error("Error updating auth user email:", updateAuthError);
          return { success: false, message: updateAuthError.message || "No se pudo actualizar el email en auth" };
        }
        // no hacemos logout aquí; solo proceder a actualizar profile
      }

      // 2) actualizar la tabla profiles
      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating profiles row:", updateError);
        return { success: false, message: updateError.message || "No se pudo actualizar el perfil" };
      }

      // 3) actualizar contexto y devolver éxito
      setUser(updatedProfile as Profile);
      return { success: true, message: "Perfil actualizado correctamente" };
    } catch (e: any) {
      console.error("Exception updateProfile:", e);
      return { success: false, message: e?.message ?? "Error inesperado" };
    }
  };

    const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      // Web: forzamos recarga y redirección a pantalla de login
      if (typeof window !== "undefined") {
        // Reemplaza la URL actual por la de login y fuerza reload.
        // Usamos replace para no dejar la página previa en el history.
        window.location.replace("/screen/login");
      }
      // En native dejamos que la app maneje la navegación (no forzamos)
    } catch (e) {
      console.error("logout error:", e);
      setUser(null);
    }
  };


  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe ser usado dentro de AuthProvider");
  return context;
};
