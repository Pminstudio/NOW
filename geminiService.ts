import { Pulse, Interest } from './types';

/**
 * Match pulses based on user interests and optional keyword search
 * No AI needed - simple filtering based on type, tags, and interests
 */
export function matchPulsesByMood(
  searchText: string,
  pulses: Pulse[],
  userInterests: Interest[]
): string[] {
  if (!searchText.trim() && userInterests.length === 0) {
    return pulses.map(p => p.id);
  }

  const keywords = searchText.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = pulses.map(pulse => {
    let score = 0;

    // Boost if pulse type matches user interests
    if (userInterests.includes(pulse.type)) {
      score += 10;
    }

    // Search in title, description, type, and tags
    const searchableText = [
      pulse.title,
      pulse.description,
      pulse.type,
      ...(pulse.tags || [])
    ].join(' ').toLowerCase();

    // Score based on keyword matches
    for (const keyword of keywords) {
      if (searchableText.includes(keyword)) {
        score += 5;
      }
      // Partial match on type
      if (pulse.type.toLowerCase().includes(keyword)) {
        score += 8;
      }
      // Match on tags
      if (pulse.tags?.some(tag => tag.toLowerCase().includes(keyword))) {
        score += 6;
      }
    }

    return { pulse, score };
  });

  // Sort by score descending, return top matches
  return scored
    .filter(s => s.score > 0 || keywords.length === 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => s.pulse.id);
}

/**
 * Generate a simple activity suggestion based on time of day
 * No AI needed - just contextual messages
 */
export function generateActivityIdea(): string {
  const hour = new Date().getHours();

  const suggestions = {
    morning: [
      "Un café et une balade pour bien démarrer ?",
      "C'est l'heure de bouger, lance-toi !",
      "Le monde t'attend dehors, go pulse !"
    ],
    afternoon: [
      "Pause méritée, trouve ton activité !",
      "L'après-midi est jeune, profites-en !",
      "Parfait pour découvrir quelque chose de nouveau"
    ],
    evening: [
      "La soirée commence, où vas-tu pulser ?",
      "Afterwork time ! Rejoins un pulse",
      "Finis la journée en beauté"
    ],
    night: [
      "Noctambule ? Il y a des pulses pour toi",
      "La nuit est à nous, pulse !",
      "Les meilleures soirées commencent maintenant"
    ]
  };

  let timeOfDay: keyof typeof suggestions;
  if (hour >= 6 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
  else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
  else timeOfDay = 'night';

  const options = suggestions[timeOfDay];
  return options[Math.floor(Math.random() * options.length)];
}
