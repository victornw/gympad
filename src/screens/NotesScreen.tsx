import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  Button,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DailyNote, ExerciseSet, KnownExerciseNames } from "../types";
import { format, parseISO, isValid, startOfDay, isFuture } from "date-fns";
import { muscleWikiService, MuscleWikiExercise } from "../services/muscleWikiService";

const NOTES_STORAGE_KEY = "@GymPad:notes";
const KNOWN_EXERCISES_STORAGE_KEY = "@GymPad:knownExercises";

// NEW COLOR PALETTE
const primaryOrange = "#FF6F00"; // Main energetic orange
const darkCharcoal = "#1A1A1A"; // Deep background, dark text elements
const mediumGray = "#333333"; // Slightly lighter background elements, secondary text
const lightGray = "#4D4D4D"; // Borders, subtle UI elements
const textPrimary = "#FFFFFF"; // For text on dark/orange backgrounds
const textSecondary = "#B0BEC5"; // For placeholder text or less important info
const accentColor = "#FFAB00"; // A brighter orange/yellow for highlights if needed

// Function to clear all notes - call this once if needed, then remove or comment out
// const clearAllNotes = async () => {
//   try {
//     await AsyncStorage.removeItem(NOTES_STORAGE_KEY);
//     await AsyncStorage.removeItem(KNOWN_EXERCISES_STORAGE_KEY); // Also clear known exercises if notes are cleared
//     console.log("All notes and known exercises cleared!");
//   } catch (e) {
//     console.error("Failed to clear notes", e);
//   }
// };

const NotesScreen = () => {
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [knownExerciseNames, setKnownExerciseNames] = useState<KnownExerciseNames>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [currentDate, setCurrentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bodyWeight, setBodyWeight] = useState("");
  const [exercises, setExercises] = useState<DailyNote["exercises"]>({});
  const [currentExerciseNameInput, setCurrentExerciseNameInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Estados para integrar exercícios do MuscleWiki
  const [availableExercises, setAvailableExercises] = useState<MuscleWikiExercise[]>([]);

  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<string | null>(null);
  const [workoutEndTime, setWorkoutEndTime] = useState<string | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Adicionar estados para novo fluxo
  const [workoutExercises, setWorkoutExercises] = useState<any[]>([]); // [{name, sets: [{weight, reps}]}]
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState<{weight: string, reps: string}[]>([{weight: "", reps: ""}]);
  const [workoutBodyWeight, setWorkoutBodyWeight] = useState("");

  // Novo estado para controlar edição do peso corporal
  const [isEditingBodyWeight, setIsEditingBodyWeight] = useState(true);

  useEffect(() => {
    // clearAllNotes(); // UNCOMMENT AND RUN ONCE TO CLEAR DATA, THEN RE-COMMENT
    const loadData = async () => {
      try {
        setIsLoading(true);
        const storedNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
        if (storedNotes) {
          setNotes(JSON.parse(storedNotes));
        }
        const storedNames = await AsyncStorage.getItem(KNOWN_EXERCISES_STORAGE_KEY);
        if (storedNames) {
          setKnownExerciseNames(new Set(JSON.parse(storedNames)));
        }
        
        // Carregar exercícios do MuscleWiki
        await muscleWikiService.initialize();
        const muscleWikiExercises = muscleWikiService.getAllExercises();
        setAvailableExercises(muscleWikiExercises);
        
      } catch (e) {
        console.error("Failed to load data from storage", e);
        Alert.alert("Error", "Failed to load saved data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes)).catch((e) => console.error("Failed to save notes", e));
    }
  }, [notes, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(KNOWN_EXERCISES_STORAGE_KEY, JSON.stringify(Array.from(knownExerciseNames))).catch((e) =>
        console.error("Failed to save known exercises", e)
      );
    }
  }, [knownExerciseNames, isLoading]);

  const handleExerciseNameChange = (text: string) => {
    setCurrentExerciseNameInput(text);
    if (text.trim().length >= 2) {
      // Combinar exercícios conhecidos e exercícios do MuscleWiki
      const knownExercisesList = Array.from(knownExerciseNames);
      const muscleWikiNames = availableExercises.map(ex => ex.name);
      
      // Filtrar sugestões de exercícios conhecidos
      const knownSuggestions = knownExercisesList.filter((name) => 
        name.toLowerCase().includes(text.toLowerCase())
      );
      
      // Filtrar sugestões do MuscleWiki (evitar duplicatas)
      const muscleWikiSuggestions = muscleWikiNames.filter((name) => 
        name.toLowerCase().includes(text.toLowerCase()) && 
        !knownExercisesList.includes(name)
      );
      
      // Combinar e limitar sugestões (priorizar exercícios conhecidos)
      const combinedSuggestions = [
        ...knownSuggestions.slice(0, 3),
        ...muscleWikiSuggestions.slice(0, 5)
      ].slice(0, 8);
      
      setSuggestions(combinedSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (name: string) => {
    setCurrentExerciseNameInput(name);
    setSuggestions([]);
    addExerciseEntry(name);
  };

  const addExerciseEntry = (nameToAdd?: string) => {
    const exerciseName = (nameToAdd || currentExerciseNameInput).trim();
    if (exerciseName === "" || exercises[exerciseName]) {
      if (exercises[exerciseName]) {
        // Optionally, alert user or handle differently if exercise already added to current note
      }
      setCurrentExerciseNameInput("");
      setSuggestions([]);
      return;
    }
    setExercises((prev) => ({
      ...prev,
      [exerciseName]: { sets: [], bestSetId: undefined },
    }));
    setCurrentExerciseNameInput("");
    setSuggestions([]);
  };

  const addSetToExercise = (exerciseName: string) => {
    setExercises((prev) => ({
      ...prev,
      [exerciseName]: {
        ...prev[exerciseName],
        sets: [...(prev[exerciseName]?.sets || []), { id: Date.now().toString(), reps: 0, unit: "kg" }],
      },
    }));
  };

  const removeSetFromExercise = (exerciseName: string, setId: string) => {
    setExercises((prev) => {
      const updatedExercise = { ...prev[exerciseName] };
      updatedExercise.sets = updatedExercise.sets.filter((set) => set.id !== setId);
      if (updatedExercise.bestSetId === setId) {
        updatedExercise.bestSetId = undefined;
        updatedExercise.sets = updatedExercise.sets.map((s) => ({ ...s, isBestSet: false }));
      }
      return { ...prev, [exerciseName]: updatedExercise };
    });
  };

  const updateSet = (exerciseName: string, setId: string, field: keyof ExerciseSet, value: string | number | undefined, unit?: "kg" | "bricks") => {
    setExercises((prev) => ({
      ...prev,
      [exerciseName]: {
        ...prev[exerciseName],
        sets: prev[exerciseName].sets.map((set) => {
          if (set.id === setId) {
            const updatedSet = { ...set };
            if (field === "unit") {
              updatedSet.unit = value as "kg" | "bricks";
            } else if (field === "weight") {
              updatedSet.weight = Number(value) || undefined;
            } else if (field === "reps") {
              updatedSet.reps = Number(value) || 0;
            }
            return updatedSet;
          }
          return set;
        }),
      },
    }));
  };

  const toggleBestSet = (exerciseName: string, setId: string) => {
    setExercises((prev) => {
      const currentExercise = prev[exerciseName];
      const newBestSetId = currentExercise.bestSetId === setId ? undefined : setId;
      return {
        ...prev,
        [exerciseName]: {
          ...currentExercise,
          bestSetId: newBestSetId,
          sets: currentExercise.sets.map((s) => ({ ...s, isBestSet: s.id === newBestSetId })),
        },
      };
    });
  };

  const startWorkout = () => {
    setIsWorkoutActive(true);
    const now = new Date().toISOString();
    setWorkoutStartTime(now);
    setWorkoutEndTime(null);
    setWorkoutDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setWorkoutDuration((prev) => prev + 1);
    }, 1000);
  };

  const endWorkout = () => {
    setIsWorkoutActive(false);
    const now = new Date().toISOString();
    setWorkoutEndTime(now);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const saveNote = () => {
    if (Object.keys(exercises).length === 0 && !bodyWeight) {
      Alert.alert("Empty Note", "Please add at least one exercise or body weight.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
      Alert.alert("Invalid Date", "Please use YYYY-MM-DD format for the date.");
      return;
    }

    const parsedDate = parseISO(currentDate);
    if (!isValid(parsedDate)) {
      Alert.alert("Invalid Date", "The date entered is not a valid calendar date.");
      return;
    }

    // Prevent saving notes for future dates
    if (isFuture(startOfDay(parsedDate))) {
      // Compare with the start of the parsed date
      Alert.alert("Future Date Invalid", "You cannot create notes for a future date.");
      return;
    }

    const noteData: Omit<DailyNote, "id"> = {
      date: currentDate,
      bodyWeight: Number(bodyWeight) || undefined,
      exercises,
      startTime: workoutStartTime || undefined,
      endTime: workoutEndTime || (isWorkoutActive ? new Date().toISOString() : undefined),
      duration: workoutDuration > 0 ? workoutDuration : undefined,
    };

    let updatedNotes = [...notes];

    if (editingNoteId) {
      // When editing, the date might change. Check if it clashes with another existing note.
      const otherNotes = notes.filter((n) => n.id !== editingNoteId);
      if (otherNotes.some((n) => n.date === currentDate)) {
        Alert.alert("Date Conflict", `A note for ${currentDate} already exists. Please choose a different date or edit the existing note.`);
        return;
      }
      updatedNotes = notes.map((n) => (n.id === editingNoteId ? { ...noteData, id: editingNoteId } : n));
    } else {
      // When creating a new note, check if date already exists
      if (notes.some((n) => n.date === currentDate)) {
        Alert.alert("Date Conflict", `A note for ${currentDate} already exists. Please edit the existing note or choose a different date.`);
        return;
      }
      const newNote: DailyNote = {
        ...noteData,
        id: Date.now().toString(),
      };
      updatedNotes = [...notes, newNote];
    }
    setNotes(updatedNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    const newNames = new Set(knownExerciseNames);
    Object.keys(exercises).forEach((name) => {
      if (!newNames.has(name)) {
        newNames.add(name);
      }
    });
    setKnownExerciseNames(newNames);

    setEditingNoteId(null);
    setCurrentDate(format(new Date(), "yyyy-MM-dd"));
    setBodyWeight("");
    setExercises({});
    setCurrentExerciseNameInput("");
  };

  // Função utilitária para calcular tonelagem total e número de séries válidas
  const getWorkoutMetrics = (note: DailyNote) => {
    let tonelagem = 0;
    let seriesValidas = 0;
    Object.values(note.exercises).forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (set.weight && set.reps && set.weight > 0 && set.reps > 0) {
          tonelagem += set.weight * set.reps;
          seriesValidas += 1;
        }
      });
    });
    return { tonelagem, seriesValidas };
  };

  // Função para estimar calorias
  const calculateCalories = (
    bodyWeight: number,
    totalTonnage: number,  // peso × reps total
    durationMinutes: number,
    restTimeRatio: number = 0.6  // % do tempo em descanso
  ) => {
    // Calorias base por minuto de treino ativo
    const activeMinutes = durationMinutes * (1 - restTimeRatio);
    const baseCaloriesPerMinute = 0.1 * bodyWeight; // ~6 cal/min para 60kg
    // Bonus baseado na tonelagem (maior volume = mais calorias)
    const tonnageBonus = totalTonnage * 0.002; // 2 cal por 1000kg movimentados
    // Calorias de descanso (metabolismo elevado)
    const restCalories = (durationMinutes * restTimeRatio) * (baseCaloriesPerMinute * 0.3);
    return (activeMinutes * baseCaloriesPerMinute) + tonnageBonus + restCalories;
  };

  const renderSetItem = (exerciseName: string, item: ExerciseSet) => (
    <View key={item.id} style={[styles.setRow, item.isBestSet && styles.bestSetRow]}>
      <View style={styles.weightUnitSelector}>
        <TouchableOpacity
          style={[styles.unitButton, item.unit === "kg" && styles.unitButtonActive]}
          onPress={() => updateSet(exerciseName, item.id, "unit", "kg")}
        >
          <Text style={[styles.unitButtonText, item.unit === "kg" && styles.unitButtonTextActive]}>kg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitButton, item.unit === "bricks" && styles.unitButtonActive]}
          onPress={() => updateSet(exerciseName, item.id, "unit", "bricks")}
        >
          <Text style={[styles.unitButtonText, item.unit === "bricks" && styles.unitButtonTextActive]}>bricks</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        placeholder="Weight"
        placeholderTextColor={textSecondary}
        keyboardType="numeric"
        style={styles.inputSmall}
        value={item.weight?.toString() || ""}
        onChangeText={(text) => updateSet(exerciseName, item.id, "weight", text)}
      />
      <TextInput
        placeholder="Reps"
        placeholderTextColor={textSecondary}
        keyboardType="numeric"
        style={styles.inputSmall}
        value={item.reps.toString()}
        onChangeText={(text) => updateSet(exerciseName, item.id, "reps", text)}
      />
      <TouchableOpacity onPress={() => toggleBestSet(exerciseName, item.id)} style={styles.bestSetButton}>
        <MaterialCommunityIcons name={item.isBestSet ? "star" : "star-outline"} size={24} color={item.isBestSet ? accentColor : textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => removeSetFromExercise(exerciseName, item.id)} style={styles.deleteSetButton}>
        <MaterialCommunityIcons name="close-circle-outline" size={24} color={primaryOrange} />
      </TouchableOpacity>
    </View>
  );

  const renderExerciseEntry = (exerciseName: string, exerciseData: DailyNote["exercises"][string]) => (
    <View key={exerciseName} style={styles.exerciseEntryContainer}>
      <Text style={styles.exerciseNameText}>{exerciseName}</Text>
      {exerciseData.sets.map((set) => renderSetItem(exerciseName, set))}
      <TouchableOpacity style={styles.addSetButton} onPress={() => addSetToExercise(exerciseName)}>
        <MaterialCommunityIcons name="plus-circle-outline" size={24} color={primaryOrange} />
        <Text style={styles.addSetButtonText}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNoteItem = ({ item }: { item: DailyNote }) => {
    const { tonelagem, seriesValidas } = getWorkoutMetrics(item);
    let calories = undefined;
    if (item.bodyWeight && item.duration) {
      calories = calculateCalories(
        item.bodyWeight,
        tonelagem,
        item.duration / 60
      );
    }
    return (
      <View style={styles.noteItemContainer}>
        <View style={styles.noteHeader}>
          <Text style={styles.noteDate}>{format(parseISO(item.date), "MMMM d, yyyy")}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setEditingNoteId(item.id)} style={styles.actionButton}>
              <MaterialCommunityIcons name="pencil-circle-outline" size={26} color={accentColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDeleteNote(item.id)} style={styles.actionButton}>
              <MaterialCommunityIcons name="trash-can-outline" size={26} color={primaryOrange} />
            </TouchableOpacity>
          </View>
        </View>
        {item.bodyWeight && <Text style={styles.bodyWeightText}>Body Weight: {item.bodyWeight} kg</Text>}
        {/* Métricas do treino */}
        <View style={{ flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' }}>
          <Text style={{ color: accentColor, fontWeight: 'bold', marginRight: 16 }}>
            Tonelagem: {tonelagem} kg
          </Text>
          <Text style={{ color: accentColor, fontWeight: 'bold', marginRight: 16 }}>
            Séries válidas: {seriesValidas}
          </Text>
          {calories !== undefined && (
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              Calorias estimadas: {calories.toFixed(0)} kcal
            </Text>
          )}
        </View>
        <Text style={styles.subHeader}>Exercises:</Text>
        {Object.entries(item.exercises).map(([name, exerciseDetails]) => (
          <View key={`${item.id}-${name}`} style={styles.exerciseLogContainer}>
            <Text style={styles.exerciseLogName}>{name}</Text>
            {exerciseDetails.sets.map((set, index) => (
              <Text key={`${item.id}-${name}-set-${set.id}`} style={[styles.setLogText, set.isBestSet && styles.bestSetLogText]}>
                {`Set ${index + 1}: `}
                {set.weight ? `${set.weight}${set.unit || "kg"} ` : ""}
                {`${set.reps} reps `}
                {exerciseDetails.bestSetId === set.id ? "(Best)" : ""}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const confirmDeleteNote = (noteId: string) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteNote(noteId) },
      ],
      { cancelable: true }
    );
  };

  const deleteNote = (noteId: string) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
    // AsyncStorage update will be handled by the useEffect watching `notes`
    Alert.alert("Note Deleted", "The note has been successfully deleted.");
  };

  // 2. Funções para adicionar exercício e séries
  const handleAddSet = () => {
    setNewExerciseSets([...newExerciseSets, {weight: "", reps: ""}]);
  };
  const handleRemoveSet = (idx: number) => {
    setNewExerciseSets(newExerciseSets.filter((_, i) => i !== idx));
  };
  const handleSetChange = (idx: number, field: "weight" | "reps", value: string) => {
    setNewExerciseSets(newExerciseSets.map((set, i) => i === idx ? {...set, [field]: value} : set));
  };
  const handleSaveExercise = () => {
    if (!newExerciseName.trim()) return;
    setWorkoutExercises([...workoutExercises, {
      name: newExerciseName.trim(),
      sets: newExerciseSets.map(s => ({weight: parseFloat(s.weight), reps: parseInt(s.reps, 10)})).filter(s => s.weight > 0 && s.reps > 0)
    }]);
    setNewExerciseName("");
    setNewExerciseSets([{weight: "", reps: ""}]);
    setShowAddExercise(false);
  };
  const handleRemoveExercise = (idx: number) => {
    setWorkoutExercises(workoutExercises.filter((_, i) => i !== idx));
  };

  // 3. Finalizar treino e salvar nota
  const handleFinishWorkout = () => {
    if (workoutExercises.length === 0) {
      Alert.alert("Adicione pelo menos um exercício antes de finalizar o treino.");
      return;
    }
    const exercisesObj: DailyNote["exercises"] = {};
    workoutExercises.forEach(ex => {
      exercisesObj[ex.name] = {
        sets: ex.sets.map((s, idx) => ({
          id: `${Date.now()}-${ex.name}-${idx}`,
          weight: s.weight,
          reps: s.reps,
          unit: "kg"
        })),
        bestSetId: undefined
      };
    });
    const noteData: Omit<DailyNote, "id"> = {
      date: format(new Date(), "yyyy-MM-dd"),
      bodyWeight: workoutBodyWeight ? parseFloat(workoutBodyWeight) : undefined,
      exercises: exercisesObj,
      startTime: workoutStartTime || undefined,
      endTime: new Date().toISOString(),
      duration: workoutDuration > 0 ? workoutDuration : undefined,
    };
    const newNote: DailyNote = {
      ...noteData,
      id: Date.now().toString(),
    };
    setNotes([newNote, ...notes]);
    setIsWorkoutActive(false);
    setWorkoutStartTime(null);
    setWorkoutEndTime(null);
    setWorkoutDuration(0);
    setWorkoutExercises([]);
    setWorkoutBodyWeight("");
  };

  if (isLoading) {
    return (
      <View style={styles.screenContainer}>
        <Text>Loading data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.screenContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      enabled={true}
    >
      <View style={styles.screenContainer}>
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyListText}>No notes yet. Add your first workout!</Text>}
          extraData={notes}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: darkCharcoal, // Dark background
  },
  createButton: {
    backgroundColor: primaryOrange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8, // Slightly less rounded, more blocky
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  createButtonText: {
    color: textPrimary,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    textTransform: "uppercase",
  },
  noteItemContainer: {
    backgroundColor: mediumGray, // Cards on dark background
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: primaryOrange, // Orange accent
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  noteDate: {
    fontSize: 18,
    fontWeight: "bold",
    color: textPrimary,
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 5,
    marginLeft: 10,
  },
  bodyWeightText: {
    fontSize: 15,
    color: textSecondary,
    marginBottom: 8,
    fontStyle: "italic",
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 25 : 25,
    backgroundColor: darkCharcoal, // Modal background same as screen
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 25,
    textAlign: "center",
    color: primaryOrange,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: mediumGray,
    borderWidth: 1,
    borderColor: lightGray,
    padding: 14, // Increased padding
    borderRadius: 6,
    fontSize: 16,
    marginBottom: 18,
    color: textPrimary,
  },
  inputSmall: {
    backgroundColor: mediumGray,
    borderWidth: 1,
    borderColor: lightGray,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 6,
    fontSize: 15,
    marginHorizontal: 3,
    flex: 1,
    textAlign: "center",
    color: textPrimary,
  },
  subHeader: {
    fontSize: 20, // Larger subheaders
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 12,
    color: primaryOrange,
    borderBottomWidth: 1,
    borderBottomColor: lightGray,
    paddingBottom: 5,
  },
  addExerciseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    zIndex: 1,
  },
  exerciseInputContainer: {
    flex: 1,
    position: "relative",
    marginRight: 10,
    zIndex: 1000,
  },
  inputFlex: {
    backgroundColor: mediumGray,
    borderWidth: 1,
    borderColor: lightGray,
    padding: 14,
    borderRadius: 6,
    fontSize: 16,
    color: textPrimary,
  },
  suggestionsList: {
    maxHeight: 150,
    borderColor: lightGray,
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: mediumGray, // Match input background
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 58, // Adjust based on inputFlex height + padding
    left: 0,
    right: 0,
    zIndex: 2000,
    elevation: Platform.OS === "android" ? 5 : 0,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightGray,
  },
  suggestionItemText: {
    // Added for suggestion text
    color: textPrimary,
    fontSize: 15,
  },
  addExerciseButton: {
    padding: 8, // Slightly larger touch target
    alignSelf: "center",
    marginTop: 8,
    backgroundColor: primaryOrange, // Button has background now
    borderRadius: 6,
  },
  exerciseEntryContainer: {
    marginBottom: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: lightGray,
    borderRadius: 8,
    backgroundColor: "transparent", // No extra bg, rely on modal bg
  },
  exerciseNameText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: accentColor, // Use accent for exercise names
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 5,
    backgroundColor: lightGray, // Sets have a subtle background
    borderRadius: 4,
  },
  bestSetRow: {
    backgroundColor: primaryOrange, // Best set highlighted strongly
    borderColor: accentColor,
    borderWidth: 1,
  },
  weightUnitSelector: {
    flexDirection: "row",
    borderColor: primaryOrange,
    borderWidth: 1,
    borderRadius: 6,
    marginRight: 5,
    overflow: "hidden",
  },
  unitButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  unitButtonActive: {
    backgroundColor: primaryOrange,
  },
  unitButtonText: {
    color: textSecondary, // Off-state text lighter
    fontSize: 14,
    fontWeight: "bold",
  },
  unitButtonTextActive: {
    color: textPrimary,
  },
  bestSetButton: {
    paddingHorizontal: 8,
  },
  deleteSetButton: {
    paddingHorizontal: 8,
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "transparent", // Make it look like a text button with icon
    borderRadius: 5,
    justifyContent: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: primaryOrange,
  },
  addSetButtonText: {
    marginLeft: 8,
    color: primaryOrange,
    fontWeight: "bold",
    fontSize: 15,
  },
  modalButtonContainer: {
    marginTop: 25,
    marginBottom: 40,
  },
  // For the main save/update and cancel buttons in modal, we will use TouchableOpacity for custom styling
  // The <Button> component is hard to style extensively. I will modify the JSX to use TouchableOpacity.
  styledModalButton: {
    backgroundColor: primaryOrange,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  styledModalButtonText: {
    color: textPrimary,
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  styledModalCancelButton: {
    backgroundColor: mediumGray, // Different color for cancel
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  emptyListText: {
    textAlign: "center",
    marginTop: 60,
    fontSize: 16,
    color: textSecondary,
  },
  exerciseLogContainer: {
    marginLeft: 10,
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: lightGray,
  },
  exerciseLogName: {
    fontSize: 17,
    fontWeight: "600",
    color: textPrimary,
  },
  setLogText: {
    marginLeft: 15,
    fontSize: 14,
    color: textSecondary,
    lineHeight: 20,
  },
  bestSetLogText: {
    fontWeight: "bold",
    color: accentColor, // Best log text stands out
  },
  // Placeholder text color for inputs
  // This needs to be applied via placeholderTextColor prop in TextInput components
});

export default NotesScreen;
