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
import MuscleWikiScreen from "./src/screens/MuscleWikiScreen";
import { createStackNavigator } from "@react-navigation/stack";

const primaryOrange = "#FF6F00";
const accentColor = "#FFAB00";
const textPrimary = "#FFFFFF";
const darkCharcoal = "#1A1A1A";
const mediumGray = "#333333";
const textSecondary = "#B0BEC5";

const Tab = createBottomTabNavigator();
const WorkoutStack = createStackNavigator();

function WorkoutStackScreen() {
  return (
    <WorkoutStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: darkCharcoal },
      }}
    >
      <WorkoutStack.Screen name="WorkoutMain" component={WorkoutScreen} />
      <WorkoutStack.Screen name="WorkoutResult" component={WorkoutResultScreen} />
    </WorkoutStack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: primaryOrange,
          background: darkCharcoal,
          card: darkCharcoal,
          text: textPrimary,
          border: mediumGray,
          notification: primaryOrange,
        },
        fonts: {
          regular: {
            fontFamily: "System",
            fontWeight: "400",
          },
          medium: {
            fontFamily: "System",
            fontWeight: "500",
          },
          bold: {
            fontFamily: "System",
            fontWeight: "700",
          },
          heavy: {
            fontFamily: "System",
            fontWeight: "900",
          },
        },
      }}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string = "alert-circle-outline";

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
            } else if (route.name === "ExerciseDatabase") {
              iconName = focused ? "database" : "database-outline";
            }
            return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
          },
          tabBarActiveTintColor: primaryOrange,
          tabBarInactiveTintColor: textSecondary,
          headerStyle: {
            backgroundColor: darkCharcoal,
            shadowColor: "transparent",
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: mediumGray,
          },
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 20,
            color: textPrimary,
          },
          headerTintColor: textPrimary,
          tabBarStyle: {
            backgroundColor: darkCharcoal,
            borderTopWidth: 1,
            borderTopColor: mediumGray,
            elevation: 0,
            shadowOpacity: 0,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
            marginTop: 4,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
        })}
      >
        <Tab.Screen
          name="Workout"
          component={WorkoutStackScreen}
          options={{
            title: "Treino",
            headerShown: false,
            tabBarIcon: ({ focused, size }) => (
              <MaterialCommunityIcons name={focused ? "run" : "run-fast"} size={size} color={focused ? primaryOrange : textSecondary} />
            ),
          }}
        />
        <Tab.Screen
          name="ExerciseDatabase"
          component={MuscleWikiScreen}
          options={{
            title: "Exercícios",
            headerTitleAlign: "center",
            tabBarIcon: ({ focused, size }) => (
              <MaterialCommunityIcons name={focused ? "database" : "database-outline"} size={size} color={focused ? primaryOrange : textSecondary} />
            ),
          }}
        />
        <Tab.Screen
          name="MuscleMap"
          component={MuscleMapScreen}
          options={{
            title: "Mapa Muscular",
            headerTitleAlign: "center",
            tabBarIcon: ({ focused, size }) => (
              <MaterialCommunityIcons name="human-male-boy" size={size} color={focused ? primaryOrange : textSecondary} />
            ),
          }}
        />
        <Tab.Screen
          name="History"
          component={NotesScreen}
          options={{
            title: "Histórico",
            headerTitleAlign: "center",
            tabBarIcon: ({ focused, size }) => (
              <MaterialCommunityIcons name={focused ? "history" : "history"} size={size} color={focused ? primaryOrange : textSecondary} />
            ),
          }}
        />
        <Tab.Screen
          name="Metrics"
          component={MetricsScreen}
          options={{
            title: "Progresso",
            headerTitleAlign: "center",
            tabBarIcon: ({ focused, size }) => (
              <MaterialCommunityIcons
                name={focused ? "chart-line" : "chart-line-variant"}
                size={size}
                color={focused ? primaryOrange : textSecondary}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
