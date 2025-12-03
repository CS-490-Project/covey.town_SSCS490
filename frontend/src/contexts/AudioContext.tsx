import React, { createContext, useContext, useRef, RefObject, useState } from 'react';

/**
 * Type definition for the Audio Context.
 * Holds a reference to the shared <audio> element.
 */
type AudioContextType = {
  audioRef: RefObject<HTMLAudioElement>;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
};

const audioContext = createContext<AudioContextType | null>(null);

/**
 * AudioProvider
 *
 * Wrap JukeboxAreaWrapper with AudioProvider to give children access to a shared <audio> element.
 *
 * @param {React.ReactNode} children - React children components
 * @returns {JSX.Element} The provider wrapping children
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <audioContext.Provider value={{ audioRef, isMuted, setIsMuted }}>
      {children}
    </audioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(audioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}
