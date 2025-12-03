import { useEffect } from 'react';
import { usePlayersInVideoCall } from '../../../classes/TownController';
import { useAudio } from '../../../contexts/AudioContext';

/**
 * VideoCallAutoMute Component (Task 16)
 *
 * Automatically mutes jukebox audio when the user joins a video call.
 * This component doesn't render anything - it just handles the auto-mute logic.
 *
 * Implementation:
 * - Uses usePlayersInVideoCall hook to detect when video call is active
 * - Automatically mutes audio when 2+ players are in proximity (video call active)
 * - Does NOT automatically unmute when leaving call (user can manually unmute)
 * - Works with real audio element through AudioContext
 *
 * User Story #3: As a user, I want the jukebox to automatically mute when I'm in a video call
 *
 * @returns null (this component doesn't render anything)
 */
export default function VideoCallAutoMute(): null {
  const playersInCall = usePlayersInVideoCall();
  const { audioRef, setIsMuted } = useAudio();

  useEffect(() => {
    // If there are 2 or more players in the video call (including ourselves),
    // automatically mute the jukebox audio to avoid interference with the call
    if (playersInCall.length >= 2) {
      console.log('Video call active with', playersInCall.length, 'players. Auto-muting jukebox.');

      // Update audio element
      if (audioRef.current) {
        audioRef.current.muted = true;
      }

      // Update global mute state
      setIsMuted(true);
    }

    // Note: We intentionally do NOT auto-unmute when leaving the call
    // The user may want to keep the audio muted even after the call ends
    // They can manually unmute using the mute button if desired
  }, [playersInCall, setIsMuted, audioRef]);

  return null; // This component doesn't render anything
}
