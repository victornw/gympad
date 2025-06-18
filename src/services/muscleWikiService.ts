import AsyncStorage from "@react-native-async-storage/async-storage";

const MUSCLEWIKI_BASE = "https://musclewiki.com";
const CACHE_KEY = "muscleWikiData";
const CACHE_EXPIRY_KEY = "muscleWikiDataExpiry";
const CUSTOM_EXERCISES_KEY = "customExercises";
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias

// Mapeamento de grupos musculares do MuscleWiki
const MUSCLE_GROUPS = {
  abdominals: "Abdominais",
  abductors: "Abdutores",
  adductors: "Adutores",
  biceps: "Bíceps",
  calves: "Panturrilhas",
  chest: "Peito",
  forearms: "Antebraços",
  glutes: "Glúteos",
  hamstrings: "Posteriores de Coxa",
  lats: "Grande Dorsal",
  lower_back: "Lombar",
  middle_back: "Costas Médio",
  neck: "Pescoço",
  quadriceps: "Quadríceps",
  shoulders: "Ombros",
  traps: "Trapézio",
  triceps: "Tríceps",
};

// Lista de músculos disponíveis para seleção
export const AVAILABLE_MUSCLES = [
  "Abdominais",
  "Abdutores",
  "Adutores",
  "Antebraços",
  "Bíceps",
  "Cardio",
  "Core",
  "Costas",
  "Grande Dorsal",
  "Glúteos",
  "Lombar",
  "Oblíquos",
  "Ombros",
  "Ombros Posteriores",
  "Panturrilhas",
  "Peito",
  "Peito Superior",
  "Peito Inferior",
  "Posteriores de Coxa",
  "Quadríceps",
  "Sóleo",
  "Trapézio",
  "Tríceps",
];

// Equipamentos traduzidos
const EQUIPMENT_TRANSLATIONS = {
  barbell: "Barra",
  dumbbell: "Halter",
  bodyweight: "Peso Corporal",
  cable: "Cabo/Polia",
  machine: "Máquina",
  kettlebell: "Kettlebell",
  resistance_band: "Faixa Elástica",
  medicine_ball: "Bola Medicinal",
  foam_roller: "Rolo de Espuma",
  other: "Outros",
};

export const AVAILABLE_EQUIPMENT = [
  "Peso Corporal",
  "Barra",
  "Halter",
  "Cabo/Polia",
  "Máquina",
  "Kettlebell",
  "Faixa Elástica",
  "Bola Medicinal",
  "Outros",
];

export const AVAILABLE_DIFFICULTIES = ["Iniciante", "Intermediário", "Avançado"];

export interface MuscleWikiExercise {
  id: string;
  name: string;
  category: string;
  muscles: string[];
  equipment: string;
  difficulty: string;
  instructions: string;
  gif_url: string;
  image_url?: string;
  force?: string;
  mechanic?: string;
}

export interface MuscleWikiCategory {
  id: string;
  name: string;
  exercises: MuscleWikiExercise[];
}

class MuscleWikiService {
  private exercises: MuscleWikiExercise[] = [];
  private categories: MuscleWikiCategory[] = [];
  private customExercises: MuscleWikiExercise[] = [];

  async initialize() {
    try {
      await this.loadCachedData();
      await this.loadCustomExercises();

      if (await this.isCacheExpired()) {
        console.log("Cache do MuscleWiki expirado, buscando dados...");
        await this.fetchExerciseData();
        await this.saveToCache();
      } else {
        console.log("Usando dados do MuscleWiki do cache");
      }

      this.mergeExercises();
    } catch (error) {
      console.error("Erro ao inicializar MuscleWiki service:", error);
    }
  }

  private mergeExercises() {
    const allExercises = [...this.exercises, ...this.customExercises];

    const categoryMap = new Map<string, MuscleWikiExercise[]>();

    allExercises.forEach((exercise) => {
      if (!categoryMap.has(exercise.category)) {
        categoryMap.set(exercise.category, []);
      }
      categoryMap.get(exercise.category)!.push(exercise);
    });

    this.categories = Array.from(categoryMap.entries()).map(([name, exercises]) => ({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      exercises,
    }));
  }

  private async loadCustomExercises() {
    try {
      const customData = await AsyncStorage.getItem(CUSTOM_EXERCISES_KEY);
      if (customData) {
        this.customExercises = JSON.parse(customData);
      }
    } catch (error) {
      console.error("Erro ao carregar exercícios customizados:", error);
    }
  }

  private async saveCustomExercises() {
    try {
      await AsyncStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(this.customExercises));
    } catch (error) {
      console.error("Erro ao salvar exercícios customizados:", error);
    }
  }

  async addCustomExercise(exercise: Omit<MuscleWikiExercise, "id" | "gif_url">) {
    try {
      const customExercise: MuscleWikiExercise = {
        ...exercise,
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        gif_url: "",
      };

      this.customExercises.push(customExercise);
      await this.saveCustomExercises();
      this.mergeExercises();

      return customExercise;
    } catch (error) {
      console.error("Erro ao adicionar exercício customizado:", error);
      throw error;
    }
  }

  async removeCustomExercise(exerciseId: string) {
    try {
      if (!exerciseId.startsWith("custom-")) {
        throw new Error("Só é possível remover exercícios customizados");
      }

      this.customExercises = this.customExercises.filter((ex) => ex.id !== exerciseId);
      await this.saveCustomExercises();
      this.mergeExercises();
    } catch (error) {
      console.error("Erro ao remover exercício customizado:", error);
      throw error;
    }
  }

  getCustomExercises(): MuscleWikiExercise[] {
    return this.customExercises;
  }

  isCustomExercise(exerciseId: string): boolean {
    return exerciseId.startsWith("custom-");
  }

  private async isCacheExpired(): Promise<boolean> {
    try {
      const expiry = await AsyncStorage.getItem(CACHE_EXPIRY_KEY);
      if (!expiry) return true;

      const expiryDate = new Date(expiry);
      return new Date() > expiryDate;
    } catch (error) {
      return true;
    }
  }

  private async loadCachedData() {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const data = JSON.parse(cachedData);
        this.exercises = data.exercises || [];
        this.categories = data.categories || [];
      }
    } catch (error) {
      console.error("Erro ao carregar cache do MuscleWiki:", error);
    }
  }

  private async saveToCache() {
    try {
      const data = {
        exercises: this.exercises,
        categories: this.categories,
      };

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));

      const expiryDate = new Date(Date.now() + CACHE_DURATION);
      await AsyncStorage.setItem(CACHE_EXPIRY_KEY, expiryDate.toISOString());
    } catch (error) {
      console.error("Erro ao salvar cache do MuscleWiki:", error);
    }
  }

  private async fetchExerciseData() {
    try {
      console.log("Buscando dados do MuscleWiki...");

      // Como o MuscleWiki é um SPA, vamos usar uma abordagem diferente
      // Vamos buscar dados de uma API alternativa ou usar dados estáticos
      await this.loadStaticExerciseData();

      console.log(`Carregados ${this.exercises.length} exercícios do MuscleWiki`);
    } catch (error) {
      console.error("Erro ao buscar dados do MuscleWiki:", error);
    }
  }

  // Dados estáticos baseados no MuscleWiki para começar
  private async loadStaticExerciseData() {
    const staticExercises: MuscleWikiExercise[] = [
      // PEITO (25 exercícios expandidos)
      {
        id: "flexao-tradicional",
        name: "Flexão Tradicional",
        category: "Peito",
        muscles: ["Peito", "Tríceps", "Ombros"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions:
          "Deite-se de bruços, apoie as mãos no chão na largura dos ombros. Mantenha o corpo reto e empurre para cima até estender os braços completamente.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-pushup-front.mp4#t=0.1",
      },
      {
        id: "flexao-diamante",
        name: "Flexão Diamante",
        category: "Peito",
        muscles: ["Tríceps", "Peito", "Ombros"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Posicione as mãos formando um diamante com os dedos. Execute a flexão mantendo os cotovelos próximos ao corpo.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-diamond-pushup-front.mp4#t=0.1",
      },
      {
        id: "flexao-inclinada",
        name: "Flexão Inclinada",
        category: "Peito",
        muscles: ["Peito", "Tríceps", "Ombros"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Apoie as mãos em uma superfície elevada como banco ou parede. Execute o movimento de flexão.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-incline-pushup-front.mp4#t=0.1",
      },
      {
        id: "flexao-declinada",
        name: "Flexão Declinada",
        category: "Peito",
        muscles: ["Peito Superior", "Tríceps", "Ombros"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Apoie os pés em uma superfície elevada e execute a flexão trabalhando mais a parte superior do peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-decline-pushup-front.mp4#t=0.1",
      },
      {
        id: "flexao-larga",
        name: "Flexão Pegada Larga",
        category: "Peito",
        muscles: ["Peito", "Ombros"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Execute flexões com as mãos posicionadas mais largas que os ombros, focando no peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-wide-pushup-front.mp4#t=0.1",
      },
      {
        id: "flexao-archer",
        name: "Flexão Archer",
        category: "Peito",
        muscles: ["Peito", "Tríceps", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Execute flexão transferindo o peso para um lado, estendendo o braço oposto lateralmente.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-archer-pushup-front.mp4#t=0.1",
      },
      {
        id: "flexao-hindu",
        name: "Flexão Hindu",
        category: "Peito",
        muscles: ["Peito", "Ombros", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Inicie em posição de cão olhando para baixo, desça em arco até posição de cobra.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-hindu-pushup-front.mp4#t=0.1",
      },
      {
        id: "supino-reto",
        name: "Supino Reto",
        category: "Peito",
        muscles: ["Peito", "Tríceps", "Ombros"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions:
          "Deite no banco, segure a barra com pegada um pouco mais larga que os ombros. Desça controladamente até o peito e empurre para cima.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-bench-press-front.mp4#t=0.1",
      },
      {
        id: "supino-inclinado",
        name: "Supino Inclinado",
        category: "Peito",
        muscles: ["Peito Superior", "Tríceps", "Ombros"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "No banco inclinado a 30-45°, execute o supino focando na parte superior do peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-incline-bench-press-front.mp4#t=0.1",
      },
      {
        id: "supino-declinado",
        name: "Supino Declinado",
        category: "Peito",
        muscles: ["Peito Inferior", "Tríceps"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "No banco declinado, execute o supino focando na parte inferior do peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-decline-bench-press-front.mp4#t=0.1",
      },
      {
        id: "supino-pegada-fechada",
        name: "Supino Pegada Fechada",
        category: "Peito",
        muscles: ["Tríceps", "Peito", "Ombros"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "Execute o supino com pegada mais estreita, focando no trabalho dos tríceps.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-close-grip-bench-press-front.mp4#t=0.1",
      },
      {
        id: "supino-halter",
        name: "Supino com Halter",
        category: "Peito",
        muscles: ["Peito", "Tríceps", "Ombros"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Deite no banco com halteres nas mãos. Execute o movimento de supino com maior amplitude de movimento.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-bench-press-front.mp4#t=0.1",
      },
      {
        id: "supino-halter-inclinado",
        name: "Supino Halter Inclinado",
        category: "Peito",
        muscles: ["Peito Superior", "Tríceps", "Ombros"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "No banco inclinado, execute o supino com halteres para trabalhar a parte superior do peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-incline-bench-press-front.mp4#t=0.1",
      },
      {
        id: "supino-halter-declinado",
        name: "Supino Halter Declinado",
        category: "Peito",
        muscles: ["Peito Inferior", "Tríceps"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "No banco declinado, execute o supino com halteres focando na parte inferior do peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-decline-bench-press-front.mp4#t=0.1",
      },
      {
        id: "crucifixo-halter",
        name: "Crucifixo com Halter",
        category: "Peito",
        muscles: ["Peito", "Ombros"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Deite no banco com halteres nas mãos. Abra os braços em arco até sentir alongamento no peito, depois volte à posição inicial.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-flyes-front.mp4#t=0.1",
      },
      {
        id: "crucifixo-inclinado",
        name: "Crucifixo Inclinado",
        category: "Peito",
        muscles: ["Peito Superior", "Ombros"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "No banco inclinado, execute o crucifixo para trabalhar a parte superior do peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-incline-flyes-front.mp4#t=0.1",
      },
      {
        id: "crucifixo-declinado",
        name: "Crucifixo Declinado",
        category: "Peito",
        muscles: ["Peito Inferior", "Ombros"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "No banco declinado, execute o crucifixo para trabalhar a parte inferior do peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-decline-flyes-front.mp4#t=0.1",
      },
      {
        id: "crossover",
        name: "Crossover",
        category: "Peito",
        muscles: ["Peito", "Ombros"],
        equipment: "Cabo/Polia",
        difficulty: "Intermediário",
        instructions: "Na polia alta, puxe os cabos cruzando-os à frente do corpo, contraindo o peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-crossover-front.mp4#t=0.1",
      },
      {
        id: "crossover-baixo",
        name: "Crossover Baixo",
        category: "Peito",
        muscles: ["Peito Superior", "Ombros"],
        equipment: "Cabo/Polia",
        difficulty: "Intermediário",
        instructions: "Na polia baixa, puxe os cabos para cima cruzando-os, trabalhando a parte superior do peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-low-crossover-front.mp4#t=0.1",
      },
      {
        id: "peck-deck",
        name: "Peck Deck",
        category: "Peito",
        muscles: ["Peito"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "Sentado na máquina, aproxime os braços à frente do corpo contraindo o peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-pec-deck-front.mp4#t=0.1",
      },
      {
        id: "supino-smith",
        name: "Supino no Smith",
        category: "Peito",
        muscles: ["Peito", "Tríceps", "Ombros"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "Execute o supino na máquina Smith para maior estabilidade e segurança.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-smith-bench-press-front.mp4#t=0.1",
      },
      {
        id: "supino-smith-inclinado",
        name: "Supino Smith Inclinado",
        category: "Peito",
        muscles: ["Peito Superior", "Tríceps", "Ombros"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "Execute o supino inclinado na máquina Smith trabalhando a parte superior do peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-smith-incline-bench-press-front.mp4#t=0.1",
      },
      {
        id: "chest-press-maquina",
        name: "Chest Press na Máquina",
        category: "Peito",
        muscles: ["Peito", "Tríceps", "Ombros"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "Na máquina chest press, empurre os pesos para frente contraindo o peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-chest-press-front.mp4#t=0.1",
      },
      {
        id: "pullover-halter",
        name: "Pullover com Halter",
        category: "Peito",
        muscles: ["Peito", "Grande Dorsal", "Tríceps"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Deitado no banco, segure um halter e execute o movimento de pullover trabalhando peito e dorsal.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-pullover-front.mp4#t=0.1",
      },
      {
        id: "svend-press",
        name: "Svend Press",
        category: "Peito",
        muscles: ["Peito", "Ombros"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Segure um halter entre as palmas das mãos e empurre para frente contraindo o peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-svend-press-front.mp4#t=0.1",
      },

      // COSTAS (25 exercícios expandidos)
      {
        id: "barra-fixa",
        name: "Barra Fixa",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps", "Ombros"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Segure a barra com pegada pronada, puxe o corpo para cima até o queixo passar da barra. Desça controladamente.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-pullup-back.mp4#t=0.1",
      },
      {
        id: "barra-fixa-supinada",
        name: "Barra Fixa Supinada",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Segure a barra com pegada supinada (palmas voltadas para você). Puxe o corpo para cima.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-chinup-back.mp4#t=0.1",
      },
      {
        id: "barra-fixa-neutra",
        name: "Barra Fixa Pegada Neutra",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps", "Antebraços"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Use pegada neutra (palmas uma de frente para a outra) para trabalhar diferentes ângulos das costas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-neutral-pullup-back.mp4#t=0.1",
      },
      {
        id: "barra-fixa-larga",
        name: "Barra Fixa Pegada Larga",
        category: "Costas",
        muscles: ["Grande Dorsal", "Trapézio"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Execute barra fixa com pegada mais larga que os ombros, focando no grande dorsal.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-wide-pullup-back.mp4#t=0.1",
      },
      {
        id: "barra-fixa-commando",
        name: "Barra Fixa Commando",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Segure a barra com pegada paralela e alterne subindo para cada lado da barra.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-commando-pullup-back.mp4#t=0.1",
      },
      {
        id: "barra-fixa-l-sit",
        name: "Barra Fixa L-Sit",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Execute barra fixa mantendo as pernas estendidas horizontalmente (posição L).",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-l-sit-pullup-back.mp4#t=0.1",
      },
      {
        id: "remada-curvada",
        name: "Remada Curvada",
        category: "Costas",
        muscles: ["Grande Dorsal", "Trapézio", "Bíceps"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "Incline o tronco para frente, segure a barra e puxe em direção ao abdômen. Mantenha as costas retas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-bent-over-row-back.mp4#t=0.1",
      },
      {
        id: "remada-curvada-supinada",
        name: "Remada Curvada Supinada",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps", "Trapézio"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "Execute a remada curvada com pegada supinada para maior ativação dos bíceps.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-underhand-row-back.mp4#t=0.1",
      },
      {
        id: "remada-pendlay",
        name: "Remada Pendlay",
        category: "Costas",
        muscles: ["Grande Dorsal", "Trapézio", "Ombros"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "Remada explosiva partindo do chão, com pausa completa entre repetições.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-pendlay-row-back.mp4#t=0.1",
      },
      {
        id: "remada-halter",
        name: "Remada com Halter",
        category: "Costas",
        muscles: ["Grande Dorsal", "Trapézio", "Bíceps"],
        equipment: "Halter",
        difficulty: "Iniciante",
        instructions: "Apoie um joelho no banco, segure o halter e puxe em direção ao quadril. Alterne os lados.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-bent-over-row-back.mp4#t=0.1",
      },
      {
        id: "remada-halter-bilateral",
        name: "Remada Halter Bilateral",
        category: "Costas",
        muscles: ["Grande Dorsal", "Trapézio", "Bíceps"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Com um halter em cada mão, execute a remada trabalhando ambos os lados simultaneamente.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-bilateral-row-back.mp4#t=0.1",
      },
      {
        id: "remada-halter-peito-apoiado",
        name: "Remada Halter Peito Apoiado",
        category: "Costas",
        muscles: ["Grande Dorsal", "Trapézio", "Bíceps"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Apoie o peito em banco inclinado e execute remada com halteres para maior isolamento.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-chest-supported-row-back.mp4#t=0.1",
      },
      {
        id: "puxada-alta",
        name: "Puxada Alta",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps", "Trapézio"],
        equipment: "Cabo/Polia",
        difficulty: "Iniciante",
        instructions: "Sentado na máquina, puxe a barra em direção ao peito mantendo o peito erguido.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-lat-pulldown-back.mp4#t=0.1",
      },
      {
        id: "puxada-alta-supinada",
        name: "Puxada Alta Supinada",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps"],
        equipment: "Cabo/Polia",
        difficulty: "Iniciante",
        instructions: "Execute a puxada alta com pegada supinada para maior ativação dos bíceps.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-underhand-pulldown-back.mp4#t=0.1",
      },
      {
        id: "puxada-alta-larga",
        name: "Puxada Alta Pegada Larga",
        category: "Costas",
        muscles: ["Grande Dorsal", "Trapézio"],
        equipment: "Cabo/Polia",
        difficulty: "Iniciante",
        instructions: "Execute puxada com pegada mais larga focando na largura das costas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-wide-lat-pulldown-back.mp4#t=0.1",
      },
      {
        id: "puxada-alta-triangulo",
        name: "Puxada Alta Triângulo",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps", "Trapézio"],
        equipment: "Cabo/Polia",
        difficulty: "Iniciante",
        instructions: "Use pegador triangular para puxada com pegada neutra.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-v-bar-pulldown-back.mp4#t=0.1",
      },
      {
        id: "remada-sentada",
        name: "Remada Sentada",
        category: "Costas",
        muscles: ["Grande Dorsal", "Trapézio", "Bíceps"],
        equipment: "Cabo/Polia",
        difficulty: "Iniciante",
        instructions: "Sentado, puxe o cabo em direção ao abdômen mantendo as costas retas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-seated-row-back.mp4#t=0.1",
      },
      {
        id: "remada-sentada-larga",
        name: "Remada Sentada Pegada Larga",
        category: "Costas",
        muscles: ["Grande Dorsal", "Trapézio", "Ombros"],
        equipment: "Cabo/Polia",
        difficulty: "Iniciante",
        instructions: "Execute remada sentada com barra larga focando na largura das costas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-wide-seated-row-back.mp4#t=0.1",
      },
      {
        id: "remada-t-bar",
        name: "Remada T-Bar",
        category: "Costas",
        muscles: ["Grande Dorsal", "Trapézio", "Ombros"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "Use a barra T para executar remadas com pegada neutra, trabalhando o meio das costas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-t-bar-row-back.mp4#t=0.1",
      },
      {
        id: "remada-t-bar-peito-apoiado",
        name: "Remada T-Bar Peito Apoiado",
        category: "Costas",
        muscles: ["Grande Dorsal", "Trapézio", "Bíceps"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "Na máquina T-bar com apoio para o peito, execute a remada com maior isolamento.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-t-bar-row-back.mp4#t=0.1",
      },
      {
        id: "pullover",
        name: "Pullover",
        category: "Costas",
        muscles: ["Grande Dorsal", "Peito", "Tríceps"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Deitado no banco, segure um halter e execute o movimento de pullover trabalhando dorsal e peito.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-pullover-back.mp4#t=0.1",
      },
      {
        id: "pullover-cabo",
        name: "Pullover no Cabo",
        category: "Costas",
        muscles: ["Grande Dorsal", "Tríceps"],
        equipment: "Cabo/Polia",
        difficulty: "Intermediário",
        instructions: "Na polia alta, execute pullover mantendo os braços estendidos.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-pullover-back.mp4#t=0.1",
      },
      {
        id: "face-pull",
        name: "Face Pull",
        category: "Costas",
        muscles: ["Ombros Posteriores", "Trapézio", "Romboides"],
        equipment: "Cabo/Polia",
        difficulty: "Iniciante",
        instructions: "Na polia alta, puxe a corda em direção ao rosto, separando as mãos no final do movimento.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-face-pull-back.mp4#t=0.1",
      },
      {
        id: "hiperextensao",
        name: "Hiperextensão",
        category: "Costas",
        muscles: ["Lombar", "Glúteos", "Posteriores de Coxa"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "No aparelho de hiperextensão, execute o movimento controlado fortalecendo a região lombar.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-hyperextension-back.mp4#t=0.1",
      },

      // PERNAS (30 exercícios expandidos)
      {
        id: "agachamento-livre",
        name: "Agachamento Livre",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Posteriores de Coxa"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions:
          "Pés na largura dos ombros, desça como se fosse sentar numa cadeira até as coxas ficarem paralelas ao chão. Suba empurrando pelos calcanhares.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-squat-front.mp4#t=0.1",
      },
      {
        id: "agachamento-barra",
        name: "Agachamento com Barra",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Posteriores de Coxa"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "Barra apoiada nos ombros, pés na largura dos ombros. Desça mantendo o peito erguido até as coxas ficarem paralelas ao chão.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-squat-front.mp4#t=0.1",
      },
      {
        id: "agachamento-frontal",
        name: "Agachamento Frontal",
        category: "Pernas",
        muscles: ["Quadríceps", "Core", "Glúteos"],
        equipment: "Barra",
        difficulty: "Avançado",
        instructions: "Barra apoiada na frente dos ombros, execute o agachamento mantendo o tronco mais ereto.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-front-squat-front.mp4#t=0.1",
      },
      {
        id: "agachamento-sumo",
        name: "Agachamento Sumô",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Adutores"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Pés mais afastados que os ombros, pontas dos pés voltadas para fora. Desça mantendo os joelhos alinhados com os pés.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-sumo-squat-front.mp4#t=0.1",
      },
      {
        id: "agachamento-sumo-barra",
        name: "Agachamento Sumô com Barra",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Adutores"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "Execute agachamento sumô com barra nos ombros para maior resistência.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-sumo-squat-front.mp4#t=0.1",
      },
      {
        id: "agachamento-goblet",
        name: "Agachamento Goblet",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Core"],
        equipment: "Halter",
        difficulty: "Iniciante",
        instructions: "Segure um halter próximo ao peito e execute o agachamento mantendo o tronco ereto.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-goblet-squat-front.mp4#t=0.1",
      },
      {
        id: "agachamento-bulgaro",
        name: "Agachamento Búlgaro",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Com um pé apoiado atrás em um banco, execute o agachamento unilateral.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-bulgarian-split-squat-front.mp4#t=0.1",
      },
      {
        id: "agachamento-bulgaro-halter",
        name: "Agachamento Búlgaro com Halter",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Execute agachamento búlgaro segurando halteres para maior resistência.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-bulgarian-split-squat-front.mp4#t=0.1",
      },
      {
        id: "agachamento-pistol",
        name: "Agachamento Pistol",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Agachamento unilateral com uma perna estendida à frente, descendo até o chão.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-pistol-squat-front.mp4#t=0.1",
      },
      {
        id: "levantamento-terra",
        name: "Levantamento Terra",
        category: "Pernas",
        muscles: ["Posteriores de Coxa", "Glúteos", "Lombar"],
        equipment: "Barra",
        difficulty: "Avançado",
        instructions:
          "Pés na largura dos quadris, segure a barra e levante mantendo as costas retas. Empurre o quadril para frente no topo do movimento.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-deadlift-back.mp4#t=0.1",
      },
      {
        id: "terra-romeno",
        name: "Terra Romeno",
        category: "Pernas",
        muscles: ["Posteriores de Coxa", "Glúteos"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "Mantenha as pernas levemente flexionadas e desça a barra próxima às pernas, sentindo o alongamento dos posteriores.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-romanian-deadlift-back.mp4#t=0.1",
      },
      {
        id: "terra-sumo",
        name: "Terra Sumô",
        category: "Pernas",
        muscles: ["Posteriores de Coxa", "Glúteos", "Adutores"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "Com pés mais afastados e pegada mais estreita, execute o levantamento terra focando nos glúteos.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-sumo-deadlift-back.mp4#t=0.1",
      },
      {
        id: "terra-halter",
        name: "Terra com Halter",
        category: "Pernas",
        muscles: ["Posteriores de Coxa", "Glúteos", "Lombar"],
        equipment: "Halter",
        difficulty: "Iniciante",
        instructions: "Execute o levantamento terra com halteres para maior amplitude de movimento.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-deadlift-back.mp4#t=0.1",
      },
      {
        id: "terra-romeno-halter",
        name: "Terra Romeno com Halter",
        category: "Pernas",
        muscles: ["Posteriores de Coxa", "Glúteos"],
        equipment: "Halter",
        difficulty: "Iniciante",
        instructions: "Execute terra romeno com halteres focando no alongamento dos posteriores.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-romanian-deadlift-back.mp4#t=0.1",
      },
      {
        id: "terra-unilateral",
        name: "Terra Unilateral",
        category: "Pernas",
        muscles: ["Posteriores de Coxa", "Glúteos", "Core"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Execute levantamento terra com uma perna, trabalhando equilíbrio e estabilidade.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-single-leg-deadlift-back.mp4#t=0.1",
      },
      {
        id: "afundo",
        name: "Afundo",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Dê um passo à frente e desça até ambos os joelhos formarem 90°. Volte à posição inicial e alterne as pernas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-lunge-front.mp4#t=0.1",
      },
      {
        id: "afundo-halter",
        name: "Afundo com Halter",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Segure halteres nas mãos e execute o afundo com maior resistência.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-lunge-front.mp4#t=0.1",
      },
      {
        id: "afundo-reverso",
        name: "Afundo Reverso",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Dê um passo para trás e execute o afundo, retornando à posição inicial.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-reverse-lunge-front.mp4#t=0.1",
      },
      {
        id: "afundo-lateral",
        name: "Afundo Lateral",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Adutores"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Dê um passo lateral e desça flexionando uma perna enquanto a outra permanece estendida.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-lateral-lunge-front.mp4#t=0.1",
      },
      {
        id: "afundo-caminhada",
        name: "Afundo Caminhada",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Execute afundos alternados caminhando para frente continuamente.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-walking-lunge-front.mp4#t=0.1",
      },
      {
        id: "leg-press",
        name: "Leg Press",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "Na máquina leg press, posicione os pés na plataforma e empurre o peso controladamente.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-leg-press-front.mp4#t=0.1",
      },
      {
        id: "leg-press-unilateral",
        name: "Leg Press Unilateral",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos"],
        equipment: "Máquina",
        difficulty: "Intermediário",
        instructions: "Execute leg press com uma perna de cada vez para maior isolamento.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-single-leg-press-front.mp4#t=0.1",
      },
      {
        id: "cadeira-extensora",
        name: "Cadeira Extensora",
        category: "Pernas",
        muscles: ["Quadríceps"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "Sentado na máquina, estenda as pernas contra a resistência focando na contração do quadríceps.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-leg-extension-front.mp4#t=0.1",
      },
      {
        id: "mesa-flexora",
        name: "Mesa Flexora",
        category: "Pernas",
        muscles: ["Posteriores de Coxa"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "Deitado na máquina, flexione as pernas trazendo os calcanhares em direção aos glúteos.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-leg-curl-back.mp4#t=0.1",
      },
      {
        id: "cadeira-flexora",
        name: "Cadeira Flexora",
        category: "Pernas",
        muscles: ["Posteriores de Coxa"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "Sentado na máquina, flexione as pernas contra a resistência trabalhando os posteriores.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-seated-leg-curl-back.mp4#t=0.1",
      },
      {
        id: "hack-squat",
        name: "Hack Squat",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos"],
        equipment: "Máquina",
        difficulty: "Intermediário",
        instructions: "Na máquina hack squat, execute o agachamento com apoio das costas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-hack-squat-front.mp4#t=0.1",
      },
      {
        id: "step-up",
        name: "Step Up",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Suba em um banco ou step alternando as pernas, focando no controle do movimento.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-step-up-front.mp4#t=0.1",
      },
      {
        id: "step-up-halter",
        name: "Step Up com Halter",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Execute step up segurando halteres para maior resistência.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-step-up-front.mp4#t=0.1",
      },
      {
        id: "wall-sit",
        name: "Wall Sit",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Apoie as costas na parede e mantenha a posição de agachamento isométrico.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-wall-sit-front.mp4#t=0.1",
      },
      {
        id: "good-morning",
        name: "Good Morning",
        category: "Pernas",
        muscles: ["Posteriores de Coxa", "Glúteos", "Lombar"],
        equipment: "Barra",
        difficulty: "Intermediário",
        instructions: "Com barra nos ombros, incline o tronco para frente mantendo as pernas levemente flexionadas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-good-morning-back.mp4#t=0.1",
      },

      // PANTURRILHAS (10 exercícios)
      {
        id: "panturrilha-em-pe",
        name: "Panturrilha em Pé",
        category: "Panturrilhas",
        muscles: ["Panturrilhas"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Eleve-se nas pontas dos pés contraindo as panturrilhas, depois desça controladamente.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-calf-raise-back.mp4#t=0.1",
      },
      {
        id: "panturrilha-halter",
        name: "Panturrilha com Halter",
        category: "Panturrilhas",
        muscles: ["Panturrilhas"],
        equipment: "Halter",
        difficulty: "Iniciante",
        instructions: "Segure halteres e execute a elevação das panturrilhas com peso adicional.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-calf-raise-back.mp4#t=0.1",
      },
      {
        id: "panturrilha-sentada",
        name: "Panturrilha Sentada",
        category: "Panturrilhas",
        muscles: ["Sóleo"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "Sentado na máquina, eleve as panturrilhas contra a resistência focando no sóleo.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-seated-calf-raise-back.mp4#t=0.1",
      },
      {
        id: "panturrilha-maquina",
        name: "Panturrilha na Máquina",
        category: "Panturrilhas",
        muscles: ["Panturrilhas"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "Na máquina de panturrilha em pé, execute o movimento com carga controlada.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-standing-calf-raise-back.mp4#t=0.1",
      },
      {
        id: "panturrilha-unilateral",
        name: "Panturrilha Unilateral",
        category: "Panturrilhas",
        muscles: ["Panturrilhas"],
        equipment: "Halter",
        difficulty: "Intermediário",
        instructions: "Execute a elevação da panturrilha com uma perna de cada vez para maior isolamento.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-single-calf-raise-back.mp4#t=0.1",
      },
      {
        id: "panturrilha-step",
        name: "Panturrilha no Step",
        category: "Panturrilhas",
        muscles: ["Panturrilhas"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "No step ou degrau, execute a elevação com maior amplitude de movimento.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-step-calf-raise-back.mp4#t=0.1",
      },
      {
        id: "panturrilha-smith",
        name: "Panturrilha no Smith",
        category: "Panturrilhas",
        muscles: ["Panturrilhas"],
        equipment: "Máquina",
        difficulty: "Intermediário",
        instructions: "Na máquina Smith, execute a elevação das panturrilhas com barra nos ombros.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-smith-calf-raise-back.mp4#t=0.1",
      },
      {
        id: "panturrilha-leg-press",
        name: "Panturrilha no Leg Press",
        category: "Panturrilhas",
        muscles: ["Panturrilhas"],
        equipment: "Máquina",
        difficulty: "Iniciante",
        instructions: "No leg press, posicione apenas a ponta dos pés na plataforma e execute a elevação.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-leg-press-calf-raise-back.mp4#t=0.1",
      },
      {
        id: "caminhada-pontas",
        name: "Caminhada nas Pontas",
        category: "Panturrilhas",
        muscles: ["Panturrilhas", "Equilíbrio"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Caminhe nas pontas dos pés mantendo as panturrilhas contraídas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-toe-walk-back.mp4#t=0.1",
      },
      {
        id: "salto-panturrilha",
        name: "Salto de Panturrilha",
        category: "Panturrilhas",
        muscles: ["Panturrilhas", "Explosão"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Execute saltos pequenos usando apenas a força das panturrilhas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-calf-jump-back.mp4#t=0.1",
      },

      // CARDIO/FUNCIONAL (10 exercícios)
      {
        id: "burpee",
        name: "Burpee",
        category: "Cardio",
        muscles: ["Corpo Inteiro"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Agache, apoie as mãos no chão, salte para trás em prancha, faça uma flexão, volte ao agachamento e salte para cima.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-burpee-front.mp4#t=0.1",
      },
      {
        id: "jumping-jack",
        name: "Polichinelo",
        category: "Cardio",
        muscles: ["Cardio", "Pernas"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Salte abrindo pernas e braços simultaneamente, depois volte à posição inicial.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-jumping-jack-front.mp4#t=0.1",
      },
      {
        id: "high-knees",
        name: "Corrida Parada",
        category: "Cardio",
        muscles: ["Cardio", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Corra no lugar elevando os joelhos o mais alto possível alternadamente.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-high-knees-front.mp4#t=0.1",
      },
      {
        id: "butt-kicks",
        name: "Chute no Bumbum",
        category: "Cardio",
        muscles: ["Cardio", "Posteriores de Coxa"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Corra no lugar tentando tocar os glúteos com os calcanhares.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-butt-kicks-front.mp4#t=0.1",
      },
      {
        id: "star-jump",
        name: "Salto Estrela",
        category: "Cardio",
        muscles: ["Corpo Inteiro"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Salte abrindo braços e pernas formando uma estrela, depois volte à posição inicial.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-star-jump-front.mp4#t=0.1",
      },
      {
        id: "squat-jump",
        name: "Agachamento com Salto",
        category: "Cardio",
        muscles: ["Pernas", "Glúteos", "Cardio"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Execute um agachamento e exploda para cima em um salto, aterrissando suavemente.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-squat-jump-front.mp4#t=0.1",
      },
      {
        id: "lunge-jump",
        name: "Afundo com Salto",
        category: "Cardio",
        muscles: ["Pernas", "Glúteos", "Cardio"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Execute afundos alternando as pernas com saltos explosivos.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-jump-lunge-front.mp4#t=0.1",
      },
      {
        id: "bear-crawl",
        name: "Caminhada do Urso",
        category: "Cardio",
        muscles: ["Core", "Ombros", "Pernas"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Caminhe para frente apoiado nas mãos e pés, mantendo os joelhos próximos ao chão.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-bear-crawl-front.mp4#t=0.1",
      },
      {
        id: "crab-walk",
        name: "Caminhada do Caranguejo",
        category: "Cardio",
        muscles: ["Tríceps", "Core", "Glúteos"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Caminhe de costas apoiado nas mãos e pés, mantendo o quadril elevado.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-crab-walk-front.mp4#t=0.1",
      },
      {
        id: "box-step",
        name: "Subida no Caixote",
        category: "Cardio",
        muscles: ["Pernas", "Glúteos", "Cardio"],
        equipment: "Peso Corporal",
        difficulty: "Iniciante",
        instructions: "Suba e desça de um caixote ou banco alternando as pernas de forma ritmada.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-box-step-front.mp4#t=0.1",
      },

      // Exercícios adicionais do MuscleWiki
      {
        id: "flexao-pike",
        name: "Flexão Pike",
        category: "Ombros",
        muscles: ["Ombros", "Tríceps", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Em posição de V invertido, execute flexões focando nos ombros.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-pike-pushup-front.mp4#t=0.1",
      },
      {
        id: "flexao-handstand",
        name: "Flexão Handstand",
        category: "Ombros",
        muscles: ["Ombros", "Tríceps", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Na parada de mão contra a parede, execute flexões verticais.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-handstand-pushup-front.mp4#t=0.1",
      },
      {
        id: "muscle-up",
        name: "Muscle Up",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps", "Tríceps", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Combine barra fixa com paralela em um movimento fluido, passando por cima da barra.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-muscle-up-back.mp4#t=0.1",
      },
      {
        id: "archer-pullup",
        name: "Barra Fixa Archer",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Execute barra fixa transferindo o peso para um lado, estendendo o braço oposto.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-archer-pullup-back.mp4#t=0.1",
      },
      {
        id: "pistol-squat-assistido",
        name: "Agachamento Pistol Assistido",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Agachamento unilateral com apoio para desenvolver força para o pistol squat completo.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-assisted-pistol-squat-front.mp4#t=0.1",
      },
      {
        id: "shrimp-squat",
        name: "Shrimp Squat",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Agachamento unilateral segurando o pé da perna traseira, versão avançada do pistol squat.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-shrimp-squat-front.mp4#t=0.1",
      },
      {
        id: "dragon-flag",
        name: "Dragon Flag",
        category: "Abdominais",
        muscles: ["Abdominais", "Core", "Oblíquos"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Exercício avançado de core onde o corpo fica suspenso horizontalmente apoiado apenas nos ombros.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-dragon-flag-front.mp4#t=0.1",
      },
      {
        id: "human-flag",
        name: "Human Flag",
        category: "Core",
        muscles: ["Core", "Grande Dorsal", "Oblíquos"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Exercício extremamente avançado onde o corpo fica horizontal segurando uma barra vertical.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-human-flag-front.mp4#t=0.1",
      },
      {
        id: "l-sit-paralelas",
        name: "L-Sit nas Paralelas",
        category: "Abdominais",
        muscles: ["Abdominais", "Core", "Tríceps"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Mantenha o corpo suspenso com as pernas estendidas horizontalmente nas paralelas.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-l-sit-front.mp4#t=0.1",
      },
      {
        id: "front-lever",
        name: "Front Lever",
        category: "Costas",
        muscles: ["Grande Dorsal", "Core", "Ombros"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Mantenha o corpo horizontal suspenso na barra fixa com os braços estendidos.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-front-lever-back.mp4#t=0.1",
      },
      {
        id: "back-lever",
        name: "Back Lever",
        category: "Costas",
        muscles: ["Grande Dorsal", "Core", "Ombros"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Mantenha o corpo horizontal suspenso de costas para a barra com os braços estendidos.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-back-lever-back.mp4#t=0.1",
      },
      {
        id: "typewriter-pullup",
        name: "Barra Fixa Typewriter",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Na posição alta da barra fixa, mova-se lateralmente de um lado para o outro.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-typewriter-pullup-back.mp4#t=0.1",
      },
      {
        id: "planche-pushup",
        name: "Flexão Planche",
        category: "Peito",
        muscles: ["Peito", "Ombros", "Core", "Tríceps"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Flexão com o corpo suspenso horizontalmente, sem apoio dos pés.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-planche-pushup-front.mp4#t=0.1",
      },
      {
        id: "one-arm-pushup",
        name: "Flexão com Um Braço",
        category: "Peito",
        muscles: ["Peito", "Tríceps", "Core", "Ombros"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Execute flexão usando apenas um braço, mantendo o corpo alinhado.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-one-arm-pushup-front.mp4#t=0.1",
      },
      {
        id: "one-arm-pullup",
        name: "Barra Fixa com Um Braço",
        category: "Costas",
        muscles: ["Grande Dorsal", "Bíceps", "Core"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Execute barra fixa usando apenas um braço, exercício extremamente avançado.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-one-arm-pullup-back.mp4#t=0.1",
      },
      {
        id: "cossack-squat",
        name: "Agachamento Cossaco",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Adutores"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Agachamento lateral profundo alternando entre as pernas, uma flexionada e outra estendida.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-cossack-squat-front.mp4#t=0.1",
      },
      {
        id: "sissy-squat",
        name: "Sissy Squat",
        category: "Pernas",
        muscles: ["Quadríceps"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Agachamento com inclinação extrema do tronco para trás, isolando o quadríceps.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-sissy-squat-front.mp4#t=0.1",
      },
      {
        id: "nordic-curl",
        name: "Nordic Curl",
        category: "Pernas",
        muscles: ["Posteriores de Coxa"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "Ajoelhado, desça o corpo controladamente usando apenas os posteriores de coxa.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-nordic-curl-back.mp4#t=0.1",
      },
      {
        id: "glute-ham-raise",
        name: "Glute Ham Raise",
        category: "Pernas",
        muscles: ["Posteriores de Coxa", "Glúteos", "Lombar"],
        equipment: "Peso Corporal",
        difficulty: "Avançado",
        instructions: "No aparelho GHR, execute o movimento trabalhando posteriores e glúteos.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-glute-ham-raise-back.mp4#t=0.1",
      },
      {
        id: "archer-squat",
        name: "Agachamento Archer",
        category: "Pernas",
        muscles: ["Quadríceps", "Glúteos", "Adutores"],
        equipment: "Peso Corporal",
        difficulty: "Intermediário",
        instructions: "Agachamento transferindo o peso para uma perna enquanto a outra fica estendida lateralmente.",
        gif_url: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-archer-squat-front.mp4#t=0.1",
      },
    ];

    this.exercises = staticExercises;
  }

  getAllExercises(): MuscleWikiExercise[] {
    return [...this.exercises, ...this.customExercises];
  }

  getExercisesByCategory(categoryName: string): MuscleWikiExercise[] {
    const allExercises = [...this.exercises, ...this.customExercises];
    return allExercises.filter((exercise) => exercise.category.toLowerCase() === categoryName.toLowerCase());
  }

  getExercisesByMuscle(muscleName: string): MuscleWikiExercise[] {
    const allExercises = [...this.exercises, ...this.customExercises];
    return allExercises.filter((exercise) => exercise.muscles.some((muscle) => muscle.toLowerCase().includes(muscleName.toLowerCase())));
  }

  searchExercises(query: string): MuscleWikiExercise[] {
    const lowercaseQuery = query.toLowerCase();
    const allExercises = [...this.exercises, ...this.customExercises];
    return allExercises.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(lowercaseQuery) ||
        exercise.category.toLowerCase().includes(lowercaseQuery) ||
        exercise.muscles.some((muscle) => muscle.toLowerCase().includes(lowercaseQuery)) ||
        exercise.equipment.toLowerCase().includes(lowercaseQuery)
    );
  }

  getCategories(): MuscleWikiCategory[] {
    return this.categories;
  }

  getExerciseById(id: string): MuscleWikiExercise | undefined {
    const allExercises = [...this.exercises, ...this.customExercises];
    return allExercises.find((exercise) => exercise.id === id);
  }

  async clearCache() {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_EXPIRY_KEY);
      this.exercises = [];
      this.categories = [];
    } catch (error) {
      console.error("Erro ao limpar cache do MuscleWiki:", error);
    }
  }
}

export const muscleWikiService = new MuscleWikiService();
