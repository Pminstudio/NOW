
import { Interest, Pulse, Pulseur } from './types';

export const INTERESTS: Interest[] = [
  'Footing', 'Yoga', 'Natation', 'Sport Collectif', 
  'Exposition', 'Balade', 'Randonnée', 'Resto', 
  'Boire un verre', 'Atelier', 'Concert', 'Cinéma',
  'Bénévolat'
];

export const MOCK_PULSEURS: Pulseur[] = [
  {
    id: 'p1',
    name: 'Sarah',
    bio: 'Yoga flow & Clean-walk. Agissons ensemble pour notre ville !',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200',
    interests: ['Yoga', 'Bénévolat'],
    isPulseur: true,
    rating: 4.9,
    activePulses: ['pulse1', 'pulse5']
  },
  {
    id: 'p2',
    name: 'Marc',
    bio: 'Coach sportif. J\'organise aussi des collectes pour les sans-abris.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200',
    interests: ['Sport Collectif', 'Bénévolat'],
    isPulseur: true,
    rating: 4.7,
    activePulses: ['pulse2']
  },
  {
    id: 'p3',
    name: 'Léa',
    bio: 'Artiste engagée. Créons du lien social par la culture.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200',
    interests: ['Exposition', 'Atelier'],
    isPulseur: true,
    rating: 5.0,
    activePulses: ['pulse3']
  }
];

export const MOCK_PULSES: Pulse[] = [
  {
    id: 'pulse1',
    title: 'Yoga Flow au Vallon des Auffes',
    description: 'Une séance douce de 1h au lever du soleil avec vue sur le petit port de pêche.',
    type: 'Yoga',
    pulseurId: 'p1',
    startTime: '2024-05-20T08:30:00',
    location: { lat: 43.2851, lng: 5.3508, address: 'Vallon des Auffes, 13007 Marseille' },
    capacity: 12,
    participants: [],
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pulse2',
    title: 'Pick-up Basketball au Mucem',
    description: 'Match amical sur l\'esplanade du J4. On cherche du monde pour un 5v5.',
    type: 'Sport Collectif',
    pulseurId: 'p2',
    startTime: '2024-05-20T18:00:00',
    location: { lat: 43.2969, lng: 5.3611, address: 'Esplanade du J4, 13002 Marseille' },
    capacity: 10,
    participants: ['u99'],
    imageUrl: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pulse5',
    title: 'Clean-walk Plage du Prophète',
    description: 'Action citoyenne : ramassage de déchets sur la plage suivi d\'un apéro offert.',
    type: 'Bénévolat',
    pulseurId: 'p1',
    startTime: '2024-05-21T10:00:00',
    location: { lat: 43.2764, lng: 5.3537, address: 'Plage du Prophète, 13007 Marseille' },
    capacity: 30,
    participants: [],
    imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pulse3',
    title: 'Exposition Art Moderne',
    description: 'Découverte du street-art et visite de 3 ateliers d\'artistes locaux au Cours Ju.',
    type: 'Exposition',
    pulseurId: 'p3',
    startTime: '2024-05-21T17:30:00',
    location: { lat: 43.2931, lng: 5.3842, address: 'Cours Julien, 13006 Marseille' },
    capacity: 15,
    participants: [],
    imageUrl: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pulse4',
    title: 'Apéro au Sunset - Catalans',
    description: 'Boire un verre les pieds dans le sable pour débriefer de la journée.',
    type: 'Boire un verre',
    pulseurId: 'p1',
    startTime: '2024-05-20T20:00:00',
    location: { lat: 43.2902, lng: 5.3534, address: 'Plage des Catalans, 13007 Marseille' },
    capacity: 20,
    participants: [],
    imageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=800&q=80'
  }
];
