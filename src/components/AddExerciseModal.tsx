import React, { useState } from "react";
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { muscleWikiService, AVAILABLE_MUSCLES, AVAILABLE_EQUIPMENT, AVAILABLE_DIFFICULTIES } from "../services/muscleWikiService";

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onExerciseAdded: () => void;
}

export default function AddExerciseModal({ visible, onClose, onExerciseAdded }: AddExerciseModalProps) {
  const [name, setName] = useState("");
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [instructions, setInstructions] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setSelectedMuscles([]);
    setEquipment("");
    setDifficulty("");
    setInstructions("");
    setCategory("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleMuscle = (muscle: string) => {
    setSelectedMuscles((prev) => (prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Erro", "Nome do exercício é obrigatório");
      return;
    }

    if (selectedMuscles.length === 0) {
      Alert.alert("Erro", "Selecione pelo menos um músculo");
      return;
    }

    if (!category.trim()) {
      Alert.alert("Erro", "Categoria é obrigatória");
      return;
    }

    setLoading(true);
    try {
      await muscleWikiService.addCustomExercise({
        name: name.trim(),
        category: category.trim(),
        muscles: selectedMuscles,
        equipment: equipment || "Peso Corporal",
        difficulty: difficulty || "Iniciante",
        instructions: instructions.trim() || "Instruções não fornecidas.",
      });

      Alert.alert("Sucesso", "Exercício adicionado com sucesso!");
      resetForm();
      onExerciseAdded();
      onClose();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível adicionar o exercício");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Adicionar Exercício</Text>
            <TouchableOpacity onPress={handleSave} style={[styles.saveButton, loading && styles.saveButtonDisabled]} disabled={loading}>
              <Text style={styles.saveButtonText}>{loading ? "Salvando..." : "Salvar"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 50 }}
          >
            <View style={styles.section}>
              <Text style={styles.label}>Nome do Exercício *</Text>
              <TextInput 
                style={styles.input} 
                value={name} 
                onChangeText={setName} 
                placeholder="Ex: Flexão personalizada" 
                placeholderTextColor="#999" 
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Categoria *</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="Ex: Peito, Pernas, Braços..."
                placeholderTextColor="#999"
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Músculos Trabalhados *</Text>
              <View style={styles.muscleGrid}>
                {AVAILABLE_MUSCLES.map((muscle) => (
                  <TouchableOpacity
                    key={muscle}
                    style={[styles.muscleChip, selectedMuscles.includes(muscle) && styles.muscleChipSelected]}
                    onPress={() => toggleMuscle(muscle)}
                  >
                    <Text style={[styles.muscleChipText, selectedMuscles.includes(muscle) && styles.muscleChipTextSelected]}>{muscle}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Equipamento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {AVAILABLE_EQUIPMENT.map((eq) => (
                  <TouchableOpacity
                    key={eq}
                    style={[styles.optionChip, equipment === eq && styles.optionChipSelected]}
                    onPress={() => setEquipment(equipment === eq ? "" : eq)}
                  >
                    <Text style={[styles.optionChipText, equipment === eq && styles.optionChipTextSelected]}>{eq}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Dificuldade</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {AVAILABLE_DIFFICULTIES.map((diff) => (
                  <TouchableOpacity
                    key={diff}
                    style={[styles.optionChip, difficulty === diff && styles.optionChipSelected]}
                    onPress={() => setDifficulty(difficulty === diff ? "" : diff)}
                  >
                    <Text style={[styles.optionChipText, difficulty === diff && styles.optionChipTextSelected]}>{diff}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Instruções</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Descreva como executar o exercício..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit={true}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 100,
  },
  muscleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  muscleChip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  muscleChipSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  muscleChipText: {
    fontSize: 14,
    color: "#333",
  },
  muscleChipTextSelected: {
    color: "#fff",
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  optionChip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  optionChipSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  optionChipText: {
    fontSize: 14,
    color: "#333",
  },
  optionChipTextSelected: {
    color: "#fff",
  },
});
