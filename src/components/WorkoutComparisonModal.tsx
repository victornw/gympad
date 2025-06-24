import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { comparisonService, WorkoutComparison, ExerciseComparison } from "../services/comparisonService";
import { format, parseISO } from "date-fns";

const primaryOrange = "#FF6F00";
const accentColor = "#FFAB00";
const textPrimary = "#FFFFFF";
const darkCharcoal = "#1A1A1A";
const mediumGray = "#333333";
const textSecondary = "#B0BEC5";
const lightGray = "#4D4D4D";

interface WorkoutComparisonModalProps {
  visible: boolean;
  onClose: () => void;
  exercises: string[];
}

const WorkoutComparisonModal: React.FC<WorkoutComparisonModalProps> = ({
  visible,
  onClose,
  exercises
}) => {
  const [comparison, setComparison] = useState<WorkoutComparison | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && exercises.length > 0) {
      loadComparison();
    }
  }, [visible, exercises]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      await comparisonService.initialize();
      const workoutComparison = await comparisonService.compareWorkout(exercises);
      setComparison(workoutComparison);
    } catch (error) {
      console.error("Erro ao carregar comparação do treino:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return { name: "trending-up", color: "#4CAF50" };
      case "declining":
        return { name: "trending-down", color: "#F44336" };
      case "stable":
        return { name: "trending-neutral", color: textSecondary };
      case "new_exercise":
        return { name: "star-circle", color: accentColor };
      default:
        return { name: "help-circle", color: textSecondary };
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case "improving":
        return "Melhorando";
      case "declining":
        return "Declinando";
      case "stable":
        return "Estável";
      case "new_exercise":
        return "Novo";
      default:
        return "N/A";
    }
  };

  const renderExerciseComparison = (exercise: ExerciseComparison) => {
    const trendIcon = getTrendIcon(exercise.trend);

    return (
      <View key={exercise.exerciseName} style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          <View style={styles.trendContainer}>
            <MaterialCommunityIcons 
              name={trendIcon.name as any} 
              size={16} 
              color={trendIcon.color} 
            />
            <Text style={[styles.trendText, { color: trendIcon.color }]}>
              {getTrendText(exercise.trend)}
            </Text>
          </View>
        </View>

        {exercise.lastPerformance ? (
          <View style={styles.performanceContainer}>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Último treino:</Text>
              <Text style={styles.performanceValue}>
                {exercise.lastPerformance.bestSet?.weight || 0}kg × {exercise.lastPerformance.bestSet?.reps || 0}
              </Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Há {exercise.lastPerformance.daysAgo} dias</Text>
              <Text style={styles.performanceValue}>
                {exercise.lastPerformance.totalSets} série{exercise.lastPerformance.totalSets !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.newExerciseContainer}>
            <MaterialCommunityIcons name="star" size={16} color={accentColor} />
            <Text style={styles.newExerciseText}>Primeiro treino!</Text>
          </View>
        )}

        {exercise.bestEverPerformance && (
          <View style={styles.recordContainer}>
            <MaterialCommunityIcons name="trophy" size={14} color={accentColor} />
            <Text style={styles.recordText}>
              Recorde: {exercise.bestEverPerformance.bestSet.weight || 0}kg × {exercise.bestEverPerformance.bestSet.reps}
            </Text>
          </View>
        )}

        <View style={styles.suggestionContainer}>
          <View style={styles.suggestionRow}>
            <Text style={styles.arrowLarge}>
              {exercise.suggestions.progressionTip}
            </Text>
            <Text style={styles.suggestionTextLarge}>
              {exercise.suggestions.motivationalMessage}
            </Text>
          </View>
          
          {exercise.suggestions.suggestedWeight && exercise.suggestions.suggestedReps && (
            <View style={styles.suggestedValues}>
              <Text style={styles.suggestedText}>
                {exercise.suggestions.suggestedWeight}kg × {exercise.suggestions.suggestedReps}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Comparação do Treino</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={textPrimary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryOrange} />
            <Text style={styles.loadingText}>Analisando seu histórico...</Text>
          </View>
        ) : comparison ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Estatísticas gerais */}
            <View style={styles.overallSection}>
              <Text style={styles.sectionTitle}>📊 Resumo Geral</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{comparison.overallStats.daysRest}</Text>
                  <Text style={styles.statLabel}>Dias de descanso</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{comparison.overallStats.averageRestDays}</Text>
                  <Text style={styles.statLabel}>Média de descanso</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={[
                    styles.statValue,
                    { color: comparison.overallStats.totalVolumeComparison > 0 ? "#4CAF50" : 
                             comparison.overallStats.totalVolumeComparison < 0 ? "#F44336" : 
                             textPrimary }
                  ]}>
                    {comparison.overallStats.totalVolumeComparison > 0 ? '+' : ''}
                    {comparison.overallStats.totalVolumeComparison.toFixed(1)}%
                  </Text>
                  <Text style={styles.statLabel}>Volume vs último</Text>
                </View>
              </View>

              <View style={styles.suggestionCard}>
                <Text style={styles.overallSuggestion}>
                  {comparison.overallStats.suggestionMessage}
                </Text>
              </View>
            </View>

            {/* Comparações por exercício */}
            <View style={styles.exercisesSection}>
              <Text style={styles.sectionTitle}>🏋️‍♂️ Por Exercício</Text>
              {comparison.exercises.map(renderExerciseComparison)}
            </View>

            {/* Legenda das setas */}
            <View style={styles.tipsSection}>
              <Text style={styles.sectionTitle}>Legenda</Text>
              <View style={styles.tipCard}>
                <Text style={styles.legendItem}>↗️ Progredir (aumentar)</Text>
                <Text style={styles.legendItem}>→ Manter</Text>
                <Text style={styles.legendItem}>↘️ Reduzir</Text>
              </View>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="database-off" size={48} color={textSecondary} />
            <Text style={styles.emptyText}>Nenhum histórico encontrado</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkCharcoal
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: mediumGray
  },
  title: {
    color: textPrimary,
    fontSize: 20,
    fontWeight: 'bold'
  },
  closeButton: {
    padding: 4
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: textSecondary,
    fontSize: 16,
    marginTop: 16
  },
  content: {
    flex: 1,
    padding: 20
  },
  overallSection: {
    marginBottom: 24
  },
  sectionTitle: {
    color: accentColor,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  statCard: {
    backgroundColor: mediumGray,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4
  },
  statValue: {
    color: textPrimary,
    fontSize: 24,
    fontWeight: 'bold'
  },
  statLabel: {
    color: textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4
  },
  suggestionCard: {
    backgroundColor: lightGray,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: primaryOrange
  },
  overallSuggestion: {
    color: textPrimary,
    fontSize: 14,
    lineHeight: 20
  },
  exercisesSection: {
    marginBottom: 24
  },
  exerciseCard: {
    backgroundColor: mediumGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  exerciseName: {
    color: textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  performanceContainer: {
    marginBottom: 12
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  performanceLabel: {
    color: textSecondary,
    fontSize: 14
  },
  performanceValue: {
    color: textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  newExerciseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  newExerciseText: {
    color: accentColor,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  recordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: lightGray
  },
  recordText: {
    color: accentColor,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  suggestionContainer: {
    backgroundColor: lightGray,
    padding: 12,
    borderRadius: 8
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  arrowLarge: {
    fontSize: 20,
    marginRight: 8
  },
  suggestionTextLarge: {
    color: textPrimary,
    fontSize: 13,
    fontWeight: '600'
  },
  suggestedValues: {
    backgroundColor: darkCharcoal,
    padding: 8,
    borderRadius: 4
  },
  suggestedText: {
    color: primaryOrange,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  tipsSection: {
    marginBottom: 24
  },
  tipCard: {
    backgroundColor: mediumGray,
    padding: 16,
    borderRadius: 8
  },
  legendItem: {
    color: textPrimary,
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    color: textSecondary,
    fontSize: 16,
    marginTop: 16
  }
});

export default WorkoutComparisonModal; 