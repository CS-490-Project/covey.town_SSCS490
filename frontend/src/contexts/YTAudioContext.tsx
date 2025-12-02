import React, { createContext, useContext, useRef, RefObject } from 'react';
import { useYouTubePlayer } from './../components/Town/interactables/JukeboxAreaMusic';

type PlayerContextType = {
  containerRef: RefObject<HTMLDivElement>;
  playerRef: RefObject<YT.Player | null>;
};

const playerContext = createContext<PlayerContextType | null>(null);

export function YTAudioProvider({
  children,
  defaultSongID = 'sF80I-TQiW0',
}: {
  children: React.ReactNode;
  defaultSongID?: string;
}) {
  const { containerRef, playerRef } = useYouTubePlayer(defaultSongID, { onReady: () => handleLoadedMetadata(), });

  return (
    <playerContext.Provider value={{ containerRef, playerRef }}>
      {children}
      <div ref={containerRef} style={{ width: 0, height: 0, visibility: 'hidden' }} />
    </playerContext.Provider>
  );
}

export function useYTAudio() {
  const context = useContext(playerContext);
  if (!context) {
    throw new Error('usePlayer must be used within YTAudioProvider');
  }
  return context;
}
