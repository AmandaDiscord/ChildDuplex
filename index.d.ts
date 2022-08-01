/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { Duplex } from "stream";
declare const delegateEvents: {
    readable: "_reader";
    data: "_reader";
    end: "_reader";
    drain: "_writer";
    finish: "_writer";
};
declare class ChildProcess extends Duplex {
    private _reader;
    private _writer;
    private _onError;
    private _readableState;
    private _writableState;
    private _process;
    private _stdin;
    private _stdout;
    private _stderr;
    unpipe: (destination?: NodeJS.WritableStream | undefined) => this;
    setEncoding: (encoding: BufferEncoding) => this;
    kill: (error?: Error) => void;
    destroy: () => this;
    noop: typeof noop;
    constructor(options?: import("stream").TransformOptions);
    private _transform;
    spawn(command: string, args?: ReadonlyArray<string>, options?: import("child_process").SpawnOptionsWithoutStdio): this;
    addListener<E extends keyof typeof delegateEvents>(event: E, fn: (...args: Array<any>) => any): this;
    on<E extends keyof typeof delegateEvents>(event: E, fn: (...args: Array<any>) => any): this;
    once<E extends keyof typeof delegateEvents>(event: E, fn: (...args: Array<any>) => any): this;
    removeListener<E extends keyof typeof delegateEvents>(event: E, fn: (...args: Array<any>) => any): this;
    removeAllListeners<E extends keyof typeof delegateEvents>(event?: E): this;
    listeners<E extends keyof typeof delegateEvents>(event: E): Array<Function>;
}
declare function noop(): void;
export = ChildProcess;
