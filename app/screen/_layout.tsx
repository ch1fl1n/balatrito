import { Tabs } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

export default function ScreenLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#222", 
          borderTopWidth: 2,
          borderTopColor: "#FFA500",
          height: 60,
        },
        tabBarLabelStyle: {
          fontFamily: "pixel",
          fontSize: 12,
        },
        tabBarActiveTintColor: "#FFA500",
        tabBarInactiveTintColor: "#fff",
      }}
    >
      <Tabs.Screen
        name="homepage"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
