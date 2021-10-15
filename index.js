"use strict";
const child_process_1 = require("child_process");
const stream_1 = require("stream");
const delegateEvents = {
    readable: "_reader",
    data: "_reader",
    end: "_reader",
    drain: "_writer",
    finish: "_writer"
};
class ChildProcess extends stream_1.Duplex {
    constructor(options) {
        super(options);
        // @ts-ignore
        this.addListener = ChildProcess.prototype.on;
        this.destroy = noop;
        // @ts-ignore
        this.kill = noop;
        this.noop = noop;
        this._reader = new stream_1.PassThrough(options);
        this._writer = new stream_1.PassThrough(options);
        const onError = this._onError || this.emit.bind(this, "error");
        this._reader.on("error", onError);
        this._writer.on("error", onError);
        // @ts-ignore
        this._readableState = this._reader._readableState;
        // @ts-ignore
        this._writableState = this._writer._writableState;
        this.pipe = this._reader.pipe;
        this.unpipe = this._reader.unpipe;
        this.setEncoding = this._reader.setEncoding;
        this.read = this._reader.read;
        this.end = this._writer.end;
        this.write = this._writer.write;
    }
    spawn(command, args, options) {
        var _a, _b, _c, _d, _e;
        const that = this;
        this._process = (0, child_process_1.spawn)(command, args, options);
        this._stdin = this._process.stdin;
        this._stdout = this._process.stdout;
        this._stderr = this._process.stderr;
        if (this._stdin)
            this._writer.pipe(this._stdin);
        (_a = this._stdout) === null || _a === void 0 ? void 0 : _a.pipe(this._reader, { end: false });
        // @ts-ignore
        this.kill = this.destroy = kill;
        let stderr = [];
        (_b = this._stderr) === null || _b === void 0 ? void 0 : _b.on("data", onStderrData);
        (_c = this._stdin) === null || _c === void 0 ? void 0 : _c.on("error", noop);
        (_d = this._stdout) === null || _d === void 0 ? void 0 : _d.on("error", noop);
        (_e = this._stdout) === null || _e === void 0 ? void 0 : _e.on("end", onStdoutEnd);
        this._process.once("close", onExit);
        this._process.once("error", onError);
        let ex, exited, killed, ended;
        return this;
        function onStdoutEnd() {
            if (exited && !ended) {
                ended = true;
                that._reader.end(that.emit.bind(that, "close"));
            }
        }
        function onStderrData(chunk) {
            stderr === null || stderr === void 0 ? void 0 : stderr.push(chunk);
        }
        function onExit(code, signal) {
            var _a;
            if (exited || exited === null)
                return;
            exited = true;
            if (killed)
                void cleanup();
            else if (ex) {
                that.emit("error", ex);
                that.emit("close");
            }
            else if (code === 0 && signal == null)
                onStdoutEnd();
            else {
                ex = Object.assign(new Error("Command failed: " + Buffer.concat(stderr || ["No stderr"]).toString("utf8")), { killed: ((_a = that._process) === null || _a === void 0 ? void 0 : _a.killed) || killed, code, signal });
                that.emit("error", ex);
                that.emit("close");
            }
            cleanup();
        }
        function onError(err) {
            var _a, _b;
            ex = err;
            (_a = that._stdout) === null || _a === void 0 ? void 0 : _a.destroy();
            (_b = that._stderr) === null || _b === void 0 ? void 0 : _b.destroy();
            onExit();
        }
        function kill(cb) {
            var _a, _b;
            (_a = that._stdout) === null || _a === void 0 ? void 0 : _a.destroy();
            (_b = that._stderr) === null || _b === void 0 ? void 0 : _b.destroy();
            killed = true;
            try {
                // @ts-expect-error
                that._process.kill((options && options.killSignal) || "SIGTERM");
            }
            catch (e) {
                ex = e;
                onExit();
            }
            cb && cb();
        }
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
                that.destroy = noop;
        }
    }
    // @ts-ignore
    on(event, fn) {
        const substream = delegateEvents[event];
        if (substream)
            return this[substream]["on"](event, fn);
        else
            return super.on.call(this, event, fn);
    }
    // @ts-ignore
    once(event, fn) {
        const substream = delegateEvents[event];
        if (substream)
            return this[substream]["once"](event, fn);
        else
            return super.once.call(this, event, fn);
    }
    // @ts-ignore
    removeListener(event, fn) {
        const substream = delegateEvents[event];
        if (substream)
            return this[substream]["removeListener"](event, fn);
        else
            return super.removeListener.call(this, event, fn);
    }
    // @ts-ignore
    removeAllListeners(event) {
        const substream = (event ? delegateEvents[event] : undefined);
        if (substream && event)
            return this[substream]["removeAllListeners"](event);
        else
            return super.removeAllListeners.call(this, event);
    }
    listeners(event) {
        const substream = delegateEvents[event];
        if (substream)
            return this[substream]["listeners"](event);
        else
            return super.listeners.call(this, event);
    }
}
function noop() { void 0; }
module.exports = ChildProcess;
