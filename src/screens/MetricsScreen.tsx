import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DailyNote, KnownExerciseNames, ExerciseSet } from "../types";
import {
  format,
  parseISO,
  startOfWeek,
  startOfMonth,
  addDays,
  isSameDay,
  startOfDay,
  subDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";
import { useFocusEffect } from "@react-navigation/native";

const NOTES_STORAGE_KEY = "@GymPad:notes";
const KNOWN_EXERCISES_STORAGE_KEY = "@GymPad:knownExercises";
const screenWidth = Dimensions.get("window").width;

const chartPaddingRight = Platform.OS === "android" ? 45 : 30;

// NEW COLOR PALETTE (same as NotesScreen for consistency)
const primaryOrange = "#FF6F00";
const darkCharcoal = "#1A1A1A";
const mediumGray = "#333333";
const lightGray = "#4D4D4D";
const textPrimary = "#FFFFFF";
const textSecondary = "#B0BEC5";
const accentColor = "#FFAB00";

const baseChartConfig = {
  backgroundColor: mediumGray,
  backgroundGradientFrom: mediumGray,
  backgroundGradientTo: mediumGray,
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(255, 111, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(176, 190, 197, ${opacity})`,
  style: {
    borderRadius: 8,
  },
  propsForDots: {
    r: "5",
    strokeWidth: "2",
    stroke: accentColor,
  },
  propsForBackgroundLines: {
    strokeDasharray: "",
    strokeWidth: StyleSheet.hairlineWidth,
    stroke: lightGray,
  },
  propsForLabels: {
    fontSize: 12,
  },
};

// Helper to prepare data for line charts
const prepareLineChartData = (rawData: number[], unit: "kg" | "bricks" | "reps") => {
  if (rawData.length === 0) return [];

  const validData = rawData.filter((val) => typeof val === "number" && !isNaN(val) && isFinite(val));
  if (validData.length === 0) return [];

  if (validData.length === 1) return [validData[0], validData[0]];

  const allSame = validData.every((val) => val === validData[0]);
  if (allSame) {
    return validData;
  }

  return validData;
};

const getChartSegments = (data: number[], isBarChart = false) => {
  if (!data || data.length === 0) return isBarChart ? 2 : 3;
  const uniqueData = Array.from(new Set(data.filter((d) => typeof d === "number" && !isNaN(d))));
  if (uniqueData.length === 0) return isBarChart ? 2 : 3;
  if (uniqueData.length === 1) return 2;
  return isBarChart ? Math.min(Math.max(2, Math.round(Math.max(...uniqueData))), 6) : Math.min(Math.max(3, uniqueData.length), 5);
};

const MetricsScreen = () => {
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [knownExerciseNames, setKnownExerciseNames] = useState<KnownExerciseNames>(new Set());
  const [selectedExercise, setSelectedExercise] = useState<string | undefined>(undefined);
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [isLoading, setIsLoading] = useState(true);

  const loadDataAsync = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      const parsedNotes: DailyNote[] = storedNotes ? JSON.parse(storedNotes) : [];
      setNotes(parsedNotes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

      const storedNames = await AsyncStorage.getItem(KNOWN_EXERCISES_STORAGE_KEY);
      const names = new Set<string>(storedNames ? JSON.parse(storedNames) : []);
      setKnownExerciseNames(names);

      if (names.size > 0) {
        if (!selectedExercise || !names.has(selectedExercise)) {
          setSelectedExercise(Array.from(names)[0]);
        }
      } else {
        setSelectedExercise(undefined);
      }
    } catch (e) {
      console.error("Failed to load data for Metrics", e);
      setNotes([]);
      setKnownExerciseNames(new Set());
      setSelectedExercise(undefined);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDataAsync();
      return () => {}; // Optional cleanup function
    }, [loadDataAsync])
  );

  // Chart Data Calculations
  const bodyWeightChartData = useMemo(() => {
    const relevantNotes = notes.filter((note) => typeof note.bodyWeight === "number" && note.bodyWeight > 0);
    if (relevantNotes.length === 0) return null;

    const dataLabels = relevantNotes.map((note) => format(parseISO(note.date), "MMM d"));
    const rawDataValues = relevantNotes.map((note) => note.bodyWeight!);
    const chartDisplayData = prepareLineChartData(rawDataValues, "kg");

    if (chartDisplayData.length < 2 && rawDataValues.length === 1) {
      // Single original point, labels need to be adjusted for the duplicated point
      return {
        labels: [dataLabels[0], format(addDays(parseISO(relevantNotes[0].date), 1), "MMM d")],
        datasets: [{ data: chartDisplayData, legendLabel: "Body Weight", unit: "kg" }],
      };
    }
    if (chartDisplayData.length < 2) return null; // Not enough data to form a line

    // Ensure labels match the data length if prepareLineChartData changed it (e.g. single point duplication)
    const finalLabels =
      chartDisplayData.length !== dataLabels.length && dataLabels.length === 1
        ? [dataLabels[0], format(addDays(parseISO(relevantNotes[0].date), 1), "MMM d")]
        : dataLabels;

    return {
      labels: finalLabels,
      datasets: [{ data: chartDisplayData, legendLabel: "Body Weight", unit: "kg" }],
    };
  }, [notes]);

  const workoutFrequencyChartData = useMemo(() => {
    if (notes.length === 0) return null;

    const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStartDate, i));
    const labels = ["S", "M", "T", "W", "T", "F", "S"]; // Sunday to Saturday

    const data = daysOfWeek.map((day) => (notes.some((note) => isSameDay(startOfDay(parseISO(note.date)), day)) ? 1 : 0));

    if (labels.length === 0) return null;

    return {
      labels,
      datasets: [{ data, legendLabel: "Workouts" }],
    };
  }, [notes, currentWeekStartDate]);

  const handlePreviousWeek = () => {
    setCurrentWeekStartDate((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStartDate((prev) => addWeeks(prev, 1));
  };

  const currentWeekDisplayRange = useMemo(() => {
    const endDate = addDays(currentWeekStartDate, 6);
    return `${format(currentWeekStartDate, "MMM dd")} - ${format(endDate, "MMM dd, yyyy")}`;
  }, [currentWeekStartDate]);

  const exerciseWeightChartData = useMemo(() => {
    if (!selectedExercise) return null;
    const relevantNotes = notes.filter((note) => note.exercises[selectedExercise!]);
    if (relevantNotes.length === 0) return null;

    let unit: "kg" | "bricks" = "kg";
    const weights: number[] = [];
    const dataLabels: string[] = [];

    relevantNotes.forEach((note) => {
      const bestSet = note.exercises[selectedExercise!]?.sets.find((s) => s.isBestSet && typeof s.weight === "number");
      if (bestSet) {
        weights.push(bestSet.weight!);
        dataLabels.push(format(parseISO(note.date), "MMM d"));
        if (bestSet.unit) unit = bestSet.unit;
      }
    });
    const numericWeights = weights.filter((w) => typeof w === "number" && !isNaN(w));
    if (numericWeights.length === 0) return null;

    const chartDisplayData = prepareLineChartData(numericWeights, unit);

    if (chartDisplayData.length < 2 && numericWeights.length === 1) {
      return {
        labels: [
          dataLabels[0],
          format(
            addDays(
              parseISO(
                relevantNotes.find((n) => n.exercises[selectedExercise!]?.sets.find((s) => s.isBestSet && s.weight === numericWeights[0]))!.date
              ),
              1
            ),
            "MMM d"
          ),
        ],
        datasets: [{ data: chartDisplayData, legendLabel: `Weight (${unit})`, unit }],
      };
    }
    if (chartDisplayData.length < 2) return null;

    const finalLabels =
      chartDisplayData.length !== dataLabels.length && dataLabels.length === 1
        ? [
            dataLabels[0],
            format(
              addDays(
                parseISO(
                  relevantNotes.find((n) => n.exercises[selectedExercise!]?.sets.find((s) => s.isBestSet && s.weight === numericWeights[0]))!.date
                ),
                1
              ),
              "MMM d"
            ),
          ]
        : dataLabels;

    return {
      labels: finalLabels,
      datasets: [{ data: chartDisplayData, legendLabel: `Weight (${unit})`, unit }],
    };
  }, [notes, selectedExercise]);

  const exerciseRepsChartData = useMemo(() => {
    if (!selectedExercise) return null;
    const relevantNotes = notes.filter((note) => note.exercises[selectedExercise!]);
    if (relevantNotes.length === 0) return null;

    const reps: number[] = [];
    const dataLabels: string[] = [];

    relevantNotes.forEach((note) => {
      const bestSet = note.exercises[selectedExercise!]?.sets.find((s) => s.isBestSet && typeof s.reps === "number");
      if (bestSet) {
        reps.push(bestSet.reps!);
        dataLabels.push(format(parseISO(note.date), "MMM d"));
      }
    });
    const numericReps = reps.filter((r) => typeof r === "number" && !isNaN(r));
    if (numericReps.length === 0) return null;

    const chartDisplayData = prepareLineChartData(numericReps, "reps");

    if (chartDisplayData.length < 2 && numericReps.length === 1) {
      return {
        labels: [
          dataLabels[0],
          format(
            addDays(
              parseISO(relevantNotes.find((n) => n.exercises[selectedExercise!]?.sets.find((s) => s.isBestSet && s.reps === numericReps[0]))!.date),
              1
            ),
            "MMM d"
          ),
        ],
        datasets: [{ data: chartDisplayData, legendLabel: "Reps", unit: "reps" }],
      };
    }
    if (chartDisplayData.length < 2) return null;

    const finalLabels =
      chartDisplayData.length !== dataLabels.length && dataLabels.length === 1
        ? [
            dataLabels[0],
            format(
              addDays(
                parseISO(relevantNotes.find((n) => n.exercises[selectedExercise!]?.sets.find((s) => s.isBestSet && s.reps === numericReps[0]))!.date),
                1
              ),
              "MMM d"
            ),
          ]
        : dataLabels;
    return {
      labels: finalLabels,
      datasets: [{ data: chartDisplayData, legendLabel: "Reps", unit: "reps" }],
    };
  }, [notes, selectedExercise]);

  // Render Chart Component
  const renderAppChart = (
    chartData: { labels: string[]; datasets: { data: number[]; legendLabel?: string; unit?: string; color?: (opacity: number) => string }[] } | null,
    type: "line" | "bar",
    title: string
  ) => {
    if (
      !chartData ||
      !Array.isArray(chartData.labels) ||
      !Array.isArray(chartData.datasets) ||
      !chartData.datasets[0] ||
      !Array.isArray(chartData.datasets[0].data) ||
      chartData.datasets[0].data.length === 0
    ) {
      return (
        <View style={styles.chartCard}>
          {title ? <Text style={styles.chartHeader}>{title}</Text> : null}
          <Text style={styles.placeholderText}>
            {typeof title === "string" && title.length > 0 ? `No data available for ${title}.` : "No data available."}
          </Text>
        </View>
      );
    }

    const dataset = chartData.datasets[0];
    const numericData = dataset.data.filter((d) => typeof d === "number" && !isNaN(d));
    if (numericData.length === 0 && type !== "bar") {
      return (
        <View style={styles.chartCard}>
          {title ? <Text style={styles.chartHeader}>{title}</Text> : null}
          <Text style={styles.placeholderText}>
            {typeof title === "string" && title.length > 0 ? `Not enough numeric data for ${title}.` : "Not enough numeric data."}
          </Text>
        </View>
      );
    }

    const safeLabels = Array.isArray(chartData.labels) ? chartData.labels.map((l) => String(l)) : [];

    const isWeightChart = type === "line" && (dataset.unit === "kg" || dataset.unit === "bricks");
    const chartDecimalPlaces = dataset.unit === "kg" ? 1 : 0;
    const yAxisSuffix = dataset.unit && dataset.unit !== "reps" ? ` ${dataset.unit}` : dataset.unit === "reps" ? " reps" : "";
    let segments = getChartSegments(numericData, type === "bar");

    if (isWeightChart && numericData.length > 0) {
      const maxValue = Math.max(...numericData);
      if (maxValue > 0) {
        if (maxValue <= 25) segments = Math.min(5, Math.max(2, Math.ceil(maxValue / 5)));
        else if (maxValue <= 50) segments = Math.min(5, Math.max(3, Math.ceil(maxValue / 10) * 2));
        else segments = Math.min(6, Math.max(4, Math.ceil(maxValue / 20)));
        segments = Math.max(segments, 2);
      }
    }

    const currentChartConfig = {
      ...baseChartConfig,
      decimalPlaces: chartDecimalPlaces,
      color: dataset.color ? (opacity = 1) => dataset.color!(opacity) : baseChartConfig.color,
    };

    const chartSpecificProps: any = {
      yAxisLabel: "",
      yAxisSuffix,
      segments,
      width: screenWidth - 20,
      height: 220,
      chartConfig: currentChartConfig,
      style: { ...baseChartConfig.style, paddingRight: chartPaddingRight, marginLeft: -15 },
    };

    if (type === "bar") {
      chartSpecificProps.showValuesOnTopOfBars = true;
      chartSpecificProps.withHorizontalLabels = true;
      chartSpecificProps.propsForBackgroundLines = { strokeWidth: 0 };
      chartSpecificProps.height = 180;
      chartSpecificProps.barPercentage = 0.7;
      if (numericData.every((d) => d === 0 || d === 1)) {
        chartSpecificProps.segments = 2;
      }
    } else if (type === "line") {
      chartSpecificProps.fromZero = isWeightChart;
      chartSpecificProps.bezier = false;
    }

    return (
      <View style={styles.chartCard}>
        {title ? <Text style={styles.chartHeader}>{title}</Text> : null}
        {type === "line" ? (
          <LineChart data={{ ...chartData, labels: safeLabels }} {...chartSpecificProps} />
        ) : (
          <BarChart data={{ ...chartData, labels: safeLabels }} {...chartSpecificProps} />
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryOrange} />
        <Text style={styles.loadingText}>Loading metrics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {renderAppChart(bodyWeightChartData, "line", "Body Weight")}

      <View style={styles.chartCard}>
        <Text style={styles.sectionHeader}>Workout Frequency</Text>
        <View style={styles.weekNavigationContainer}>
          <TouchableOpacity onPress={handlePreviousWeek} style={styles.weekNavButton}>
            <Text style={styles.weekNavButtonText}>{"< PREV"}</Text>
          </TouchableOpacity>
          <Text style={styles.weekDateRange}>{currentWeekDisplayRange}</Text>
          <TouchableOpacity onPress={handleNextWeek} style={styles.weekNavButton}>
            <Text style={styles.weekNavButtonText}>{"NEXT >"}</Text>
          </TouchableOpacity>
        </View>
        {workoutFrequencyChartData && workoutFrequencyChartData.datasets[0].data.length > 0 ? (
          renderAppChart(workoutFrequencyChartData, "bar", "")
        ) : (
          <Text style={styles.placeholderText}>Log workouts for frequency data.</Text>
        )}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionHeader}>Exercise Evolution</Text>
        {knownExerciseNames.size > 0 ? (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedExercise}
              onValueChange={(itemValue: string) => setSelectedExercise(itemValue)}
              style={styles.picker}
              dropdownIconColor={textPrimary}
            >
              {Array.from(knownExerciseNames).map((name) => (
                <Picker.Item
                  key={name}
                  label={name}
                  value={name}
                  style={styles.pickerItem}
                  color={Platform.OS === "android" ? textPrimary : undefined}
                />
              ))}
            </Picker>
          </View>
        ) : (
          <Text style={styles.placeholderText}>Log exercises to see evolution.</Text>
        )}
        {selectedExercise && (
          <>
            {renderAppChart(exerciseWeightChartData, "line", `Weight (${exerciseWeightChartData?.datasets[0].unit || ""})`)}
            {renderAppChart(exerciseRepsChartData, "line", "Reps")}
          </>
        )}
        {!selectedExercise && knownExerciseNames.size > 0 && <Text style={styles.placeholderText}>Select an exercise.</Text>}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkCharcoal,
    paddingHorizontal: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: darkCharcoal,
  },
  loadingText: {
    // Added style for loading text
    color: textPrimary,
    marginTop: 10,
    fontSize: 16,
  },
  chartCard: {
    marginVertical: 15,
    backgroundColor: mediumGray,
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 5,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderTopWidth: 3,
    borderTopColor: primaryOrange,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    color: primaryOrange,
    textTransform: "uppercase",
  },
  chartHeader: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
    color: textPrimary,
  },
  placeholderText: {
    textAlign: "center",
    paddingVertical: 30,
    color: textSecondary,
    fontSize: 15,
    fontStyle: "italic",
  },
  pickerWrapper: {
    // Wrapper for picker styling
    backgroundColor: mediumGray,
    borderWidth: 1,
    borderColor: lightGray,
    borderRadius: 8,
    marginBottom: 15,
    marginHorizontal: 10, // Add some horizontal margin
    overflow: "hidden", // For borderRadius on Android picker
  },
  picker: {
    height: 50,
    color: textPrimary, // For selected value color on iOS and Android (sometimes)
  },
  pickerItem: {
    // Primarily for iOS item styling
    color: textPrimary, // This may not work on Android, handled by <Picker.Item color...>
    backgroundColor: mediumGray, // iOS item background
  },
  weekNavigationContainer: {
    flexDirection: "row",
    justifyContent: "space-around", // Better spacing
    alignItems: "center",
    paddingHorizontal: 5,
    marginBottom: 15,
  },
  weekNavButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: primaryOrange,
  },
  weekNavButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: textPrimary,
    textTransform: "uppercase",
  },
  weekDateRange: {
    fontSize: 16,
    fontWeight: "600",
    color: textPrimary,
  },
});

export default MetricsScreen;
