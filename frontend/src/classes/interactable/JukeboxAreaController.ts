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
   * Returns the an array of Song objects.
   */
  public get songQueue(): Song[] {
    return this._model.songQueue;
  }

  /**
   * Updates the songQueue array if a song is queued or a song ends.
   */
  public set songQueue(queue: Song[]) {
    if (this._model.songQueue != queue) this._model.songQueue = queue;
    this.emit('songQueueChange', queue);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected _updateFrom(updatedModel: JukeboxAreaModel): void {
    this.songQueue = updatedModel.songQueue;
  }
}
