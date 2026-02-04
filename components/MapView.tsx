
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Pulse, Interest } from '../types';
import { matchPulsesByMood } from '../geminiService';
import { motion, AnimatePresence } from 'framer-motion';

// Declare Leaflet global
declare const L: any;

interface MapViewProps {
  pulses: Pulse[];
  userLocation: { lat: number; lng: number };
  userInterests: Interest[];
  onPulseSelect: (pulse: Pulse) => void;
  onProfileClick: () => void;
  onPulseurSpace: () => void;
  onMyPulsesClick: () => void;
}

type DateFilter = string | 'any'; // Can be 'any' or 'YYYY-MM-DD'
type TimeFilter = 'morning' | 'afternoon' | 'evening' | 'any';

const MapView: React.FC<MapViewProps> = ({ 
  pulses, 
  userInterests, 
  onPulseSelect, 
  onProfileClick, 
  onPulseurSpace,
  onMyPulsesClick,
  userLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mood, setMood] = useState('');
  const [selectedDate, setSelectedDate] = useState<DateFilter>('any');
  const [selectedTime, setSelectedTime] = useState<TimeFilter>('any');
  
  const [filteredPulseIds, setFilteredPulseIds] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const visiblePulses = useMemo(() => {
    let list = pulses;

    if (selectedDate !== 'any') {
      list = list.filter(p => p.startTime.startsWith(selectedDate));
    }

    if (selectedTime !== 'any') {
      list = list.filter(p => {
        const hour = new Date(p.startTime).getHours();
        if (selectedTime === 'morning') return hour >= 6 && hour < 12;
        if (selectedTime === 'afternoon') return hour >= 12 && hour < 18;
        if (selectedTime === 'evening') return hour >= 18 || hour < 6;
        return true;
      });
    }

    if (filteredPulseIds !== null) {
      list = list.filter(p => filteredPulseIds.includes(p.id));
    }

    return list;
  }, [filteredPulseIds, pulses, selectedDate, selectedTime]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([43.2965, 5.3698], 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(mapRef.current);

    markerLayerRef.current = L.layerGroup().addTo(mapRef.current);

    const userIcon = L.divIcon({
      className: 'user-marker-icon',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10">
          <div class="absolute inset-0 bg-violet-800 opacity-20 rounded-full animate-ping"></div>
          <div class="w-4 h-4 bg-violet-800 rounded-full border-2 border-white shadow-lg relative z-10"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    }
  }, [userLocation]);

  useEffect(() => {
    if (!markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();

    visiblePulses.forEach((pulse) => {
      const icon = L.divIcon({
        className: 'pulse-marker-icon',
        html: `
          <div class="relative group cursor-pointer overflow-visible">
            <div class="w-16 h-16 rounded-[24px] overflow-hidden border-[4px] border-white shadow-2xl bg-violet-100 transform transition-all duration-300 ease-out group-hover:scale-125 group-hover:border-violet-700 group-hover:shadow-[0_15px_30px_-5px_rgba(109,40,217,0.5)] active:scale-95">
              <img src="${pulse.imageUrl}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=200&h=200'" />
            </div>
            <div class="absolute -top-3 -right-3 bg-violet-800 text-white text-[9px] font-black px-2 py-1 rounded-xl shadow-lg border-2 border-white transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 uppercase">
              ${pulse.type}
            </div>
          </div>
        `,
        iconSize: [64, 64],
        iconAnchor: [32, 32]
      });

      const marker = L.marker([pulse.location.lat, pulse.location.lng], { icon })
        .on('click', () => onPulseSelect(pulse));
      
      markerLayerRef.current.addLayer(marker);
    });
  }, [visiblePulses, onPulseSelect]);

  const handleSearch = async () => {
    if (mood.trim() || selectedDate !== 'any' || selectedTime !== 'any') {
      if (mood.trim()) {
        setIsSearching(true);
        const matchedIds = await matchPulsesByMood(mood, pulses, userInterests);
        setFilteredPulseIds(matchedIds);
        setIsSearching(false);
      }
    } else {
      setFilteredPulseIds(null);
    }
    setIsModalOpen(false);

    if (visiblePulses.length > 0 && mapRef.current) {
      const latlngs = visiblePulses.map(p => [p.location.lat, p.location.lng]);
      mapRef.current.fitBounds(latlngs, { padding: [100, 100], maxZoom: 15 });
    }
  };

  const resetFilters = () => {
    setFilteredPulseIds(null);
    setSelectedDate('any');
    setSelectedTime('any');
    setMood('');
  };

  const isAnyFilterActive = filteredPulseIds !== null || selectedDate !== 'any' || selectedTime !== 'any';

  return (
    <div className="relative h-full w-full bg-[#F9F7FF] overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-40">
        <div className="flex gap-3">
          <button 
            onClick={onProfileClick} 
            className="w-14 h-14 rounded-2xl overflow-hidden shadow-2xl border-2 border-white bg-white active:scale-90 transition-transform"
          >
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150" className="w-full h-full object-cover" />
          </button>
          
          <button 
            onClick={onMyPulsesClick}
            className="w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-2 border-white active:scale-90 transition-transform group"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-7 h-7 text-violet-800 group-hover:scale-110 transition-transform">
              <path d="M16.5 4h-9A2.5 2.5 0 005 6.5v15l7-4 7 4v-15A2.5 2.5 0 0016.5 4z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="flex flex-col items-center bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-3xl shadow-2xl border border-white/50">
          <h1 className="text-xs font-black text-gray-900 tracking-widest uppercase italic leading-none">NOW.</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <p className="text-[8px] font-black text-violet-800 uppercase tracking-widest">{visiblePulses.length} pulses</p>
          </div>
        </div>

        <button 
          onClick={onPulseurSpace} 
          className="w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-2 border-white active:scale-90 transition-transform group"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-7 h-7 text-violet-800 group-hover:scale-110 transition-transform">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Floating Heart Button */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40">
        <div className="flex flex-col items-center">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group relative transition-transform active:scale-90"
            aria-label="Ouvrir le menu pulse"
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="#4c1d95" 
              className="w-24 h-24 animate-pulse-heart drop-shadow-[0_15px_25px_rgba(91,33,182,0.4)] transition-all hover:scale-110"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
          <p className="mt-4 text-[9px] font-black text-violet-950 uppercase tracking-[0.3em] bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-xl border border-violet-100">
            Envie de quoi ?
          </p>
        </div>
      </div>

      {isAnyFilterActive && (
         <motion.button 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={resetFilters}
          className="absolute bottom-44 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-xl px-7 py-3.5 rounded-full shadow-2xl border border-violet-100 flex items-center gap-4 text-[9px] font-black text-violet-800 uppercase tracking-widest"
         >
           Filtres actifs
           <div className="flex gap-1.5">
             {selectedDate !== 'any' && <span className="bg-violet-100 px-2.5 py-1 rounded-lg">{selectedDate}</span>}
             {selectedTime !== 'any' && <span className="bg-violet-100 px-2.5 py-1 rounded-lg">{selectedTime.toUpperCase()}</span>}
             {filteredPulseIds !== null && <span className="bg-violet-800 text-white px-2.5 py-1 rounded-lg">IA</span>}
           </div>
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-3.5 h-3.5 text-violet-300 hover:text-red-400 ml-1">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
           </svg>
         </motion.button>
      )}

      {/* Mood Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-violet-950/50 backdrop-blur-xl flex flex-col justify-end"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="relative w-full max-h-[95vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Floating Heart Icon Container - NOW TRULY FLOATING */}
              <div className="absolute -top-16 left-0 right-0 flex justify-center z-[110] pointer-events-none">
                 <motion.div 
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="bg-white p-3 rounded-full shadow-[0_25px_60px_rgba(76,29,149,0.4)] flex items-center justify-center pointer-events-auto active:scale-95 transition-transform"
                 >
                   <div className="w-28 h-28 bg-violet-950 rounded-full flex items-center justify-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-tr from-violet-700 to-violet-950 opacity-100" />
                      <div className="absolute inset-0 bg-violet-400 animate-ping opacity-20" />
                      <svg viewBox="0 0 24 24" fill="white" className="w-14 h-14 relative z-10 drop-shadow-2xl animate-pulse">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                   </div>
                 </motion.div>
              </div>

              {/* White Modal Body */}
              <div className="bg-white rounded-t-[80px] pt-24 pb-12 px-8 shadow-[0_-30px_100px_rgba(46,16,101,0.25)] overflow-y-auto scrollbar-hide relative z-10">
                {/* Header Decoration */}
                <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-violet-50/40 to-transparent pointer-events-none rounded-t-[80px]" />
                
                <div className="text-center mb-12 relative z-20">
                  <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-10" />
                  <h2 className="text-6xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Ton Mood.</h2>
                  <p className="text-violet-400 font-bold uppercase text-[11px] tracking-[0.5em] mt-4 opacity-70">Laisse Now guider tes envies.</p>
                </div>
                
                <div className="space-y-10 relative z-20">
                  {/* Humeur Section */}
                  <div className="group bg-[#FDFCFF] rounded-[55px] p-10 border border-violet-50 transition-all hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/10">
                    <label className="block text-[11px] font-black text-violet-950/20 uppercase tracking-[0.4em] mb-6 ml-3">Describe your vibe</label>
                    <textarea
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      placeholder="Ex: J'ai envie d'un truc posé avec de la musique..."
                      className="w-full h-36 bg-transparent border-none p-0 focus:ring-0 text-2xl font-bold text-gray-900 placeholder:text-gray-200 resize-none leading-tight tracking-tight"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-10">
                    {/* Timing Section */}
                    <div className="bg-[#FDFCFF] rounded-[55px] p-10 border border-violet-50 shadow-sm">
                      <label className="block text-[11px] font-black text-violet-950/20 uppercase tracking-[0.4em] mb-6 ml-3">Timing</label>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setSelectedDate(todayStr)}
                          className={`px-8 py-5 rounded-[28px] font-black text-[10px] uppercase tracking-[0.2em] transition-all border-2 ${
                            selectedDate === todayStr 
                              ? 'bg-violet-950 border-violet-950 text-white shadow-2xl scale-105' 
                              : 'bg-white border-violet-50 text-gray-300'
                          }`}
                        >
                          AUJOURD'HUI
                        </button>
                        <div className={`flex-1 flex items-center px-8 py-5 rounded-[28px] transition-all border-2 relative ${
                          selectedDate !== 'any' && selectedDate !== todayStr
                            ? 'bg-violet-50 border-violet-950 shadow-lg' 
                            : 'bg-white border-violet-50'
                        }`}>
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`w-5 h-5 mr-4 ${selectedDate !== 'any' ? 'text-violet-950' : 'text-gray-200'}`}>
                             <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                           </svg>
                           <input 
                             type="date" 
                             value={selectedDate === 'any' ? '' : selectedDate}
                             onChange={(e) => setSelectedDate(e.target.value || 'any')}
                             className="bg-transparent border-none outline-none font-black text-[11px] uppercase tracking-widest text-violet-950 w-full"
                           />
                        </div>
                      </div>
                    </div>

                    {/* Moment Section */}
                    <div className="bg-[#FDFCFF] rounded-[55px] p-10 border border-violet-50 shadow-sm">
                      <label className="block text-[11px] font-black text-violet-950/20 uppercase tracking-[0.4em] mb-6 ml-3">Moment de la journée</label>
                      <div className="grid grid-cols-2 gap-4">
                        {(['any', 'morning', 'afternoon', 'evening'] as const).map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`py-5 rounded-[28px] font-black text-[10px] uppercase tracking-[0.2em] transition-all border-2 ${
                              selectedTime === time 
                                ? 'bg-violet-950 border-violet-950 text-white shadow-2xl scale-105' 
                                : 'bg-white border-violet-50 text-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {time === 'any' ? 'H24' : time === 'morning' ? 'MATIN' : time === 'afternoon' ? 'APRÈM' : 'SOIR'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-16 flex gap-5 relative z-20">
                  <button 
                    onClick={resetFilters}
                    className="w-24 h-24 bg-gray-50 text-gray-300 rounded-[35px] flex items-center justify-center transition-all active:scale-90 hover:text-red-400 border border-gray-100"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-8 h-8">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="flex-1 py-8 bg-violet-950 text-white rounded-[40px] text-3xl font-black shadow-[0_25px_80px_rgba(76,29,149,0.5)] flex items-center justify-center gap-6 transition-all active:scale-95 disabled:opacity-50 uppercase italic tracking-tighter"
                  >
                    {isSearching ? (
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce" />
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    ) : (
                      <>
                        <span>PULSER</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" className="w-8 h-8">
                          <path d="M5 12h14m-7-7l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MapView;
