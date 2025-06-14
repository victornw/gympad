import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import NotesScreen from "./src/screens/NotesScreen";
import TrainsScreen from "./src/screens/TrainsScreen";
import MetricsScreen from "./src/screens/MetricsScreen";
import WorkoutScreen from "./src/screens/WorkoutScreen";
import WorkoutResultScreen from "./src/screens/WorkoutResultScreen";
import MuscleMapScreen from "./src/screens/MuscleMapScreen";
import { createStackNavigator } from '@react-navigation/stack';

const Tab = createBottomTabNavigator();
const WorkoutStack = createStackNavigator();

function WorkoutStackScreen() {
  return (
    <WorkoutStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkoutStack.Screen name="WorkoutMain" component={WorkoutScreen} />
      <WorkoutStack.Screen name="WorkoutResult" component={WorkoutResultScreen} />
    </WorkoutStack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string = "alert-circle-outline"; // Default icon

            if (route.name === "Workout") {
              iconName = focused ? "run" : "run-fast";
            } else if (route.name === "History") {
              iconName = focused ? "history" : "history";
            } else if (route.name === "Trains") {
              iconName = focused ? "dumbbell" : "weight-lifter";
            } else if (route.name === "Metrics") {
              iconName = focused ? "chart-line" : "chart-line-variant";
            } else if (route.name === "MuscleMap") {
              iconName = "human-male-body";
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
        <Tab.Screen name="Workout" component={WorkoutStackScreen} options={{ title: "Treino", headerShown: false }} />
        <Tab.Screen name="MuscleMap" component={MuscleMapScreen} options={{ title: "Mapa Muscular", tabBarIcon: ({ color, size }) => (<MaterialCommunityIcons name="human-male-body" size={size} color={color} />) }} />
        <Tab.Screen name="History" component={NotesScreen} options={{ title: "Histórico" }} />
        <Tab.Screen name="Trains" component={TrainsScreen} options={{ title: "Routines" }} />
        <Tab.Screen name="Metrics" component={MetricsScreen} options={{ title: "Progress" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
