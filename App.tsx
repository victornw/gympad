import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import NotesScreen from "./src/screens/NotesScreen";
import TrainsScreen from "./src/screens/TrainsScreen";
import MetricsScreen from "./src/screens/MetricsScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string = "alert-circle-outline"; // Default icon

            if (route.name === "Notes") {
              iconName = focused ? "notebook-edit" : "notebook-edit-outline";
            } else if (route.name === "Trains") {
              iconName = focused ? "dumbbell" : "weight-lifter"; // Changed Trains icon for variety
            } else if (route.name === "Metrics") {
              iconName = focused ? "chart-line" : "chart-line-variant";
            }
            // Cast to any needed due to library typing, known issue with @expo/vector-icons & @react-navigation
            return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#007AFF",
          tabBarInactiveTintColor: "gray",
          headerStyle: {
            backgroundColor: "#f8f8f8",
          },
          headerTitleStyle: {
            fontWeight: "bold",
          },
          tabBarStyle: {
            backgroundColor: "#f8f8f8",
            borderTopWidth: 0, // Cleaner look
            elevation: 0, // Remove shadow on Android
            shadowOpacity: 0, // Remove shadow on iOS
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        })}
      >
        <Tab.Screen name="Notes" component={NotesScreen} options={{ title: "Daily Logs" }} />
        <Tab.Screen name="Trains" component={TrainsScreen} options={{ title: "Routines" }} />
        <Tab.Screen name="Metrics" component={MetricsScreen} options={{ title: "Progress" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
