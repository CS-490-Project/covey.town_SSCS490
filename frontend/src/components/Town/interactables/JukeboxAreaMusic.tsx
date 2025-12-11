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
  FormControl,
  FormLabel,
  Input,
  useToast,
} from '@chakra-ui/react';
import useTownController from '../../../hooks/useTownController';
import React, { useState, useCallback, useEffect, RefObject, useRef } from 'react';
import { InteractableID, Song } from '../../../types/CoveyTownSocket';
import { useInteractable, useInteractableAreaController } from '../../../classes/TownController';
import JukeboxAreaInteractable from './JukeboxArea';
import JukeboxAreaController from '../../../classes/interactable/JukeboxAreaController';
import { useYTAudio } from '../../../contexts/YTAudioContext';

const ALLOWED_DRIFT = 2000;
const DEFAULT_SONG = 'pFS4zYWxzNA';

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
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearch: (q: string) => void;
  // coveyTownController: ReturnType<typeof useTownController>;
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
  searchQuery,
  setSearchQuery,
  onSearch,
}: // coveyTownController,
JukeboxAreaProps): JSX.Element {
  const jukeboxAreaController = useInteractableAreaController<JukeboxAreaController>(
    jukeboxArea.id,
  );

  const [songQueue, setSongQueue] = useState<Song[]>([]);
  // Helper to format time in mm:ss
  // Used in progress bar display to display current time and duration of song
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [startedAtCurrentSong, setStartedAtCurrentSong] = useState(0);

  // Synchronization
  useEffect(() => {
    // No sync in default mode
    if (isDefaultMode) return;
    if (jukeboxAreaController) {
      if (jukeboxAreaController.songQueue.length > 0) {
        const theoreticalTime = Date.now() - startedAtCurrentSong;
        if (Math.abs(theoreticalTime - currentTime * 1000) > ALLOWED_DRIFT) {
          seek(Math.floor(theoreticalTime / 1000));
        }
      }
    }
  }, [isDefaultMode, currentTime, seek, jukeboxAreaController, startedAtCurrentSong]);

  // Looping default music
  useEffect(() => {
    if (!isDefaultMode) return;
    const intervalId = window.setInterval(() => {
      if (playerRef.current?.getPlayerState() === window.YT.PlayerState.ENDED) {
        load(DEFAULT_SONG);
      }
    }, 300);
    return () => window.clearInterval(intervalId);
  }, [playerRef, isDefaultMode, load]);

  const lastLoadedSongStartedAt = useRef<number | null>(null);

  useEffect(() => {
    const onQueueChange = (queue: Song[]) => {
      setSongQueue(queue);

      const next = queue[0];
      if (!next && !isDefaultMode) {
        seek(duration);
        setCurrentSong('No songs in playlist');
        seek(0);
        return;
      }

      // we know next.startedAt is defined because it is first in the queue
      if (lastLoadedSongStartedAt.current !== next.startedAt && next.startedAt && !isDefaultMode) {
        lastLoadedSongStartedAt.current = next.startedAt;
        load(next.youtubeId);
        setCurrentSong(next.title);
        setStartedAtCurrentSong(next.startedAt);
      }
    };

    jukeboxAreaController.addListener('songQueueChange', onQueueChange);

    // Initialize with current queue on mount
    const currentQueue = jukeboxAreaController.songQueue;
    if (currentQueue.length > 0) {
      setSongQueue(currentQueue);
    }

    return () => {
      jukeboxAreaController.removeListener('songQueueChange', onQueueChange);
    };
  }, [jukeboxAreaController, load, setCurrentSong, isDefaultMode, seek, duration]);

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
          if (
            jukeboxAreaController.songQueue.length > 0 &&
            jukeboxAreaController.songQueue[0].startedAt
          ) {
            setStartedAtCurrentSong(jukeboxAreaController.songQueue[0].startedAt);
            load(jukeboxAreaController.songQueue[0].youtubeId);
            setCurrentSong(jukeboxAreaController.songQueue[0].title);
          } else {
            setCurrentSong('No songs in playlist');
          }
        }
      } else {
        load(DEFAULT_SONG);
        setCurrentSong('Default Background Music');
      }
    }
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
      {/* Search Bar - Only show in Shared mode */}
      {!isDefaultMode && (
        <FormControl>
          <FormLabel htmlFor='song'>Search a song</FormLabel>
          <Input
            id='song'
            placeholder='Type song name and press Enter'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearch(searchQuery);
              }
            }}
          />
        </FormControl>
      )}
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
                    />
                  </HStack>

                  {/* Progress Bar */}
                  <HStack width='100%' spacing={4}>
                    <Text fontSize='md' color='white' minW='40px'>
                      {formatTime(currentTime)}
                    </Text>
                    <Box
                      flex='1'
                      onKeyDown={e => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}>
                      <Slider
                        value={currentTime}
                        min={0}
                        max={duration}
                        onChange={onSeek}
                        isDisabled={!isDefaultMode}
                        opacity={!isDefaultMode ? 0.5 : 1}
                        cursor={!isDefaultMode ? 'not-allowed' : 'pointer'}
                        focusThumbOnChange={false}>
                        <SliderTrack bg='whiteAlpha.500'>
                          <SliderFilledTrack bg='white' />
                        </SliderTrack>
                        <SliderThumb boxSize={4} bg='white' />
                      </Slider>
                    </Box>
                    <Text fontSize='md' color='white' minW='40px'>
                      {formatTime(duration)}
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </Box>
        </VStack>
      </Box>

      {/* Queue Display - Only show in Shared mode */}
      {!isDefaultMode && (
        <Box
          bg='white'
          p={4}
          borderRadius='md'
          border='1px solid'
          borderColor='gray.200'
          maxH='300px'
          overflowY='auto'>
          <Text fontSize='lg' fontWeight='semibold' mb={3} color='gray.700'>
            Playlist ({songQueue.length} {songQueue.length === 1 ? 'song' : 'songs'})
          </Text>

          {songQueue.length === 0 ? (
            <Box bg='gray.50' p={4} borderRadius='md' textAlign='center'>
              <Text color='gray.500' fontSize='sm'>
                No songs in queue. Search and add songs above!
              </Text>
            </Box>
          ) : (
            <VStack spacing={2} align='stretch'>
              {songQueue.map((song, index) => (
                <Box
                  key={`${song.youtubeId}-${index}-${song.startedAt || 'queued'}`}
                  bg={index === 0 ? 'blue.50' : 'gray.50'}
                  p={3}
                  borderRadius='md'
                  borderLeft='4px solid'
                  borderColor={index === 0 ? 'blue.500' : 'gray.300'}
                  transition='all 0.2s'>
                  <HStack justify='space-between' align='start'>
                    <VStack align='start' spacing={1} flex={1}>
                      <HStack>
                        {index === 0 && <Text fontSize='sm' color='blue.500'></Text>}
                        <Text
                          fontWeight={index === 0 ? 'bold' : 'medium'}
                          fontSize='sm'
                          color={index === 0 ? 'blue.700' : 'gray.700'}
                          noOfLines={1}>
                          {song.title}
                        </Text>
                      </HStack>
                      {song.queuedBy && (
                        <Text fontSize='xs' color='gray.500' fontStyle='italic'>
                          Queued by {song.queuedBy.userName}
                        </Text>
                      )}
                    </VStack>
                    {index === 0 && (
                      <Box bg='blue.500' px={2} py={1} borderRadius='md' flexShrink={0}>
                        <Text fontSize='xs' color='white' fontWeight='bold'>
                          PLAYING
                        </Text>
                      </Box>
                    )}
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      )}

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
      zIndex={1500}
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
          Yes
        </Button>
        <Button size='sm' variant='outline' onClick={onCancel}>
          No
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
  const townController = useTownController();
  const [isHidden, setIsHidden] = useState(true);
  const [displayVote, setDisplayVote] = useState(false);
  const toast = useToast();
  const jukeboxAreaController = useInteractableAreaController<JukeboxAreaController>('Jukebox');

  const closeModal = useCallback(() => {
    if (jukeboxArea) {
      setIsHidden(true);
      townController.unPause();
    }
  }, [jukeboxArea, townController]);

  // BELOW V ARE CONTROLS FOR YT IFRAME PLAYER

  // Audio state - lives here so it persists when modal closes
  const { playerRef, isPlaying, currentTime, duration, play, pause, seek, load } = useYTAudio();
  const [currentSong, setCurrentSong] = useState('Default Background Music');
  const [isDefaultMode, setIsDefaultMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (jukeboxArea) {
      townController.pause();
    } else {
      townController.unPause();
    }
  }, [townController, jukeboxArea]);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !jukeboxArea) {
        return;
      }

      try {
        await townController.sendSearchSongCommand(jukeboxArea.id, query.trim());

        toast({
          title: 'Song request sent!',
          description: `Searching for "${query}"...`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        setSearchQuery(''); // Clear the search bar after submission
      } catch (error) {
        toast({
          title: 'Error sending song request',
          description: `Could not send song request. Please try again`,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [toast, townController, jukeboxArea, setSearchQuery],
  );

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

  // Displays the skip vote for the client when a vote is occurring
  useEffect(() => {
    if (!jukeboxAreaController) return;

    const onVotingChange = (isVoting: boolean) => {
      if (isVoting) {
        setDisplayVote(true);
      } else {
        setDisplayVote(false);
      }
    };
    jukeboxAreaController?.addListener('isVotingStarted', onVotingChange);

    return () => {
      jukeboxAreaController?.removeListener('isVotingStarted', onVotingChange);
    };
  }, [jukeboxAreaController]);

  const handleSkip = useCallback(() => {
    if (jukeboxArea) {
      // Sends Initiate Vote Skip Command if there is no current vote to skip.
      if (jukeboxAreaController.skipVotes === 0 && !jukeboxAreaController.isVoting) {
        // Vote is on a 20 second timer
        townController.sendInitiateVoteSkipCommand(jukeboxArea.id);
      }
      return;
    }

    seek(0);
  }, [jukeboxArea, jukeboxAreaController, seek, townController]);

  const handleVoteConfirm = useCallback(() => {
    // Sends Yes vote to the JukeboxArea interactable
    townController.sendVoteConfirmCommand('Jukebox');
    setDisplayVote(false);
  }, [townController]);

  const handleVoteCancel = useCallback(() => {
    // Just hides SkipVoteButton
    setDisplayVote(false);
  }, []);

  return (
    <>
      {/* Audio element also here for when modal isn't open */}
      {displayVote && (
        <SkipVoteButton
          visible={displayVote}
          onConfirm={handleVoteConfirm}
          onCancel={handleVoteCancel}
        />
      )}

      {/* Audio element lives outside the modal - persists when modal closes */}
      {jukeboxArea && (
        <Modal isOpen onClose={closeModal} closeOnOverlayClick={false} size='xl'>
          <ModalOverlay display={isHidden ? 'none' : 'block'} />
          <ModalContent
            display={isHidden ? 'none' : 'block'}
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
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={handleSearch}
                // coveyTownController={townController}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}
