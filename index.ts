import { spawn } from "child_process";
import { PassThrough, Duplex } from "stream";


// IDFK why I"m typing these node internals, but oh well.
interface ReadableState {
	objectMode: boolean;
	highWaterMark: number;
	buffer: BufferList;
	length: number;
	pipes: Array<import("stream").Writable>;
	flowing: true | null;
	ended: boolean;
	endEmitted: boolean;
	reading: boolean;
	constructed: boolean;
	sync: boolean;
	needReadable: boolean;
	emittedReadable: boolean;
	readableListening: boolean;
	resumeScheduled: boolean;
	errorEmitted: boolean;
	emitClose: boolean;
	autoDestroy: boolean;
	destroyed: boolean;
	errored: boolean | null;
	closed: boolean;
	closeEmitted: boolean;
	defaultEncoding: string;
	awaitDrainWriters: null;
	multiAwaitDrain: boolean;
	readingMore: boolean;
	dataEmitted: boolean;
	decoder: null;
	encoding: null;
}

interface WritableState {
	objectMode: boolean;
	highWaterMark: number;
	finalCalled: boolean;
	needDrain: boolean;
	ending: boolean;
	ended: boolean;
	finished: boolean;
	destroyed: boolean;
	decodeStrings: boolean;
	defaultEncoding: string;
	length: number;
	writing: boolean;
	corked: number;
	sync: boolean;
	bufferProcessing: boolean;
	onwrite: Function;
	writecb: Function | null;
	writelen: number;
	afterWriteTickInfo: null;
	buffered: Array<unknown>;
	bufferedIndex: number;
	allBuffers: true;
	allNoop: boolean;
	pendingcb: number;
	constructed: boolean;
	prefinished: boolean;
	errorEmitted: boolean;
	emitClose: boolean;
	autoDestroy: boolean;
	errored: null;
	closed: boolean;
	closeEmitted: boolean;
}

interface BufferList {
	[Symbol.iterator]: any;
	new (): BufferList;
	head: { data: any; next: any; } | null;
	tail: { data: any; next: any; } | null;
	length: number;

	push(v: any): void;
	unshift(v: any): void;
	shift(): any;
	clear(): void;
	join(s: any): string;
	concat(n: number): Buffer;
	consume(n: number, hasStrings: boolean): string | Buffer;
	first(): any;

	_getString(n: number): string;
	_getBuffer(n: number): Buffer;
}

const delegateEvents = {
	readable: "_reader" as const,
	data: "_reader" as const,
	end: "_reader" as const,
	drain: "_writer" as const,
	finish: "_writer" as const
}

class ChildProcess extends Duplex {
	private _reader: PassThrough;
	private _writer: PassThrough;
	private _onError: any;
	private _readableState: ReadableState;
	private _writableState: WritableState;
	private _process: import("child_process").ChildProcess | null;
	private _stdin: import("stream").Writable | null;
	private _stdout: import("stream").Readable | null;
	private _stderr: import("stream").Readable | null;

	public unpipe: (destination?: NodeJS.WritableStream | undefined) => this;
	public setEncoding: (encoding: BufferEncoding) => this;

	public kill: (error?: Error) => void = noop;
	public destroy = noop as () => this;
	public noop = noop;

	public constructor(options?: import("stream").TransformOptions) {
		super(options);

		this._reader = new PassThrough(options);
		this._writer = new PassThrough(options);
		const onError = this._onError || this.emit.bind(this, "error");
		this._reader.on("error", onError);
		this._writer.on("error", onError);
		// @ts-ignore
		this._readableState = this._reader._readableState;
		// @ts-ignore
		this._writableState = this._writer._writableState;


		this.pipe = this._reader.pipe;
		this.unpipe = this._reader.unpipe as unknown as (destination?: NodeJS.WritableStream | undefined) => this;
		this.setEncoding = this._reader.setEncoding as unknown as (encoding: BufferEncoding) => this;
		this.read = this._reader.read;
		this._read = this._reader._read;
		this.end = this._writer.end as unknown as (cb?: (() => void) | undefined) => this;
		this.write = this._writer.write;
		this._write = this._writer._write;
	}

	private _transform(chunk: Buffer | string, encoding: string, callback: (error: Error | null, chunk?: Buffer | string) => any) {
		callback(null, chunk);
	}

	public spawn(command: string, args?: ReadonlyArray<string>, options?: import("child_process").SpawnOptionsWithoutStdio) {
		const that = this;

		this._process = spawn(command, args, options);
		this._stdin = this._process.stdin;
		this._stdout = this._process.stdout;
		this._stderr = this._process.stderr;
		if (this._stdin) this._writer.pipe(this._stdin);
		this._stdout?.pipe(this._reader, { end: false });
		this.kill = (this.destroy as typeof noop) = kill;

		let stderr: Array<any> | null = [];
		this._stderr?.on("data", onStderrData);
		this._stdin?.on("error", noop);
		this._stdout?.on("error", noop);

		this._stdout?.on("end", onStdoutEnd);

		this._process.once("close", onExit);
		this._process.once("error", onError);

		let ex: null | Error & { killed?: boolean | null; code?: number; signal?: string } | undefined, exited: boolean | undefined | null, killed: boolean | undefined | null, ended: boolean | undefined;

		return this;

		function onStdoutEnd() {
			if (exited && !ended) {
				ended = true;
				that._reader.end(that.emit.bind(that, "close"));
			}
		}

		function onStderrData(chunk: any) {
			stderr?.push(chunk);
		}

		function onExit(code?: number, signal?: string) {
			if (exited || exited === null) return;

			exited = true;

			if (killed) void cleanup();
			else if (ex) {
				that.emit("error", ex);
				that.emit("close");
			} else if (code === 0 && signal == null) onStdoutEnd();
			else {
				ex = Object.assign(new Error("Command failed: " + Buffer.concat(stderr || ["No stderr"]).toString("utf8")), { killed: that._process?.killed || killed, code, signal });
				that.emit("error", ex);
				that.emit("close");
			}

			cleanup();
		}

		function onError(err: Error) {
			ex = err;
			that._stdout?.destroy();
			that._stderr?.destroy();
			onExit();
		}

		function kill(error?: Error | undefined) {
			that._stdout?.destroy(error);
			that._stderr?.destroy(error);

			killed = true;

			try {
				that._process!.kill((options && options.killSignal) || "SIGTERM");
			} catch (e) {
				ex = e;
				onExit();
			}
		}

		type t = this;

		function cleanup() {
			that._process =
			that._stderr =
			that._stdout =
			that._stdin =
			stderr =
			ex =
			exited =
			killed = null;

			that.kill =
			that.destroy = noop as () => t;
		}
	}

	public addListener<E extends keyof typeof delegateEvents>(event: E, fn: (...args: Array<any>) => any): this {
		const substream = delegateEvents[event] as typeof delegateEvents[keyof typeof delegateEvents];
		if (substream) return this[substream]["on"](event, fn) as unknown as this;
		else return super.addListener.call(this, event, fn);
	}

	public on<E extends keyof typeof delegateEvents>(event: E, fn: (...args: Array<any>) => any): this {
		const substream = delegateEvents[event] as typeof delegateEvents[keyof typeof delegateEvents];
		if (substream) return this[substream]["on"](event, fn) as unknown as this;
		else return super.on.call(this, event, fn);
	}

	public once<E extends keyof typeof delegateEvents>(event: E, fn: (...args: Array<any>) => any): this {
		const substream = delegateEvents[event] as typeof delegateEvents[keyof typeof delegateEvents];
		if (substream) return this[substream]["once"](event, fn) as unknown as this;
		else return super.once.call(this, event, fn);
	}

	public removeListener<E extends keyof typeof delegateEvents>(event: E, fn: (...args: Array<any>) => any): this {
		const substream = delegateEvents[event] as typeof delegateEvents[keyof typeof delegateEvents];
		if (substream) return this[substream]["removeListener"](event, fn) as unknown as this;
		else return super.removeListener.call(this, event, fn);
	}

	public removeAllListeners<E extends keyof typeof delegateEvents>(event?: E): this {
		const substream = (event ? delegateEvents[event] : undefined) as typeof delegateEvents[keyof typeof delegateEvents];
		if (substream && event) return this[substream]["removeAllListeners"](event) as unknown as this;
		else return super.removeAllListeners.call(this, event);
	}

	public listeners<E extends keyof typeof delegateEvents>(event: E): Array<Function> {
		const substream = delegateEvents[event] as typeof delegateEvents[keyof typeof delegateEvents];
		if (substream) return this[substream]["listeners"](event);
		else return super.listeners.call(this, event);
	}
}

function noop() { void 0; }

export = ChildProcess;
