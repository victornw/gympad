import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Platform, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const primaryOrange = "#FF6F00";
const accentColor = "#FFAB00";
const textPrimary = "#FFFFFF";
const darkCharcoal = "#1A1A1A";
const mediumGray = "#333333";
const textSecondary = "#B0BEC5";

const { width, height } = Dimensions.get("window");

interface Set {
  weight: number;
  reps: number;
}

interface Exercise {
  name: string;
  sets: Set[];
}

const WorkoutScreen = () => {
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [workoutExercises, setWorkoutExercises] = useState<Exercise[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState<{ weight: string; reps: string }[]>([{ weight: "", reps: "" }]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigation = useNavigation<any>();

  const startWorkout = () => {
    setIsWorkoutActive(true);
    setWorkoutDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setWorkoutDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleAddSet = () => {
    setNewExerciseSets([...newExerciseSets, { weight: "", reps: "" }]);
  };
  const handleRemoveSet = (idx: number) => {
    setNewExerciseSets(newExerciseSets.filter((_, i) => i !== idx));
  };
  const handleSetChange = (idx: number, field: "weight" | "reps", value: string) => {
    setNewExerciseSets(newExerciseSets.map((set, i) => (i === idx ? { ...set, [field]: value } : set)));
  };
  const handleSaveExercise = () => {
    if (!newExerciseName.trim()) return;
    setWorkoutExercises([
      ...workoutExercises,
      {
        name: newExerciseName.trim(),
        sets: newExerciseSets.map((s) => ({ weight: parseFloat(s.weight), reps: parseInt(s.reps, 10) })).filter((s) => s.weight > 0 && s.reps > 0),
      },
    ]);
    setNewExerciseName("");
    setNewExerciseSets([{ weight: "", reps: "" }]);
    setShowAddExercise(false);
  };
  const handleRemoveExercise = (idx: number) => {
    setWorkoutExercises(workoutExercises.filter((_, i) => i !== idx));
  };

  // Função para calcular tonelagem e séries válidas
  const getWorkoutMetrics = (exercises: Exercise[]) => {
    let tonelagem = 0;
    let seriesValidas = 0;
    exercises.forEach((ex) => {
      ex.sets.forEach((set: Set) => {
        if (set.weight > 0 && set.reps > 0) {
          tonelagem += set.weight * set.reps;
          seriesValidas += 1;
        }
      });
    });
    return { tonelagem, seriesValidas };
  };
  // Função para estimar calorias (ajustada)
  const calculateCalories = (bodyWeight: number, totalTonnage: number, durationMinutes: number, validSets: number, restTimeRatio: number = 0.6) => {
    // Base: 5 kcal/min ativo (média para musculação moderada)
    const activeMinutes = durationMinutes * (1 - restTimeRatio);
    const baseCalories = activeMinutes * 5;
    // Bônus por tonelagem
    const tonnageBonus = (totalTonnage / 1000) * 0.3; // 0.3 kcal por tonelada
    // Bônus por série válida
    const setBonus = validSets * 1.5;
    return baseCalories + tonnageBonus + setBonus;
  };
  // Função para formatar duração
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: darkCharcoal }}>
      {!isWorkoutActive ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <TouchableOpacity
            style={{
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: primaryOrange,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: primaryOrange,
              shadowOffset: {
                width: 0,
                height: 0,
              },
              shadowOpacity: 0.4,
              shadowRadius: 20,
              elevation: 20,
            }}
            onPress={startWorkout}
          >
            <MaterialCommunityIcons name="play" size={60} color={textPrimary} />
            <Text
              style={{
                color: textPrimary,
                fontSize: 18,
                fontWeight: "bold",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              INICIAR{"\n"}TREINO
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              color: textSecondary,
              fontSize: 16,
              marginTop: 40,
              textAlign: "center",
              lineHeight: 24,
            }}
          >
            Toque no botão para começar{"\n"}seu treino
          </Text>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}>
          <View
            style={{
              alignItems: "center",
              marginVertical: 40,
              backgroundColor: "#0A0A0A",
              borderRadius: 20,
              paddingVertical: 30,
              paddingHorizontal: 20,
              marginHorizontal: 10,
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <Text
              style={{
                color: "#666",
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 10,
                letterSpacing: 1,
              }}
            >
              TEMPO DE TREINO
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#111",
                paddingHorizontal: 25,
                paddingVertical: 15,
                borderRadius: 15,
                borderWidth: 2,
                borderColor: "#222",
              }}
            >
              <Text
                style={{
                  color: accentColor,
                  fontSize: 56,
                  fontWeight: "300",
                  fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
                  letterSpacing: 4,
                  textShadowColor: accentColor,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 10,
                }}
              >
                {`${Math.floor(workoutDuration / 60)
                  .toString()
                  .padStart(2, "0")}`}
              </Text>
              <Text
                style={{
                  color: "#666",
                  fontSize: 32,
                  fontWeight: "300",
                  marginHorizontal: 8,
                  fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
                }}
              >
                :
              </Text>
              <Text
                style={{
                  color: accentColor,
                  fontSize: 56,
                  fontWeight: "300",
                  fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
                  letterSpacing: 4,
                  textShadowColor: accentColor,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 10,
                }}
              >
                {`${(workoutDuration % 60).toString().padStart(2, "0")}`}
              </Text>
            </View>

            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <Text style={{ color: "#888", fontSize: 12, marginRight: 20 }}>MIN</Text>
              <Text style={{ color: "#888", fontSize: 12 }}>SEG</Text>
            </View>
          </View>
          {/* Lista de exercícios adicionados */}
          {workoutExercises.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: accentColor, fontWeight: "bold", fontSize: 20, marginBottom: 8 }}>Exercícios adicionados:</Text>
              {workoutExercises.map((ex, idx) => (
                <View key={idx} style={{ marginBottom: 8, backgroundColor: mediumGray, borderRadius: 6, padding: 8 }}>
                  <Text style={{ color: accentColor, fontWeight: "bold", fontSize: 16 }}>{ex.name}</Text>
                  {ex.sets.map((set: Set, sidx: number) => (
                    <Text key={sidx} style={{ color: textPrimary, fontSize: 15, marginLeft: 8 }}>{`Série ${sidx + 1}: ${set.weight} kg x ${
                      set.reps
                    } reps`}</Text>
                  ))}
                  <TouchableOpacity onPress={() => handleRemoveExercise(idx)} style={{ marginTop: 4 }}>
                    <Text style={{ color: primaryOrange, fontSize: 13 }}>Remover exercício</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {/* Adicionar exercício */}
          {showAddExercise ? (
            <View style={{ backgroundColor: darkCharcoal, borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <TextInput
                placeholder="Nome do exercício"
                placeholderTextColor={textSecondary}
                style={{ backgroundColor: mediumGray, color: textPrimary, borderRadius: 6, padding: 12, fontSize: 16, marginBottom: 10 }}
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                returnKeyType="next"
                blurOnSubmit={true}
              />
              {newExerciseSets.map((set, idx) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <TextInput
                    placeholder="Peso (kg)"
                    placeholderTextColor={textSecondary}
                    style={{
                      backgroundColor: mediumGray,
                      color: textPrimary,
                      borderRadius: 6,
                      padding: 10,
                      fontSize: 15,
                      flex: 1,
                      textAlign: "center",
                    }}
                    value={set.weight}
                    onChangeText={(v) => handleSetChange(idx, "weight", v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))}
                    keyboardType="decimal-pad"
                    maxLength={6}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                  <TextInput
                    placeholder="Reps"
                    placeholderTextColor={textSecondary}
                    style={{
                      backgroundColor: mediumGray,
                      color: textPrimary,
                      borderRadius: 6,
                      padding: 10,
                      fontSize: 15,
                      flex: 1,
                      textAlign: "center",
                      marginLeft: 8,
                    }}
                    value={set.reps}
                    onChangeText={(v) => handleSetChange(idx, "reps", v.replace(/[^\d]/g, ""))}
                    keyboardType="number-pad"
                    maxLength={3}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                  <TouchableOpacity onPress={() => handleRemoveSet(idx)} style={{ marginLeft: 8 }}>
                    <MaterialCommunityIcons name="minus-circle-outline" size={24} color={primaryOrange} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={handleAddSet} style={{ marginBottom: 8 }}>
                <Text style={{ color: accentColor, fontWeight: "bold" }}>Adicionar série</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <TouchableOpacity
                  onPress={handleSaveExercise}
                  style={{ backgroundColor: primaryOrange, borderRadius: 8, padding: 12, flex: 1, marginRight: 8, alignItems: "center" }}
                >
                  <Text style={{ color: textPrimary, fontWeight: "bold" }}>Salvar exercício</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddExercise(false);
                    setNewExerciseName("");
                    setNewExerciseSets([{ weight: "", reps: "" }]);
                  }}
                  style={{ backgroundColor: mediumGray, borderRadius: 8, padding: 12, flex: 1, alignItems: "center" }}
                >
                  <Text style={{ color: textPrimary, fontWeight: "bold" }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: primaryOrange,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                paddingVertical: 14,
                marginBottom: 16,
              }}
              onPress={() => setShowAddExercise(true)}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color={textPrimary} />
              <Text style={{ color: textPrimary, fontSize: 18, fontWeight: "bold", marginLeft: 10 }}>Adicionar Exercício</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={{
              backgroundColor: accentColor,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              paddingVertical: 18,
              marginTop: 8,
            }}
            onPress={() => {
              const { tonelagem, seriesValidas } = getWorkoutMetrics(workoutExercises);
              const duration = workoutDuration;
              const durationFormatted = formatDuration(duration);
              const calories = calculateCalories(70, tonelagem, duration / 60, seriesValidas);
              (navigation as any).navigate("WorkoutResult", {
                metrics: {
                  duration: durationFormatted,
                  calories: Math.round(calories),
                  validSets: seriesValidas,
                  tonnage: tonelagem,
                  exercises: workoutExercises,
                },
              });
            }}
          >
            <MaterialCommunityIcons name="stop-circle" size={32} color={textPrimary} />
            <Text style={{ color: textPrimary, fontSize: 22, fontWeight: "bold", marginLeft: 12 }}>Finalizar Treino</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

export default WorkoutScreen;
