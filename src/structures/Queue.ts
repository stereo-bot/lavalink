import { Player } from "./Player";
import { LoadedTrack, Track } from "./Track";

/**
 * The player's queue, the `current` property is the track playing the guild
 */
export class Queue {
	/** The current playing track */
	public current: LoadedTrack | null = null;
	/** The list of tracks that have not been played yet */
	public next: Track[] = [];
	/** The list of tracks that have been played */
	public previous: Track[] = [];
	/** whether the queue should loop the queue or not */
	public repeatQueue = false;
	/** whether the queue should loop the song or not */
	public repeatSong = false;

	constructor(public player: Player) {}

	/**
	 * sets repeatSong to false or true
	 * @param boolean defaults to the opposite of this.repeatSong
	 */
	public setRepeatSong(boolean = !this.repeatSong): void {
		if (boolean) {
			this.repeatSong = true;
			this.repeatQueue = false;
			return;
		}

		this.repeatSong = boolean;
	}

	/**
	 * sets repeatQueue to false or true
	 * @param boolean defaults to the opposite of this.repeatQueue
	 */
	public setRepeatQueue(boolean = !this.repeatQueue): void {
		const oldPlayer = { ...this.player };
		if (boolean) {
			this.repeatSong = false;
			this.repeatQueue = true;
		} else {
			this.repeatQueue = boolean;
		}

		this.player.manager.emit("playerUpdate", { oldPlayer, newPlayer: this.player });
	}

	/**
	 * Starts playing a new track in the queue
	 */
	public nextSong(): void {
		if (this.repeatSong && this.current) {
			this.player.play();
			return;
		}

		if (this.repeatQueue && this.current) {
			this.next.push(this.current);
			this.current = (this.next.shift() as LoadedTrack) ?? null;
			this.player.play();
			return;
		}

		if (!this.next.length) {
			this.reset();
			this.player.manager.emit("queueEmpty", this.player);
			this.player.playing = false;
			return;
		}

		if (this.current) this.previous.push(this.current);
		this.current = (this.next.shift() as LoadedTrack) ?? null;
		this.player.play();
	}

	/**
	 * Adds track(s) to the queue
	 * @param offset
	 * @param tracks
	 */
	public add(offset: number, ...tracks: Track[]): void;

	/**
	 * Adds track(s) to the queue
	 * @param tracks
	 */
	public add(...tracks: Track[]): void;
	public add(...tracks: (Track | number)[]): void {
		const oldQueue = { ...this };
		if (typeof tracks[0] === "number") {
			const offset = tracks.shift() as number;
			const valid: Track[] = [];

			for (const track of tracks) {
				if (!(track instanceof Track))
					throw new RangeError(`tracks[${tracks.indexOf(track)}] is not an instance of Track`);
				valid.push(track);
			}

			this.next.splice(offset, 0, ...valid);
			this.player.manager.emit("queueUpdate", { oldQueue, newQueue: this });
			return;
		}

		for (const track of tracks) {
			if (!(track instanceof Track))
				throw new RangeError(`tracks[${tracks.indexOf(track)}] is not an instance of Track`);
			this.next.push(track);
		}

		this.player.manager.emit("queueUpdate", { oldQueue, newQueue: this });
		if (!this.current) this.current = (this.next.shift() as LoadedTrack) ?? null;
	}

	/**
	 * Removes a track from the next array, returns the removed track
	 * @param position defaults to 0
	 */
	public remove(position?: number): Track[];
	/**
	 * Removes an amount of tracks from the next array, return the removed tracks
	 * @param from
	 * @param to
	 */
	public remove(from: number, to: number): Track[];
	public remove(from = 0, to?: number): Track[] {
		if (!this.size) return [];

		const oldQueue = { ...this };
		if (this.repeatSong) {
			this.player.seek(0);
			return this.current ? [this.current] : [];
		}

		if (typeof to !== "undefined") {
			if (isNaN(Number(from))) throw new RangeError("Invalid `from` parameter provided");
			else if (isNaN(Number(to))) throw new RangeError("Invalid `to` parameter provided");
			else if (from >= to) throw new RangeError("`From` can not be bigger than to.");
			else if (from >= this.next.length)
				throw new RangeError(`\`From\` can not be bigger than ${this.next.length}.`);

			const tracks = this.next.splice(from, to - from);
			if (this.repeatQueue) this.next.push(...tracks);
			else this.previous.push(...tracks);

			this.player.manager.emit("queueUpdate", { oldQueue, newQueue: this });
			return tracks;
		}

		const tracks = this.next.splice(from, 1);
		if (this.repeatQueue) this.next.push(...tracks);
		else this.previous.push(...tracks);

		this.player.manager.emit("queueUpdate", { oldQueue, newQueue: this });
		return tracks;
	}

	/** Gets the total duration of the queue */
	public get duration(): number {
		const current = this.current?.duration ?? 0;
		return this.next.reduce((a, b) => a + (b.duration ?? 0), current);
	}

	/** Gets the total length of the queue (including Queue.current) */
	public get size(): number {
		return this.next.length + (this.current ? 1 : 0);
	}

	/** Resets the queue */
	public reset(): void {
		this.current = null;
		this.next = [];
		this.previous = [];
	}

	/** Shuffles the songs in the queue */
	public shuffle() {
		for (let i = this.next.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.next[i], this.next[j]] = [this.next[j], this.next[i]];
		}
	}
}
