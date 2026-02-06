export type Interest =
  | 'Footing' | 'Yoga' | 'Natation' | 'Sport Collectif'
  | 'Exposition' | 'Balade' | 'Randonnée' | 'Resto'
  | 'Boire un verre' | 'Atelier' | 'Concert' | 'Cinéma'
  | 'Bénévolat';

// ============================================
// Database Row Types (matching Supabase schema)
// ============================================

export interface DbProfile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  interests: string[];
  is_pulseur: boolean;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface DbPulse {
  id: string;
  title: string;
  description: string | null;
  type: string;
  pulseur_id: string;
  start_time: string;
  location_lat: number;
  location_lng: number;
  location_address: string | null;
  capacity: number;
  image_url: string | null;
  price: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DbPulseWithParticipants extends DbPulse {
  participant_ids: string[] | null;
  participant_count: number;
}

export interface DbPulseInsert {
  title: string;
  description?: string | null;
  type: string;
  pulseur_id: string;
  start_time: string;
  location_lat: number;
  location_lng: number;
  location_address?: string | null;
  capacity?: number;
  image_url?: string | null;
  price?: number | null;
  tags?: string[];
}

// ============================================
// Application Types
// ============================================

export interface UserProfile {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  interests: Interest[];
  isPulseur: boolean;
  rating?: number;
}

export interface Pulse {
  id: string;
  title: string;
  description: string;
  type: Interest;
  pulseurId: string;
  startTime: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  capacity: number;
  participants: string[];
  imageUrl: string;
  price?: number;
  tags?: string[];
}

export interface Pulseur extends UserProfile {
  rating: number;
  activePulses: string[];
}

// ============================================
// Helper functions to convert between DB and App types
// ============================================

export function dbProfileToUserProfile(dbProfile: DbProfile): UserProfile {
  return {
    id: dbProfile.id,
    name: dbProfile.name,
    bio: dbProfile.bio || 'Prêt à pulser !',
    avatar: dbProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbProfile.id}`,
    interests: dbProfile.interests as Interest[],
    isPulseur: dbProfile.is_pulseur,
    rating: dbProfile.rating,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbPulseToPulse(dbPulse: any): Pulse {
  return {
    id: dbPulse.id,
    title: dbPulse.title,
    description: dbPulse.description || '',
    type: dbPulse.type as Interest,
    pulseurId: dbPulse.pulseur_id,
    startTime: dbPulse.start_time,
    location: {
      lat: dbPulse.location_lat,
      lng: dbPulse.location_lng,
      address: dbPulse.location_address || '',
    },
    capacity: dbPulse.capacity,
    participants: (dbPulse.participant_ids || []).map((id: unknown) => String(id)),
    imageUrl: dbPulse.image_url || '',
    price: dbPulse.price ?? undefined,
    tags: dbPulse.tags || [],
  };
}

export function pulseToDbPulse(pulse: Omit<Pulse, 'id' | 'participants'>): DbPulseInsert {
  return {
    title: pulse.title,
    description: pulse.description,
    type: pulse.type,
    pulseur_id: pulse.pulseurId,
    start_time: pulse.startTime,
    location_lat: pulse.location.lat,
    location_lng: pulse.location.lng,
    location_address: pulse.location.address,
    capacity: pulse.capacity,
    image_url: pulse.imageUrl,
    price: pulse.price ?? 0,
    tags: pulse.tags || [],
  };
}
