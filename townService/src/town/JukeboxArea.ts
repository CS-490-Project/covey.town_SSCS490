import { ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import { youtube } from '@googleapis/youtube';
import {
  InteractableCommand,
  JukeboxArea as JukeboxAreaModel,
  InteractableCommandReturnType,
  Song,
  TownEmitter,
  BoundingBox,
  Player,
} from '../types/CoveyTownSocket';
import InteractableArea from './InteractableArea';
import InvalidParametersError from '../lib/InvalidParametersError';

/*
 * We do this in order to remove the circular dependency that would arise from
 * simply importing and storing a Town object in JukeboxArea.
 * This also makes testing simpler.
 */
export interface HasPlayerCount {
  playerCount(): number;
}

export default class JukeboxArea extends InteractableArea {
  public songQueue: Song[];

  public skipVotes: number;

  private _songEndTimeout: NodeJS.Timeout | undefined;

  private _broadcastEmitter: TownEmitter;

  private _town: HasPlayerCount;

  private _youtubeAPIKey: string | undefined;

  /**
   * Creates a new JukeboxArea.
   *
   * @param jukeboxAreaModel model containing this area's current queue and its ID
   * @param coordinates the bounding box that defines this conversation area
   * @param townEmitter a broadcast emitter that can be used to emit updates to players
   */
  public constructor(
    { songQueue, skipVotes, id }: Omit<JukeboxAreaModel, 'type'>,
    coordinates: BoundingBox,
    townEmitter: TownEmitter,
    town: HasPlayerCount,
  ) {
    super(id, coordinates, townEmitter);
    this.songQueue = songQueue;
    this.skipVotes = skipVotes;
    this._broadcastEmitter = townEmitter;
    this._town = town;

    this._youtubeAPIKey = process.env.YOUTUBE_DATA_API_KEY;

    this._periodicEmitAreaChanged();
  }

  /**
   * Creates a new JukeboxArea model that contains the state of the JukeboxArea to send to the client.
   *
   * @returns
   */
  public toModel(): JukeboxAreaModel {
    return {
      type: 'JukeboxArea',
      id: this.id,
      occupants: this.occupantsByID,
      songQueue: this.songQueue,
      skipVotes: this.skipVotes,
    };
  }

  /**
   * Creates a new JukeboxArea object that will represent a Jukebox Area object in the town map.
   * @param mapObject An ITiledMapObject that represents a rectangle in which this jukebox area exists
   * @param broadcastEmitter An emitter that can be used by this conversation area to broadcast updates
   * @returns
   */
  public static fromMapObject(
    mapObject: ITiledMapObject,
    broadcastEmitter: TownEmitter,
    town: HasPlayerCount,
  ): JukeboxArea {
    const { name, width, height } = mapObject;
    if (!width || !height) {
      throw new Error(`Malformed jukebox area ${name}`);
    }
    const rect: BoundingBox = { x: mapObject.x, y: mapObject.y, width, height };
    return new JukeboxArea(
      { id: name, occupants: [], songQueue: [], skipVotes: 0 },
      rect,
      broadcastEmitter,
      town,
    );
  }

  /**
   * Handles Jukebox commands. In this case, SearchSong, QueueSong, InitiateSongSkipVote and VoteForSongSkip.
   *
   * @param command command to handle
   * @returns a command response
   * @throws InvalidParameterError
   */
  public handleCommand<CommandType extends InteractableCommand>(
    command: CommandType,
  ): InteractableCommandReturnType<CommandType> {
    if (command.type === 'SearchSong') {
      if (command.query.length == 0) {
        throw new InvalidParametersError('Empty search query');
      }

      this._search(command.requesterId, command.query);
    }
    if (command.type === 'QueueSong') {
      this._queueSongById(command.youtubeId, command.player);
      return undefined as InteractableCommandReturnType<CommandType>;
    }
    if (command.type === 'InitiateSongSkipVote') {
      this._handleVote();
      return undefined as InteractableCommandReturnType<CommandType>;
    }
    if (command.type === 'VoteForSongSkip') {
      this._handleVote();
      return undefined as InteractableCommandReturnType<CommandType>;
    }

    throw new InvalidParametersError('Unknown command type');
  }

  private _search(requesterId: string, query: string) {
    youtube('v3')
      .search.list({
        part: ['snippet'],
        maxResults: 25,
        q: query,
        videoCategoryId: '10',
        type: ['video'],
        videoDuration: 'short',
        auth: this._youtubeAPIKey,
      })
      .then(result => {
        const items = result.data.items;
        if (!items) {
          return;
        }

        const songs: (Song | undefined)[] = items?.map(item => {
          const youtubeId = item.id?.videoId;
          const thumbnail = item.snippet?.thumbnails?.default?.url;
          const title = item.snippet?.title;
          const artist = item.snippet?.channelTitle;

          if (!youtubeId || !thumbnail || !title || !artist) {
            return undefined;
          }
          return {
            youtubeId,
            thumbnail,
            title,
            artist,
          };
        });

        this._broadcastEmitter.emit('songSearchResults', {
          requesterId,
          // The cast is safe because we filter out any undefined values
          songs: songs.filter(song => song) as Song[],
        });
      });
  }

  /**
   * Queues a song asynchronously given a YouTube ID.
   * @param youtubeId the YouTube ID of the song
   * @param queuedBy the player who queued the song
   */
  private _queueSongById(youtubeId: string, queuedBy?: Player) {
    youtube('v3')
      .videos.list({
        part: ['snippet', 'contentDetails'],
        maxResults: 25,
        id: [youtubeId],
        videoCategoryId: '10',
        auth: this._youtubeAPIKey,
      })
      .then(result => {
        const items = result.data.items;
        // How I yearn for monads...
        if (!items || items.length === 0) {
          return;
        }

        const video = items[0];

        const thumbnail = video.snippet?.thumbnails?.maxres?.url;
        const rawDuration = video.contentDetails?.duration;
        const title = video.snippet?.title;
        const artist = video.snippet?.channelTitle;

        // Or at least early return ? like in Rust...
        if (!thumbnail || !rawDuration || !title || !artist) {
          return;
        }

        this._queueSong({
          youtubeId,
          thumbnail,
          duration: this._parseDuration(rawDuration),
          title,
          artist,
          queuedBy,
        });
      });
  }

  /**
   * Adds a song to the queue. If the added song is the only one in the queue,
   * we set its startedAt time and set up a callback for when it ends.
   * @param song the song to queue
   */
  private _queueSong(song: Song) {
    this.songQueue.push(song);
    if (this.songQueue.length === 1) {
      this.songQueue[0].startedAt = Date.now();

      setTimeout(() => this._songEnd(), this.songQueue[0].duration);
    }

    this._emitAreaChanged();
  }

  /**
   * Runs whenever a song finishes playing. Removes the finished song from the
   * queue. If another song is present, start playing it and call ourselves
   * recursively when the song completes.
   */
  private _songEnd() {
    // skip votes get cleared when a song ends
    this.skipVotes = 0;
    // remove zeroth song from song queue
    this.songQueue.shift();
    if (this.songQueue.length >= 1) {
      this.songQueue[0].startedAt = Date.now();

      this._songEndTimeout = setTimeout(() => this._songEnd(), this.songQueue[0].duration);

      this._emitAreaChanged();
    }
  }

  /**
   * Handles an incoming vote, whether from an InitiateSongSkip or a
   * VoteForSongSkip.
   */
  private _handleVote() {
    if (this.songQueue.length === 0) {
      return;
    }
    this.skipVotes += 1;

    const playerCount = this._town.playerCount();
    // If at least half the players vote to skip the song, then we should skip
    // the song. This handles the case of one player correctly, where only they
    // need to agree to skip the song. We may want to choose a different
    // threshold in the feature.
    if (this.skipVotes > Math.floor(playerCount / 2)) {
      // We need to cancel the current song end timeout, because it will
      // occur during the next song.
      clearTimeout(this._songEndTimeout);
      this._songEnd();
    }
    this._emitAreaChanged();
  }

  /**
   * Emits an area update once a second. This allows users who join mid-song
   * to get a synchronization update and start playing music. This also allows
   * for periodic synchronization between the frontend and backend.
   */
  private _periodicEmitAreaChanged() {
    const periodMs = 1000;

    this._emitAreaChanged();
    setTimeout(() => this._periodicEmitAreaChanged(), periodMs);
  }

  /**
   * Parses durations returned by the YouTube API. These are in ISO 8601 format,
   * so PT#M#S for videos shorter than an hour, PT#H#M#S for videos shorter than
   * a day, and P#DT#H#M#S for videos that are longer.
   *
   * See
   * https://developers.google.com/youtube/v3/docs/videos#contentDetails.duration
   * for details.
   *
   * We could pull in a library for this, but it is relatively straightforward
   * to do ourselves and is not worth the extra dependency.
   *
   * @param rawDuration The duration in ISO 8601 format
   * @returns the duration in milliseconds
   */
  private _parseDuration(rawDuration: string): number | undefined {
    if (rawDuration.startsWith('PT')) {
      // the duration is under a day
      if (rawDuration.indexOf('H') !== -1) {
        // the duration is over an hour
        const regex = /PT(\d+)H(\d+)M(\d+)S/;
        const segments = regex.exec(rawDuration);
        if (!segments) {
          return undefined;
        }
        const hours = parseFloat(segments[1]);
        const minutes = parseFloat(segments[2]);
        const seconds = parseFloat(segments[3]);
        return ((hours * 60 + minutes) * 60 + seconds) * 1000;
      }
      // the duration is under an hour
      const regex = /PT(\d+)M(\d+)S/;
      const segments = regex.exec(rawDuration);
      if (!segments) {
        return undefined;
      }
      const minutes = parseFloat(segments[1]);
      const seconds = parseFloat(segments[2]);
      return (minutes * 60 + seconds) * 1000;
    }
    // the duration is longer than a day
    const regex = /P(\d+)DT(\d+)H(\d+)M(\d+)S/;
    const segments = regex.exec(rawDuration);
    if (!segments) {
      return undefined;
    }
    const days = parseFloat(segments[1]);
    const hours = parseFloat(segments[2]);
    const minutes = parseFloat(segments[3]);
    const seconds = parseFloat(segments[4]);
    return (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
  }
}
