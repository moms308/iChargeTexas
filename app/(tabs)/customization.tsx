import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { useTheme, COLOR_SCHEMES, ThemeSettings } from "@/constants/themeContext";
import * as ImagePicker from "expo-image-picker";
import { Check, Upload, Palette, Type, Image as ImageIcon, Save, Truck, Zap, MapPin, Send, X } from "lucide-react-native";

export default function CustomizationScreen() {
  const { theme, colors, setTheme } = useTheme();
  const [businessNameInput, setBusinessNameInput] = useState(theme.businessName);
  const [selectedSchemeId, setSelectedSchemeId] = useState(theme.colorScheme.id);
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState<string | null>(theme.backgroundImage);
  const [selectedIcons, setSelectedIcons] = useState(theme.customIcons || {
    roadsideButton: null,
    chargingButton: null,
    locationButton: null,
    submitButton: null,
  });
  const [selectedButtonImages, setSelectedButtonImages] = useState<ThemeSettings["customButtonImages"]>({
    roadsideMascot: theme.customButtonImages?.roadsideMascot ?? null,
    chargingMascot: theme.customButtonImages?.chargingMascot ?? null,
    serviceSharedMascot: theme.customButtonImages?.serviceSharedMascot ?? null,
  });
  const [selectedButtonColors, setSelectedButtonColors] = useState(theme.customButtonColors || {
    roadsideBackground: null,
    chargingBackground: null,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);



  const handlePickImage = async () => {
    if (Platform.OS === 'web') {
      Alert.alert("Not Available", "Image upload is not available on web. Please provide an image URL.");
      return;
    }

    console.log("Requesting media library permissions...");
    
    const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    console.log("Current permission status:", existingStatus);
    
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = status;
      console.log("Permission request result:", status);
    }

    if (finalStatus !== 'granted') {
      console.log("Permission denied, showing settings alert");
      
      Alert.alert(
        "Photo Library Access Required",
        "To upload a background image, this app needs access to your photo library. Would you like to open Settings to enable photo access?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => console.log("User cancelled settings navigation")
          },
          {
            text: "Open Settings",
            onPress: async () => {
              console.log("Opening app settings...");
              await Linking.openSettings();
            }
          }
        ]
      );
      return;
    }

    console.log("Permission granted, launching image library...");

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      console.log("Image picker result:", result);

      if (!result.canceled && result.assets[0]) {
        console.log("Image selected:", result.assets[0].uri);
        setSelectedBackgroundImage(result.assets[0].uri);
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleRemoveBackground = () => {
    Alert.alert(
      "Remove Background",
      "Are you sure you want to remove the background image?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => {
            setSelectedBackgroundImage(null);
            setHasUnsavedChanges(true);
          }
        }
      ]
    );
  };

  const handleSelectColorScheme = (schemeId: string) => {
    setSelectedSchemeId(schemeId);
    setHasUnsavedChanges(true);
  };

  const handleSaveAllChanges = async () => {
    const selectedScheme = COLOR_SCHEMES.find(s => s.id === selectedSchemeId);
    if (!selectedScheme) {
      Alert.alert("Error", "Invalid color scheme selected");
      return;
    }

    if (!businessNameInput.trim()) {
      Alert.alert("Error", "Business name cannot be empty");
      return;
    }

    try {
      await setTheme({
        businessName: businessNameInput.trim(),
        backgroundImage: selectedBackgroundImage,
        colorScheme: selectedScheme,
        customIcons: selectedIcons,
        customButtonImages: selectedButtonImages,
        customButtonColors: selectedButtonColors,
      });
      setHasUnsavedChanges(false);
      Alert.alert("Success", "All changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Type size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Business Name
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            This name will appear at the top of your application
          </Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.surface, 
              borderColor: colors.border,
              color: colors.text 
            }]}
            value={businessNameInput}
            onChangeText={(text) => {
              setBusinessNameInput(text);
              setHasUnsavedChanges(true);
            }}
            placeholder="Enter business name"
            placeholderTextColor={colors.textTertiary}
          />

        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ImageIcon size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Background Image
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Customize the background of your application
          </Text>
          
          {selectedBackgroundImage ? (
            <View style={styles.imagePreview}>
              <Text style={[styles.imagePreviewText, { color: colors.textSecondary }]}>
                Background image is set
              </Text>
              <TouchableOpacity
                style={[styles.buttonSecondary, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.error,
                  borderWidth: 1 
                }]}
                onPress={handleRemoveBackground}
              >
                <Text style={[styles.buttonTextSecondary, { color: colors.error }]}>
                  Remove Background
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
          
          <TouchableOpacity
            style={[styles.buttonSecondary, { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1 
            }]}
            onPress={handlePickImage}
          >
            <Upload size={20} color={colors.primary} />
            <Text style={[styles.buttonTextSecondary, { color: colors.text, marginLeft: 8 }]}>
              {selectedBackgroundImage ? "Change Background Image" : "Upload Background Image"}
            </Text>
          </TouchableOpacity>
          
          {Platform.OS === 'web' && (
            <Text style={[styles.note, { color: colors.textTertiary }]}>
              Note: Image upload is not available on web
            </Text>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ImageIcon size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Service Button Mascots & Colors
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Customize the mascot image and background color for service buttons (the robot guy and button color)
          </Text>
          
          <View style={styles.buttonCustomizationList}>
            <View style={[styles.buttonCustomItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.buttonCustomHeader}>
                <ImageIcon size={20} color={colors.primary} />
                <Text style={[styles.buttonCustomLabel, { color: colors.text }]}>service buttons</Text>
              </View>
              <Text style={[styles.buttonCustomSubLabel, { color: colors.textSecondary }]}>
                Apply a single image to replace the little robot on both Roadside Assistance and Schedule Charging buttons.
              </Text>
              <View style={styles.iconActions}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      Alert.alert("Not Available", "Image upload is not available on web.");
                      return;
                    }
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert("Permission Required", "Photo library access is required.");
                      return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ["images"],
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 1,
                    });
                    if (!result.canceled && result.assets[0]) {
                      setSelectedButtonImages({
                        ...selectedButtonImages,
                        serviceSharedMascot: result.assets[0].uri,
                      });
                      setHasUnsavedChanges(true);
                    }
                  }}
                >
                  <Upload size={16} color={colors.white} />
                  <Text style={[styles.iconButtonText, { color: colors.white }]}>Upload</Text>
                </TouchableOpacity>
                {selectedButtonImages?.serviceSharedMascot && (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: colors.error }]}
                    onPress={() => {
                      setSelectedButtonImages({
                        ...selectedButtonImages,
                        serviceSharedMascot: null,
                      });
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <X size={16} color={colors.white} />
                    <Text style={[styles.iconButtonText, { color: colors.white }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              {selectedButtonImages?.serviceSharedMascot && (
                <Text style={[styles.buttonCustomSubLabel, { color: colors.textSecondary }]}>
                  Shared icon applied to both service buttons.
                </Text>
              )}
            </View>

            <View style={[styles.buttonCustomItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.buttonCustomHeader}>
                <Truck size={20} color={colors.roadside} />
                <Text style={[styles.buttonCustomLabel, { color: colors.text }]}>Roadside Assistance Button</Text>
              </View>
              
              <View style={styles.buttonCustomSection}>
                <Text style={[styles.buttonCustomSubLabel, { color: colors.textSecondary }]}>Mascot Image (Robot Guy)</Text>
                <View style={styles.iconActions}>
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      if (Platform.OS === 'web') {
                        Alert.alert("Not Available", "Image upload is not available on web.");
                        return;
                      }
                      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (status !== 'granted') {
                        Alert.alert("Permission Required", "Photo library access is required.");
                        return;
                      }
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ["images"],
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 1,
                      });
                      if (!result.canceled && result.assets[0]) {
                        setSelectedButtonImages({
                          ...selectedButtonImages,
                          roadsideMascot: result.assets[0].uri,
                        });
                        setHasUnsavedChanges(true);
                      }
                    }}
                  >
                    <Upload size={16} color={colors.white} />
                    <Text style={[styles.iconButtonText, { color: colors.white }]}>Upload</Text>
                  </TouchableOpacity>
                  {selectedButtonImages?.roadsideMascot && (
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: colors.error }]}
                      onPress={() => {
                        setSelectedButtonImages({
                          ...selectedButtonImages,
                          roadsideMascot: null,
                        });
                        setHasUnsavedChanges(true);
                      }}
                    >
                      <X size={16} color={colors.white} />
                      <Text style={[styles.iconButtonText, { color: colors.white }]}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.buttonCustomSection}>
                <Text style={[styles.buttonCustomSubLabel, { color: colors.textSecondary }]}>Background Color (Hex)</Text>
                <View style={{ flexDirection: 'row' as const, gap: 8, alignItems: 'center' as const }}>
                  <TextInput
                    style={[styles.colorInput, { 
                      backgroundColor: colors.background, 
                      borderColor: colors.border,
                      color: colors.text 
                    }]}
                    value={selectedButtonColors?.roadsideBackground || ''}
                    onChangeText={(text) => {
                      setSelectedButtonColors({
                        ...selectedButtonColors,
                        roadsideBackground: text || null,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="#FF0000"
                    placeholderTextColor={colors.textTertiary}
                  />
                  {selectedButtonColors?.roadsideBackground && (
                    <View style={[styles.colorPreviewBox, { backgroundColor: selectedButtonColors.roadsideBackground }]} />
                  )}
                  {selectedButtonColors?.roadsideBackground && (
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: colors.error, paddingHorizontal: 10 }]}
                      onPress={() => {
                        setSelectedButtonColors({
                          ...selectedButtonColors,
                          roadsideBackground: null,
                        });
                        setHasUnsavedChanges(true);
                      }}
                    >
                      <X size={16} color={colors.white} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <View style={[styles.buttonCustomItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.buttonCustomHeader}>
                <Zap size={20} color={colors.charging} />
                <Text style={[styles.buttonCustomLabel, { color: colors.text }]}>Schedule Charging Button</Text>
              </View>
              
              <View style={styles.buttonCustomSection}>
                <Text style={[styles.buttonCustomSubLabel, { color: colors.textSecondary }]}>Mascot Image (Robot Guy)</Text>
                <View style={styles.iconActions}>
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      if (Platform.OS === 'web') {
                        Alert.alert("Not Available", "Image upload is not available on web.");
                        return;
                      }
                      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (status !== 'granted') {
                        Alert.alert("Permission Required", "Photo library access is required.");
                        return;
                      }
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ["images"],
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 1,
                      });
                      if (!result.canceled && result.assets[0]) {
                        setSelectedButtonImages({
                          ...selectedButtonImages,
                          chargingMascot: result.assets[0].uri,
                        });
                        setHasUnsavedChanges(true);
                      }
                    }}
                  >
                    <Upload size={16} color={colors.white} />
                    <Text style={[styles.iconButtonText, { color: colors.white }]}>Upload</Text>
                  </TouchableOpacity>
                  {selectedButtonImages?.chargingMascot && (
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: colors.error }]}
                      onPress={() => {
                        setSelectedButtonImages({
                          ...selectedButtonImages,
                          chargingMascot: null,
                        });
                        setHasUnsavedChanges(true);
                      }}
                    >
                      <X size={16} color={colors.white} />
                      <Text style={[styles.iconButtonText, { color: colors.white }]}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.buttonCustomSection}>
                <Text style={[styles.buttonCustomSubLabel, { color: colors.textSecondary }]}>Background Color (Hex)</Text>
                <View style={{ flexDirection: 'row' as const, gap: 8, alignItems: 'center' as const }}>
                  <TextInput
                    style={[styles.colorInput, { 
                      backgroundColor: colors.background, 
                      borderColor: colors.border,
                      color: colors.text 
                    }]}
                    value={selectedButtonColors?.chargingBackground || ''}
                    onChangeText={(text) => {
                      setSelectedButtonColors({
                        ...selectedButtonColors,
                        chargingBackground: text || null,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="#10B981"
                    placeholderTextColor={colors.textTertiary}
                  />
                  {selectedButtonColors?.chargingBackground && (
                    <View style={[styles.colorPreviewBox, { backgroundColor: selectedButtonColors.chargingBackground }]} />
                  )}
                  {selectedButtonColors?.chargingBackground && (
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: colors.error, paddingHorizontal: 10 }]}
                      onPress={() => {
                        setSelectedButtonColors({
                          ...selectedButtonColors,
                          chargingBackground: null,
                        });
                        setHasUnsavedChanges(true);
                      }}
                    >
                      <X size={16} color={colors.white} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ImageIcon size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Button Icons
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Customize small icons for service buttons (like the truck and lightning symbols)
          </Text>
          
          <View style={styles.iconsList}>
            <View style={[styles.iconItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.iconItemHeader}>
                <Truck size={20} color={colors.roadside} />
                <Text style={[styles.iconItemLabel, { color: colors.text }]}>Roadside Assistance Button</Text>
              </View>
              <View style={styles.iconActions}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      Alert.alert("Not Available", "Image upload is not available on web.");
                      return;
                    }
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert("Permission Required", "Photo library access is required.");
                      return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ["images"],
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 1,
                    });
                    if (!result.canceled && result.assets[0]) {
                      const updatedIcons = {
                        roadsideButton: result.assets[0].uri,
                        chargingButton: selectedIcons?.chargingButton || null,
                        locationButton: selectedIcons?.locationButton || null,
                        submitButton: selectedIcons?.submitButton || null,
                      };
                      setSelectedIcons(updatedIcons);
                      setHasUnsavedChanges(true);
                    }
                  }}
                >
                  <Upload size={16} color={colors.white} />
                  <Text style={[styles.iconButtonText, { color: colors.white }]}>Upload</Text>
                </TouchableOpacity>
                {selectedIcons?.roadsideButton && (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: colors.error }]}
                    onPress={() => {
                      const updatedIcons = {
                        roadsideButton: null,
                        chargingButton: selectedIcons?.chargingButton || null,
                        locationButton: selectedIcons?.locationButton || null,
                        submitButton: selectedIcons?.submitButton || null,
                      };
                      setSelectedIcons(updatedIcons);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <X size={16} color={colors.white} />
                    <Text style={[styles.iconButtonText, { color: colors.white }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={[styles.iconItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.iconItemHeader}>
                <Zap size={20} color={colors.charging} />
                <Text style={[styles.iconItemLabel, { color: colors.text }]}>Schedule Charging Button</Text>
              </View>
              <View style={styles.iconActions}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      Alert.alert("Not Available", "Image upload is not available on web.");
                      return;
                    }
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert("Permission Required", "Photo library access is required.");
                      return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ["images"],
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 1,
                    });
                    if (!result.canceled && result.assets[0]) {
                      const updatedIcons = {
                        roadsideButton: selectedIcons?.roadsideButton || null,
                        chargingButton: result.assets[0].uri,
                        locationButton: selectedIcons?.locationButton || null,
                        submitButton: selectedIcons?.submitButton || null,
                      };
                      setSelectedIcons(updatedIcons);
                      setHasUnsavedChanges(true);
                    }
                  }}
                >
                  <Upload size={16} color={colors.white} />
                  <Text style={[styles.iconButtonText, { color: colors.white }]}>Upload</Text>
                </TouchableOpacity>
                {selectedIcons?.chargingButton && (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: colors.error }]}
                    onPress={() => {
                      const updatedIcons = {
                        roadsideButton: selectedIcons?.roadsideButton || null,
                        chargingButton: null,
                        locationButton: selectedIcons?.locationButton || null,
                        submitButton: selectedIcons?.submitButton || null,
                      };
                      setSelectedIcons(updatedIcons);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <X size={16} color={colors.white} />
                    <Text style={[styles.iconButtonText, { color: colors.white }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={[styles.iconItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.iconItemHeader}>
                <MapPin size={20} color={colors.primary} />
                <Text style={[styles.iconItemLabel, { color: colors.text }]}>Is Service at Location Button</Text>
              </View>
              <View style={styles.iconActions}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      Alert.alert("Not Available", "Image upload is not available on web.");
                      return;
                    }
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert("Permission Required", "Photo library access is required.");
                      return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ["images"],
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 1,
                    });
                    if (!result.canceled && result.assets[0]) {
                      const updatedIcons = {
                        roadsideButton: selectedIcons?.roadsideButton || null,
                        chargingButton: selectedIcons?.chargingButton || null,
                        locationButton: result.assets[0].uri,
                        submitButton: selectedIcons?.submitButton || null,
                      };
                      setSelectedIcons(updatedIcons);
                      setHasUnsavedChanges(true);
                    }
                  }}
                >
                  <Upload size={16} color={colors.white} />
                  <Text style={[styles.iconButtonText, { color: colors.white }]}>Upload</Text>
                </TouchableOpacity>
                {selectedIcons?.locationButton && (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: colors.error }]}
                    onPress={() => {
                      const updatedIcons = {
                        roadsideButton: selectedIcons?.roadsideButton || null,
                        chargingButton: selectedIcons?.chargingButton || null,
                        locationButton: null,
                        submitButton: selectedIcons?.submitButton || null,
                      };
                      setSelectedIcons(updatedIcons);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <X size={16} color={colors.white} />
                    <Text style={[styles.iconButtonText, { color: colors.white }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={[styles.iconItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.iconItemHeader}>
                <Send size={20} color={colors.primary} />
                <Text style={[styles.iconItemLabel, { color: colors.text }]}>Submit Request Button</Text>
              </View>
              <View style={styles.iconActions}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      Alert.alert("Not Available", "Image upload is not available on web.");
                      return;
                    }
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert("Permission Required", "Photo library access is required.");
                      return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ["images"],
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 1,
                    });
                    if (!result.canceled && result.assets[0]) {
                      const updatedIcons = {
                        roadsideButton: selectedIcons?.roadsideButton || null,
                        chargingButton: selectedIcons?.chargingButton || null,
                        locationButton: selectedIcons?.locationButton || null,
                        submitButton: result.assets[0].uri,
                      };
                      setSelectedIcons(updatedIcons);
                      setHasUnsavedChanges(true);
                    }
                  }}
                >
                  <Upload size={16} color={colors.white} />
                  <Text style={[styles.iconButtonText, { color: colors.white }]}>Upload</Text>
                </TouchableOpacity>
                {selectedIcons?.submitButton && (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: colors.error }]}
                    onPress={() => {
                      const updatedIcons = {
                        roadsideButton: selectedIcons?.roadsideButton || null,
                        chargingButton: selectedIcons?.chargingButton || null,
                        locationButton: selectedIcons?.locationButton || null,
                        submitButton: null,
                      };
                      setSelectedIcons(updatedIcons);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <X size={16} color={colors.white} />
                    <Text style={[styles.iconButtonText, { color: colors.white }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Color Scheme
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose a color palette for your application
          </Text>
          
          <View style={styles.colorGrid}>
            {COLOR_SCHEMES.map((scheme) => (
              <TouchableOpacity
                key={scheme.id}
                style={[
                  styles.colorCard,
                  { 
                    backgroundColor: colors.surface,
                    borderColor: selectedSchemeId === scheme.id ? colors.primary : colors.border,
                    borderWidth: selectedSchemeId === scheme.id ? 2 : 1,
                  }
                ]}
                onPress={() => handleSelectColorScheme(scheme.id)}
              >
                <View style={styles.colorPreview}>
                  <View style={[styles.colorSwatch, { backgroundColor: scheme.primary }]} />
                  <View style={[styles.colorSwatch, { backgroundColor: scheme.secondary }]} />
                  <View style={[styles.colorSwatch, { backgroundColor: scheme.accent }]} />
                  <View style={[styles.colorSwatch, { backgroundColor: scheme.background }]} />
                </View>
                <View style={styles.colorInfo}>
                  <Text style={[styles.colorName, { color: colors.text }]}>
                    {scheme.name}
                  </Text>
                  {selectedSchemeId === scheme.id && (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                      <Check size={14} color={colors.white} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.section}>
          <Text style={[styles.previewTitle, { color: colors.text }]}>
            Preview
          </Text>
          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.previewHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.previewHeaderText, { color: colors.text }]}>
                {businessNameInput || "Business Name"}
              </Text>
            </View>
            <View style={styles.previewContent}>
              <View style={[styles.previewButton, { backgroundColor: colors.primary }]}>
                <Text style={[styles.previewButtonText, { color: colors.white }]}>
                  Primary Button
                </Text>
              </View>
              <View style={[styles.previewButton, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.previewButtonText, { color: colors.white }]}>
                  Secondary Button
                </Text>
              </View>
              <View style={[styles.previewCard2, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                <Text style={[styles.previewText, { color: colors.text }]}>
                  Sample Card
                </Text>
                <Text style={[styles.previewTextSecondary, { color: colors.textSecondary }]}>
                  This is how your content will look
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            { 
              backgroundColor: hasUnsavedChanges ? colors.primary : colors.border,
            }
          ]}
          onPress={handleSaveAllChanges}
          disabled={!hasUnsavedChanges}
        >
          <Save size={20} color={colors.white} />
          <Text style={[styles.saveButtonText, { color: colors.white }]}>
            {hasUnsavedChanges ? "Save All Changes" : "No Changes to Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  buttonSecondary: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  colorGrid: {
    gap: 12,
  },
  colorCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  colorPreview: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  colorInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colorName: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreview: {
    marginBottom: 12,
  },
  imagePreviewText: {
    fontSize: 14,
    marginBottom: 8,
  },
  note: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic" as const,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 16,
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  previewHeaderText: {
    fontSize: 18,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  previewContent: {
    padding: 16,
    gap: 12,
  },
  previewButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  previewCard2: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  previewText: {
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  previewTextSecondary: {
    fontSize: 12,
  },
  saveButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  iconsList: {
    gap: 12,
  },
  iconItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconItemLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    flex: 1,
  },
  iconActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  iconButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  buttonCustomizationList: {
    gap: 16,
  },
  buttonCustomItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 16,
  },
  buttonCustomHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 4,
  },
  buttonCustomLabel: {
    fontSize: 16,
    fontWeight: "700" as const,
    flex: 1,
  },
  buttonCustomSection: {
    gap: 8,
  },
  buttonCustomSubLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  colorInput: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  colorPreviewBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
