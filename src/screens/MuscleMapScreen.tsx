import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { differenceInDays, parseISO } from 'date-fns';

const muscleGroups = [
  { key: 'chest', name: 'Peito' },
  { key: 'shoulders', name: 'Ombros' },
  { key: 'biceps', name: 'Bíceps' },
  { key: 'triceps', name: 'Tríceps' },
  { key: 'back', name: 'Costas' },
  { key: 'traps', name: 'Trapézio' },
  { key: 'abs', name: 'Abdômen' },
  { key: 'quads', name: 'Quadríceps' },
  { key: 'hamstrings', name: 'Posteriores' },
  { key: 'glutes', name: 'Glúteos' },
  { key: 'calves', name: 'Panturrilhas' },
  { key: 'forearms', name: 'Antebraços' },
];

const fatigueColors = {
  green: '#4CAF50',
  yellow: '#FFEB3B',
  orange: '#FF9800',
  red: '#F44336',
};

// Mapeamento de exercícios para grupos musculares principais
const exerciseToMuscles: Record<string, string[]> = {
  'Supino': ['chest', 'triceps', 'shoulders'],
  'Desenvolvimento': ['shoulders', 'triceps'],
  'Remada': ['back', 'biceps'],
  'Puxada': ['back', 'biceps'],
  'Agachamento': ['quads', 'glutes', 'hamstrings'],
  'Leg Press': ['quads', 'glutes'],
  'Stiff': ['hamstrings', 'glutes'],
  'Rosca Direta': ['biceps', 'forearms'],
  'Tríceps Testa': ['triceps'],
  'Abdominal': ['abs'],
  'Panturrilha': ['calves'],
  // ...adicione mais conforme necessário
};

// Mock de histórico de treinos (últimos 7 dias)
const mockNotes = [
  {
    id: '1',
    date: '2024-06-10',
    exercises: {
      'Supino': { sets: [ { id: '1', weight: 60, reps: 10 }, { id: '2', weight: 60, reps: 8 } ] },
      'Tríceps Testa': { sets: [ { id: '1', weight: 30, reps: 12 } ] },
      'Abdominal': { sets: [ { id: '1', weight: 0, reps: 20 } ] },
    },
  },
  {
    id: '2',
    date: '2024-06-09',
    exercises: {
      'Agachamento': { sets: [ { id: '1', weight: 80, reps: 10 }, { id: '2', weight: 80, reps: 8 } ] },
      'Panturrilha': { sets: [ { id: '1', weight: 40, reps: 15 } ] },
    },
  },
  {
    id: '3',
    date: '2024-06-08',
    exercises: {
      'Remada': { sets: [ { id: '1', weight: 50, reps: 10 } ] },
      'Rosca Direta': { sets: [ { id: '1', weight: 20, reps: 12 } ] },
    },
  },
  {
    id: '4',
    date: '2024-06-07',
    exercises: {
      'Desenvolvimento': { sets: [ { id: '1', weight: 30, reps: 10 } ] },
      'Stiff': { sets: [ { id: '1', weight: 60, reps: 10 } ] },
    },
  },
  // ... mais dias se quiser
];

// Função para calcular fadiga dos grupos musculares
function calculateMuscleFatigue(notes: any[], today: string) {
  // Inicializa dados
  const muscleData: Record<string, { lastWorkout: string | null, daysAgo: number, volume: number }> = {};
  muscleGroups.forEach(m => muscleData[m.key] = { lastWorkout: null, daysAgo: 99, volume: 0 });

  notes.forEach(note => {
    const noteDate = note.date;
    Object.entries(note.exercises).forEach(([exName, exData]: any) => {
      const muscles = exerciseToMuscles[exName] || [];
      const volume = exData.sets.reduce((sum: number, set: any) => sum + (set.weight || 0) * (set.reps || 0), 0);
      muscles.forEach(muscle => {
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
  muscleGroups.forEach(m => {
    if (muscleData[m.key].lastWorkout) {
      muscleData[m.key].daysAgo = differenceInDays(parseISO(today), parseISO(muscleData[m.key].lastWorkout));
    }
  });

  // Aplica regras de fadiga
  const fatigue: Record<string, { percent: number, color: string, lastWorkout: string, volume: number, status: string }> = {};
  muscleGroups.forEach(m => {
    const { daysAgo, volume, lastWorkout } = muscleData[m.key];
    let color = fatigueColors.green;
    let percent = 0;
    let status = 'Recuperado';
    if (daysAgo <= 0 && volume > 2000) {
      color = fatigueColors.red;
      percent = 80;
      status = 'Muito fatigado';
    } else if (daysAgo <= 1 && volume > 1000) {
      color = fatigueColors.orange;
      percent = 60;
      status = 'Moderado';
    } else if (daysAgo <= 2 && volume > 0) {
      color = fatigueColors.yellow;
      percent = 30;
      status = 'Leve';
    } else if (daysAgo >= 3) {
      color = fatigueColors.green;
      percent = 10;
      status = 'Recuperado';
    }
    fatigue[m.key] = {
      percent,
      color,
      lastWorkout: lastWorkout ? `${daysAgo} dia(s) atrás` : 'Nunca',
      volume,
      status,
    };
  });
  return fatigue;
}

const today = '2024-06-10'; // Data mockada para simulação
const fatigueData = calculateMuscleFatigue(mockNotes, today);

const MuscleMapScreen = () => {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Mapa Muscular</Text>
        <View style={styles.silhouetteContainer}>
          <Svg width={220} height={400} viewBox="0 0 220 400">
            {/* Peito */}
            <Path d="M70,90 Q110,70 150,90 Q145,120 110,120 Q75,120 70,90" fill={fatigueData.chest.color} onPress={() => setSelectedMuscle('chest')} />
            {/* Ombro esquerdo */}
            <Path d="M55,80 Q65,60 85,80 Q80,100 65,100 Q55,90 55,80" fill={fatigueData.shoulders.color} onPress={() => setSelectedMuscle('shoulders')} />
            {/* Ombro direito */}
            <Path d="M155,80 Q165,60 185,80 Q180,100 165,100 Q155,90 155,80" fill={fatigueData.shoulders.color} onPress={() => setSelectedMuscle('shoulders')} />
            {/* Bíceps esquerdo */}
            <Path d="M50,110 Q55,130 70,140 Q75,120 65,110 Q60,110 50,110" fill={fatigueData.biceps.color} onPress={() => setSelectedMuscle('biceps')} />
            {/* Bíceps direito */}
            <Path d="M170,110 Q165,130 150,140 Q145,120 155,110 Q160,110 170,110" fill={fatigueData.biceps.color} onPress={() => setSelectedMuscle('biceps')} />
            {/* Tríceps esquerdo */}
            <Path d="M60,140 Q55,170 70,180 Q75,160 70,150 Q65,145 60,140" fill={fatigueData.triceps.color} onPress={() => setSelectedMuscle('triceps')} />
            {/* Tríceps direito */}
            <Path d="M160,140 Q165,170 150,180 Q145,160 150,150 Q155,145 160,140" fill={fatigueData.triceps.color} onPress={() => setSelectedMuscle('triceps')} />
            {/* Abdômen */}
            <Path d="M90,130 Q110,130 130,130 Q135,170 110,200 Q85,170 90,130" fill={fatigueData.abs.color} onPress={() => setSelectedMuscle('abs')} />
            {/* Quadríceps esquerdo */}
            <Path d="M90,200 Q95,250 90,340 Q70,340 75,250 Q80,220 90,200" fill={fatigueData.quads.color} onPress={() => setSelectedMuscle('quads')} />
            {/* Quadríceps direito */}
            <Path d="M130,200 Q125,250 130,340 Q150,340 145,250 Q140,220 130,200" fill={fatigueData.quads.color} onPress={() => setSelectedMuscle('quads')} />
            {/* Posterior esquerdo */}
            <Path d="M75,250 Q70,300 80,340 Q90,340 90,320 Q85,270 75,250" fill={fatigueData.hamstrings.color} onPress={() => setSelectedMuscle('hamstrings')} />
            {/* Posterior direito */}
            <Path d="M145,250 Q150,300 140,340 Q130,340 130,320 Q135,270 145,250" fill={fatigueData.hamstrings.color} onPress={() => setSelectedMuscle('hamstrings')} />
            {/* Glúteos */}
            <Path d="M100,200 Q120,200 125,220 Q120,240 100,240 Q95,220 100,200" fill={fatigueData.glutes.color} onPress={() => setSelectedMuscle('glutes')} />
            {/* Panturrilha esquerda */}
            <Path d="M80,340 Q85,370 95,390 Q100,380 95,340 Q90,340 80,340" fill={fatigueData.calves.color} onPress={() => setSelectedMuscle('calves')} />
            {/* Panturrilha direita */}
            <Path d="M140,340 Q135,370 125,390 Q120,380 125,340 Q130,340 140,340" fill={fatigueData.calves.color} onPress={() => setSelectedMuscle('calves')} />
            {/* Antebraço esquerdo */}
            <Path d="M45,180 Q50,210 65,220 Q70,200 60,180 Q55,180 45,180" fill={fatigueData.forearms.color} onPress={() => setSelectedMuscle('forearms')} />
            {/* Antebraço direito */}
            <Path d="M175,180 Q170,210 155,220 Q150,200 160,180 Q165,180 175,180" fill={fatigueData.forearms.color} onPress={() => setSelectedMuscle('forearms')} />
          </Svg>
        </View>
        {/* Legenda */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Legenda:</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: fatigueColors.green }]} />
            <Text style={styles.legendText}>Recuperado</Text>
            <View style={[styles.legendDot, { backgroundColor: fatigueColors.yellow }]} />
            <Text style={styles.legendText}>Leve</Text>
            <View style={[styles.legendDot, { backgroundColor: fatigueColors.orange }]} />
            <Text style={styles.legendText}>Moderado</Text>
            <View style={[styles.legendDot, { backgroundColor: fatigueColors.red }]} />
            <Text style={styles.legendText}>Cansado</Text>
          </View>
        </View>
        {/* Lista de grupos musculares */}
        {muscleGroups.map((group) => (
          <TouchableOpacity key={group.key} style={styles.card} onPress={() => setSelectedMuscle(group.key)}>
            <View style={[styles.statusDot, { backgroundColor: fatigueData[group.key].color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{group.name}</Text>
              <Text style={styles.cardSubtitle}>Último treino: {fatigueData[group.key].lastWorkout}</Text>
            </View>
            <Text style={styles.cardStatus}>{fatigueData[group.key].status}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Modal de detalhes do músculo */}
      <Modal visible={!!selectedMuscle} transparent animationType="slide" onRequestClose={() => setSelectedMuscle(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMuscle && (
              <>
                <Text style={styles.modalTitle}>{muscleGroups.find(g => g.key === selectedMuscle)?.name}</Text>
                <Text style={styles.modalDetail}>Fadiga: {fatigueData[selectedMuscle].percent}%</Text>
                <Text style={styles.modalDetail}>Último treino: {fatigueData[selectedMuscle].lastWorkout}</Text>
                <Text style={styles.modalDetail}>Volume (7 dias): {fatigueData[selectedMuscle].volume} kg</Text>
                <Text style={styles.modalDetail}>Status: {fatigueData[selectedMuscle].status}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedMuscle(null)}>
                  <Text style={{ color: '#fff' }}>Fechar</Text>
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
  container: { flex: 1, backgroundColor: '#181818', padding: 16 },
  title: { color: '#FFAB00', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  silhouetteContainer: { alignItems: 'center', marginBottom: 16 },
  legendContainer: { flexDirection: 'column', alignItems: 'center', marginBottom: 12 },
  legendTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 16, height: 16, borderRadius: 8, marginHorizontal: 4 },
  legendText: { color: '#fff', marginRight: 8, fontSize: 13 },
  cardList: { flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', borderRadius: 8, padding: 12, marginBottom: 8 },
  statusDot: { width: 14, height: 14, borderRadius: 7, marginRight: 10 },
  cardTitle: { color: '#FFAB00', fontWeight: 'bold', fontSize: 16 },
  cardSubtitle: { color: '#B0BEC5', fontSize: 13 },
  cardStatus: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#222', borderRadius: 12, padding: 24, width: 280, alignItems: 'center' },
  modalTitle: { color: '#FFAB00', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  modalDetail: { color: '#fff', fontSize: 16, marginBottom: 6 },
  closeButton: { marginTop: 16, backgroundColor: '#FF6F00', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 },
});

export default MuscleMapScreen; 