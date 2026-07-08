import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

/**
 * Open the system photo picker. Resolves to a local URI, or null if cancelled.
 */
export async function pickImage(options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
}): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library access is required to pick a photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options?.allowsEditing ?? false,
    aspect: options?.aspect,
    quality: 1,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

/**
 * Resize to max 1600px wide and compress to ~0.8 JPEG before any upload.
 */
export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return result.uri;
}

/**
 * Compress + upload an image to a Supabase Storage bucket. Returns public URL.
 * Buckets used by the app: avatars, feed-media, event-images, partner-images, course-images.
 */
export async function uploadToBucket(params: {
  bucket: string;
  path: string;
  uri: string;
  contentType?: string;
}): Promise<string> {
  const compressedUri = await compressImage(params.uri);
  const response = await fetch(compressedUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from(params.bucket).upload(params.path, arrayBuffer, {
    contentType: params.contentType ?? 'image/jpeg',
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(params.bucket).getPublicUrl(params.path);
  return data.publicUrl;
}
