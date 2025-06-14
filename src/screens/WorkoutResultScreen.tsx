import React from "react";
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";

const primaryOrange = "#FF6F00";
const accentColor = "#FFAB00";
const textPrimary = "#FFFFFF";
const darkCharcoal = "#1A1A1A";
const mediumGray = "#333333";
const textSecondary = "#B0BEC5";

const WorkoutResultScreen = ({ navigation, route }: any) => {
  // Receber dados reais do treino
  const metrics = route?.params?.metrics || {
    duration: "-",
    calories: 0,
    validSets: 0,
    tonnage: 0,
    exercises: [],
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: darkCharcoal }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 26, fontWeight: 'bold', color: accentColor, marginBottom: 8 }}>Treino Finalizado!</Text>
          <Text style={{ color: textSecondary, fontSize: 16 }}>Confira seu desempenho:</Text>
        </View>
        <View style={{ backgroundColor: mediumGray, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <Text style={{ color: textPrimary, fontSize: 18, fontWeight: 'bold' }}>Duração: <Text style={{ color: accentColor }}>{metrics.duration}</Text></Text>
          <Text style={{ color: textPrimary, fontSize: 18, fontWeight: 'bold' }}>Calorias: <Text style={{ color: accentColor }}>{metrics.calories} kcal</Text></Text>
          <Text style={{ color: textPrimary, fontSize: 18, fontWeight: 'bold' }}>Séries válidas: <Text style={{ color: accentColor }}>{metrics.validSets}</Text></Text>
          <Text style={{ color: textPrimary, fontSize: 18, fontWeight: 'bold' }}>Tonelagem: <Text style={{ color: accentColor }}>{(metrics.tonnage/1000).toFixed(2)} ton</Text></Text>
        </View>
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: accentColor, fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Exercícios Realizados</Text>
          {metrics.exercises && metrics.exercises.length > 0 ? metrics.exercises.map((ex: any, idx: number) => (
            <View key={idx} style={{ marginBottom: 8, backgroundColor: mediumGray, borderRadius: 8, padding: 10 }}>
              <Text style={{ color: accentColor, fontWeight: 'bold' }}>{ex.name}</Text>
              {ex.sets && ex.sets.length > 0 && ex.sets.map((set: any, sidx: number) => (
                <Text key={sidx} style={{ color: textPrimary, fontSize: 15, marginLeft: 8 }}>{`Série ${sidx + 1}: ${set.weight} kg x ${set.reps} reps`}</Text>
              ))}
            </View>
          )) : (
            <Text style={{ color: textSecondary }}>Nenhum exercício registrado.</Text>
          )}
        </View>
        <TouchableOpacity style={{ backgroundColor: primaryOrange, borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 16 }} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'WorkoutMain' }] })}>
          <Text style={{ color: textPrimary, fontWeight: 'bold', fontSize: 16 }}>Voltar para Treino</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default WorkoutResultScreen; 