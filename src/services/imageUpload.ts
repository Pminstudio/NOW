import { supabase } from '../lib/supabase';

export type ImageBucket = 'pulse-images' | 'avatars';

interface UploadResult {
  url: string | null;
  error: Error | null;
}

/**
 * Upload an image to Supabase Storage
 */
export async function uploadImage(
  file: File,
  bucket: ImageBucket,
  userId: string
): Promise<UploadResult> {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (err) {
    console.error('Error uploading image:', err);
    return {
      url: null,
      error: err instanceof Error ? err : new Error('Failed to upload image'),
    };
  }
}

/**
 * Upload image from base64 data URL
 */
export async function uploadImageFromDataUrl(
  dataUrl: string,
  bucket: ImageBucket,
  userId: string
): Promise<UploadResult> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Determine file extension from mime type
    const mimeType = blob.type;
    const ext = mimeType.split('/')[1] || 'jpg';

    // Create file from blob
    const file = new File([blob], `image.${ext}`, { type: mimeType });

    return uploadImage(file, bucket, userId);
  } catch (err) {
    console.error('Error uploading image from data URL:', err);
    return {
      url: null,
      error: err instanceof Error ? err : new Error('Failed to upload image'),
    };
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(
  imageUrl: string,
  bucket: ImageBucket
): Promise<{ error: Error | null }> {
  try {
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);

    if (pathParts.length < 2) {
      return { error: new Error('Invalid image URL') };
    }

    const filePath = decodeURIComponent(pathParts[1]);

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting image:', err);
    return {
      error: err instanceof Error ? err : new Error('Failed to delete image'),
    };
  }
}

/**
 * Compress image before upload (client-side)
 */
export function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}
