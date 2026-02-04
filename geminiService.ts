
import { GoogleGenAI, Type } from "@google/genai";
import { Pulse, Interest } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function matchPulsesByMood(
  mood: string, 
  pulses: Pulse[], 
  userInterests: Interest[]
): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analyze the user's mood and interests to suggest the best matching "Pulses" (activities).
        
        User Mood: "${mood}"
        User Interests: ${userInterests.join(', ')}
        
        Available Pulses:
        ${pulses.map(p => `ID: ${p.id}, Title: ${p.title}, Type: ${p.type}, Description: ${p.description}`).join('\n')}
        
        Return ONLY a JSON array of the IDs of the pulses that match best (max 3).
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Error matching pulses:", error);
    return pulses.slice(0, 2).map(p => p.id); // Fallback
  }
}

export async function generateActivityIdea(mood: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Propose une courte idée d'activité (1 phrase) pour quelqu'un qui se sent comme ça : "${mood}". Sois motivant et direct.`
    });
    return response.text || "Bougeons ensemble !";
  } catch {
    return "Il est temps de sortir et de pulser !";
  }
}
