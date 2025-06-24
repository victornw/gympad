import AsyncStorage from "@react-native-async-storage/async-storage";
import { DailyNote, ExerciseSet } from "../types";
import { differenceInDays, parseISO, startOfDay, isSameDay } from "date-fns";

const NOTES_STORAGE_KEY = "@GymPad:notes";

export interface ExerciseComparison {
  exerciseName: string;
  currentPerformance?: {
    bestSet?: ExerciseSet;
    totalVolume: number;
    totalSets: number;
  };
  lastPerformance?: {
    date: string;
    daysAgo: number;
    bestSet?: ExerciseSet;
    totalVolume: number;
    totalSets: number;
  };
  bestEverPerformance?: {
    date: string;
    bestSet: ExerciseSet;
    totalVolume: number;
  };
  suggestions: {
    suggestedWeight?: number;
    suggestedReps?: number;
    progressionTip: string;
    motivationalMessage: string;
  };
  trend: "improving" | "declining" | "stable" | "new_exercise";
}

export interface WorkoutComparison {
  exercises: ExerciseComparison[];
  overallStats: {
    lastWorkoutDate?: string;
    daysRest: number;
    averageRestDays: number;
    totalVolumeComparison: number; // % change
    suggestionMessage: string;
  };
}

class ComparisonService {
  private notes: DailyNote[] = [];

  async initialize() {
    await this.loadNotes();
  }

  private async loadNotes() {
    try {
      const storedNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      if (storedNotes) {
        this.notes = JSON.parse(storedNotes)
          .sort((a: DailyNote, b: DailyNote) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    } catch (error) {
      console.error("Erro ao carregar notas para comparação:", error);
    }
  }

  async compareWorkout(currentExercises: string[]): Promise<WorkoutComparison> {
    await this.loadNotes(); // Refresh data

    const exerciseComparisons: ExerciseComparison[] = [];
    let totalCurrentVolume = 0;
    let totalLastVolume = 0;

    // Comparar cada exercício
    for (const exerciseName of currentExercises) {
      const comparison = await this.compareExercise(exerciseName);
      exerciseComparisons.push(comparison);
      
      if (comparison.currentPerformance) {
        totalCurrentVolume += comparison.currentPerformance.totalVolume;
      }
      if (comparison.lastPerformance) {
        totalLastVolume += comparison.lastPerformance.totalVolume;
      }
    }

    // Estatísticas gerais
    const lastWorkout = this.getLastWorkout();
    const daysRest = lastWorkout ? differenceInDays(new Date(), parseISO(lastWorkout.date)) : 0;
    const averageRestDays = this.calculateAverageRestDays();
    
    const volumeChange = totalLastVolume > 0 ? 
      ((totalCurrentVolume - totalLastVolume) / totalLastVolume) * 100 : 0;

    return {
      exercises: exerciseComparisons,
      overallStats: {
        lastWorkoutDate: lastWorkout?.date,
        daysRest,
        averageRestDays,
        totalVolumeComparison: volumeChange,
        suggestionMessage: this.generateOverallSuggestion(daysRest, averageRestDays, volumeChange)
      }
    };
  }

  private async compareExercise(exerciseName: string): Promise<ExerciseComparison> {
    const lastPerformance = this.getLastExercisePerformance(exerciseName);
    const bestEverPerformance = this.getBestExercisePerformance(exerciseName);
    const exerciseHistory = this.getExerciseHistory(exerciseName);

    const suggestions = this.generateSuggestions(exerciseName, lastPerformance, bestEverPerformance, exerciseHistory);
    const trend = this.calculateTrend(exerciseHistory);

    return {
      exerciseName,
      lastPerformance,
      bestEverPerformance,
      suggestions,
      trend
    };
  }

  private getLastExercisePerformance(exerciseName: string) {
    for (const note of this.notes) {
      if (note.exercises[exerciseName]) {
        const exerciseData = note.exercises[exerciseName];
        const bestSet = exerciseData.sets.find(s => s.isBestSet) || 
                       exerciseData.sets.reduce((best, current) => 
                         (current.weight || 0) * current.reps > (best.weight || 0) * best.reps ? current : best
                       );
        
        const totalVolume = exerciseData.sets.reduce((sum, set) => 
          sum + (set.weight || 0) * set.reps, 0
        );

        return {
          date: note.date,
          daysAgo: differenceInDays(new Date(), parseISO(note.date)),
          bestSet,
          totalVolume,
          totalSets: exerciseData.sets.length
        };
      }
    }
    return undefined;
  }

  private getBestExercisePerformance(exerciseName: string) {
    let bestPerformance: { date: string; bestSet: ExerciseSet; totalVolume: number } | undefined;

    for (const note of this.notes) {
      if (note.exercises[exerciseName]) {
        const exerciseData = note.exercises[exerciseName];
        const bestSet = exerciseData.sets.reduce((best, current) => 
          (current.weight || 0) * current.reps > (best.weight || 0) * best.reps ? current : best
        );
        
        const totalVolume = exerciseData.sets.reduce((sum, set) => 
          sum + (set.weight || 0) * set.reps, 0
        );

        if (!bestPerformance || 
            (bestSet.weight || 0) * bestSet.reps > (bestPerformance.bestSet.weight || 0) * bestPerformance.bestSet.reps) {
          bestPerformance = {
            date: note.date,
            bestSet,
            totalVolume
          };
        }
      }
    }

    return bestPerformance;
  }

  private getExerciseHistory(exerciseName: string, limit: number = 10) {
    const history: Array<{ date: string; bestSet: ExerciseSet; totalVolume: number }> = [];

    for (const note of this.notes.slice(0, limit)) {
      if (note.exercises[exerciseName]) {
        const exerciseData = note.exercises[exerciseName];
        const bestSet = exerciseData.sets.reduce((best, current) => 
          (current.weight || 0) * current.reps > (best.weight || 0) * best.reps ? current : best
        );
        
        const totalVolume = exerciseData.sets.reduce((sum, set) => 
          sum + (set.weight || 0) * set.reps, 0
        );

        history.push({ date: note.date, bestSet, totalVolume });
      }
    }

    return history.reverse(); // Ordem cronológica
  }

  private generateSuggestions(
    exerciseName: string, 
    lastPerformance: any, 
    bestEverPerformance: any, 
    history: any[]
  ) {
    let suggestedWeight = 0;
    let suggestedReps = 0;
    let progressionTip = "";
    let motivationalMessage = "";

    if (!lastPerformance) {
      // Novo exercício
      progressionTip = "↗️";
      motivationalMessage = "Novo exercício";
      suggestedWeight = 20;
      suggestedReps = 10;
    } else {
      const lastWeight = lastPerformance.bestSet.weight || 0;
      const lastReps = lastPerformance.bestSet.reps;
      const daysRest = lastPerformance.daysAgo;

      // Lógica de progressão baseada no descanso e histórico
      if (daysRest <= 2) {
        // Pouco descanso - manter ou reduzir levemente
        suggestedWeight = lastWeight;
        suggestedReps = Math.max(lastReps - 1, lastReps);
        progressionTip = "→";
        motivationalMessage = "Manter";
      } else if (daysRest <= 7) {
        // Descanso adequado - tentar progredir
        if (lastReps >= 12) {
          suggestedWeight = lastWeight + 2.5;
          suggestedReps = 8;
          progressionTip = "↗️";
        } else {
          suggestedWeight = lastWeight;
          suggestedReps = lastReps + 1;
          progressionTip = "↗️";
        }
        motivationalMessage = "Progredir";
      } else {
        // Muito descanso - ser conservador
        suggestedWeight = Math.max(lastWeight - 2.5, lastWeight * 0.9);
        suggestedReps = lastReps;
        progressionTip = "↘️";
        motivationalMessage = "Reduzir";
      }
    }

    return {
      suggestedWeight: Math.max(suggestedWeight, 0),
      suggestedReps: Math.max(suggestedReps, 1),
      progressionTip,
      motivationalMessage
    };
  }

  private calculateTrend(history: any[]): "improving" | "declining" | "stable" | "new_exercise" {
    if (history.length === 0) return "new_exercise";
    if (history.length === 1) return "stable";

    const recent = history.slice(-3); // Últimas 3 performances
    const older = history.slice(0, -3);

    if (older.length === 0) return "stable";

    const recentAvg = recent.reduce((sum, h) => sum + ((h.bestSet.weight || 0) * h.bestSet.reps), 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + ((h.bestSet.weight || 0) * h.bestSet.reps), 0) / older.length;

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (changePercent > 5) return "improving";
    if (changePercent < -5) return "declining";
    return "stable";
  }

  private getLastWorkout(): DailyNote | undefined {
    return this.notes.length > 0 ? this.notes[0] : undefined;
  }

  private calculateAverageRestDays(): number {
    if (this.notes.length < 2) return 0;

    let totalRestDays = 0;
    for (let i = 0; i < this.notes.length - 1; i++) {
      const current = parseISO(this.notes[i].date);
      const next = parseISO(this.notes[i + 1].date);
      totalRestDays += differenceInDays(current, next);
    }

    return Math.round(totalRestDays / (this.notes.length - 1));
  }

  private generateOverallSuggestion(daysRest: number, averageRest: number, volumeChange: number): string {
    if (daysRest === 0) {
      return "⚠️ Mesmo dia - Atenção ao overtraining";
    } else if (daysRest < averageRest) {
      return "🔥 Frequência alta";
    } else if (daysRest > averageRest * 2) {
      return "💪 Retorno - Comece conservador";
    } else if (volumeChange > 10) {
      return "↗️ Volume maior que último treino";
    } else if (volumeChange < -10) {
      return "↘️ Volume menor";
    } else {
      return "→ Ritmo consistente";
    }
  }

  // Método para obter comparação rápida durante o treino
  async getQuickComparison(exerciseName: string): Promise<{
    lastWeight?: number;
    lastReps?: number;
    daysAgo?: number;
    suggestion: string;
    arrow: string;
  }> {
    await this.loadNotes();
    const lastPerf = this.getLastExercisePerformance(exerciseName);
    
    if (!lastPerf) {
      return {
        suggestion: "Novo exercício",
        arrow: "↗️"
      };
    }

    const daysAgo = lastPerf.daysAgo;
    let arrow = "↗️";
    let suggestion = "Progredir";

    if (daysAgo <= 2) {
      arrow = "→";
      suggestion = "Manter";
    } else if (daysAgo > 7) {
      arrow = "↘️";
      suggestion = "Reduzir";
    }

    return {
      lastWeight: lastPerf.bestSet.weight || 0,
      lastReps: lastPerf.bestSet.reps,
      daysAgo: lastPerf.daysAgo,
      suggestion,
      arrow
    };
  }
}

export const comparisonService = new ComparisonService(); 