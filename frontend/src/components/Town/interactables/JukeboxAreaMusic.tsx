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
import React, { useState, useCallback, useEffect, RefObject, useRef } from 'react';
import { InteractableID, Song } from '../../../types/CoveyTownSocket';
import { useInteractable, useInteractableAreaController } from '../../../classes/TownController';
//import { useInteractable } from '../../../classes/TownController';
import JukeboxAreaInteractable from './JukeboxArea';
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
  setIsDefaultMode: (value: boolean) => void;
  setCurrentSong: (value: string) => void;
  jukeboxArea: JukeboxAreaInteractable;
  playerRef: RefObject<YT.Player | null>;
  //play: () => void;
  pause: () => void;
  seek: (sec: number) => void;
  load: (songId: string) => void;
  isHidden: boolean;
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
  setIsDefaultMode,
  setCurrentSong,
  jukeboxArea,
  playerRef,
  //play,
  pause,
  seek,
  load,
  isHidden,
}: JukeboxAreaProps): JSX.Element {
  const jukeboxAreaController = useInteractableAreaController<JukeboxAreaController>(
    jukeboxArea.name,
  );
  // Helper to format time in mm:ss
  // Used in progress bar display to display current time and duration of song
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const lastLoadedSong = useRef<Song | null>(null);

  useEffect(() => {
    const onQueueChange = (queue: Song[]) => {
      const next = queue[0];
      if (!next) return;

      if (lastLoadedSong.current !== next) {
        lastLoadedSong.current = next;
        load(next.youtubeId);
        setCurrentSong(next.title);
      }
    };

    jukeboxAreaController.addListener('songQueueChange', onQueueChange);
    return () => {
      jukeboxAreaController.removeListener('songQueueChange', onQueueChange);
    };
  }, [jukeboxAreaController, load, setCurrentSong]);

  const onModeToggle = useCallback(() => {
    const newMode = !isDefaultMode;
    setIsDefaultMode(newMode);

    // Always pause and reset when switching modes
    if (playerRef.current) {
      pause();
      seek(0);
      // Remove source when switching to shared mode (empty playlist)
      if (!newMode) {
        if (jukeboxAreaController) {
          const testList: Song[] = [
            {
              youtubeId: 'MtN1YnoL46Q',
              thumbnail: 'blah',
              title: 'Bad song',
              artist: 'A horrible person',
            },
          ];
          jukeboxAreaController.songQueue = testList;
          if (jukeboxAreaController.songQueue.length > 0)
            load(jukeboxAreaController.songQueue[0].youtubeId);
          else load('dQw4w9WgXcQ');
        }
      } else {
        load('sF80I-TQiW0');
      }
    }

    setCurrentSong(newMode ? 'Default Background Music' : 'No songs in playlist');
  }, [
    isDefaultMode,
    load,
    pause,
    playerRef,
    seek,
    setCurrentSong,
    setIsDefaultMode,
    jukeboxAreaController,
  ]);

  return (
    <VStack
      spacing={4}
      width='100%'
      align='stretch'
      style={{ visibility: isHidden ? 'hidden' : 'visible' }}>
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
  const [isHidden, setIsHidden] = useState(true);

  const closeModal = useCallback(() => {
    if (jukeboxArea) {
      setIsHidden(true);
    }
  }, [jukeboxArea]);

  // BELOW V ARE CONTROLS FOR YT IFRAME PLAYER

  // Audio state - lives here so it persists when modal closes
  const {
    //containerRef,
    playerRef,
    //ready,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    seek,
    load,
  } = useYTAudio();
  const [currentSong, setCurrentSong] = useState('Default Background Music');
  const [isDefaultMode, setIsDefaultMode] = useState(true);

  function setHide() {
    setIsHidden(true);
  }

  function setShow() {
    setIsHidden(false);
  }

  useEffect(() => {
    console.log('Change');
    jukeboxArea?.addListener('hide', setHide);
    jukeboxArea?.addListener('show', setShow);

    return () => {
      jukeboxArea?.removeListener('hide', setHide);
      jukeboxArea?.removeListener('show', setShow);
    };
  }, [jukeboxArea]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    if (!playerRef.current) return;

    // Don't allow play in shared mode if playlist is empty
    if (!isDefaultMode) {
      return;
    }

    if (isPlaying) pause();
    else play();
  }, [isPlaying, isDefaultMode, play, pause, playerRef]);

  const handleSeek = useCallback(
    (value: number) => {
      if (!isDefaultMode) return;
      seek(value);
    },
    [seek, isDefaultMode],
  );

  // THIS IS A PLACEHOLDER
  // ACTUAL SKIP SHOULD HAVE A DIFFERENT LOGIC
  const handleSkip = useCallback(() => {
    if (!playerRef.current) return;

    // Skip only works in default mode for now
    if (!isDefaultMode) return;

    seek(0);
  }, [isDefaultMode, playerRef, seek]);

  if (jukeboxArea) {
    return (
      <>
        {/* Audio element lives outside the modal - persists when modal closes */}

        <Modal isOpen onClose={closeModal} closeOnOverlayClick={false} size='xl'>
          <ModalOverlay
            visibility={isHidden ? 'hidden' : 'visible'}
            pointerEvents={isHidden ? 'none' : 'auto'}
          />
          <ModalContent
            visibility={isHidden ? 'hidden' : 'visible'}
            pointerEvents={isHidden ? 'none' : 'auto'}>
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
                setIsDefaultMode={setIsDefaultMode}
                setCurrentSong={setCurrentSong}
                jukeboxArea={jukeboxArea}
                playerRef={playerRef}
                //play={play}
                pause={pause}
                seek={seek}
                load={load}
                isHidden={isHidden}
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
      <SkipVoteButton visible={true} onConfirm={() => {}} onCancel={() => {}} />
    </>
  );
}
