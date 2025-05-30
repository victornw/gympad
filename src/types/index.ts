export interface ExerciseSet {
  id: string;
  weight?: number; // Single field for weight
  unit?: "kg" | "bricks"; // Unit for the weight
  reps: number;
  isBestSet?: boolean; // To mark the best set
}

export interface DailyNote {
  id: string;
  date: string; // ISO date string
  bodyWeight?: number;
  exercises: {
    [exerciseName: string]: {
      sets: ExerciseSet[];
      bestSetId?: string; // ID of the best set for this exercise on this day
    };
  };
}

export interface RoutineExercise {
  name: string;
  sets: number;
  reps: string; // e.g., "8-12" or "15"
  notes?: string;
}

export interface RoutineDay {
  dayName?: string; // Optional name for the day, e.g., "Push", "Upper", "Day 1"
  exercises: RoutineExercise[];
}

export interface TrainRoutine {
  id: string;
  name: string;
  numberOfDays: number; // To store how many days/splits this routine has
  days: RoutineDay[]; // Array of days, each with exercises
}

// To store known exercise names for suggestions
export type KnownExerciseNames = Set<string>;
