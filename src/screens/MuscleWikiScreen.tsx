import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Dimensions,
  Image,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { muscleWikiService, MuscleWikiExercise, MuscleWikiCategory } from "../services/muscleWikiService";
import AddExerciseModal from "../components/AddExerciseModal";

const primaryOrange = "#FF6F00";
const accentColor = "#FFAB00";
const textPrimary = "#FFFFFF";
const darkCharcoal = "#1A1A1A";
const mediumGray = "#333333";
const textSecondary = "#B0BEC5";
const backgroundLight = "#F5F5F5";

const { width } = Dimensions.get("window");

const MuscleWikiScreen = () => {
  const [exercises, setExercises] = useState<MuscleWikiExercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<MuscleWikiExercise[]>([]);
  const [categories, setCategories] = useState<MuscleWikiCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<MuscleWikiExercise | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [imageErrorStates, setImageErrorStates] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [searchQuery, selectedCategory, exercises]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      await muscleWikiService.initialize();

      const allExercises = muscleWikiService.getAllExercises();
      const allCategories = muscleWikiService.getCategories();

      setExercises(allExercises);
      setCategories([{ id: "todos", name: "Todos", exercises: [] }, ...allCategories]);

      console.log(`Carregados ${allExercises.length} exercícios do MuscleWiki`);
    } catch (error) {
      console.error("Erro ao carregar exercícios do MuscleWiki:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await muscleWikiService.clearCache();
    setImageLoadingStates({});
    setImageErrorStates({});
    await loadExercises();
    setRefreshing(false);
  };

  const filterExercises = () => {
    let filtered = exercises;

    if (selectedCategory !== "Todos") {
      filtered = muscleWikiService.getExercisesByCategory(selectedCategory);
    }

    if (searchQuery.trim()) {
      filtered = muscleWikiService.searchExercises(searchQuery);
    }

    setFilteredExercises(filtered);
  };

  const handleExercisePress = (exercise: MuscleWikiExercise) => {
    setSelectedExercise(exercise);
    setModalVisible(true);
  };

  const handleExerciseAdded = () => {
    loadExercises();
  };

  const handleLongPress = (exercise: MuscleWikiExercise) => {
    if (muscleWikiService.isCustomExercise(exercise.id)) {
      Alert.alert("Remover Exercício", `Deseja remover o exercício "${exercise.name}"?`, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => removeCustomExercise(exercise.id),
        },
      ]);
    }
  };

  const removeCustomExercise = async (exerciseId: string) => {
    try {
      await muscleWikiService.removeCustomExercise(exerciseId);
      loadExercises();
      Alert.alert("Sucesso", "Exercício removido com sucesso!");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível remover o exercício");
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "iniciante":
        return "#4CAF50";
      case "intermediário":
        return "#FF9800";
      case "avançado":
        return "#F44336";
      default:
        return textSecondary;
    }
  };

  const handleImageLoadStart = (exerciseId: string) => {
    setImageLoadingStates((prev) => ({ ...prev, [exerciseId]: true }));
  };

  const handleImageLoadEnd = (exerciseId: string) => {
    setImageLoadingStates((prev) => ({ ...prev, [exerciseId]: false }));
  };

  const handleImageError = (exerciseId: string) => {
    setImageErrorStates((prev: { [key: string]: boolean }) => ({ ...prev, [exerciseId]: true }));
    setImageLoadingStates((prev: { [key: string]: boolean }) => ({ ...prev, [exerciseId]: false }));
  };

  const renderExerciseCard = ({ item }: { item: MuscleWikiExercise }) => {
    const isLoading = imageLoadingStates[item.id];
    const hasError = imageErrorStates[item.id];
    const isCustom = muscleWikiService.isCustomExercise(item.id);

    return (
      <TouchableOpacity
        style={[
          {
            backgroundColor: mediumGray,
            borderRadius: 12,
            margin: 8,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            width: (width - 48) / 2,
          },
          isCustom && {
            borderWidth: 2,
            borderColor: primaryOrange,
          },
        ]}
        onPress={() => handleExercisePress(item)}
        onLongPress={() => handleLongPress(item)}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 8,
            backgroundColor: "#f0f0f0",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            alignSelf: "center",
            position: "relative",
          }}
        >
          {isLoading && <ActivityIndicator size="small" color={primaryOrange} style={{ position: "absolute" }} />}
          {hasError || !item.gif_url ? (
            <MaterialCommunityIcons name="image-off" size={32} color={textSecondary} />
          ) : (
            <Image
              source={{ uri: item.gif_url, headers: { "User-Agent": "GymPad/1.0" } }}
              style={{ width: 80, height: 80, borderRadius: 8 }}
              onLoadStart={() => handleImageLoadStart(item.id)}
              onLoadEnd={() => handleImageLoadEnd(item.id)}
              onError={() => handleImageError(item.id)}
            />
          )}
          {isCustom && (
            <View
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                backgroundColor: primaryOrange,
                borderRadius: 8,
                padding: 2,
              }}
            >
              <Ionicons name="person" size={12} color="#fff" />
            </View>
          )}
        </View>

        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: textPrimary,
            marginBottom: 4,
            textAlign: "center",
          }}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        <Text
          style={{
            fontSize: 12,
            color: textSecondary,
            marginBottom: 8,
            textAlign: "center",
          }}
          numberOfLines={2}
        >
          {item.muscles.join(", ")}
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <MaterialCommunityIcons name="dumbbell" size={12} color={textSecondary} />
            <Text
              style={{
                fontSize: 10,
                color: textSecondary,
                marginLeft: 4,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {item.equipment}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: getDifficultyColor(item.difficulty),
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 10, color: "#fff", fontWeight: "500" }}>{item.difficulty}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryFilter = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ paddingHorizontal: 4 }}>
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={{
            backgroundColor: selectedCategory === category.name ? primaryOrange : mediumGray,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            marginHorizontal: 4,
          }}
          onPress={() => setSelectedCategory(category.name)}
        >
          <Text
            style={{
              color: textPrimary,
              fontSize: 14,
              fontWeight: selectedCategory === category.name ? "bold" : "normal",
            }}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderExerciseModal = () => (
    <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: darkCharcoal,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "85%",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 40,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                color: textPrimary,
                fontSize: 20,
                fontWeight: "bold",
                flex: 1,
              }}
            >
              {selectedExercise?.name}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="close" size={24} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedExercise?.gif_url && (
              <View style={{ marginBottom: 20, alignItems: "center" }}>
                {imageErrorStates[selectedExercise.id] ? (
                  <View
                    style={{
                      width: 200,
                      height: 200,
                      backgroundColor: darkCharcoal,
                      borderRadius: 12,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <MaterialCommunityIcons name="image-off" size={64} color={textSecondary} />
                  </View>
                ) : (
                  <View style={{ position: "relative" }}>
                    <Image
                      source={{
                        uri: selectedExercise.gif_url,
                        headers: {
                          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
                        },
                      }}
                      style={{
                        width: 200,
                        height: 200,
                        borderRadius: 12,
                      }}
                      resizeMode="cover"
                    />
                    {muscleWikiService.isCustomExercise(selectedExercise.id) && (
                      <View
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          backgroundColor: primaryOrange,
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="person" size={14} color="#fff" />
                        <Text style={{ color: "#fff", fontSize: 12, marginLeft: 4, fontWeight: "600" }}>Personalizado</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={{ flexDirection: "row", marginBottom: 16, flexWrap: "wrap" }}>
              <View
                style={{
                  backgroundColor: accentColor,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: darkCharcoal, fontSize: 12, fontWeight: "bold" }}>{selectedExercise?.category}</Text>
              </View>

              <View
                style={{
                  backgroundColor: getDifficultyColor(selectedExercise?.difficulty || ""),
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold" }}>{selectedExercise?.difficulty}</Text>
              </View>

              <View
                style={{
                  backgroundColor: mediumGray,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: textPrimary, fontSize: 12, fontWeight: "bold" }}>{selectedExercise?.equipment}</Text>
              </View>
            </View>

            {selectedExercise?.muscles && selectedExercise.muscles.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    color: accentColor,
                    fontSize: 16,
                    fontWeight: "bold",
                    marginBottom: 8,
                  }}
                >
                  Músculos Trabalhados
                </Text>
                <Text style={{ color: textPrimary, fontSize: 14 }}>{selectedExercise.muscles.join(", ")}</Text>
              </View>
            )}

            {selectedExercise?.instructions && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    color: accentColor,
                    fontSize: 16,
                    fontWeight: "bold",
                    marginBottom: 8,
                  }}
                >
                  Como Executar
                </Text>
                <Text
                  style={{
                    color: textPrimary,
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                >
                  {selectedExercise.instructions}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: darkCharcoal,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={primaryOrange} />
        <Text
          style={{
            color: textSecondary,
            marginTop: 16,
            fontSize: 16,
          }}
        >
          Carregando exercícios...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: darkCharcoal }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      enabled={true}
    >
      <View style={{ flex: 1, backgroundColor: darkCharcoal }}>
        <View style={{ padding: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <TextInput
              style={{
                backgroundColor: mediumGray,
                color: textPrimary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                flex: 1,
              }}
              placeholder="Buscar exercícios..."
              placeholderTextColor={textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              blurOnSubmit={true}
            />
            <TouchableOpacity
              onPress={handleRefresh}
              style={{
                backgroundColor: primaryOrange,
                borderRadius: 12,
                padding: 12,
                marginLeft: 8,
              }}
            >
              <MaterialCommunityIcons name="refresh" size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>

          {renderCategoryFilter()}

          <View style={styles.header}>
            <Text style={styles.title}>Exercícios ({filteredExercises.length})</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MaterialCommunityIcons name="dumbbell" size={16} color={primaryOrange} />
            <Text
              style={{
                color: textSecondary,
                fontSize: 14,
                marginLeft: 8,
              }}
            >
              {filteredExercises.length} exercícios disponíveis
            </Text>
          </View>
        </View>

        <FlatList
          data={filteredExercises}
          renderItem={renderExerciseCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{ padding: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[primaryOrange]} />}
          keyboardShouldPersistTaps="handled"
        />

        {renderExerciseModal()}

        <AddExerciseModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} onExerciseAdded={handleExerciseAdded} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: backgroundLight,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: textPrimary,
  },
  addButton: {
    backgroundColor: primaryOrange,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default MuscleWikiScreen;
