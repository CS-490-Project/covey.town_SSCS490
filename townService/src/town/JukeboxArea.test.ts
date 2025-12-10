import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import JukeboxArea, { HasPlayerCount } from './JukeboxArea';
import {
  JukeboxArea as JukeboxAreaModel,
  PlayerID,
  Song,
  TownEmitter,
} from '../types/CoveyTownSocket';
import Player from '../lib/Player';
import { getLastEmittedEvent } from '../TestUtils';

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');

describe('JukeboxArea', () => {
  const testAreaBox = { x: 100, y: 100, width: 100, height: 100 };
  let testArea: JukeboxArea;
  const townEmitter = mock<TownEmitter>();
  // This indirection means our mock town implementation captures a reference
  // to the object, meaning we can update the stored number elsewhere and have
  // it update there.
  const playerCountObject = { playerCount: 0 };
  const town: HasPlayerCount = {
    playerCount: () => playerCountObject.playerCount,
  };
  let newPlayer: Player;
  const id = nanoid();
  const songQueue: Song[] = [];
  const skipVotes = 0;
  const isVoting = false;
  const occupants: PlayerID[] = [];

  const testSong: Song = {
    youtubeId: '',
    duration: 1000,
    thumbnail: '',
    title: '',
    artist: '',
  };

  beforeEach(() => {
    mockClear(townEmitter);
    playerCountObject.playerCount = 0;
    testArea = new JukeboxArea(
      { id, songQueue, skipVotes, isVoting, occupants },
      testAreaBox,
      townEmitter,
      town,
    );
    newPlayer = new Player(nanoid(), townEmitter);
    playerCountObject.playerCount = 1;
    testArea.add(newPlayer);
  });

  describe('remove', () => {
    it('Removes the player from the list of occupants and emits an interactableUpdate event', () => {
      // Add another player so that we are not also testing what happens when the last player leaves
      const extraPlayer = new Player(nanoid(), mock<TownEmitter>());
      testArea.add(extraPlayer);
      testArea.remove(newPlayer);

      expect(testArea.occupantsByID).toEqual([extraPlayer.id]);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        id,
        songQueue: [],
        skipVotes,
        isVoting,
        occupants: [extraPlayer.id],
        type: 'JukeboxArea',
      });
    });
  });

  describe('add', () => {
    it('Adds the player to the occupants list', () => {
      expect(testArea.occupantsByID).toEqual([newPlayer.id]);
    });

    it('Emits an interactableUpdate event', () => {
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        id,
        songQueue: [],
        skipVotes,
        isVoting,
        occupants: [newPlayer.id],
        type: 'JukeboxArea',
      });
    });

    test('toModel sets the ID, songQueue, and occupants', () => {
      const model = testArea.toModel();
      expect(model).toEqual({
        id,
        songQueue,
        skipVotes,
        isVoting,
        occupants: [newPlayer.id],
        type: 'JukeboxArea',
      });
    });

    describe('fromMapObject', () => {
      it('Throws an error if the width or height are missing', () => {
        expect(() =>
          JukeboxArea.fromMapObject(
            { id: 1, name: nanoid(), visible: true, x: 0, y: 0 },
            townEmitter,
            town,
          ),
        ).toThrowError();
      });
      it('Creates a new viewing area using the provided boundingBox and id, with isPlaying defaulting to false and progress to 0, and emitter', () => {
        const x = 30;
        const y = 20;
        const width = 10;
        const height = 20;
        const name = 'name';
        const val = JukeboxArea.fromMapObject(
          { x, y, width, height, name, id: 10, visible: true },
          townEmitter,
          town,
        );
        expect(val.boundingBox).toEqual({ x, y, width, height });
        expect(val.id).toEqual(name);
        expect(val.songQueue).toEqual([]);
        expect(val.occupantsByID).toEqual([]);
      });
    });
  });

  describe('_queueSong', () => {
    it('Adds a song to the queue. For the first song added, sets its startedAt and set up songEnd callback, otherwise do nothing. Check that interactableUpdate event is sent.', () => {
      // @ts-expect-error (access to private method)
      testArea._queueSong(testSong);
      expect(testArea.songQueue[0].youtubeId).toEqual(testSong.youtubeId);
      expect(testArea.songQueue[0].artist).toEqual(testSong.artist);
      expect(testArea.songQueue[0].title).toEqual(testSong.title);
      expect(testArea.songQueue[0].duration).toEqual(testSong.duration);
      expect(testArea.songQueue[0].thumbnail).toEqual(testSong.thumbnail);
      expect(testArea.songQueue[0].startedAt).toBeGreaterThan(0);

      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate.id).toEqual(id);
      expect((lastEmittedUpdate as JukeboxAreaModel).songQueue[0].youtubeId).toEqual(
        testSong.youtubeId,
      );

      jest.runOnlyPendingTimers();
      expect(testArea.songQueue).toHaveLength(0);
      expect(getLastEmittedEvent(townEmitter, 'interactableUpdate')).toEqual({
        id,
        songQueue: [],
        skipVotes,
        isVoting,
        occupants: [newPlayer.id],
        type: 'JukeboxArea',
      });
    });

    it('Test multiple songs added to the queue.', () => {
      // @ts-expect-error (access to private method)
      testArea._queueSong(testSong);
      // @ts-expect-error (access to private method)
      testArea._queueSong(testSong);

      expect(testArea.songQueue[0].youtubeId).toEqual(testSong.youtubeId);
      expect(testArea.songQueue[0].artist).toEqual(testSong.artist);
      expect(testArea.songQueue[0].title).toEqual(testSong.title);
      expect(testArea.songQueue[0].duration).toEqual(testSong.duration);
      expect(testArea.songQueue[0].thumbnail).toEqual(testSong.thumbnail);
      expect(testArea.songQueue[0].startedAt).toBeGreaterThan(0);
      expect(testArea.songQueue[1].youtubeId).toEqual(testSong.youtubeId);
      expect(testArea.songQueue[1].artist).toEqual(testSong.artist);
      expect(testArea.songQueue[1].title).toEqual(testSong.title);
      expect(testArea.songQueue[1].duration).toEqual(testSong.duration);
      expect(testArea.songQueue[1].thumbnail).toEqual(testSong.thumbnail);
      expect(testArea.songQueue[1].startedAt).toBeGreaterThan(0);

      jest.runOnlyPendingTimers();

      expect(testArea.songQueue).toHaveLength(1);

      jest.runOnlyPendingTimers();

      expect(testArea.songQueue).toHaveLength(0);
    });
  });

  describe('_periodicEmitAreaChanged', () => {
    it('Sends out an interactableUpdate event periodically', () => {
      const firstEvent = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(firstEvent).toEqual({
        id,
        songQueue: [],
        skipVotes,
        isVoting,
        occupants: [newPlayer.id],
        type: 'JukeboxArea',
      });

      jest.runOnlyPendingTimers();
      const secondEvent = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(secondEvent).toEqual({
        id,
        songQueue: [],
        skipVotes,
        isVoting,
        occupants: [newPlayer.id],
        type: 'JukeboxArea',
      });
      // Because we had a new event emitted, they should not be equal
      expect(firstEvent).not.toBe(secondEvent);

      jest.runOnlyPendingTimers();
      const thirdEvent = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(thirdEvent).toEqual({
        id,
        songQueue: [],
        skipVotes,
        isVoting,
        occupants: [newPlayer.id],
        type: 'JukeboxArea',
      });
      // Because we had a new event emitted, they should not be equal
      expect(secondEvent).not.toBe(thirdEvent);

      // three is basically infinity, right? :)
    });
  });

  describe('_handleVote', () => {
    it('does nothing if no song is queued', () => {
      // @ts-expect-error (access to private method)
      testArea._handleVote();
      expect(testArea.songQueue).toHaveLength(0);
      expect(testArea.skipVotes).toBe(0);
    });

    it('increments the vote count when a song is playing', () => {
      // we set this high enough that we avoid actually skipping the song
      playerCountObject.playerCount = 10;
      // @ts-expect-error (access to private method)
      testArea._queueSong(testSong);
      expect(testArea.skipVotes).toBe(0);

      // @ts-expect-error (access to private method)
      testArea._handleVote();
      expect(testArea.skipVotes).toBe(1);

      // @ts-expect-error (access to private method)
      testArea._handleVote();
      expect(testArea.skipVotes).toBe(2);
    });

    it('removes the current song from the queue if three votes are reached with four players in the town', () => {
      // we set this high enough that we avoid actually skipping the song
      playerCountObject.playerCount = 4;
      // @ts-expect-error (access to private method)
      testArea._queueSong(testSong);
      // @ts-expect-error (access to private method)
      testArea._queueSong(testSong);

      const songQueueLength = testArea.songQueue.length;

      // @ts-expect-error (access to private method)
      testArea._handleVote();
      expect(testArea.songQueue).toHaveLength(songQueueLength);
      expect(testArea.skipVotes).toBe(1);

      // @ts-expect-error (access to private method)
      testArea._handleVote();
      expect(testArea.songQueue).toHaveLength(songQueueLength);
      expect(testArea.skipVotes).toBe(2);

      // @ts-expect-error (access to private method)
      testArea._handleVote();
      expect(testArea.songQueue).toHaveLength(songQueueLength - 1);
      expect(testArea.skipVotes).toBe(0);
    });

    it('removes the current song from the queue if three votes are reached with five players in the town', () => {
      // we set this high enough that we avoid actually skipping the song
      playerCountObject.playerCount = 5;
      // @ts-expect-error (access to private method)
      testArea._queueSong(testSong);
      // @ts-expect-error (access to private method)
      testArea._queueSong(testSong);

      const songQueueLength = testArea.songQueue.length;

      // @ts-expect-error (access to private method)
      testArea._handleVote();
      expect(testArea.songQueue).toHaveLength(songQueueLength);
      expect(testArea.skipVotes).toBe(1);

      // @ts-expect-error (access to private method)
      testArea._handleVote();
      expect(testArea.songQueue).toHaveLength(songQueueLength);
      expect(testArea.skipVotes).toBe(2);

      // @ts-expect-error (access to private method)
      testArea._handleVote();
      expect(testArea.songQueue).toHaveLength(songQueueLength - 1);
      expect(testArea.skipVotes).toBe(0);
    });
  });

  describe('_parseDuration', () => {
    it('parses multiday durations correctly', () => {
      for (let i = 0; i < 10; i++) {
        const days = Math.floor(Math.random() * 30) + 1;
        const hours = Math.floor(Math.random() * 24);
        const minutes = Math.floor(Math.random() * 60);
        const seconds = Math.floor(Math.random() * 60);
        const result = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;

        // @ts-expect-error (access to private method)
        expect(testArea._parseDuration(`P${days}DT${hours}H${minutes}M${seconds}S`)).toBe(result);
      }
    });

    it('parses multihour durations correctly', () => {
      for (let i = 0; i < 10; i++) {
        const hours = Math.floor(Math.random() * 23) + 1;
        const minutes = Math.floor(Math.random() * 60);
        const seconds = Math.floor(Math.random() * 60);
        const result = ((hours * 60 + minutes) * 60 + seconds) * 1000;

        // @ts-expect-error (access to private method)
        expect(testArea._parseDuration(`PT${hours}H${minutes}M${seconds}S`)).toBe(result);
      }
    });

    it('parses subhour durations correctly', () => {
      for (let i = 0; i < 10; i++) {
        const minutes = Math.floor(Math.random() * 60);
        const seconds = Math.floor(Math.random() * 60);
        const result = (minutes * 60 + seconds) * 1000;

        // @ts-expect-error (access to private method)
        expect(testArea._parseDuration(`PT${minutes}M${seconds}S`)).toBe(result);
      }
    });

    it('parses subminute durations correctly', () => {
      for (let i = 0; i < 10; i++) {
        const seconds = Math.floor(Math.random() * 60);
        const result = seconds * 1000;

        // @ts-expect-error (access to private method)
        expect(testArea._parseDuration(`PT${seconds}S`)).toBe(result);
      }
    });
  });
});
