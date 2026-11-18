/* The connection to the game server (docs/online-protocol.md): hello, clock sync,
   text and binary dispatch, and reconnecting. Works in the browser and in Node:
   give it a transport factory, a function returning an object shaped like a
   WebSocket ({ send(data), close(), onopen, onmessage(data), onclose }), plus an
   optional clock and scheduler so tests can run it on simulated time.

     const conn = Conn.open({ build });          // browser: wss://<host>/ws
     conn.on('room', m => ...); conn.send({ t: 'find' });
     conn.now()                                  // estimated server ms
*/
export const PROTO = 1;

/** A WebSocket to the same origin's /ws, wrapped as a transport. */
export function webSocketTransport(url) {
  return () => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    const t = {
      send: d => ws.send(d), close: () => ws.close(),
      onopen: null, onmessage: null, onclose: null,
      get open() { return ws.readyState === 1; },
    };
    ws.onopen = () => t.onopen?.();
    ws.onmessage = ev => t.onmessage?.(ev.data);
    ws.onclose = () => t.onclose?.();
    ws.onerror = () => {};   // onclose follows
    return t;
  };
}

export class Conn {
  /**
   * opts: { transport: () => transport, build, clock: () => localMs, schedule: (fn, ms) => cancel,
   *         reconnect: bool (default true), pings: 8, pingEvery: 5000 }
   */
  constructor(opts) {
    this.opts = opts;
    this.clock = opts.clock || (() => performance.now());
    this.schedule = opts.schedule || ((fn, ms) => { const id = setTimeout(fn, ms); return () => clearTimeout(id); });
    this.handlers = new Map();
    this.offset = 0; this.bestRtt = Infinity; this.synced = false;
    this.you = null; this.ready = false; this.closed = false; this.tries = 0;
    this.queue = [];          // text sent while not connected, flushed after welcome
    this.cancels = [];
    this._connect();
  }

  /** Browser: connect to wss://<this host>/ws. */
  static open({ build = '', ...rest } = {}) {
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
    return new Conn({ transport: webSocketTransport(url), build, ...rest });
  }

  /** Estimated server clock, ms. */
  now() { return this.clock() + this.offset; }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }
  emit(type, msg) { for (const fn of this.handlers.get(type) || []) fn(msg); }

  /** Send a JSON message. Queued while reconnecting (pings are not). */
  send(obj) {
    if (this.ready) this.t.send(JSON.stringify(obj));
    else if (obj.t !== 'ping' && !this.closed) this.queue.push(obj);
  }
  /** Send a binary frame. Dropped while disconnected: snapshots are only worth sending fresh. */
  sendBinary(buf) { if (this.ready) this.t.send(buf); }

  ping() { if (this.ready) this.t.send(JSON.stringify({ t: 'ping', c: this.clock() })); }

  close() { this.closed = true; this.ready = false; for (const c of this.cancels) c(); this.cancels = []; this.t?.close?.(); }

  _connect() {
    const t = this.t = this.opts.transport();
    t.onopen = () => t.send(JSON.stringify({ t: 'hello', proto: PROTO, build: this.opts.build || '' }));
    t.onmessage = data => this._message(data);
    t.onclose = () => this._closed(t);
    if (t.open) t.onopen();   // a test transport may be open already
  }

  _message(data) {
    if (typeof data !== 'string') { this.emit('snap', data); return; }
    let m; try { m = JSON.parse(data); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'welcome') {
      this.you = m.you; this.ready = true; this.tries = 0;
      if (!this.synced) this.offset = m.now - this.clock();   // rough until the pongs come back
      const n = this.opts.pings ?? 8;
      for (let i = 0; i < n; i++) this.cancels.push(this.schedule(() => this.ping(), i * 120));
      this._pingLoop();
      const q = this.queue; this.queue = [];
      for (const o of q) this.send(o);
    } else if (m.t === 'pong') {
      const t1 = this.clock(), rtt = t1 - m.c;
      // the sample with the smallest round trip wins: its midpoint is the best guess
      if (rtt >= 0 && rtt <= this.bestRtt) { this.bestRtt = rtt; this.offset = m.now - (m.c + t1) / 2; this.synced = true; this.rtt = rtt; }
    } else if (m.t === 'old') {
      this.closed = true;
      if (this.handlers.get('old')?.size) this.emit('old', m);
      else if (typeof location !== 'undefined') location.reload();
      return;
    }
    this.emit(m.t, m);
  }

  _pingLoop() {
    const every = this.opts.pingEvery ?? 5000;
    this.cancels.push(this.schedule(() => { if (!this.ready) return; this.ping(); this._pingLoop(); }, every));
  }

  _closed(t) {
    if (t !== this.t) return;
    const was = this.ready;
    this.ready = false;
    for (const c of this.cancels) c(); this.cancels = [];
    if (was) this.emit('close', {});
    if (this.closed || this.opts.reconnect === false) return;
    // back off: 0.5 s, 1 s, 2 s, ... up to 10 s, with a little jitter so a room does not reconnect in lockstep
    const wait = Math.min(10000, 500 * 2 ** this.tries++) * (0.8 + Math.random() * 0.4);
    this.cancels.push(this.schedule(() => { if (!this.closed) { this._connect(); this.emit('reconnect', { tries: this.tries }); } }, wait));
  }
}
