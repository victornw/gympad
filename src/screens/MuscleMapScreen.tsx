import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, Dimensions } from "react-native";
import Svg, { Path, Circle, Ellipse, G } from "react-native-svg";
import { differenceInDays, parseISO } from "date-fns";

const { width: screenWidth } = Dimensions.get("window");

const muscleGroups = [
  { key: "chest", name: "Peito", frontView: true, svgClass: "pecs" },
  { key: "shoulders", name: "Ombros", frontView: true, svgClass: "front-side-delts" },
  { key: "biceps", name: "Bíceps", frontView: true, svgClass: "biceps" },
  { key: "triceps", name: "Tríceps", frontView: false, svgClass: "triceps" },
  { key: "back", name: "Costas", frontView: false, svgClass: "lats" },
  { key: "traps", name: "Trapézio", frontView: false, svgClass: "traps" },
  { key: "abs", name: "Abdômen", frontView: true, svgClass: "abs" },
  { key: "quads", name: "Quadríceps", frontView: true, svgClass: "quads" },
  { key: "hamstrings", name: "Posteriores", frontView: false, svgClass: "hamstrings" },
  { key: "glutes", name: "Glúteos", frontView: false, svgClass: "glutes" },
  { key: "calves", name: "Panturrilhas", frontView: true, svgClass: "calves" },
  { key: "forearms", name: "Antebraços", frontView: true, svgClass: "forearms-top" },
  { key: "obliques", name: "Oblíquos", frontView: true, svgClass: "obliques" },
  { key: "rearDelts", name: "Deltóide Posterior", frontView: false, svgClass: "rear-delts" },
  { key: "lowerBack", name: "Lombar", frontView: false, svgClass: "lower-back" },
  { key: "neck", name: "Pescoço", frontView: false, svgClass: "neck" },
];

const fatigueColors = {
  green: "#4CAF50",
  yellow: "#FFEB3B",
  orange: "#FF9800",
  red: "#F44336",
  default: "#8B4513",
};

// Mapeamento de exercícios para grupos musculares principais
const exerciseToMuscles: Record<string, string[]> = {
  Supino: ["chest", "triceps", "shoulders"],
  Desenvolvimento: ["shoulders", "triceps"],
  Remada: ["back", "biceps"],
  Puxada: ["back", "biceps"],
  Agachamento: ["quads", "glutes", "hamstrings"],
  "Leg Press": ["quads", "glutes"],
  Stiff: ["hamstrings", "glutes"],
  "Rosca Direta": ["biceps", "forearms"],
  "Tríceps Testa": ["triceps"],
  Abdominal: ["abs"],
  Panturrilha: ["calves"],
  // ...adicione mais conforme necessário
};

// Mock de histórico de treinos (últimos 7 dias)
const mockNotes = [
  {
    id: "1",
    date: "2024-06-10",
    exercises: {
      Supino: {
        sets: [
          { id: "1", weight: 60, reps: 10 },
          { id: "2", weight: 60, reps: 8 },
        ],
      },
      "Tríceps Testa": { sets: [{ id: "1", weight: 30, reps: 12 }] },
      Abdominal: { sets: [{ id: "1", weight: 0, reps: 20 }] },
    },
  },
  {
    id: "2",
    date: "2024-06-09",
    exercises: {
      Agachamento: {
        sets: [
          { id: "1", weight: 80, reps: 10 },
          { id: "2", weight: 80, reps: 8 },
        ],
      },
      Panturrilha: { sets: [{ id: "1", weight: 40, reps: 15 }] },
    },
  },
  {
    id: "3",
    date: "2024-06-08",
    exercises: {
      Remada: { sets: [{ id: "1", weight: 50, reps: 10 }] },
      "Rosca Direta": { sets: [{ id: "1", weight: 20, reps: 12 }] },
    },
  },
  {
    id: "4",
    date: "2024-06-07",
    exercises: {
      Desenvolvimento: { sets: [{ id: "1", weight: 30, reps: 10 }] },
      Stiff: { sets: [{ id: "1", weight: 60, reps: 10 }] },
    },
  },
  // ... mais dias se quiser
];

// Função para calcular fadiga dos grupos musculares
function calculateMuscleFatigue(notes: any[], today: string) {
  // Inicializa dados
  const muscleData: Record<string, { lastWorkout: string | null; daysAgo: number; volume: number }> = {};
  muscleGroups.forEach((m) => (muscleData[m.key] = { lastWorkout: null, daysAgo: 99, volume: 0 }));

  notes.forEach((note) => {
    const noteDate = note.date;
    Object.entries(note.exercises).forEach(([exName, exData]: any) => {
      const muscles = exerciseToMuscles[exName] || [];
      const volume = exData.sets.reduce((sum: number, set: any) => sum + (set.weight || 0) * (set.reps || 0), 0);
      muscles.forEach((muscle) => {
        // Soma volume
        muscleData[muscle].volume += volume;
        // Atualiza último treino se for mais recente
        if (!muscleData[muscle].lastWorkout || noteDate > muscleData[muscle].lastWorkout) {
          muscleData[muscle].lastWorkout = noteDate;
        }
      });
    });
  });

  // Calcula dias desde o último treino
  muscleGroups.forEach((m) => {
    if (muscleData[m.key].lastWorkout) {
      muscleData[m.key].daysAgo = differenceInDays(parseISO(today), parseISO(muscleData[m.key].lastWorkout!));
    }
  });

  // Aplica regras de fadiga
  const fatigue: Record<string, { percent: number; color: string; lastWorkout: string; volume: number; status: string }> = {};
  muscleGroups.forEach((m) => {
    const { daysAgo, volume, lastWorkout } = muscleData[m.key];
    let color = fatigueColors.green;
    let percent = 0;
    let status = "Recuperado";
    if (daysAgo <= 0 && volume > 2000) {
      color = fatigueColors.red;
      percent = 80;
      status = "Muito fatigado";
    } else if (daysAgo <= 1 && volume > 1000) {
      color = fatigueColors.orange;
      percent = 60;
      status = "Moderado";
    } else if (daysAgo <= 2 && volume > 0) {
      color = fatigueColors.yellow;
      percent = 30;
      status = "Leve";
    } else if (daysAgo >= 3) {
      color = fatigueColors.green;
      percent = 10;
      status = "Recuperado";
    } else {
      color = fatigueColors.default;
    }
    fatigue[m.key] = {
      percent,
      color,
      lastWorkout: lastWorkout ? `${daysAgo} dia(s) atrás` : "Nunca",
      volume,
      status,
    };
  });
  return fatigue;
}

const today = "2024-06-10"; // Data mockada para simulação
const fatigueData = calculateMuscleFatigue(mockNotes, today);

console.log("Fatigue Data:", fatigueData);

const FrontBodySvg = ({ onMusclePress }: { onMusclePress: (muscle: string) => void }) => (
  <Svg width={300} height={480} viewBox="0 0 400 500">
    <G>
      <TouchableOpacity onPress={() => onMusclePress("chest")}>
        <Path
          d="M150,80 Q200,75 250,80 Q260,120 240,160 Q200,170 160,160 Q140,120 150,80 Z"
          fill={fatigueData.chest?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("shoulders")}>
        <Path
          d="M100,80 Q120,60 140,80 Q145,110 130,130 L120,120 Q105,100 100,80 Z"
          fill={fatigueData.shoulders?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path
          d="M260,80 Q280,60 300,80 Q295,100 280,120 L270,130 Q255,110 260,80 Z"
          fill={fatigueData.shoulders?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("biceps")}>
        <Path
          d="M80,120 Q90,110 110,120 Q115,150 105,180 Q95,185 85,180 Q75,150 80,120 Z"
          fill={fatigueData.biceps?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path
          d="M290,120 Q310,110 320,120 Q325,150 315,180 Q305,185 295,180 Q285,150 290,120 Z"
          fill={fatigueData.biceps?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("forearms")}>
        <Path
          d="M75,180 Q85,175 105,180 Q110,220 100,250 Q90,255 80,250 Q70,220 75,180 Z"
          fill={fatigueData.forearms?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path
          d="M295,180 Q315,175 325,180 Q330,220 320,250 Q310,255 300,250 Q290,220 295,180 Z"
          fill={fatigueData.forearms?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("abs")}>
        <Path
          d="M160,170 Q200,165 240,170 Q245,220 240,270 Q200,275 160,270 Q155,220 160,170 Z"
          fill={fatigueData.abs?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path d="M180,180 L220,180" stroke="#333" strokeWidth="1" />
        <Path d="M180,200 L220,200" stroke="#333" strokeWidth="1" />
        <Path d="M180,220 L220,220" stroke="#333" strokeWidth="1" />
        <Path d="M180,240 L220,240" stroke="#333" strokeWidth="1" />
        <Path d="M200,170 L200,270" stroke="#333" strokeWidth="1" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("obliques")}>
        <Path
          d="M140,180 Q150,170 160,180 Q165,220 155,250 Q145,255 135,250 Q130,220 140,180 Z"
          fill={fatigueData.obliques?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path
          d="M240,180 Q250,170 260,180 Q270,220 265,250 Q255,255 245,250 Q235,220 240,180 Z"
          fill={fatigueData.obliques?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("quads")}>
        <Path
          d="M150,280 Q170,275 190,280 Q195,350 185,420 Q175,425 165,420 Q155,350 150,280 Z"
          fill={fatigueData.quads?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path
          d="M210,280 Q230,275 250,280 Q245,350 235,420 Q225,425 215,420 Q205,350 210,280 Z"
          fill={fatigueData.quads?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path d="M170,290 L170,410" stroke="#333" strokeWidth="1" />
        <Path d="M230,290 L230,410" stroke="#333" strokeWidth="1" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("calves")}>
        <Path
          d="M155,420 Q175,415 185,420 Q190,460 180,480 Q170,485 160,480 Q150,460 155,420 Z"
          fill={fatigueData.calves?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path
          d="M215,420 Q235,415 245,420 Q240,460 230,480 Q220,485 210,480 Q205,460 215,420 Z"
          fill={fatigueData.calves?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <Circle cx="200" cy="40" r="25" fill="#2C2C2C" stroke="#444" strokeWidth="2" />
      <Path d="M185,60 L215,60 L210,80 L190,80 Z" fill="#2C2C2C" stroke="#444" strokeWidth="2" />
      <Path d="M160,80 L240,80 L250,280 L150,280 Z" fill="none" stroke="#444" strokeWidth="1" />
    </G>
  </Svg>
);

const BackBodySvg = ({ onMusclePress }: { onMusclePress: (muscle: string) => void }) => (
  <Svg width={300} height={480} viewBox="0 0 400 500">
    <G>
      <TouchableOpacity onPress={() => onMusclePress("traps")}>
        <Path
          d="M160,80 Q200,75 240,80 Q245,110 235,130 Q200,135 165,130 Q155,110 160,80 Z"
          fill={fatigueData.traps?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("rearDelts")}>
        <Path
          d="M100,80 Q120,60 140,80 Q145,110 130,130 L120,120 Q105,100 100,80 Z"
          fill={fatigueData.rearDelts?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path
          d="M260,80 Q280,60 300,80 Q295,100 280,120 L270,130 Q255,110 260,80 Z"
          fill={fatigueData.rearDelts?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("back")}>
        <Path
          d="M160,130 Q200,125 240,130 Q250,180 245,230 Q200,235 155,230 Q150,180 160,130 Z"
          fill={fatigueData.back?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path d="M200,130 L200,230" stroke="#333" strokeWidth="1" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("triceps")}>
        <Path
          d="M80,120 Q90,110 110,120 Q115,150 105,180 Q95,185 85,180 Q75,150 80,120 Z"
          fill={fatigueData.triceps?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path
          d="M290,120 Q310,110 320,120 Q325,150 315,180 Q305,185 295,180 Q285,150 290,120 Z"
          fill={fatigueData.triceps?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("lowerBack")}>
        <Path
          d="M170,230 Q200,225 230,230 Q235,260 225,280 Q200,285 175,280 Q165,260 170,230 Z"
          fill={fatigueData.lowerBack?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("glutes")}>
        <Path
          d="M160,280 Q200,275 240,280 Q245,320 235,340 Q200,345 165,340 Q155,320 160,280 Z"
          fill={fatigueData.glutes?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path d="M200,280 L200,340" stroke="#333" strokeWidth="1" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("hamstrings")}>
        <Path
          d="M150,340 Q170,335 190,340 Q195,400 185,420 Q175,425 165,420 Q155,400 150,340 Z"
          fill={fatigueData.hamstrings?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path
          d="M210,340 Q230,335 250,340 Q245,400 235,420 Q225,425 215,420 Q205,400 210,340 Z"
          fill={fatigueData.hamstrings?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path d="M170,350 L170,410" stroke="#333" strokeWidth="1" />
        <Path d="M230,350 L230,410" stroke="#333" strokeWidth="1" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("calves")}>
        <Path
          d="M155,420 Q175,415 185,420 Q190,460 180,480 Q170,485 160,480 Q150,460 155,420 Z"
          fill={fatigueData.calves?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
        <Path
          d="M215,420 Q235,415 245,420 Q240,460 230,480 Q220,485 210,480 Q205,460 215,420 Z"
          fill={fatigueData.calves?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onMusclePress("neck")}>
        <Path
          d="M185,60 Q200,55 215,60 Q220,75 210,80 Q200,85 190,80 Q180,75 185,60 Z"
          fill={fatigueData.neck?.color || "#8B4513"}
          stroke="#222"
          strokeWidth="2"
        />
      </TouchableOpacity>

      <Circle cx="200" cy="40" r="25" fill="#2C2C2C" stroke="#444" strokeWidth="2" />
      <Path d="M185,60 L215,60 L210,80 L190,80 Z" fill="#2C2C2C" stroke="#444" strokeWidth="2" />
      <Path d="M160,80 L240,80 L250,280 L150,280 Z" fill="none" stroke="#444" strokeWidth="1" />
    </G>
  </Svg>
);

const MuscleMapScreen = () => {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"front" | "back">("front");

  const handleMusclePress = (muscle: string) => {
    setSelectedMuscle(muscle);
  };

  const toggleView = () => {
    setViewMode(viewMode === "front" ? "back" : "front");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.title}>Mapa Muscular</Text>

      {/* Toggle de visualização */}
      <View style={styles.viewToggle}>
        <TouchableOpacity style={[styles.toggleButton, viewMode === "front" && styles.toggleButtonActive]} onPress={() => setViewMode("front")}>
          <Text style={[styles.toggleText, viewMode === "front" && styles.toggleTextActive]}>Frente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleButton, viewMode === "back" && styles.toggleButtonActive]} onPress={() => setViewMode("back")}>
          <Text style={[styles.toggleText, viewMode === "back" && styles.toggleTextActive]}>Costas</Text>
        </TouchableOpacity>
      </View>

      {/* Corpo humano */}
      <View style={styles.bodyContainer}>
        {viewMode === "front" ? <FrontBodySvg onMusclePress={handleMusclePress} /> : <BackBodySvg onMusclePress={handleMusclePress} />}
      </View>

      {/* Legenda */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Status de Recuperação:</Text>
        <View style={styles.legendGrid}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: fatigueColors.green }]} />
            <Text style={styles.legendText}>Recuperado</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: fatigueColors.yellow }]} />
            <Text style={styles.legendText}>Leve</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: fatigueColors.orange }]} />
            <Text style={styles.legendText}>Moderado</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: fatigueColors.red }]} />
            <Text style={styles.legendText}>Fatigado</Text>
          </View>
        </View>
      </View>

      {/* Lista de grupos musculares */}
      <View style={styles.muscleList}>
        <Text style={styles.sectionTitle}>Grupos Musculares</Text>
        {muscleGroups
          .filter((group) => (viewMode === "front" ? group.frontView : !group.frontView))
          .map((group) => (
            <TouchableOpacity key={group.key} style={styles.muscleCard} onPress={() => setSelectedMuscle(group.key)}>
              <View style={[styles.statusIndicator, { backgroundColor: fatigueData[group.key].color }]} />
              <View style={styles.muscleInfo}>
                <Text style={styles.muscleName}>{group.name}</Text>
                <Text style={styles.muscleStatus}>
                  {fatigueData[group.key].status} • {fatigueData[group.key].lastWorkout}
                </Text>
              </View>
              <Text style={styles.fatiguePercent}>{fatigueData[group.key].percent}%</Text>
            </TouchableOpacity>
          ))}
      </View>

      {/* Modal de detalhes */}
      <Modal visible={!!selectedMuscle} transparent animationType="fade" onRequestClose={() => setSelectedMuscle(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMuscle && (
              <>
                <Text style={styles.modalTitle}>{muscleGroups.find((g) => g.key === selectedMuscle)?.name}</Text>

                <View style={styles.modalStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Status</Text>
                    <Text style={[styles.statValue, { color: fatigueData[selectedMuscle].color }]}>{fatigueData[selectedMuscle].status}</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Fadiga</Text>
                    <Text style={styles.statValue}>{fatigueData[selectedMuscle].percent}%</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Último Treino</Text>
                    <Text style={styles.statValue}>{fatigueData[selectedMuscle].lastWorkout}</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Volume (7 dias)</Text>
                    <Text style={styles.statValue}>{fatigueData[selectedMuscle].volume} kg</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedMuscle(null)}>
                  <Text style={styles.closeButtonText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  title: {
    color: "#FFAB00",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#333",
    borderRadius: 25,
    margin: 20,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: "#FF6F00",
  },
  toggleText: {
    color: "#B0BEC5",
    fontSize: 16,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  bodyContainer: {
    alignItems: "center",
    marginVertical: 20,
    backgroundColor: "#2C2C2C",
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 20,
  },
  legendContainer: {
    margin: 20,
    backgroundColor: "#333",
    borderRadius: 15,
    padding: 16,
  },
  legendTitle: {
    color: "#FFAB00",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  muscleList: {
    margin: 20,
  },
  sectionTitle: {
    color: "#FFAB00",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  muscleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  muscleInfo: {
    flex: 1,
  },
  muscleName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  muscleStatus: {
    color: "#B0BEC5",
    fontSize: 14,
  },
  fatiguePercent: {
    color: "#FFAB00",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#333",
    borderRadius: 20,
    padding: 24,
    width: screenWidth - 40,
    maxWidth: 400,
  },
  modalTitle: {
    color: "#FFAB00",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  modalStats: {
    marginBottom: 24,
  },
  statItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  statLabel: {
    color: "#B0BEC5",
    fontSize: 16,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  closeButton: {
    backgroundColor: "#FF6F00",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default MuscleMapScreen;
