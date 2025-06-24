import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Platform, Dimensions, KeyboardAvoidingView, FlatList, Alert, Modal } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { muscleWikiService, MuscleWikiExercise } from "../services/muscleWikiService";
import ExerciseComparisonCard from "../components/ExerciseComparisonCard";
import WorkoutComparisonModal from "../components/WorkoutComparisonModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DailyNote, ExerciseSet } from "../types";
import { format } from "date-fns";

const primaryOrange = "#FF6F00";
const accentColor = "#FFAB00";
const textPrimary = "#FFFFFF";
const darkCharcoal = "#1A1A1A";
const mediumGray = "#333333";
const textSecondary = "#B0BEC5";
const lightGray = "#4D4D4D";

const { width, height } = Dimensions.get("window");

// Storage keys
const NOTES_STORAGE_KEY = "@GymPad:notes";
const KNOWN_EXERCISES_STORAGE_KEY = "@GymPad:knownExercises";

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
  
  // Estados para autocompletar exercícios
  const [exerciseSuggestions, setExerciseSuggestions] = useState<MuscleWikiExercise[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<MuscleWikiExercise[]>([]);
  
  // Estados para comparação de treinos
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  
  // Estados para adicionar exercícios personalizados
  const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);
  const [createExerciseName, setCreateExerciseName] = useState("");
  const [createExerciseCategory, setCreateExerciseCategory] = useState("");
  
  // Estado para salvar histórico
  const [workoutStartTime, setWorkoutStartTime] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigation = useNavigation<any>();

  // Carregar exercícios disponíveis quando o componente montar
  useEffect(() => {
    const loadExercises = async () => {
      try {
        await muscleWikiService.initialize();
        const exercises = muscleWikiService.getAllExercises();
        setAvailableExercises(exercises);
      } catch (error) {
        console.error("Erro ao carregar exercícios:", error);
      }
    };
    loadExercises();
  }, []);

  // Função para filtrar exercícios baseado no texto digitado
  const handleExerciseNameChange = (text: string) => {
    setNewExerciseName(text);
    
    if (text.trim().length >= 2) {
      const filtered = availableExercises.filter(exercise =>
        exercise.name.toLowerCase().includes(text.toLowerCase())
      ).slice(0, 5); // Limitar a 5 sugestões
      
      setExerciseSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setExerciseSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Função para selecionar uma sugestão
  const selectExerciseSuggestion = (exerciseName: string) => {
    setNewExerciseName(exerciseName);
    setExerciseSuggestions([]);
    setShowSuggestions(false);
  };

  const startWorkout = () => {
    setIsWorkoutActive(true);
    setWorkoutDuration(0);
    setWorkoutStartTime(new Date().toISOString());
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
    
    // Limpar sugestões
    setExerciseSuggestions([]);
    setShowSuggestions(false);
  };

  // Função para aplicar sugestões de comparação
  const handleApplyComparison = (exerciseIndex: number, setIndex: number, weight: number, reps: number) => {
    const updatedExercises = [...workoutExercises];
    if (updatedExercises[exerciseIndex] && updatedExercises[exerciseIndex].sets[setIndex]) {
      updatedExercises[exerciseIndex].sets[setIndex] = { weight, reps };
      setWorkoutExercises(updatedExercises);
    }
  };

  // Função para salvar o treino no histórico
  const saveWorkoutToHistory = async () => {
    try {
      if (!workoutStartTime || workoutExercises.length === 0) return;

      // Converter exercícios para o formato do histórico
      const exercises: DailyNote["exercises"] = {};
      workoutExercises.forEach((exercise) => {
        if (exercise.sets.length > 0) {
          const sets: ExerciseSet[] = exercise.sets.map((set, index) => ({
            id: `${Date.now()}-${index}`,
            weight: set.weight,
            reps: set.reps,
            unit: "kg" as const,
            isBestSet: false
          }));

          // Marcar a melhor série
          if (sets.length > 0) {
            const bestSetIndex = sets.reduce((bestIdx, current, index, array) => {
              const currentVolume = (current.weight || 0) * current.reps;
              const bestVolume = (array[bestIdx].weight || 0) * array[bestIdx].reps;
              return currentVolume > bestVolume ? index : bestIdx;
            }, 0);
            sets[bestSetIndex].isBestSet = true;
          }

          exercises[exercise.name] = {
            sets,
            bestSetId: sets.find(s => s.isBestSet)?.id
          };
        }
      });

      // Criar note do treino
      const workoutNote: DailyNote = {
        id: Date.now().toString(),
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: workoutStartTime,
        endTime: new Date().toISOString(),
        duration: workoutDuration,
        exercises
      };

      // Carregar histórico existente
      const existingNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      let notes: DailyNote[] = existingNotes ? JSON.parse(existingNotes) : [];
      
      // Adicionar nova note
      notes.push(workoutNote);
      
      // Salvar de volta
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));

      // Atualizar exercícios conhecidos
      const exerciseNames = workoutExercises.map(ex => ex.name);
      const existingKnownExercises = await AsyncStorage.getItem(KNOWN_EXERCISES_STORAGE_KEY);
      let knownExercises: string[] = existingKnownExercises ? JSON.parse(existingKnownExercises) : [];
      
      exerciseNames.forEach(name => {
        if (!knownExercises.includes(name)) {
          knownExercises.push(name);
        }
      });
      
      await AsyncStorage.setItem(KNOWN_EXERCISES_STORAGE_KEY, JSON.stringify(knownExercises));

      console.log("Treino salvo no histórico com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar treino no histórico:", error);
      Alert.alert("Erro", "Não foi possível salvar o treino no histórico");
    }
  };

  // Função para criar exercício personalizado
  const handleCreateCustomExercise = async () => {
    if (!createExerciseName.trim()) {
      Alert.alert("Erro", "Nome do exercício é obrigatório");
      return;
    }

    try {
      await muscleWikiService.addCustomExercise({
        name: createExerciseName.trim(),
        category: createExerciseCategory.trim() || "Personalizado",
        muscles: ["Múltiplo"],
        equipment: "Variado",
        difficulty: "Intermediário",
        instructions: "Exercício criado pelo usuário durante o treino."
      });

      // Recarregar exercícios
      const exercises = muscleWikiService.getAllExercises();
      setAvailableExercises(exercises);

      // Aplicar o exercício criado
      setNewExerciseName(createExerciseName.trim());
      
      // Limpar e fechar modal
      setCreateExerciseName("");
      setCreateExerciseCategory("");
      setShowCreateExerciseModal(false);
      
      Alert.alert("Sucesso", "Exercício criado e adicionado!");
    } catch (error) {
      console.error("Erro ao criar exercício:", error);
      Alert.alert("Erro", "Não foi possível criar o exercício");
    }
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
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: darkCharcoal }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      enabled={true}
    >
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
          <ScrollView 
            keyboardShouldPersistTaps="handled" 
            contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
            showsVerticalScrollIndicator={false}
          >
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: accentColor, fontWeight: "bold", fontSize: 20 }}>Exercícios adicionados:</Text>
                  <TouchableOpacity 
                    onPress={() => setShowComparisonModal(true)}
                    style={{ 
                      backgroundColor: primaryOrange, 
                      paddingHorizontal: 12, 
                      paddingVertical: 6, 
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                  >
                    <MaterialCommunityIcons name="chart-timeline-variant" size={16} color={textPrimary} />
                    <Text style={{ color: textPrimary, fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>
                      Comparar
                    </Text>
                  </TouchableOpacity>
                </View>
                {workoutExercises.map((ex, idx) => (
                  <View key={idx} style={{ marginBottom: 12 }}>
                    <View style={{ backgroundColor: mediumGray, borderRadius: 8, padding: 12 }}>
                      <Text style={{ color: accentColor, fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>{ex.name}</Text>
                      
                      {/* Card de comparação para este exercício */}
                      <ExerciseComparisonCard 
                        exerciseName={ex.name} 
                        onSuggestionApply={(weight, reps) => {
                          // Aplicar aos campos do último set ou criar novo set
                          const updatedExercises = [...workoutExercises];
                          if (updatedExercises[idx].sets.length === 0) {
                            updatedExercises[idx].sets.push({ weight, reps });
                          } else {
                            const lastSetIndex = updatedExercises[idx].sets.length - 1;
                            updatedExercises[idx].sets[lastSetIndex] = { weight, reps };
                          }
                          setWorkoutExercises(updatedExercises);
                        }}
                      />
                      
                      {ex.sets.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                          {ex.sets.map((set: Set, sidx: number) => (
                            <Text key={sidx} style={{ color: textPrimary, fontSize: 15, marginLeft: 8, marginBottom: 2 }}>
                              {`Série ${sidx + 1}: ${set.weight} kg × ${set.reps} reps`}
                            </Text>
                          ))}
                        </View>
                      )}
                      
                      <TouchableOpacity onPress={() => handleRemoveExercise(idx)} style={{ marginTop: 8 }}>
                        <Text style={{ color: primaryOrange, fontSize: 13, textAlign: 'center' }}>Remover exercício</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {/* Adicionar exercício */}
            {showAddExercise ? (
              <View style={{ backgroundColor: darkCharcoal, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: showSuggestions ? 5 : 10 }}>
                  <TextInput
                    placeholder="Nome do exercício"
                    placeholderTextColor={textSecondary}
                    style={{ 
                      backgroundColor: mediumGray, 
                      color: textPrimary, 
                      borderRadius: 6, 
                      padding: 12, 
                      fontSize: 16, 
                      flex: 1,
                      marginRight: 8
                    }}
                    value={newExerciseName}
                    onChangeText={handleExerciseNameChange}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCreateExerciseModal(true)}
                    style={{
                      backgroundColor: primaryOrange,
                      borderRadius: 6,
                      padding: 12,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={textPrimary} />
                  </TouchableOpacity>
                </View>
                {showSuggestions && (
                  <View style={{ 
                    maxHeight: 150, 
                    backgroundColor: lightGray, 
                    borderRadius: 6, 
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: mediumGray
                  }}>
                    <FlatList
                      data={exerciseSuggestions}
                      keyExtractor={(item) => item.id}
                      nestedScrollEnabled={true}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => selectExerciseSuggestion(item.name)}
                          style={{ 
                            padding: 12, 
                            borderBottomWidth: 1, 
                            borderBottomColor: mediumGray,
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}
                        >
                          <MaterialCommunityIcons name="dumbbell" size={16} color={accentColor} style={{ marginRight: 8 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '500' }}>{item.name}</Text>
                            <Text style={{ color: textSecondary, fontSize: 12 }}>{item.category} • {item.equipment}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      style={{ maxHeight: 150 }}
                      showsVerticalScrollIndicator={false}
                    />
                  </View>
                )}
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
                      setExerciseSuggestions([]);
                      setShowSuggestions(false);
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
              onPress={async () => {
                // Salvar treino no histórico primeiro
                await saveWorkoutToHistory();
                
                // Parar timer
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                
                // Calcular métricas
                const { tonelagem, seriesValidas } = getWorkoutMetrics(workoutExercises);
                const duration = workoutDuration;
                const durationFormatted = formatDuration(duration);
                const calories = calculateCalories(70, tonelagem, duration / 60, seriesValidas);
                
                // Navegar para tela de resultado
                (navigation as any).navigate("WorkoutResult", {
                  metrics: {
                    duration: durationFormatted,
                    calories: Math.round(calories),
                    validSets: seriesValidas,
                    tonnage: tonelagem,
                    exercises: workoutExercises,
                  },
                });
                
                // Reset do treino
                setIsWorkoutActive(false);
                setWorkoutExercises([]);
                setWorkoutDuration(0);
                setWorkoutStartTime(null);
              }}
            >
              <MaterialCommunityIcons name="stop-circle" size={32} color={textPrimary} />
              <Text style={{ color: textPrimary, fontSize: 22, fontWeight: "bold", marginLeft: 12 }}>Finalizar Treino</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
        
        {/* Modal de comparação completa */}
        <WorkoutComparisonModal
          visible={showComparisonModal}
          onClose={() => setShowComparisonModal(false)}
          exercises={workoutExercises.map(ex => ex.name)}
        />

        {/* Modal para criar exercício personalizado */}
        <Modal
          visible={showCreateExerciseModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCreateExerciseModal(false)}
        >
          <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: darkCharcoal }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={{ flex: 1 }}>
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: 20, 
                borderBottomWidth: 1, 
                borderBottomColor: mediumGray 
              }}>
                <TouchableOpacity 
                  onPress={() => {
                    setShowCreateExerciseModal(false);
                    setCreateExerciseName("");
                    setCreateExerciseCategory("");
                  }}
                >
                  <MaterialCommunityIcons name="close" size={24} color={textPrimary} />
                </TouchableOpacity>
                <Text style={{ color: textPrimary, fontSize: 18, fontWeight: 'bold' }}>
                  Criar Exercício
                </Text>
                <TouchableOpacity 
                  onPress={handleCreateCustomExercise}
                  style={{ 
                    backgroundColor: primaryOrange, 
                    paddingHorizontal: 16, 
                    paddingVertical: 8, 
                    borderRadius: 6 
                  }}
                >
                  <Text style={{ color: textPrimary, fontWeight: 'bold' }}>Criar</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, padding: 20 }}>
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: accentColor, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                    Nome do Exercício *
                  </Text>
                  <TextInput
                    placeholder="Ex: Agachamento búlgaro"
                    placeholderTextColor={textSecondary}
                    style={{
                      backgroundColor: mediumGray,
                      color: textPrimary,
                      borderRadius: 8,
                      padding: 16,
                      fontSize: 16
                    }}
                    value={createExerciseName}
                    onChangeText={setCreateExerciseName}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: accentColor, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                    Categoria (Opcional)
                  </Text>
                  <TextInput
                    placeholder="Ex: Pernas, Peito, Costas..."
                    placeholderTextColor={textSecondary}
                    style={{
                      backgroundColor: mediumGray,
                      color: textPrimary,
                      borderRadius: 8,
                      padding: 16,
                      fontSize: 16
                    }}
                    value={createExerciseCategory}
                    onChangeText={setCreateExerciseCategory}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                </View>

                <View style={{
                  backgroundColor: lightGray,
                  padding: 16,
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: accentColor
                }}>
                  <Text style={{ color: textPrimary, fontSize: 14, lineHeight: 20 }}>
                    💡 <Text style={{ fontWeight: 'bold' }}>Dica:</Text> Após criar, o exercício estará disponível 
                    para uso imediato e aparecerá nas sugestões futuras.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

export default WorkoutScreen;
