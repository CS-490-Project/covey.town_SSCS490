import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Box,
  HStack,
  Text,
  Button,
  VStack,
  Flex,
  Switch,
  IconButton,
  Icon,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@chakra-ui/react';
import useTownController from '../../../hooks/useTownController';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InteractableID } from '../../../types/CoveyTownSocket';
import { useInteractable, useInteractableAreaController } from '../../../classes/TownController';
import JukeboxAreaInteractable from './JukeboxArea';
import { useAudio } from '../../../contexts/AudioContext';
import JukeboxAreaController from '../../../classes/interactable/JukeboxAreaController';
import { useYTAudio } from '../../../contexts/YTAudioContext';

export type SkipVoteButtonProps = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Props for JukeboxArea - receives control functions from parent
type JukeboxAreaProps = {
  interactableID: InteractableID;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentSong: string;
  isDefaultMode: boolean;
  onPlayPause: () => void;
  onSkip: () => void;
  onSeek: (value: number) => void;
  onModeToggle: () => void;
};

function JukeboxArea({
  isPlaying,
  currentTime,
  duration,
  currentSong,
  isDefaultMode,
  onPlayPause,
  onSkip,
  onSeek,
  onModeToggle,
}: JukeboxAreaProps): JSX.Element {
  // Helper to format time in mm:ss
  // Used in progress bar display to display current time and duration of song
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <VStack spacing={4} width='100%' align='stretch'>
      {/* Toggle Section 
      Music Mode Toggle Section
      - Horizontal layout for label and toggle switch
      - Switch toggles between Default mode and Shared mode
      - Colors indicate active/inactive state
      - onChange calls parent callback to handle mode change
  */}

      <Flex justify='space-between' align='center' mb={2}>
        <Text fontSize='lg' fontWeight='medium' color='gray.600'>
          Music Mode
        </Text>

        <HStack spacing={2}>
          <Text fontSize='md' color={!isDefaultMode ? 'blue.500' : 'gray.400'}>
            Shared
          </Text>

          <Switch size='md' colorScheme='blue' isChecked={isDefaultMode} onChange={onModeToggle} />

          <Text fontSize='md' color={isDefaultMode ? 'blue.500' : 'gray.400'}>
            Default
          </Text>
        </HStack>
      </Flex>

      {/* Mode Indicator */}
      <Box
        bg={isDefaultMode ? 'blue.50' : 'green.50'}
        p={2}
        borderRadius='md'
        borderLeft='4px solid'
        borderColor={isDefaultMode ? 'blue.500' : 'green.500'}>
        <Text fontSize='sm' color='gray.700'>
          {isDefaultMode ? 'Playing default music' : 'Listening to shared town playlist'}
        </Text>
      </Box>

      {/* Now Playing Section */}
      <Box bg='#70A1D9' p={6} borderRadius='xl' width='100%'>
        <VStack spacing={4}>
          <Text fontSize='2xl' fontWeight='bold' color='black'>
            Now Playing
          </Text>

          <Box bg='white' p={1} borderRadius='2xl' width='100%' boxShadow='md'>
            <VStack spacing={6}>
              {/* Song Display Box */}
              <Box bg='#70A1D9' borderRadius='xl' width='100%' p={8}>
                <VStack spacing={6}>
                  <Text fontSize='2xl' fontWeight='semibold' color='white'>
                    {currentSong}
                  </Text>

                  {/* Playback Controls */}
                  <HStack spacing={6}>
                    <IconButton
                      aria-label='Play/Pause'
                      icon={
                        isPlaying ? (
                          <Icon viewBox='0 0 24 24' boxSize={8}>
                            <path fill='white' d='M6 4h4v16H6V4zm8 0h4v16h-4V4z' />
                          </Icon>
                        ) : (
                          <Icon viewBox='0 0 24 24' boxSize={8}>
                            <path fill='white' d='M8 5v14l11-7z' />
                          </Icon>
                        )
                      }
                      onClick={onPlayPause}
                      size='lg'
                      bg='transparent'
                      border='2px solid white'
                      borderRadius='full'
                      _hover={{ bg: 'whiteAlpha.300' }}
                      isDisabled={!isDefaultMode}
                      opacity={!isDefaultMode ? 0.5 : 1}
                      cursor={!isDefaultMode ? 'not-allowed' : 'pointer'}
                    />

                    <IconButton
                      aria-label='Skip Forward'
                      icon={
                        <Icon viewBox='0 0 24 24' boxSize={8}>
                          <path fill='white' d='M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z' />
                        </Icon>
                      }
                      onClick={onSkip}
                      size='lg'
                      bg='transparent'
                      border='2px solid white'
                      borderRadius='full'
                      _hover={{ bg: 'whiteAlpha.300' }}
                      isDisabled={!isDefaultMode}
                      opacity={!isDefaultMode ? 0.5 : 1}
                      cursor={!isDefaultMode ? 'not-allowed' : 'pointer'}
                    />
                  </HStack>

                  {/* Progress Bar */}
                  <HStack width='100%' spacing={4}>
                    <Text fontSize='md' color='white'>
                      {formatTime(currentTime)}
                    </Text>
                    <Slider value={currentTime} min={0} max={duration} onChange={onSeek}>
                      <SliderTrack bg='whiteAlpha.500'>
                        <SliderFilledTrack bg='white' />
                      </SliderTrack>
                      <SliderThumb boxSize={4} bg='white' />
                    </Slider>
                    <Text fontSize='md' color='white'>
                      {formatTime(duration)}
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </Box>
        </VStack>
      </Box>

      {/* Additional Info */}
      <Text fontSize='xs' color='gray.500' textAlign='center'>
        {"Toggle switch to listen to town's default music or join the town's community playlist"}
      </Text>
    </VStack>
  );
}

export function SkipVoteButton({ visible, onConfirm, onCancel }: SkipVoteButtonProps) {
  return (
    <Box
      position='fixed'
      bottom='16px'
      left='20px'
      zIndex={1100}
      display={visible ? 'flex' : 'none'}
      bg='white'
      border='1px solid #E4E7E9'
      borderRadius='12px'
      boxShadow='md'
      px='12px'
      py='10px'
      alignItems='center'
      gap='10px'>
      <Text fontWeight='semibold'>Skip song?</Text>
      <HStack spacing='8px'>
        <Button size='sm' onClick={onConfirm}>
          Confirm
        </Button>
        <Button size='sm' variant='outline' onClick={onCancel}>
          Cancel
        </Button>
      </HStack>
    </Box>
  );
}

/*
function onPlayerReady(event: YT.PlayerEvent) {
  event.target.playVideo();
}


// This function creates a youtube player and returns the reference to player and its container
export function useYouTubePlayer(videoId: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);

  // Player is not yet created
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }

    const el = containerRef.current;
    if (!el) return;
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player(el, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          loop: 1,
        },
        events: {
          onReady: onPlayerReady,
        },
      });
    };

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  return { containerRef, playerRef };
}
*/

/**
 * JukeboxAreaWrapper
 *
 * This component wraps the JukeboxArea UI and manages all audio playback
 * logic, state, and interactions for the town jukebox.
 *
 * Key Responsibilities:
 * 1. Manages audio element and state:
 *    - `isPlaying`: whether audio is currently playing
 *    - `currentTime`: current playback time of the song
 *    - `duration`: total duration of the current song
 *    - `currentSong`: name of the current song
 *    - `isDefaultMode`: toggle between default background music and shared playlist
 *
 * 2. Handles audio events:
 *    - `handleTimeUpdate`: updates `currentTime` as audio plays
 *    - `handleLoadedMetadata`: sets `duration` when audio metadata is loaded
 *    - `onEnded` event: stops playback when song finishes
 *
 * 3. Controls playback:
 *    - `handlePlayPause`: toggles play/pause state; only works in default mode
 *    - `handleSkip`: resets song to beginning; only works in default mode
 *    - `handleSeek`: allows jumping to a specific time in the song
 *
 * 4. Handles mode toggle:
 *    - `handleModeToggle`: switches between default music and shared playlist
 *    - Pauses and resets audio when mode changes
 *    - Updates audio source based on selected mode
 *    - Resets playback state and current song display
 *
 * 5. Maintains audio persistence:
 *    - Audio element lives outside modal so music continues playing even when modal closes
 *
 * 6. Integrates with town/interactable state:
 *    - `useInteractable` to get current jukebox interactable
 *    - `useTownController` to manage modal closing and interactions
 *
 * Renders:
 * - The `JukeboxArea` component with all state and callback props
 * - A persistent `<audio>` element
 * - Modal wrapper to display the jukebox UI
 *
 * @returns {JSX.Element} The full jukebox UI and audio controller
 */

export default function JukeboxAreaWrapper(): JSX.Element {
  const jukeboxArea = useInteractable<JukeboxAreaInteractable>('jukeboxArea');
  let jukeboxAreaController = null;
  if (jukeboxArea) {
    jukeboxAreaController = useInteractableAreaController<JukeboxAreaController>(jukeboxArea.id);
  }
  const townController = useTownController();

  /*
  // Audio state - lives here so it persists when modal closes
  const { audioRef } = useAudio();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSong, setCurrentSong] = useState('No songs in playlist');
  const [isDefaultMode, setIsDefaultMode] = useState(false);

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(Math.floor(audioRef.current.currentTime));
    }
  }, [audioRef]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(Math.floor(audioRef.current.duration));
    }
  }, [audioRef]);

  // Mode toggle
  const handleModeToggle = useCallback(() => {
    const newMode = !isDefaultMode;
    setIsDefaultMode(newMode);

    // Always pause and reset when switching modes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // Remove source when switching to shared mode (empty playlist)
      if (!newMode) {
        audioRef.current.src = '';
      } else {
        audioRef.current.src = '/assets/default-music.mp3';
      }
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCurrentSong(newMode ? 'Default Background Music' : 'No songs in playlist');
  }, [isDefaultMode, audioRef]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    // Don't allow play in shared mode if playlist is empty
    if (!isDefaultMode) {
      return;
    }

    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying, isDefaultMode, audioRef]);

  const handleSkip = useCallback(() => {
    if (!audioRef.current) return;

    // Skip only works in default mode for now
    if (!isDefaultMode) return;

    audioRef.current.currentTime = 0;
    setCurrentTime(0);
  }, [isDefaultMode, audioRef]);

  const handleSeek = useCallback(
    (value: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = value;
        setCurrentTime(value);
      }
    },
    [audioRef],
  );
 */

  // ABOVE ^ ARE CONTROLS FOR REGULAR AUDIO ELEMENT
  const closeModal = useCallback(() => {
    if (jukeboxArea) {
      townController.interactEnd(jukeboxArea);
      // Audio continues playing after modal closes
    }
  }, [townController, jukeboxArea]);

  // BELOW V ARE CONTROLS FOR YT IFRAME PLAYER

  // Audio state - lives here so it persists when modal closes
  const { containerRef, playerRef } = useYTAudio();
  const [currentSong, setCurrentSong] = useState('No songs in playlist');
  const [isDefaultMode, setIsDefaultMode] = useState(false);
  //const [isPlaying, setIsPlaying] = useState(false);
  //const [currentTime, setCurrentTime] = useState(0);
  //const [duration, setDuration] = useState(0);
  //const [ready, setReady] = useState(false);

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (playerRef.current) {
      setCurrentTime(Math.floor(playerRef.current.getCurrentTime()));
    }
  }, [playerRef]);

  const handleLoadedMetadata = useCallback(() => {
    if (playerRef.current) {
      setDuration(Math.floor(playerRef.current.getDuration()));
    }
  }, [playerRef]);

  // Mode toggle
  const handleModeToggle = useCallback(() => {
    const newMode = !isDefaultMode;
    setIsDefaultMode(newMode);

    // Always pause and reset when switching modes
    if (playerRef.current) {
      playerRef.current.pauseVideo();
      playerRef.current.seekTo(0, false);
      // Remove source when switching to shared mode (empty playlist)
      if (!newMode) {
        playerRef.current.loadVideoById('dQw4w9WgXcQ');
        if (jukeboxAreaController) {
          //playerRef.current.loadVideoById(jukeboxAreaController.songQueue[0].url);
        }
      } else {
        playerRef.current.loadVideoById('sF80I-TQiW0');
      }
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCurrentSong(newMode ? 'Default Background Music' : 'No songs in playlist');
  }, [isDefaultMode, playerRef]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    if (!playerRef.current) return;

    // Don't allow play in shared mode if playlist is empty
    if (!isDefaultMode) {
      return;
    }

    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
    setIsPlaying(!isPlaying);
  }, [isPlaying, isDefaultMode, playerRef]);

  const handleSkip = useCallback(() => {
    if (!playerRef.current) return;

    // Skip only works in default mode for now
    if (!isDefaultMode) return;

    playerRef.current.seekTo(0, false);
    setCurrentTime(0);
  }, [isDefaultMode, playerRef]);

  const handleSeek = useCallback(
    (value: number) => {
      if (playerRef.current) {
        playerRef.current.seekTo(value, true);
        setCurrentTime(value);
      }
    },
    [playerRef],
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      handleTimeUpdate();
      // HANDLE SYNCHRONIZATION HERE
    }, 300); // Updates every second

    // Here we can set some listeners if we need them
    return () => clearInterval(intervalId);
  }, [playerRef, handleTimeUpdate]);

  if (jukeboxArea) {
    console.log('interactable id', jukeboxArea.id);

    return (
      <>
        {/* Audio element lives outside the modal - persists when modal closes */}

        {/*
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
        */}

        <Modal isOpen onClose={closeModal} closeOnOverlayClick={false} size='xl'>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>{jukeboxArea.name}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <JukeboxArea
                interactableID={jukeboxArea.id}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                currentSong={currentSong}
                isDefaultMode={isDefaultMode}
                onPlayPause={handlePlayPause}
                onSkip={handleSkip}
                onSeek={handleSeek}
                onModeToggle={handleModeToggle}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    );
  }

  return (
    <>
      {/* Audio element also here for when modal isn't open */}
      {/*<audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      /> */}
      <SkipVoteButton visible={true} onConfirm={() => {}} onCancel={() => {}} />
    </>
  );
}
