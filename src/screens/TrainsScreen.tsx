import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, ScrollView, Alert, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TrainRoutine, RoutineDay, RoutineExercise } from "../types";
import { Picker } from "@react-native-picker/picker";

const TRAINS_STORAGE_KEY = "@GymPad:trainRoutines";

// Color Palette (consistent with other screens)
const primaryOrange = "#FF6F00";
const darkCharcoal = "#1A1A1A";
const mediumGray = "#333333";
const lightGray = "#4D4D4D";
const textPrimary = "#FFFFFF";
const textSecondary = "#B0BEC5";
const accentColor = "#FFAB00";

const TrainsScreen = () => {
  const [routines, setRoutines] = useState<TrainRoutine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1: select days, 2: routine details
  const [editingRoutine, setEditingRoutine] = useState<TrainRoutine | null>(null);
  const [routineName, setRoutineName] = useState("");
  const [numberOfDays, setNumberOfDays] = useState("1");
  const [currentDays, setCurrentDays] = useState<RoutineDay[]>([]);

  useEffect(() => {
    const loadRoutines = async () => {
      setIsLoading(true);
      try {
        const storedRoutines = await AsyncStorage.getItem(TRAINS_STORAGE_KEY);
        if (storedRoutines) setRoutines(JSON.parse(storedRoutines));
        else setRoutines([]);
      } catch (e) {
        setRoutines([]);
      }
      setIsLoading(false);
    };
    loadRoutines();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(TRAINS_STORAGE_KEY, JSON.stringify(routines)).catch(() => {});
    }
  }, [routines, isLoading]);

  const resetForm = () => {
    setEditingRoutine(null);
    setRoutineName("");
    setNumberOfDays("1");
    setCurrentDays([]);
    setModalStep(1);
  };

  const openModalForNew = () => {
    resetForm();
    setModalVisible(true);
  };

  const openModalForEdit = (routine: TrainRoutine) => {
    setEditingRoutine(routine);
    setRoutineName(routine.name);
    setNumberOfDays(String(routine.numberOfDays));
    setCurrentDays(JSON.parse(JSON.stringify(routine.days)));
    setModalStep(2);
    setModalVisible(true);
  };

  const handleProceedToStep2 = () => {
    const daysArray: RoutineDay[] = Array.from({ length: Number(numberOfDays) }, (_, i) => ({ dayName: `Day ${i + 1}`, exercises: [] }));
    setCurrentDays(daysArray);
    setModalStep(2);
  };

  const handleSaveRoutine = () => {
    if (!routineName.trim()) {
      Alert.alert("Missing Name", "Please enter a name for the routine.");
      return;
    }
    if (currentDays.length === 0) {
      Alert.alert("No Days", "Please add at least one day to the routine.");
      return;
    }
    const newRoutine: TrainRoutine = {
      id: editingRoutine ? editingRoutine.id : Date.now().toString(),
      name: routineName.trim(),
      numberOfDays: Number(numberOfDays),
      days: currentDays,
    };
    if (editingRoutine) {
      setRoutines((prev) => prev.map((r) => (r.id === editingRoutine.id ? newRoutine : r)));
    } else {
      setRoutines((prev) => [...prev, newRoutine]);
    }
    setModalVisible(false);
    resetForm();
  };

  // --- Exercise and Day Editing ---
  const updateDayName = (dayIndex: number, name: string) => {
    setCurrentDays((prev) => {
      const newDays = [...prev];
      newDays[dayIndex].dayName = name;
      return newDays;
    });
  };
  const addExerciseToDay = (dayIndex: number) => {
    setCurrentDays((prev) => {
      const newDays = [...prev];
      newDays[dayIndex].exercises.push({ name: "", sets: 3, reps: "8" });
      return newDays;
    });
  };
  const updateExerciseDetail = (dayIndex: number, exerciseIndex: number, field: keyof RoutineExercise, value: string | number) => {
    setCurrentDays((prev) => {
      const newDays = [...prev];
      const exercise = newDays[dayIndex].exercises[exerciseIndex];
      if (field === "sets" || field === "reps") {
        (exercise as any)[field] = Number(value) || 0;
      } else {
        (exercise as any)[field] = value;
      }
      return newDays;
    });
  };
  const removeExerciseFromDay = (dayIndex: number, exerciseIndex: number) => {
    setCurrentDays((prev) => {
      const newDays = [...prev];
      newDays[dayIndex].exercises.splice(exerciseIndex, 1);
      return newDays;
    });
  };

  const deleteRoutine = (routineId: string) => {
    Alert.alert(
      "Delete Routine",
      "Are you sure you want to delete this routine?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setRoutines((prev) => prev.filter((r) => r.id !== routineId));
          },
        },
      ],
      { cancelable: true }
    );
  };

  // --- Renderers ---
  const renderExerciseInput = (dayIndex: number, exercise: RoutineExercise, exerciseIndex: number) => (
    <View key={exerciseIndex} style={styles.exerciseInputRow}>
      <TextInput
        placeholder="Exercise Name"
        placeholderTextColor={textSecondary}
        value={exercise.name}
        onChangeText={(val) => updateExerciseDetail(dayIndex, exerciseIndex, "name", val)}
        style={[styles.input, { flex: 2, marginRight: 5 }]}
      />
      <TextInput
        placeholder="Sets"
        placeholderTextColor={textSecondary}
        value={exercise.sets.toString()}
        keyboardType="numeric"
        onChangeText={(val) => updateExerciseDetail(dayIndex, exerciseIndex, "sets", val)}
        style={[styles.input, { flex: 1, marginRight: 5 }]}
      />
      <TextInput
        placeholder="Reps"
        placeholderTextColor={textSecondary}
        value={exercise.reps.toString()}
        keyboardType="numeric"
        onChangeText={(val) => updateExerciseDetail(dayIndex, exerciseIndex, "reps", val)}
        style={[styles.input, { flex: 1, marginRight: 5 }]}
      />
      <TouchableOpacity onPress={() => removeExerciseFromDay(dayIndex, exerciseIndex)} style={styles.removeButton}>
        <MaterialCommunityIcons name="minus-circle-outline" size={24} color={primaryOrange} />
      </TouchableOpacity>
    </View>
  );

  const renderDayForm = (day: RoutineDay, dayIndex: number) => (
    <View key={dayIndex} style={styles.dayContainer}>
      <TextInput
        placeholder={`Day ${dayIndex + 1} Name (e.g. Push, Upper)}`}
        placeholderTextColor={textSecondary}
        value={day.dayName || ""}
        onChangeText={(val) => updateDayName(dayIndex, val)}
        style={styles.dayNameInput}
      />
      {day.exercises.map((ex, exIndex) => renderExerciseInput(dayIndex, ex, exIndex))}
      <TouchableOpacity style={styles.addExerciseButton} onPress={() => addExerciseToDay(dayIndex)}>
        <MaterialCommunityIcons name="plus" size={20} color={primaryOrange} />
        <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRoutineItem = ({ item }: { item: TrainRoutine }) => (
    <View style={styles.listItemContainer}>
      <TouchableOpacity onPress={() => openModalForEdit(item)} style={{ flex: 1 }}>
        <View style={styles.routineInfoContainer}>
          <Text style={styles.listItemText}>{item.name}</Text>
          {item.days.map((day, idx) => (
            <Text key={idx} style={styles.listItemSubText}>
              {day.dayName || `Day ${idx + 1}`}: {day.exercises.length} exercise{day.exercises.length !== 1 ? "s" : ""}
            </Text>
          ))}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => deleteRoutine(item.id)} style={styles.deleteRoutineButton}>
        <MaterialCommunityIcons name="trash-can-outline" size={26} color={primaryOrange} />
      </TouchableOpacity>
      <MaterialCommunityIcons name="chevron-right" size={28} color={primaryOrange} />
    </View>
  );

  if (isLoading)
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.emptyListText}>Loading routines...</Text>
      </View>
    );

  return (
    <View style={styles.screenContainer}>
      <TouchableOpacity style={styles.createButton} onPress={openModalForNew}>
        <MaterialCommunityIcons name="plus-circle" size={28} color={textPrimary} />
        <Text style={styles.createButtonText}>Add New Routine</Text>
      </TouchableOpacity>
      <FlatList
        data={routines.sort((a, b) => a.name.localeCompare(b.name))}
        renderItem={renderRoutineItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyListText}>No routines yet. Create your first one!</Text>}
      />
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <ScrollView style={styles.modalContainer} keyboardShouldPersistTaps="handled">
          {modalStep === 1 && (
            <View>
              <Text style={styles.modalTitle}>Select Number of Training Days</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={numberOfDays}
                  onValueChange={(itemValue) => setNumberOfDays(String(itemValue))}
                  style={styles.picker}
                  dropdownIconColor={textPrimary}
                >
                  {["1", "2", "3", "4", "5", "6", "7"].map((d) => (
                    <Picker.Item key={d} label={`${d} Day${d !== "1" ? "s" : ""}`} value={d} color={textPrimary} />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity style={styles.styledModalButton} onPress={handleProceedToStep2}>
                <Text style={styles.styledModalButtonText}>Next</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.styledModalCancelButton}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.styledModalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          {modalStep === 2 && (
            <View>
              <Text style={styles.modalTitle}>{editingRoutine ? "Edit Routine" : "Create New Routine"}</Text>
              <TextInput
                placeholder="Routine Name"
                placeholderTextColor={textSecondary}
                style={styles.input}
                value={routineName}
                onChangeText={setRoutineName}
              />
              {currentDays.map(renderDayForm)}
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity style={styles.styledModalButton} onPress={handleSaveRoutine}>
                  <Text style={styles.styledModalButtonText}>{editingRoutine ? "Update Routine" : "Save Routine"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.styledModalCancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.styledModalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: darkCharcoal,
  },
  createButton: {
    backgroundColor: primaryOrange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
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
  listItemContainer: {
    backgroundColor: mediumGray,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 5,
    borderLeftColor: primaryOrange,
  },
  routineInfoContainer: {
    flex: 1,
  },
  listItemText: {
    color: textPrimary,
    fontSize: 18,
    fontWeight: "bold",
  },
  listItemSubText: {
    color: textSecondary,
    fontSize: 14,
    marginTop: 3,
  },
  emptyListText: {
    textAlign: "center",
    marginTop: 60,
    fontSize: 16,
    color: textSecondary,
    fontStyle: "italic",
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 25 : 25,
    backgroundColor: darkCharcoal,
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
    padding: 14,
    borderRadius: 6,
    fontSize: 16,
    marginBottom: 15,
    color: textPrimary,
  },
  dayContainer: {
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: lightGray,
    borderRadius: 10,
    backgroundColor: mediumGray,
  },
  dayNameInput: {
    fontSize: 16,
    fontWeight: "bold",
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: lightGray,
    borderRadius: 6,
    backgroundColor: darkCharcoal,
    color: textPrimary,
  },
  exerciseInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "transparent",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: primaryOrange,
    marginTop: 5,
  },
  addExerciseButtonText: {
    marginLeft: 8,
    color: primaryOrange,
    fontWeight: "bold",
    fontSize: 16,
  },
  removeButton: {
    padding: 5,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: lightGray,
    borderRadius: 8,
    marginBottom: 20,
    overflow: "hidden",
    backgroundColor: mediumGray,
  },
  picker: {
    height: 50,
    color: textPrimary,
  },
  modalButtonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
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
    backgroundColor: mediumGray,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteRoutineButton: {
    padding: 8,
    marginLeft: 8,
    alignSelf: "center",
  },
});

export default TrainsScreen;
