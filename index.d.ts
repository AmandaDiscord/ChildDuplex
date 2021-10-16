/// <reference types="node" />
import { PassThrough, Duplex } from "stream";
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
    kill: (error?: Error) => void;
    addListener: <E extends "readable" | "data" | "end" | "drain" | "finish">(event: E, fn: (...args: Array<any>) => any) => ChildProcess | PassThrough;
    unpipe: typeof PassThrough.prototype.unpipe;
    setEncoding: typeof PassThrough.prototype.setEncoding;
    destroy: typeof noop;
    kill: (error?: Error | undefined) => void;
    noop: typeof noop;
    constructor(options?: import("stream").TransformOptions);
    private _transform;
    spawn(command: string, args?: ReadonlyArray<string>, options?: import("child_process").SpawnOptionsWithoutStdio): this;
    on<E extends keyof typeof delegateEvents>(event: E, fn: (...args: Array<any>) => any): this | PassThrough;
    once<E extends keyof typeof delegateEvents>(event: E, fn: (...args: Array<any>) => any): this | PassThrough;
    removeListener<E extends keyof typeof delegateEvents>(event: E, fn: (...args: Array<any>) => any): this | PassThrough;
    removeAllListeners<E extends keyof typeof delegateEvents>(event?: E): this | PassThrough;
    listeners<E extends keyof typeof delegateEvents>(event: E): Array<Function>;
}
declare function noop(): void;
export = ChildProcess;
