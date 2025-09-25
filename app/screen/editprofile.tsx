// app/screen/editprofile.tsx
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  Dimensions,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useFonts } from "expo-font";
import { useAuth } from "../../CONTEXTS/authContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";

const { width, height } = Dimensions.get("window");

function formatDateToYMD(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function EditProfile({ navigation }: any) {
  const [fontsLoaded] = useFonts({ pixel: require("../../assets/fonts/pixel.ttf") });
  const { user, refreshProfile, updateProfile } = useAuth();

  // fields
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [birth, setBirth] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthDateObj, setBirthDateObj] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? null);
      setLastName(user.last_name ?? null);
      setUsername(user.username ?? null);
      setEmail(user.email ?? null);
      setPhone(user.phone ?? null);
      setBirth(user.birth ?? null);
      setGender(user.gender ?? null);
      if (user.birth) {
        const d = new Date(user.birth);
        if (!isNaN(d.getTime())) setBirthDateObj(d);
      }
    }
  }, [user]);

  if (!fontsLoaded) return null;

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setBirthDateObj(selectedDate);
      setBirth(formatDateToYMD(selectedDate));
    }
  };

  const onSave = async () => {
    if (!user?.id) {
      Alert.alert("Error", "Usuario no autenticado.");
      return;
    }

    if (!username || username.trim().length < 3) {
      Alert.alert("Username inválido", "El username debe tener al menos 3 caracteres.");
      return;
    }
    if (!email || !email.includes("@")) {
      Alert.alert("Email inválido", "Introduce un email válido.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        first_name: firstName ?? null,
        last_name: lastName ?? null,
        phone: phone ?? null,
        birth: birth ?? null,
        gender: gender ?? null,
        username: username?.trim().toLowerCase(),
        email: email?.trim(),
      };

      const res = await updateProfile(payload);
      if (!res.success) {
        Alert.alert("Error", res.message || "No se pudo actualizar el perfil");
        return;
      }

      // refrescar contexto y volver atrás
      await refreshProfile();
      Alert.alert("Éxito", res.message || "Perfil actualizado");
      navigation?.goBack();
    } catch (e: any) {
      console.error("Exception update profile:", e);
      Alert.alert("Error inesperado", e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ImageBackground source={require("../../assets/images/background.png")} style={styles.background} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backText}>{"‹"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarCenter}>
            <Image
              source={user?.avatar_url ? { uri: user.avatar_url } : require("../../assets/images/avatar.png")}
              style={styles.avatar}
            />
          </View>

          <Text style={styles.pageTitle}>Edit Profile</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              value={username ?? ""}
              onChangeText={(t) => setUsername(t || null)}
              style={styles.input}
              placeholder="@username"
              autoCapitalize="none"
              placeholderTextColor="#9a9a9a"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email ?? ""}
              onChangeText={(t) => setEmail(t || null)}
              style={styles.input}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9a9a9a"
            />

            <Text style={styles.label}>First Name</Text>
            <TextInput value={firstName ?? ""} onChangeText={(t) => setFirstName(t || null)} style={styles.input} placeholderTextColor="#9a9a9a" />

            <Text style={styles.label}>Last Name</Text>
            <TextInput value={lastName ?? ""} onChangeText={(t) => setLastName(t || null)} style={styles.input} placeholderTextColor="#9a9a9a" />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput value={phone ?? ""} onChangeText={(t) => setPhone(t || null)} style={styles.input} keyboardType="phone-pad" placeholderTextColor="#9a9a9a" />

            <Text style={styles.label}>Birth</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.inputText}>{birth ?? "Select birth date"}</Text>
            </TouchableOpacity>
            {showDatePicker && <DateTimePicker value={birthDateObj ?? new Date(1990, 0, 1)} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onChangeDate} maximumDate={new Date()} />}

            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={gender ?? ""} onValueChange={(val) => setGender(val || null)} style={styles.picker} itemStyle={{ fontFamily: "pixel" }}>
                <Picker.Item label="Select gender..." value="" />
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
                <Picker.Item label="Prefer not to say" value="none" />
              </Picker>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? "Guardando..." : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width, height },
  container: { padding: 20, alignItems: "center" },
  topRow: { width: "100%", marginTop: 20 },
  backText: { fontSize: 22, color: "#111", fontFamily: "pixel" },
  card: { width: "100%", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 18, padding: 18, marginTop: 10 },
  avatarCenter: { alignItems: "center", marginBottom: 8 },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  pageTitle: { fontSize: 20, fontFamily: "pixel", color: "#111", textAlign: "left", marginTop: 8, marginBottom: 10 },
  form: { marginTop: 6 },
  label: { fontFamily: "pixel", color: "#444", fontSize: 11, marginTop: 10, marginBottom: 6 },
  input: { height: 44, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#fff", justifyContent: "center" },
  inputText: { fontFamily: "pixel", color: "#111" },
  pickerWrap: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff" },
  picker: { height: 44 },
  saveBtn: { marginTop: 14, backgroundColor: "#0b7a3f", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontFamily: "pixel", fontSize: 14 },
});
