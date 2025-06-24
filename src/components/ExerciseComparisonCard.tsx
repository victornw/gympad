import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { comparisonService } from "../services/comparisonService";
import { format, parseISO } from "date-fns";

const primaryOrange = "#FF6F00";
const accentColor = "#FFAB00";
const textPrimary = "#FFFFFF";
const darkCharcoal = "#1A1A1A";
const mediumGray = "#333333";
const textSecondary = "#B0BEC5";
const lightGray = "#4D4D4D";

interface ExerciseComparisonCardProps {
  exerciseName: string;
  onSuggestionApply?: (weight: number, reps: number) => void;
}

const ExerciseComparisonCard: React.FC<ExerciseComparisonCardProps> = ({
  exerciseName,
  onSuggestionApply
}) => {
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadComparison();
  }, [exerciseName]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      const quickComparison = await comparisonService.getQuickComparison(exerciseName);
      setComparison(quickComparison);
    } catch (error) {
      console.error("Erro ao carregar comparação:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "improving":
        return { name: "trending-up", color: "#4CAF50" };
      case "declining":
        return { name: "trending-down", color: "#F44336" };
      case "stable":
        return { name: "trending-neutral", color: textSecondary };
      default:
        return { name: "star-circle", color: accentColor };
    }
  };

  const handleApplySuggestion = () => {
    if (comparison && comparison.lastWeight && comparison.lastReps && onSuggestionApply) {
      onSuggestionApply(comparison.lastWeight, comparison.lastReps);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="loading" size={16} color={textSecondary} />
        <Text style={styles.loadingText}>Comparando...</Text>
      </View>
    );
  }

  if (!comparison) return null;

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.header}
          onPress={() => setShowDetails(true)}
        >
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons 
              name="history" 
              size={16} 
              color={primaryOrange} 
            />
            <Text style={styles.headerText}>Último treino</Text>
          </View>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={16} 
            color={textSecondary} 
          />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.comparisonRow}>
            {comparison.lastWeight && comparison.lastReps ? (
              <View style={styles.lastPerformance}>
                <Text style={styles.lastPerfText}>
                  {comparison.lastWeight}kg × {comparison.lastReps}
                </Text>
                <Text style={styles.daysAgoText}>
                  {comparison.daysAgo}d atrás
                </Text>
              </View>
            ) : (
              <Text style={styles.newExerciseText}>Novo</Text>
            )}

            <View style={styles.suggestionContainer}>
              <Text style={styles.arrowText}>
                {comparison.arrow}
              </Text>
              <Text style={styles.suggestionText}>
                {comparison.suggestion}
              </Text>
            </View>
          </View>

          {comparison.lastWeight && comparison.lastReps && (
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={handleApplySuggestion}
            >
              <MaterialCommunityIcons 
                name="arrow-down-circle" 
                size={12} 
                color={primaryOrange} 
              />
              <Text style={styles.applyButtonText}>Usar anterior</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal com detalhes completos */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Histórico - {exerciseName}</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <MaterialCommunityIcons name="close" size={24} color={textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>📊 Última Performance</Text>
              {comparison.lastWeight && comparison.lastReps ? (
                <>
                  <Text style={styles.detailText}>
                    Peso: {comparison.lastWeight}kg
                  </Text>
                  <Text style={styles.detailText}>
                    Repetições: {comparison.lastReps}
                  </Text>
                  <Text style={styles.detailText}>
                    Há {comparison.daysAgo} dia{comparison.daysAgo !== 1 ? 's' : ''}
                  </Text>
                </>
              ) : (
                <Text style={styles.detailText}>Primeiro treino com este exercício</Text>
              )}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>💡 Sugestão</Text>
              <Text style={styles.suggestionDetailText}>
                {comparison.suggestion}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>🎯 Dicas</Text>
              <Text style={styles.tipText}>
                • Aumente gradualmente o peso (2.5kg por vez)
                {"\n"}• Mantenha a forma correta sempre
                {"\n"}• Descanse adequadamente entre treinos
                {"\n"}• Escute seu corpo
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: lightGray,
    borderRadius: 8,
    marginVertical: 4,
    overflow: 'hidden'
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: lightGray,
    borderRadius: 8,
    marginVertical: 4
  },
  loadingText: {
    color: textSecondary,
    fontSize: 12,
    marginLeft: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: mediumGray
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerText: {
    color: textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  content: {
    padding: 12
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  lastPerformance: {
    flex: 1
  },
  lastPerfText: {
    color: textPrimary,
    fontSize: 14,
    fontWeight: 'bold'
  },
  daysAgoText: {
    color: textSecondary,
    fontSize: 11
  },
  newExerciseText: {
    color: accentColor,
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },
  suggestionContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  arrowText: {
    fontSize: 18,
    marginBottom: 2
  },
  suggestionText: {
    color: textSecondary,
    fontSize: 11,
    textAlign: 'center'
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: darkCharcoal,
    borderRadius: 6
  },
  applyButtonText: {
    color: primaryOrange,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4
  },
  modalContainer: {
    flex: 1,
    backgroundColor: darkCharcoal
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: mediumGray
  },
  modalTitle: {
    color: textPrimary,
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalContent: {
    flex: 1,
    padding: 20
  },
  detailSection: {
    marginBottom: 24
  },
  detailTitle: {
    color: accentColor,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  detailText: {
    color: textPrimary,
    fontSize: 14,
    marginBottom: 4
  },
  suggestionDetailText: {
    color: textPrimary,
    fontSize: 14,
    fontStyle: 'italic'
  },
  tipText: {
    color: textSecondary,
    fontSize: 14,
    lineHeight: 20
  }
});

export default ExerciseComparisonCard; 