import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

declare const L: any;

interface LocationPickerProps {
  onLocationSelected: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number; address?: string };
  userLocation: { lat: number; lng: number };
}

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
      { headers: { 'Accept-Language': 'fr' } }
    );
    const data = await res.json();
    if (data.address) {
      const a = data.address;
      const parts = [
        a.road || a.pedestrian || a.footway || '',
        a.house_number || '',
      ].filter(Boolean);
      const street = parts.join(' ');
      const city = a.city || a.town || a.village || a.municipality || '';
      return [street, city].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || 'Position sélectionnée';
    }
    return data.display_name?.split(',').slice(0, 3).join(',') || 'Position sélectionnée';
  } catch {
    return 'Position sélectionnée';
  }
};

const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelected,
  initialLocation,
  userLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [address, setAddress] = useState(initialLocation?.address || '');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [hasSelected, setHasSelected] = useState(!!initialLocation?.address);

  const startLat = initialLocation?.lat || userLocation.lat;
  const startLng = initialLocation?.lng || userLocation.lng;
  const pendingLocationRef = useRef({ lat: startLat, lng: startLng });

  const updateLocation = (lat: number, lng: number) => {
    pendingLocationRef.current = { lat, lng };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsGeocoding(true);
    debounceRef.current = setTimeout(async () => {
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      setIsGeocoding(false);
      onLocationSelected({ lat, lng, address: addr });
    }, 500);
  };

  // Initialize map when opened
  useEffect(() => {
    if (!isMapOpen || !mapContainerRef.current) return;

    // Small delay to let the container animate in
    const initTimeout = setTimeout(() => {
      if (mapRef.current || !mapContainerRef.current) return;

      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([pendingLocationRef.current.lat, pendingLocationRef.current.lng], 15);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current);

      const markerIcon = L.divIcon({
        className: 'location-picker-marker',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="width:40px;height:40px;background:#7c3aed;border-radius:50%;border:4px solid white;box-shadow:0 10px 25px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
              <svg viewBox="0 0 24 24" fill="white" style="width:20px;height:20px;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3" fill="white"/>
              </svg>
            </div>
            <div style="width:4px;height:16px;background:#7c3aed;margin-top:-4px;"></div>
          </div>
        `,
        iconSize: [40, 56],
        iconAnchor: [20, 56],
      });

      markerRef.current = L.marker(
        [pendingLocationRef.current.lat, pendingLocationRef.current.lng],
        { icon: markerIcon, draggable: true }
      ).addTo(mapRef.current);

      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        updateLocation(pos.lat, pos.lng);
      });

      mapRef.current.on('click', (e: any) => {
        markerRef.current.setLatLng(e.latlng);
        updateLocation(e.latlng.lat, e.latlng.lng);
      });

      // Initial geocode if no address yet
      if (!address) {
        updateLocation(pendingLocationRef.current.lat, pendingLocationRef.current.lng);
      }
    }, 100);

    return () => {
      clearTimeout(initTimeout);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isMapOpen]);

  const centerOnUser = () => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 15);
      markerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      updateLocation(userLocation.lat, userLocation.lng);
    }
  };

  const handleConfirm = () => {
    setHasSelected(true);
    setIsMapOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Collapsed view - tap to open map */}
      {!isMapOpen && (
        <button
          type="button"
          onClick={() => setIsMapOpen(true)}
          className="w-full flex items-center gap-5 bg-violet-50 p-6 rounded-[30px] border-2 border-violet-100 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-7 h-7 text-violet-600">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">
              {hasSelected ? 'Lieu sélectionné' : 'Appuie pour choisir le lieu'}
            </p>
            {hasSelected && address ? (
              <p className="font-black text-violet-950 text-sm leading-tight truncate">{address}</p>
            ) : (
              <p className="font-bold text-violet-300 text-sm">Placer le pin sur la carte</p>
            )}
          </div>
          <div className="w-10 h-10 bg-violet-200/50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5 text-violet-500">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      )}

      {/* Expanded map view */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-4">
              <div className="relative rounded-[35px] overflow-hidden border-2 border-violet-200 shadow-xl">
                <div ref={mapContainerRef} className="w-full h-64" />

                {/* Center on user button */}
                <button
                  type="button"
                  onClick={centerOnUser}
                  className="absolute bottom-4 right-4 z-[400] w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-all border border-violet-100"
                  title="Ma position"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-violet-600">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4m0 12v4M2 12h4m12 0h4" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Address display */}
              <div className="flex items-center gap-4 bg-violet-50 p-5 rounded-[25px] border border-violet-100">
                <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-violet-600">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Lieu sélectionné</p>
                  {isGeocoding ? (
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  ) : (
                    <p className="font-black text-violet-950 text-sm leading-tight truncate">{address || 'Déplace le pin sur la carte'}</p>
                  )}
                </div>
              </div>

              {/* Confirm button */}
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-5 bg-violet-600 text-white rounded-[25px] font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-5 h-5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Confirmer le lieu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocationPicker;
