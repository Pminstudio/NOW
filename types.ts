
export type Interest = 
  | 'Footing' | 'Yoga' | 'Natation' | 'Sport Collectif' 
  | 'Exposition' | 'Balade' | 'Randonnée' | 'Resto' 
  | 'Boire un verre' | 'Atelier' | 'Concert' | 'Cinéma'
  | 'Bénévolat';

export interface UserProfile {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  interests: Interest[];
  isPulseur: boolean;
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
  price?: number; // Optional price (0 or undefined = free)
  tags?: string[]; // Extra classification tags
}

export interface Pulseur extends UserProfile {
  rating: number;
  activePulses: string[];
}
