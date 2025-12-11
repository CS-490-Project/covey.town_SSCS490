import { mock, mockClear, MockProxy } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { JukeboxArea, Song } from '../../types/CoveyTownSocket';
import TownController from '../TownController';
import JukeboxAreaController, { JukeboxAreaEvents } from './JukeboxAreaController';

describe('JukeboxAreaController', () => {
  // A valid JukeboxAreaController to be reused within the tests
  let testAreaController: JukeboxAreaController;
  let testAreaModel: JukeboxArea;
  const townController: MockProxy<TownController> = mock<TownController>();
  const mockListeners = mock<JukeboxAreaEvents>();
  const testSong: Song = {
    youtubeId: 'abc',
    duration: 1000,
    thumbnail: '',
    title: 'Song 1',
    artist: 'Artist 1',
  };
  const testQueue: Song[] = [testSong];

  beforeEach(() => {
    testAreaModel = {
      id: nanoid(),
      songQueue: [],
      skipVotes: 0,
      isVoting: false,
      occupants: [],
      type: 'JukeboxArea',
    };
    testAreaController = new JukeboxAreaController(testAreaModel);
    mockClear(townController);
    mockClear(mockListeners.songQueueChange);
    testAreaController.addListener('songQueueChange', mockListeners.songQueueChange);
    jest.spyOn(testAreaController, 'emit');
  });
  describe('songQueueChange', () => {
    it('emits a songQueueChange event if the queue changes', () => {
      testAreaController.songQueue = testQueue;
      expect(mockListeners.songQueueChange).toBeCalledWith(testAreaController.songQueue);
      expect(testAreaController.emit).toHaveBeenCalledWith('songQueueChange', testQueue);
      expect(testAreaController.songQueue).toEqual(testQueue);
    });
  });
  describe('isVotingStarted', () => {
    it('isVoting should initially be false', () => {
      expect(testAreaController.isVoting).toBe(false);
    });
    it('emits a isVotingStarted event if a skip vote is started', () => {
      testAreaController.isVoting = true;
      expect(testAreaModel.isVoting).toBe(true);
      expect(testAreaController.emit).toHaveBeenCalledWith('isVotingStarted', true);
    });
    it('isVoting is set back to false', () => {
      testAreaController.isVoting = false;
      expect(testAreaModel.isVoting).toBe(false);
      expect(testAreaController.emit).toHaveBeenCalledWith('isVotingStarted', false);
    });
  });
  describe('JukeboxAreaModel', () => {
    it('Carries through all of the properties', () => {
      const model = testAreaController.toInteractableAreaModel();
      expect(model).toEqual(testAreaModel);
    });
  });
  describe('updateFrom', () => {
    it('Updates the songQueue', () => {
      const newModel: JukeboxArea = {
        id: testAreaModel.id,
        songQueue: [testSong],
        skipVotes: 0,
        isVoting: false,
        occupants: [],
        type: 'JukeboxArea',
      };
      testAreaController.updateFrom(newModel, []);
      expect(testAreaController.songQueue).toEqual(newModel.songQueue);
      expect(mockListeners.songQueueChange).toBeCalledWith(testAreaController.songQueue);
    });
    it('Does not update the id property', () => {
      const existingID = testAreaController.id;
      const newModel: JukeboxArea = {
        id: nanoid(),
        songQueue: [],
        skipVotes: 0,
        isVoting: false,
        occupants: [],
        type: 'JukeboxArea',
      };
      testAreaController.updateFrom(newModel, []);
      expect(testAreaController.id).toEqual(existingID);
    });
  });
});
