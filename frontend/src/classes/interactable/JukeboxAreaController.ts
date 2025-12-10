import { JukeboxArea as JukeboxAreaModel, Song } from '../../types/CoveyTownSocket';
import InteractableAreaController, {
  BaseInteractableEventMap,
  JUKEBOX_AREA_TYPE,
} from './InteractableAreaController';

/**
 * The events that a JukeboxAreaController can emit
 */
export type JukeboxAreaEvents = BaseInteractableEventMap & {
  /**
   * A songQueueChange event indicates that a song has been queued or ended.
   * Listeners are passed the new queue in the parameter `songQueue`
   */
  songQueueChange: (queue: Song[]) => void;
  /**
   * A isVotingStarted event indicates that a skip vote has started.
   * Listeners have their vote prompt made visible`
   */
  isVotingStarted: (isVoting: boolean) => void;
};

export default class JukeboxAreaController extends InteractableAreaController<
  JukeboxAreaEvents,
  JukeboxAreaModel
> {
  private _model: JukeboxAreaModel;

  /**
   * Constructs a new JukeboxAreaController, initialized with the state of the
   * provided jukeboxAreaModel.
   *
   * @param jukeboxAreaModel The jukebox area model that this controller should represent
   */
  constructor(jukeboxAreaModel: JukeboxAreaModel) {
    super(jukeboxAreaModel.id);
    this._model = jukeboxAreaModel;
  }

  /**
   * Since we are always playing a song, we are always active.
   *
   * @returns whether or not the jukebox area is active (it always is)
   */
  public isActive(): boolean {
    return true;
  }

  public get friendlyName(): string {
    return this.id;
  }

  /**
   * @returns JukeboxAreaModel that represents the current state of this ViewingAreaController
   */
  public toInteractableAreaModel(): JukeboxAreaModel {
    return this._model;
  }

  public get type(): string {
    return JUKEBOX_AREA_TYPE;
  }

  /**
   * @returns an array of Songs that are currently in the shared playlist
   */
  public get songQueue(): Song[] {
    return this._model.songQueue;
  }

  /**
   * Updates the songQueue array if a song is queued or a song ends.
   * @param queue
   */
  public set songQueue(queue: Song[]) {
    if (this._model.songQueue !== queue) this._model.songQueue = queue;
    this.emit('songQueueChange', queue);
  }

  /**
   * @returns the number of votes to skip the current song in the shared playlist
   */
  public get skipVotes(): number {
    return this._model.skipVotes;
  }

  /**
   * @returns true if a vote is currently ongoing and false if a vote is not ongoing
   */
  public get isVoting(): boolean {
    return this._model.isVoting;
  }

  /**
   * Updates the isVoting boolean value and emits the change to the clients.
   * @param currentVotingStatus
   */
  public set isVoting(currentVotingStatus: boolean) {
    this._model.isVoting = currentVotingStatus;
    console.log('isVoting status:', currentVotingStatus);
    this.emit('isVotingStarted', currentVotingStatus);
  }

  /**
   * Update the state of the JukeboxArea from a new area model.
   * @param updatedModel
   */
  protected _updateFrom(updatedModel: JukeboxAreaModel): void {
    this.songQueue = updatedModel.songQueue;
    if (this._model.isVoting !== updatedModel.isVoting) {
      this._model.isVoting = updatedModel.isVoting;
      this.emit('isVotingStarted', updatedModel.isVoting);
    }
  }
}
