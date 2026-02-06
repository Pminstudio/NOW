import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Pulse } from '../../types';

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

/**
 * Generate share content for a pulse
 */
export function generatePulseShareData(pulse: Pulse, baseUrl: string = window.location.origin): ShareData {
  const dateStr = new Date(pulse.startTime).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    title: `${pulse.title} - NOW`,
    text: `Rejoins-moi pour "${pulse.title}" ! 🚀\n\n📍 ${pulse.location.address}\n📅 ${dateStr}\n\n${pulse.description}`,
    url: `${baseUrl}/pulse/${pulse.id}`
  };
}

/**
 * Share a pulse using native share sheet or Web Share API
 */
export async function sharePulse(pulse: Pulse): Promise<{ success: boolean; error?: string }> {
  const shareData = generatePulseShareData(pulse);

  try {
    if (Capacitor.isNativePlatform()) {
      // Use Capacitor Share plugin for native
      await Share.share({
        title: shareData.title,
        text: shareData.text,
        url: shareData.url,
        dialogTitle: 'Partager ce Pulse'
      });
      return { success: true };
    } else if (navigator.share) {
      // Use Web Share API if available
      await navigator.share({
        title: shareData.title,
        text: shareData.text,
        url: shareData.url
      });
      return { success: true };
    } else {
      // Fallback: copy to clipboard
      await copyToClipboard(shareData.url);
      return { success: true };
    }
  } catch (error) {
    // User cancelled sharing - not an error
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false };
    }
    console.error('Share error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors du partage'
    };
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (error) {
    console.error('Copy to clipboard error:', error);
    return false;
  }
}

/**
 * Check if native sharing is available
 */
export function canShare(): boolean {
  return Capacitor.isNativePlatform() || !!navigator.share;
}

/**
 * Share via specific platform (for custom share buttons)
 */
export function getShareLinks(pulse: Pulse, baseUrl: string = window.location.origin) {
  const shareData = generatePulseShareData(pulse, baseUrl);
  const encodedText = encodeURIComponent(shareData.text);
  const encodedUrl = encodeURIComponent(shareData.url);
  const encodedTitle = encodeURIComponent(shareData.title);

  return {
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
    sms: `sms:?body=${encodedText}%20${encodedUrl}`
  };
}
