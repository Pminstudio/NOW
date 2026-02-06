import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { compressImage, uploadImage, ImageBucket } from '../../src/services/imageUpload';

interface ImagePickerProps {
  currentImage?: string;
  onImageSelected: (url: string) => void;
  userId: string;
  bucket: ImageBucket;
  presetImages?: Record<string, string>;
  className?: string;
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  currentImage,
  onImageSelected,
  userId,
  bucket,
  presetImages,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNative = Capacitor.isNativePlatform();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(20);

    try {
      // Compress image
      setUploadProgress(40);
      const compressedFile = await compressImage(file, 1200, 1200, 0.85);

      // Upload to Supabase
      setUploadProgress(60);
      const { url, error: uploadError } = await uploadImage(compressedFile, bucket, userId);

      if (uploadError) {
        throw uploadError;
      }

      if (url) {
        setUploadProgress(100);
        onImageSelected(url);
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCameraCapture = async (source: CameraSource) => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source,
        width: 1200,
        height: 1200,
      });

      if (image.dataUrl) {
        // Convert data URL to file
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

        await uploadFile(file);
      }
    } catch (err) {
      console.error('Camera error:', err);
      // User cancelled or error
    }
  };

  const handleWebFileSelect = () => {
    fileInputRef.current?.click();
  };

  const selectPresetImage = (url: string) => {
    onImageSelected(url);
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <div
        className={`relative cursor-pointer group ${className}`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative w-full h-72 rounded-[45px] bg-gray-100 overflow-hidden shadow-2xl">
          {currentImage ? (
            <img
              src={currentImage}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt="Selected"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-violet-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-16 h-16 text-violet-300 mb-4">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-violet-400 font-black text-[10px] uppercase tracking-widest">Ajouter une image</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-2xl">
              <p className="text-violet-950 font-black text-[10px] uppercase tracking-widest">Modifier</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input for web */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end justify-center"
            onClick={() => !isUploading && setIsModalOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white rounded-t-[50px] p-8 pb-12"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />

              <h3 className="text-2xl font-black text-center text-violet-950 mb-8 tracking-tight">
                Choisir une image
              </h3>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl text-sm font-bold text-center mb-6"
                >
                  {error}
                </motion.div>
              )}

              {isUploading ? (
                <div className="py-8">
                  <div className="w-full h-3 bg-violet-100 rounded-full overflow-hidden mb-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-violet-600 rounded-full"
                    />
                  </div>
                  <p className="text-center text-violet-600 font-black text-[10px] uppercase tracking-widest">
                    Upload en cours...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Camera options for native */}
                  {isNative && (
                    <>
                      <button
                        onClick={() => handleCameraCapture(CameraSource.Camera)}
                        className="w-full flex items-center gap-5 p-5 bg-violet-50 rounded-[25px] border border-violet-100 active:scale-95 transition-all"
                      >
                        <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-violet-600">
                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="font-black text-violet-950">Prendre une photo</p>
                          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Utiliser l'appareil photo</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleCameraCapture(CameraSource.Photos)}
                        className="w-full flex items-center gap-5 p-5 bg-violet-50 rounded-[25px] border border-violet-100 active:scale-95 transition-all"
                      >
                        <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-violet-600">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="font-black text-violet-950">Galerie</p>
                          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Choisir depuis la galerie</p>
                        </div>
                      </button>
                    </>
                  )}

                  {/* File upload for web */}
                  {!isNative && (
                    <button
                      onClick={handleWebFileSelect}
                      className="w-full flex items-center gap-5 p-5 bg-violet-50 rounded-[25px] border border-violet-100 active:scale-95 transition-all"
                    >
                      <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-violet-600">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-black text-violet-950">Uploader une image</p>
                        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Depuis ton appareil</p>
                      </div>
                    </button>
                  )}

                  {/* Preset images */}
                  {presetImages && Object.keys(presetImages).length > 0 && (
                    <div className="pt-4">
                      <p className="text-[10px] font-black text-violet-950/30 uppercase tracking-[0.3em] mb-4 ml-2">
                        Ou choisir un preset
                      </p>
                      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                        {Object.entries(presetImages).map(([name, url]) => (
                          <button
                            key={name}
                            onClick={() => selectPresetImage(url)}
                            className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-4 transition-all active:scale-95 ${
                              currentImage === url ? 'border-violet-600 shadow-lg' : 'border-transparent'
                            }`}
                          >
                            <img src={url} alt={name} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-full py-5 bg-gray-100 text-gray-500 rounded-[25px] font-black text-sm uppercase tracking-widest mt-4"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImagePicker;
