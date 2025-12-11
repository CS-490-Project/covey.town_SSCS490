import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { mock, MockProxy } from 'jest-mock-extended';
import TownController from '../../../classes/TownController';
import * as TownControllerHooks from '../../../classes/TownController';
import TownControllerContext from '../../../contexts/TownControllerContext';
import JukeboxAreaController from '../../../classes/interactable/JukeboxAreaController';
import { Song } from '../../../types/CoveyTownSocket';
import JukeboxAreaWrapper from './JukeboxAreaMusic';

/*
Added one file with four small tests:
JukeboxArea gets rendered
Toggling default/shared mode calls seek and pause
Queuing a song call load with that song id
Sync calls seek with correct time if there is a time difference is greater than allowed drift. 
*/

const play = jest.fn();
const pause = jest.fn();
const seek = jest.fn();
const load = jest.fn();

const playerRef = {
  current: {
    getPlayerState: jest.fn(() => 1),
  },
} as any;

const containerRef = {
  current: {
    getPlayerState: jest.fn(() => 1),
  },
} as any;

jest.mock('../../../contexts/YTAudioContext', () => ({
  __esModule: true,
  useYTAudio: () => ({
    containerRef,
    playerRef,
    isPlaying: false,
    currentTime: 0,
    duration: 999,
    play,
    pause,
    seek,
    load,
  }),
}));

function renderJukebox(controller: TownController) {
  return render(
    <ChakraProvider>
      <TownControllerContext.Provider value={controller}>
        <JukeboxAreaWrapper />
      </TownControllerContext.Provider>
    </ChakraProvider>,
  );
}

describe('Jukebox Area Music', () => {
  let townController: MockProxy<TownController>;
  let areaController: JukeboxAreaController;
  let useInteractableSpy: jest.SpyInstance;
  let useInteractableAreaControllerSpy: jest.SpyInstance;
  let mockInteractable: any;

  beforeAll(() => {
    (window as any).YT = {
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
    };
  });

  beforeEach(() => {
    play.mockClear();
    pause.mockClear();
    seek.mockClear();
    load.mockClear();

    townController = mock<TownController>();
    const emitter = {
      on: jest.fn(),
      off: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      emit: jest.fn(),
    };
    Object.defineProperty(townController, 'interactableEmitter', {
      value: emitter,
    });

    townController.pause.mockImplementation(() => undefined as any);
    townController.unPause?.mockImplementation?.(() => undefined as any);

    areaController = new JukeboxAreaController({
      id: 'test',
      songQueue: [],
      skipVotes: 0,
      isVoting: false,
      occupants: [],
      type: 'JukeboxArea',
    });

    mockInteractable = {
      id: 'test',
      name: 'Test Jukebox',
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    useInteractableSpy = jest
      .spyOn(TownControllerHooks, 'useInteractable')
      .mockReturnValue(mockInteractable);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    useInteractableAreaControllerSpy = jest
      .spyOn(TownControllerHooks, 'useInteractableAreaController')
      .mockReturnValue(areaController as any);
  });

  function getLatestListenerAdded(eventName: string, spy: jest.SpyInstance) {
    const addedListeners = spy.mock.calls.filter(eachCall => eachCall[0] === eventName);
    if (addedListeners.length === 0) {
      throw new Error(
        `Expected at least one addListener("${eventName}") call, found ${addedListeners.length}`,
      );
    }
    return addedListeners[addedListeners.length - 1][1];
  }

  // helper function to trigger UI of the jukebox
  async function showJukeboxUI() {
    await waitFor(() =>
      expect(mockInteractable.addListener).toHaveBeenCalledWith('show', expect.any(Function)),
    );

    const showCb = (mockInteractable.addListener as jest.Mock).mock.calls.find(
      ([eventName]) => eventName === 'show',
    )?.[1] as (() => void) | undefined;

    if (!showCb) throw new Error('show listener was not registered');

    act(() => showCb());
  }

  describe('Render', () => {
    test('renders without crashing', () => {
      renderJukebox(townController);
      // ModalHeader shows interactable name
      expect(screen.getByText('Test Jukebox')).toBeInTheDocument();
    });
  });

  describe('Mode switching', () => {
    test('pauses and seeks to 0 when mode is toggled', async () => {
      renderJukebox(townController);
      await showJukeboxUI();

      // Clicks on mode switch
      fireEvent.click(screen.getByRole('checkbox'));

      expect(pause).toHaveBeenCalled();
      expect(seek).toHaveBeenCalledWith(0);
    });
  });

  describe('Song switching', () => {
    test('loads next song on songQueueChange', async () => {
      const addListenerSpy = jest.spyOn(areaController, 'addListener');

      renderJukebox(townController);
      await showJukeboxUI();

      // switch to shared mode
      fireEvent.click(screen.getByRole('checkbox'));

      await waitFor(() =>
        expect(addListenerSpy).toHaveBeenCalledWith('songQueueChange', expect.any(Function)),
      );

      const onQueueChange = getLatestListenerAdded('songQueueChange', addListenerSpy);

      const song: Song = {
        youtubeId: 'test',
        title: 'Song',
        artist: 'Artist',
        thumbnail: '',
        startedAt: Date.now(),
      };

      act(() => {
        onQueueChange([song]);
      });

      await waitFor(() => expect(load).toHaveBeenCalledWith('test'));
      const nowPlaying = screen.getByText('Now Playing').closest('div');
      expect(nowPlaying).not.toBeNull();
      expect(within(nowPlaying as HTMLElement).getByText('Song')).toBeInTheDocument();
    });
  });

  describe('Synchronization', () => {
    test('calls seek when allowed threshold is exceeded', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(1000000);

      const addListenerSpy = jest.spyOn(areaController, 'addListener');

      renderJukebox(townController);
      await showJukeboxUI();

      // switch to shared mode
      fireEvent.click(screen.getByRole('checkbox'));
      // clear the seek(0) from mode switch
      seek.mockClear();

      await waitFor(() =>
        expect(addListenerSpy).toHaveBeenCalledWith('songQueueChange', expect.any(Function)),
      );

      const onQueueChange = getLatestListenerAdded('songQueueChange', addListenerSpy);

      const song: Song = {
        youtubeId: 'test',
        title: 'Song',
        artist: 'Artist',
        thumbnail: '',
        startedAt: Date.now() - 10000,
      };

      act(() => {
        areaController.songQueue = [song];
        onQueueChange([song]);
      });

      await waitFor(() => expect(seek).toHaveBeenCalledWith(10));

      jest.useRealTimers();
    });
  });
});
