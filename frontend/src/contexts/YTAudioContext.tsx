import React, {
  createContext,
  useContext,
  useRef,
  RefObject,
  useEffect,
  useState,
  useCallback,
} from 'react';

type PlayerContextType = {
  containerRef: RefObject<HTMLDivElement>;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore YT namespace not defined during tests
  playerRef: RefObject<YT.Player | null>;
  ready: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;

  play: () => void;
  pause: () => void;
  seek: (sec: number) => void;
  load: (songId: string) => void;
};

const playerContext = createContext<PlayerContextType | null>(null);

export function YTAudioProvider({
  children,
  defaultSongID = 'pFS4zYWxzNA',
}: {
  children: React.ReactNode;
  defaultSongID?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore YT namespace not defined during tests
  const playerRef = useRef<YT.Player | null>(null);

  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Player is not yet created
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const createPlayer = () => {
      playerRef.current = new window.YT.Player(el, {
        videoId: defaultSongID,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          loop: 1,
          playlist: defaultSongID,
        },
        events: {
          onReady: () => {
            setReady(true);
            const d = Math.floor(playerRef.current?.getDuration() ?? 0);
            if (d > 0) setDuration(d);
            if (playerRef.current) playerRef.current.playVideo();
          },
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore YT namespace not defined during tests
          onStateChange: ({ data }) => {
            if (data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setDuration(d => d || Math.floor(playerRef.current?.getDuration() ?? 0));
            } else if (
              data === window.YT.PlayerState.PAUSED ||
              data === window.YT.PlayerState.ENDED
            ) {
              setIsPlaying(false);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag?.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [defaultSongID]);

  // Polling to update current time
  useEffect(() => {
    if (!ready || !isPlaying || !playerRef.current) return;
    const intervalId = window.setInterval(() => {
      const t = playerRef.current?.getCurrentTime() ?? 0;
      setCurrentTime(Math.floor(t));
    }, 300);
    return () => window.clearInterval(intervalId);
  }, [ready, isPlaying]);

  const play = useCallback(() => playerRef.current?.playVideo(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);
  const seek = useCallback((sec: number) => playerRef.current?.seekTo(sec, true), []);
  const load = useCallback((videoId: string) => {
    if (!playerRef.current) return;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    playerRef.current.loadVideoById(videoId);
  }, []);

  return (
    <playerContext.Provider
      value={{
        containerRef,
        playerRef,
        ready,
        isPlaying,
        currentTime,
        duration,
        play,
        pause,
        seek,
        load,
      }}>
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
