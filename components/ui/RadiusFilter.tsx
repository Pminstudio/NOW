import React from 'react';
import { motion } from 'framer-motion';

interface RadiusFilterProps {
  value: number;
  onChange: (radius: number) => void;
  disabled?: boolean;
}

const RADIUS_OPTIONS = [
  { value: 1, label: '1 km' },
  { value: 2, label: '2 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
];

const RadiusFilter: React.FC<RadiusFilterProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-violet-900/30 uppercase tracking-widest">
          Rayon de recherche
        </label>
        <span className="text-sm font-black text-violet-600">{value} km</span>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min="1"
          max="50"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-violet-100 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:bg-violet-600
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:border-4
            [&::-webkit-slider-thumb]:border-white
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:bg-violet-600
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-4
            [&::-moz-range-thumb]:border-white
            [&::-moz-range-thumb]:cursor-pointer"
        />
        <div
          className="absolute top-0 left-0 h-2 bg-violet-600 rounded-full pointer-events-none"
          style={{ width: `${((value - 1) / 49) * 100}%` }}
        />
      </div>

      {/* Quick select buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        {RADIUS_OPTIONS.map((option) => (
          <motion.button
            key={option.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              value === option.value
                ? 'bg-violet-600 text-white shadow-lg'
                : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
            } disabled:opacity-50`}
          >
            {option.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default RadiusFilter;
