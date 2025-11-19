import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from './colors';
import { ServiceRequest } from './types';

interface PhotoGalleryModalProps {
  visible: boolean;
  onClose: () => void;
  request: ServiceRequest;
  onAddPhoto: (photoUri: string) => Promise<void>;
  onRemovePhoto: (photoUri: string) => Promise<void>;
}

export default function PhotoGalleryModal({
  visible,
  onClose,
  request,
  onAddPhoto,
  onRemovePhoto,
}: PhotoGalleryModalProps) {
  const insets = useSafeAreaInsets();
  const currentUser = null;
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const canUpload = (): boolean => {
    if (!currentUser) return false;
    
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
      return true;
    }
    
    if (request.status === 'pending') {
      return true;
    }
    
    return false;
  };

  const canDelete = (): boolean => {
    if (!currentUser) return false;
    return currentUser.role === 'super_admin' || currentUser.role === 'admin';
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to take photos.'
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library permission is required to select photos.'
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) return;

      setIsUploading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64 
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        
        await onAddPhoto(uri);
        Alert.alert('Success', 'Photo added successfully');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectPhoto = async () => {
    try {
      const hasPermission = await requestMediaLibraryPermissions();
      if (!hasPermission) return;

      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64 
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        
        await onAddPhoto(uri);
        Alert.alert('Success', 'Photo added successfully');
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = (photoUri: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onRemovePhoto(photoUri);
              setSelectedPhoto(null);
              Alert.alert('Success', 'Photo deleted successfully');
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  const photos = request.photos || [];
  const uploadEnabled = canUpload();
  const deleteEnabled = canDelete();

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Job Photos</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              Status: {request.status.toUpperCase()}
            </Text>
          </View>

          {!uploadEnabled && request.status !== 'pending' && (
            <View style={styles.permissionNotice}>
              <Text style={styles.permissionNoticeText}>
                {currentUser?.role === 'user' || currentUser?.role === 'worker'
                  ? 'Only admins can upload photos when status is not pending'
                  : 'You can only upload photos when the job is pending or if you are an admin'}
              </Text>
            </View>
          )}

          {uploadEnabled && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, isUploading && styles.actionButtonDisabled]}
                onPress={handleTakePhoto}
                disabled={isUploading}
              >
                <Camera color={colors.white} size={20} />
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, isUploading && styles.actionButtonDisabled]}
                onPress={handleSelectPhoto}
                disabled={isUploading}
              >
                <ImageIcon color={colors.white} size={20} />
                <Text style={styles.actionButtonText}>Choose Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          {isUploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.uploadingText}>Uploading photo...</Text>
            </View>
          )}

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {photos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ImageIcon color={colors.textSecondary} size={64} />
                <Text style={styles.emptyText}>No photos yet</Text>
                <Text style={styles.emptySubtext}>
                  {uploadEnabled
                    ? 'Take or upload photos to get started'
                    : 'Photos will appear here once uploaded'}
                </Text>
              </View>
            ) : (
              <View style={styles.photoGrid}>
                {photos.map((photoUri, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.photoThumbnail}
                    onPress={() => setSelectedPhoto(photoUri)}
                  >
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={!!selectedPhoto}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.fullscreenModal}>
          <View style={[styles.fullscreenHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={styles.fullscreenCloseButton}
              onPress={() => setSelectedPhoto(null)}
            >
              <X color={colors.white} size={28} />
            </TouchableOpacity>
            {deleteEnabled && selectedPhoto && (
              <TouchableOpacity
                style={styles.fullscreenDeleteButton}
                onPress={() => handleDeletePhoto(selectedPhoto)}
              >
                <Trash2 color={colors.white} size={24} />
              </TouchableOpacity>
            )}
          </View>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
  },
  closeButton: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  statusBadge: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  permissionNotice: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  permissionNoticeText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.white,
  },
  uploadingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
    paddingVertical: 20,
  },
  uploadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
  },
  photoGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  photoThumbnail: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  fullscreenHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fullscreenCloseButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  fullscreenDeleteButton: {
    padding: 8,
    backgroundColor: colors.error + '80',
    borderRadius: 8,
  },
  fullscreenImage: {
    flex: 1,
    width: '100%',
  },
});
