(function() {
	// node_modules/@solidjs/signals/dist/prod/core/error.js
	/**
	* Thrown by a tracked read whose value is currently pending (an async memo /
	* `createSignal(asyncFn)` / projection / store derivation that hasn't settled
	* yet). Surfacing through the reactive graph is what suspends the consumer
	* scope — the nearest enclosing `<Loading>` boundary catches the throw and
	* renders its fallback until the source resolves.
	*
	* App code rarely catches this directly; `<Loading>` is the canonical
	* handler. The error type is exposed for advanced cases — e.g. interop layers
	* that bridge Solid's pending-throw protocol to a different async strategy,
	* or tests that want to assert on the suspension shape.
	*
	* @example
	* ```ts
	* // Advanced: distinguish "not ready yet" from a real error in custom
	* // boundary plumbing. App code should rely on `<Loading>` / `<Errored>`.
	* try {
	*   const value = readReactiveSource();
	* } catch (err) {
	*   if (err instanceof NotReadyError) throw err; // re-throw to suspend
	*   reportError(err);
	* }
	* ```
	*/
	var NotReadyError = class extends Error {
		constructor(r) {
			const o = Error;
			const t = o.stackTraceLimit;
			if (t !== void 0) o.stackTraceLimit = 0;
			super();
			if (t !== void 0) o.stackTraceLimit = t;
			this.source = r;
		}
	};
	var StatusError = class extends Error {
		constructor(r, o) {
			try {
				var t = String(o instanceof Error ? o.message : o);
			} catch {}
			super(t, { cause: o });
			this.source = r;
		}
	};
	/** Return the user's error from an internal status wrapper. */ function unwrapStatusError(r) {
		return r instanceof StatusError ? r.cause : r;
	}
	// node_modules/@solidjs/signals/dist/prod/core/constants.js
	var REACTIVE_MANUAL_WRITE = 1024;
	/** L2, rule 3 — the node's LAST pass was a render effect's read of the
	* future as committed (`frameRead`): the frame shows the committed world
	* beside a future it also derives from, and re-derives at the landing.
	* Survives its own pass's wipe; the next pass's wipe clears it (a pass that
	* re-derived the frame — in the future, or without the held read — owes the
	* landing nothing). The landing consumes it (the transaction's `_reruns`). */ var REACTIVE_FRAME_READ = 2048;
	/**
	* A dependency write landed while this subscriber was mid-recompute — a
	* nested pull committed beneath one of its reads (#3037). The heap refuses
	* RECOMPUTING nodes, so recompute's tail consumes this latch and reschedules:
	* values the pass read before the nested commit are stale. Only set for
	* links validated this pass (gen-current): a write to an untouched link is
	* either re-read later in the pass (fresh) or trimmed with it (not a dep).
	*/ var REACTIVE_MISSED_WAKE = 4096;
	/** A `refresh()` asked this node to re-ask its question (A19 exc. 2, A24):
	* consumed by the next pass, which — going pending — classifies its flight
	* quiet (`_x._reask`). */ var REACTIVE_REASK = 8192;
	/** The pass was served a node's ambient staging — written this flush, not
	* held. If the flush parks, the pass is the frame's with it (the same sync
	* frame as the async): a verdict read cannot break it out. Per pass. */ var REACTIVE_STAGED_READ = 16384;
	/** The pass entered a verdict window (`isPending`/`latest`). Per pass: a
	* pass that did not keeps CONFIG_VERDICT no longer — the frame-reader
	* posture lasts exactly as long as the probing does. */ var REACTIVE_PROBED = 32768;
	/** Lanes — the node (a lane's member) was dirtied by the lane's own
	* re-staging (a re-guess, lane work re-derived): its next pass is the
	* lane's from the start (`recompute`), not a stale reader's re-run by an
	* unrelated write (#3460). Consumed by the pass. */ var REACTIVE_LANE_DIRTY = 65536;
	/** Lanes (plan sec. 28) — the pass read a lane's value as lane work (`enterLane`): a
	* tracked derivation's read of displayed optimism, a verdict read routed
	* into the holder's verdict lane. A pass in a lane's seat that read none of
	* its world has left the lane (`recompute`'s tail). Per pass. */ var REACTIVE_LANE_READ = 1 << 17;
	/** Lanes (plan sec. 28) — a render effect in the frame's seat was served the screen
	* for a lane's node (`laneRead`: a stale reader of a lane that has not
	* shown). Its pass computing exactly what it last applied has nothing to
	* run — an effect has no comparator, and the guess's notification is not a
	* change it can see. Per pass. */ var REACTIVE_SCREEN_READ = 1 << 18;
	/** A verdict reader whose probe was answered before the flush had a
	* transaction (verdict.ts `watchVerdict`): the seam re-runs it even if a
	* later read of the same pass routed it into a verdict lane — that was not
	* the probe's answer (lanes.ts). Per pass. */ var REACTIVE_PROBE_UNANSWERED = 1 << 19;
	/** A member of the uncommitted frame a held pass built (ruling A): set at
	* the park seam on every computed under a staged node (`holdFrame`). Never
	* shown, it has no screen: its reads are its transaction's, whichever flush
	* runs it (`bornInto`, #4010). Cleared by its commit. */ var CONFIG_HELD_FRAME = 1 << 20;
	/** A15's reveal corollary (#3305): a commit published this flight's inputs
	* beneath it — the node was pending, nothing staged, when it committed — so
	* its committed value is torn against the visible frame. A render effect
	* revealing it cannot be a stale reader: it observes the flight (pends,
	* holds) instead of showing the pre-flight value. Outlives the flight that
	* earned it for as long as the node stays pending, and no longer: the
	* commit that lands a value clears it. */ var CONFIG_INPUTS_PUBLISHED = 1024;
	/** D-41: the staged value in `_pendingValue` is an error — an
	* answer of the held frame, published at its landing like a value. */ var CONFIG_STAGED_ERROR = 1 << 21;
	/** The node's pass read a verdict (`isPending`/`latest`): a dependency going
	* pending is a question for its next pass — the verdict changed — so the
	* propagation re-derives it instead of marking it pending (as a kept-tail
	* link does, A30). Set at the window, never cleared: a reader that stopped
	* asking re-derives once and goes pending through its own read. The same
	* bit as REACTIVE_PROBED: a pass's probe (or a read of a verdict memo,
	* core.ts `read`) carries into the config at its end without a shift. */ var CONFIG_VERDICT = 32768;
	/** A28 (4): the node was written inside a recompute that ran OUTSIDE a flush
	* (a creation-time compute — boundary machinery, a mapArray's first run). Such
	* a write is promoted at that recompute's end: readers in the same block see
	* it. Cleared when the next flush begins; set only on that rare path. */ var CONFIG_PROMOTED = 1 << 22;
	var NOT_PENDING = {};
	var NO_SNAPSHOT = {};
	var defaultContext = {};
	/**
	* Brand symbol used by `Refreshable<T>` values (projection stores, async
	* memos) to expose their underlying computation to `refresh()`. Not part of
	* the user-facing API.
	*
	* @internal
	*/ var $REFRESH = Symbol("refresh");
	var NewSet = Set;
	// node_modules/@solidjs/signals/dist/prod/core/owner.js
	function markDisposal(e) {
		let n = e.De;
		while (n) {
			n.R |= 32;
			markDisposal(n);
			n = n.pe;
		}
	}
	var cleanupError;
	/** Runs a cleanup or `unobserved` hook; a throw is collected, not raised. @internal */ function runCleanup(e) {
		try {
			e();
		} catch (e) {
			cleanupError ||= [e];
			schedule();
		}
	}
	/** Rethrows the error `runCleanup` collected, once; `drop` discards it. @internal */ function rethrowCleanupError(e) {
		const n = cleanupError;
		cleanupError = void 0;
		if (n && !e) throw n[0];
	}
	function disposeChildren(e, n = false, r) {
		const t = e.R;
		if (t & 64) return;
		if (n && !r && e.T !== null && (e.T.Ue !== null || e.T.me !== null)) disposeChildren(e, false, true);
		if (n) e.R = t | 64;
		if (n && e.X) {
			if (e.T !== null) e.T.Se = null;
			if (e.m & 1 && e.T?.Re != null || t & 2048) schedule();
		}
		let l = r ? e.T.Ue : e.De;
		if (r) e.T.Ue = null;
		else e.De = null;
		while (l) {
			const e = l;
			e.l &= -33;
			deleteFromHeap(e, dirtyQueue);
			clearDeps(e);
			l.Ze = l;
			disposeChildren(l, true);
			l = l.pe;
		}
		if (!r) e.ye = 0;
		if (n && !r && !(t & 32) && e._parent !== null && !(e._parent.R & 64)) {
			const n = e.Ze;
			const r = e.pe;
			if (n !== null) n.pe = r;
			else e._parent.De = r;
			if (r !== null) r.Ze = n;
			e.Ze = null;
		}
		runDisposal(e, r);
		if (n && e.Je) {
			const n = e.Je;
			e.Je = void 0;
			runCleanup(n);
		}
	}
	function linkChild(e, n) {
		const r = e.De;
		n.Ze = null;
		n.pe = r;
		if (r !== null) r.Ze = n;
		e.De = n;
	}
	function runDisposal(e, n) {
		const r = n ? e.T.me : e.He;
		if (!r) return;
		if (n) e.T.me = null;
		else e.He = null;
		if (Array.isArray(r)) for (let e = r.length - 1; e >= 0; e--) runCleanup(r[e]);
		else runCleanup(r);
	}
	function childId(e, n) {
		let r = e;
		while (r.l & 4 && r._parent) r = r._parent;
		if (r.id != null) return formatId(r.id, n ? r.ye++ : r.ye);
		throw new Error("");
	}
	/**
	* Allocates and returns the next stable child id for `owner`. Used by
	* hydration plumbing and `createUniqueId`. Not part of the user-facing API.
	*
	* @internal
	*/ function getNextChildId(e) {
		return childId(e, true);
	}
	/**
	* The id a freshly-created node inherits: an explicit `options.id` wins;
	* transparent nodes share their parent's id; otherwise the parent's next
	* child id is consumed (or `undefined` outside an id-carrying tree).
	*/ function inheritId(e, n, r) {
		return e?.id ?? (n ? r?.id : r?.id != null ? getNextChildId(r) : void 0);
	}
	function formatId(e, n) {
		const r = n.toString(36), t = r.length - 1;
		return e + (t ? String.fromCharCode(64 + t) : "") + r;
	}
	/**
	* Returns the current reactive **owner** — the lifecycle node that the next
	* `cleanup()` / `onCleanup()` / `createSignal()` etc. will be attached to.
	*
	* Returns `null` if called outside any owner. Capture the owner with
	* `getOwner()` and re-enter it later with `runWithOwner(owner, fn)` to attach
	* disposables created from a callback (event handler, async resolution, etc.)
	* back to a component's lifecycle.
	*
	* @example
	* ```ts
	* function defer<T>(fn: () => T) {
	*   const owner = getOwner();
	*   queueMicrotask(() => runWithOwner(owner, fn));
	* }
	* ```
	*/ function getOwner() {
		return context;
	}
	/**
	* Low-level: registers `fn` as a disposal callback on the current owner.
	* Most code should use `onCleanup()` from `solid-js`, which adds dev-mode
	* checks. `cleanup()` is the unchecked primitive used by internals; `owner`
	* (internal) targets a specific owner's disposal list instead of the ambient
	* one.
	*/ function cleanup(e, n = context) {
		if (!n) return e;
		if (!n.He) n.He = e;
		else if (Array.isArray(n.He)) n.He.push(e);
		else n.He = [n.He, e];
		return e;
	}
	function disposeRootSelf(e = true) {
		disposeChildren(this, e);
		if (cleanupError && !globalQueue.q) rethrowCleanupError();
	}
	/**
	* Creates a fresh owner attached as a child of the current owner (or as a
	* detached root if there is none). Used by framework internals to group
	* cleanups; app code should use `createRoot()` (host a reactive scope outside
	* a component) or `runWithOwner()` (re-enter a captured owner).
	*
	* @internal
	*/ function createOwner(e) {
		const n = context;
		const r = e?.transparent ?? false;
		const t = {
			id: inheritId(e, r, n),
			l: r ? 4 : 0,
			R: 0,
			Qe: true,
			Ye: n?.Qe ? n.Ye : n,
			De: null,
			pe: null,
			Ze: null,
			He: null,
			A: n?.A || defaultContext,
			ye: 0,
			T: null,
			_parent: n,
			dispose: disposeRootSelf
		};
		if (n) linkChild(n, t);
		return t;
	}
	/**
	* Creates a reactive root — an owner scope with its own `dispose()`. A root
	* created inside an existing owner is owned by it and is disposed when the
	* parent is disposed; call `dispose()` to tear it down earlier. To create a
	* root that outlives its creator, detach explicitly:
	* `runWithOwner(null, () => createRoot(...))`. Pass `id` to seed hydration
	* ids for the tree it owns.
	*
	* `dispose()` tears down every signal, memo, effect, and `onCleanup`
	* registered inside the root.
	*
	* Use this to host long-lived reactive scopes outside of a component (custom
	* controllers, app bootstrapping, tests). Inside a component, prefer
	* letting Solid's component lifecycle own things.
	*
	* @example
	* ```ts
	* // At module level there is no owner, so this root lives until disposed.
	* const dispose = createRoot(dispose => {
	*   const [n, setN] = createSignal(0);
	*   createEffect(() => n(), value => console.log(value));
	*   setInterval(() => setN(x => x + 1), 1000);
	*   return dispose;
	* });
	*
	* // Later, to tear everything down:
	* dispose();
	*
	* // Inside an owner (component, effect, another root), detach explicitly
	* // if the root must outlive its creator:
	* const detached = runWithOwner(null, () => createRoot(d => d));
	* ```
	*
	* @description https://v2.solidjs.com/reference/solid-js/advanced/owner-introspection/create-root
	*/ function createRoot$1(e, n) {
		const r = createOwner(n);
		return runWithOwner(r, () => e(disposeRootSelf.bind(r, true)));
	}
	// node_modules/@solidjs/signals/dist/prod/core/scheduler.js
	var laneReadHook = null;
	var laneStageHook = null;
	var laneOutcomeHook = null;
	var laneWriteHook = null;
	var applyGuessesHook = null;
	var laneSeamsHook = null;
	var laneCorrectionsHook = null;
	var endLanesHook = null;
	var lanesBlockedHook = null;
	var catchHook = null;
	var freshHook = null;
	var hiddenHook = null;
	var boundarySeamHook = null;
	var heldRunHook = null;
	/** Store (store/store.ts): `park` — the flush parked into `t`: the store
	* materializes and holds the container node of every staging that had none
	* (a staging needs the node as its home only when something can read the
	* frame through it; a hold can); `commit` — fold the pending backings whose
	* container nodes this flush committed (the owned-raw model's one mutation
	* point). */ var storeParkHook = null;
	var storeCommitHook = null;
	/** `affects()` marks (affects.ts): the releases at a landing and at the seam
	* (ambient marks). */ var releaseMarksHook = null;
	var releaseAmbientMarksHook = null;
	/** Verdicts (verdict.ts). */ var observeFlightHook = null;
	/** External-source bridge (wired by enableExternalSource(); undefined while
	* no config is active — including after _resetExternalSourceConfig()). */ var wireExternalSourceHook = void 0;
	var externalUntrackHook = void 0;
	/** Live transactions — opened, unmerged, not landed. Scanned at every seam
	* while non-empty; nothing on the plain path. */ var transactions = [];
	/** A transaction (listed here) or a lane (lanes.ts lists its own). */ function newTransaction(e, n = null) {
		const o = {
			tn: [],
			un: [[], []],
			En: [],
			cn: null,
			_parent: n,
			v: e,
			he: null,
			tt: 0,
			nt: false,
			en: null,
			ke: false,
			ln: false,
			I: null
		};
		if (!e) transactions.push(o);
		return o;
	}
	/** The lane the running pass is work of; set at `recompute`'s head from the
	* node, moved by a derivation's lane read, saved and restored around the
	* pass. */ var passLane = null;
	function setPassLane(e) {
		passLane = e;
	}
	/** The transaction this flush parks into: set by the first join, merged
	* with every further one. Consumed at the seam. A join outside a flush (a
	* mount's pending observer, a write to a held node, an action opening)
	* schedules the seam that consumes it: membership is the tick's — the same
	* synchronous frame — and the next tick's writes are not this one's. */ var flushTransaction = null;
	/** The transaction the passes running OUTSIDE a flush this tick derive from
	* (a mainline mount, a mainline re-pass): the passes' own (A29, creation-
	* time form — "the entry is the pass's alone"): their results are staged
	* into it, and nothing else in the tick is — a write made after the mount
	* is a mainline write, a render effect mounted beside it a stale reader.
	* Inside a flush, or in a tick that already has its transaction (an
	* action's body), the frame joins instead (`flushTransaction`) — except a
	* first pass a loading boundary that has not shown content catches (`own`,
	* A29's boundary exemption, #3540): it is the boundary's, not the tick's,
	* and a flush that has joined nothing keeps it pass-scoped as outside one.
	* Cleared by the flush the join schedules, and at the end of a flush that
	* set it. */ var passTx = null;
	function joinPassTx(e, n) {
		if (globalQueue.q && !n || flushTransaction !== null) return joinFuture(e);
		if (passTx === null) passTx = resolveTx(e);
		else merge(resolveTx(e), passTx);
		schedule();
	}
	/** The transaction holding a node (CONFIG_HELD set), resolved through
	* merges; the path is compressed. */ function txOf(e) {
		return e.T.Re = resolveTx(e.T.Re);
	}
	/** `t` resolved through merges while it is still parked or open; null once
	* it has landed. */ function liveTx(e) {
		e = resolveTx(e);
		return transactions.indexOf(e) !== -1 ? e : null;
	}
	function resolveTx(e) {
		while (e.cn !== null) e = e.cn;
		return e;
	}
	/** The flush joins transaction `t` — or needs one of its own (`null`: a pass
	* went pending with nothing held). Joining a second one merges it into the
	* flush's: the work that touched both entangles them (A15). */ function joinFuture(e) {
		const n = flushTransaction;
		if (n === null) flushTransaction = e === null ? newTransaction(false) : resolveTx(e);
		else if (e !== null) merge(resolveTx(e), n);
		if (!globalQueue.q) schedule();
	}
	/** `t` merges into `f`: the work that touched both entangles them (A15).
	* A lane never merges: it is a sub-frame, not a peer — its work is routed
	* per pass (`passLane`). */ function merge(e, n) {
		e = resolveTx(e);
		n = resolveTx(n);
		if (e === n || e.v || n.v) return;
		e.cn = n;
		n.tt += e.tt;
		n.nt ||= e.nt;
		append(n.tn, e.tn);
		append(n.un[0], e.un[0]);
		append(n.un[1], e.un[1]);
		append(n.En, e.En);
		if (e.I !== null) append(n.I ??= [], e.I);
		transactions.splice(transactions.indexOf(e), 1);
	}
	/** A15: a hold is a property of the async node — observed pending by a
	* render reader. A transaction is blocked while a node it holds, in flight,
	* has one: a pending render effect (the frame itself), or a pending held
	* node a render effect reads. A stale reader served the committed value
	* never went pending, but derives from the flight all the same (#3494) and
	* is still linked to it; a memo between them is pending, and held, too — so
	* one hop of `_subs` is the chain. Reads of the reader's LAST pass only (the
	* link's generation is the pass's): a tail kept for A30 — the committed
	* frame's dependency, awaiting the run that retires it — is not a read of
	* the flight, and a reader that stopped reading releases it (O3, #3494).
	* An errored pass (NotReady included) did not stop: it never got there, and
	* its full list stands (A30) — the reads it did not reach still observe. A
	* flight nobody renders holds nothing (A29). Only the nodes `t` still owns
	* count: one a lane took over since is the lane's to wait on. A guess whose
	* own truth is in flight blocks the lane's parent, not the lane — it stands
	* in for the flight (A17: "visible until its own fetch settles"). */ function blocked(e) {
		const n = judge;
		judge ??= e;
		const o = e.tt !== 0 || blockedBy(e.tn, e) || !!lanesBlockedHook?.(e);
		judge = n;
		return o;
	}
	var judge = null;
	/** A source the pending node waits on that is `t`'s (held by it, or by no
	* one) — not another transaction's or lane's work. Itself, when it is the
	* source. */ function ownSource(e, n) {
		const o = e.T?.fe;
		if (o === void 0) return true;
		for (const e of o) {
			const o = e.T?.Re;
			if (o == null || resolveTx(o) === n) return true;
		}
		return false;
	}
	function blockedBy(e, n, o = false) {
		for (let t = 0; t < e.length; t++) {
			const l = e[t];
			if (!(l.m & 1) || l.R & 64 || l.l & 8192 || l.T.Re !== null && txOf(l) !== n || o && !ownSource(l, n)) continue;
			if (l.i === 1) {
				if (onScreen(l, judge ?? n)) return true;
				continue;
			}
			for (let e = l.o; e !== null; e = e.t) {
				const o = e.u;
				if ((o.i === 1 && o.m & 1 || o.R & 2048 || o.l & 16384 && o.m === 1) && (e.Te === o.Ne || o.T?.F != null) && !(o.R & 64) && onScreen(o, judge ?? n)) return true;
			}
		}
		return false;
	}
	/** A frame reader whose say counts for `t`'s hold — `t` the transaction
	* being judged: not a zombie whose removal `t` stages (A15 #3463: a re-ask
	* in the unmount frame lands its pending on the zombie it unmounts — the
	* compiled <Show> of #3372; a zombie blocks every other judgment while it
	* is visible, a lane's reveal included: only the commit that disposes it
	* makes its say moot), and not behind a fallback (A33: a boundary showing its fallback is the display of
	* everything under it, so a reader there is not on screen and holds
	* nothing — boundaries.ts). */ function onScreen(e, n) {
		return !(e.R & 32 && removalStagedBy(e, n)) && !hiddenHook?.(e);
	}
	/** A15 (#3463): a reader whose removal is staged — a zombie, parked by a
	* pass awaiting its commit — is still on screen and live for every hold,
	* except the transaction staging its removal: for that one its say is moot
	* (done, and the commit disposes it; not done, and it stays parked). The
	* staging transaction is the one holding the pass that parked the frame:
	* the nearest non-zombie ancestor. */ function removalStagedBy(e, n) {
		let o = e;
		while (o?.R & 32) o = o._parent;
		return o?.l & 256 && o.T?.Re != null && txOf(o) === resolveTx(n);
	}
	/** Unchanged passes this flush whose stale dependency tail awaits the
	* flush's verdict (A30, #3469): trimmed when the flush commits, kept when
	* it parks — the committed frame still derives from the previous pass's
	* dependencies, and a write to one of them must reach the node until a
	* committing pass replaces it. */ var heldTrims = [];
	function heldTrim(e) {
		heldTrims.push(e);
	}
	/** Zombies popped from the dirty heap this flush (`deferZombie`). The seam
	* decides their fate: a park cancels them (the writes that dirtied them are
	* held with it); a commit runs the survivors — the ones whose owner is still
	* awaiting its commit — in height order, after the commits that would have
	* disposed them (#3546). No second heap: the list is the deferral. */ var deferredZombies = [];
	function deferZombie(e) {
		deleteFromHeap(e, dirtyQueue);
		e.R &= -4;
		deferredZombies.push(e);
	}
	/** Put a staged node in a transaction: flagged, stamped, on its landing
	* list. */ function holdNode(e, n) {
		e.l |= 256;
		list(e, n);
	}
	/** Put a node on a transaction's list, once: a node's `_transaction` is the
	* transaction whose `_nodes` it is on (every site that sets one does the
	* other), so a re-pass, a re-landing or a re-staging adds nothing. */ function list(e, n) {
		const o = ext(e);
		if (o.Re === n) return;
		o.Re = n;
		n.tn.push(e);
	}
	/** Hold the (uncommitted) frame under a held pass: every computed in the
	* live child chain, recursively. Plain owners are walked through, not held
	* — nothing reads or re-passes them. Once per park, over the parked frames
	* only; recomputes pay nothing for it. A lane's node in the frame (listed on
	* a lane: a verdict reader broken out of this very hold — display-ahead — or
	* a derivation of a guess, CONFIG_OVERRIDE; a lane pass's effect) is the
	* lane's, as the seam's own loop has it: "lane work never makes its node
	* transaction work" (A15, #3698). Re-listed here it would carry the lane's
	* value on the transaction's list, where the landing nulls its transaction
	* and `dissolveLane` no longer finds it — a lane node with no lane, which the
	* next read of it trips over (`laneRead` → `txOf`). Its frame is the lane's
	* too (ruling A: a lane pass's children are the lane's), revealed and
	* retired at the lane's seam. */ function holdFrame(e, n) {
		for (let o = e.De; o !== null; o = o.pe) {
			if (o.T?.Re?.v) continue;
			if (o.X !== void 0) {
				if (!(o.l & 256)) holdNode(o, n);
				o.l |= CONFIG_HELD_FRAME;
			}
			holdFrame(o, n);
		}
	}
	var dirtyQueue = {
		$e: new Array(2e3).fill(void 0),
		p: false,
		Ge: 0,
		et: 0
	};
	var clock = 0;
	var scheduled = false;
	var halted = false;
	var haltNotified = false;
	var syncDepth = 0;
	/** Action bodies on the stack (action.ts): `flush()` is refused inside one —
	* the body's writes are its transaction's and commit when it settles; a
	* drain mid-step cannot reveal them, and dev says so. */ var actionDepth = 0;
	/** Provenance (A18, #3331): the question being asked — an action's
	* sequence while a slice of its body and the flush that carries it run, 0
	* otherwise. A guess is stamped with it (lanes.ts; a mainline guess takes a
	* fresh sequence: the newest intent), a flight with the question that
	* started it (async.ts; mainline is always the current question). An
	* answer from an older question than the guess it lands on is stale: held
	* silently, it does not move the graph. */ var question = 0;
	function schedule() {
		if (halted) {
			notifyHalted();
			return;
		}
		if (scheduled) return;
		scheduled = true;
		if (!syncDepth && !globalQueue.q) queueMicrotask(flush);
	}
	/**
	* Permanently halts the reactive system. Called when a user error escapes
	* every boundary — app state is undefined at that point, so scheduling stops
	* entirely rather than limping along with a half-applied update.
	*/
	/**
	* The key a root owner carries its client error hook under (`render`'s
	* `onError`) — registered, so a runtime writes it with no import of the hook
	* module (core/error-hooks.ts) and no property mangling in the way. Defined
	* HERE, not there: a runtime that only writes the key must not retain the
	* hook machinery (pay-for-use).
	*/ var ROOT_ERROR_HOOK = Symbol.for("solid-js/root-error-hook");
	function haltReactivity(e) {
		if (halted) return;
		halted = true;
		rethrowCleanupError(true);
		let n = "[REACTIVITY_HALTED]";
		const o = e !== void 0 && globalThis.reportError;
		o || e === void 0 ? console.error(n) : console.error(n, e);
		o && o(e);
	}
	function notifyHalted() {
		if (haltNotified) return;
		haltNotified = true;
		console.error("[REACTIVITY_HALTED]");
	}
	var GlobalQueue = class GlobalQueue {
		un = [[], []];
		q = false;
		flush() {
			if (this.q) return;
			this.q = true;
			resyncUnflushedCompanions();
			passLane = null;
			passTx = null;
			try {
				sweepDormant();
				runHeap(dirtyQueue, GlobalQueue._e);
				this.settle();
				clock++;
				scheduled = dirtyQueue.et >= dirtyQueue.Ge || pendingNodes.length !== 0;
				this.run(1);
				this.run(2);
			} finally {
				this.q = false;
				passTx = null;
			}
		}
		/** L2 — the seam: end of the pure phase. Commit this flush's staged nodes,
		* or park them with the transaction the flush joined; then land every
		* transaction no frame is waiting on. The landing flush is an ordinary
		* flush: the settle walk (async.ts) re-ran the parked readers in its pure
		* phase, and here no flight the transaction holds has a frame deriving
		* from it (`blocked`). */ settle() {
			if (laneCorrectionsHook?.()) runHeap(dirtyQueue, GlobalQueue._e);
			const e = flushTransaction;
			flushTransaction = null;
			applyGuessesHook?.(e);
			const n = e !== null && !e.v ? resolveTx(e) : null;
			if (n !== null) {
				const e = pendingNodes.length;
				for (let o = 0; o < e; o++) {
					const e = pendingNodes[o];
					if (!(e.l & 2304) && (e.T === null || e.T.Re === null || !e.T.Re.v)) {
						if (e.ue === NOT_PENDING && e.m & 4 && e.i !== 1) continue;
						if (e.ue !== NOT_PENDING && !(e.m & 5) && e.T?.Ue == null && e.T?.me == null && isSame(e, e.Ie, e.ue)) {
							e.ue = NOT_PENDING;
							e.l &= -129;
							continue;
						}
						holdNode(e, n);
					}
					if (e.l & 128) holdFrame(e, n);
				}
				pendingNodes.length = 0;
				storeParkHook?.(n);
				const o = deferredZombies.splice(0);
				if (observeFlightHook) {
					o.sort((e, n) => e.Fe - n.Fe);
					for (let e = 0; e < o.length; e++) if ((o[e].R & 96) === 32 && o[e].l & 32768) recompute(o[e]);
				}
			} else {
				commitPendingNodes();
				for (let e = 0; e < heldTrims.length; e++) {
					const n = heldTrims[e];
					if (n.T?.F == null && !n.Ae) trimStaleDeps(n);
				}
			}
			if (heldTrims.length) heldTrims.length = 0;
			const o = this.un;
			const t = this.un = [[], []];
			if (laneSeamsHook) {
				laneSeamsHook(n !== null ? stagedReaders : null);
				if (stagedReaders.length) stagedReaders.length = 0;
			}
			this.un = [[], []];
			for (let e = transactions.length - 1; e >= 0; e--) {
				const n = transactions[e];
				if (blocked(n)) continue;
				transactions.splice(e, 1);
				endLanesHook?.(n);
				land(n);
				e = transactions.length;
			}
			storeCommitHook?.();
			const l = n && liveTx(n);
			releaseAmbientMarksHook?.(l);
			const s = l !== null;
			for (let e = 0; e < 2; e++) {
				if (s) append(l.un[e], o[e]);
				this.un[e] = s || t[e].length || this.un[e].length ? t[e].concat(s ? [] : o[e], this.un[e]) : o[e];
			}
			if (deferredZombies.length !== 0) {
				const e = deferredZombies.splice(0).sort((e, n) => e.Fe - n.Fe);
				for (let n = 0; n < e.length; n++) if (!(e[n].R & 64)) recompute(e[n]);
			}
			boundarySeamHook?.();
		}
		run(e) {
			const n = this.un[e - 1];
			if (n.length) {
				this.un[e - 1] = [];
				runQueue(n, e);
			}
		}
		enqueue(e, n, o = passLane) {
			if (e) (o !== null ? o : this).un[e - 1].push(n);
			schedule();
		}
		/** Status reaching the root: pending is absorbed (the root mount defers —
		* dev records it for the ASYNC_OUTSIDE_LOADING_BOUNDARY FYI); an error is
		* unhandled (`false` → the caller halts).
		*
		* L2: this is where a transaction is registered. Pending that reaches an
		* observer (a render effect: the frame) is a frame that cannot show — the
		* flush parks, and the transaction waits on the flight while a frame
		* derives from it (`blocked`). Pending nobody observes holds nothing: a
		* memo in flight that no frame reads is not a frame waiting. (Base: the
		* queue's `_asyncReporters`, INV-3's one registration site.)
		*
		* A boundary between the observer and the root (boundaries.ts) is asked
		* first: a fallback catches what is not ready under it, and the root
		* never hears of it. */ notify(e, n, o, t) {
			if (catchHook?.(e, o & n, t)) return true;
			if (n & 1) {
				if (o & 1) {
					if (passLane === null) joinFuture(null);
				}
				return true;
			}
			return false;
		}
	};
	/** A15's stale readers: a frame whose LAST pass read a held node as
	* committed re-derives on the landed world — next round, after the commits.
	* One re-derived since (any later pass cleared the bit: in the transaction,
	* or without the held read) owes nothing. A run this transaction stashed
	* for it is void (#3322: an effect has one value slot, and the stale pass
	* overwrote the value that run was for) — the re-derivation's run replaces
	* it. Truthy when an effect re-derives (`land`). */ function reruns(e) {
		let n;
		for (let o = 0; o < e.En.length; o++) {
			const t = e.En[o];
			if (t.R & 64 || t.m & 2) continue;
			if (t.R & 2048 || t.l & 32768) {
				n ||= t.i;
				t.R &= ~REACTIVE_FRAME_READ;
				t.Ae = false;
				for (let e = t.De; e !== null; e = e.pe) if (e.i) e.Ae = false;
				enqueueSub(t);
			}
		}
		e.En.length = 0;
		return n;
	}
	/** The landing: the held frame becomes the frame. */ function land(e) {
		const n = reruns(e);
		if (e.I !== null) releaseMarksHook(e.I);
		for (let n = 0; n < e.tn.length; n++) {
			const o = e.tn[n];
			if (o.T.Re === null || txOf(o) !== e) continue;
			o.T.Re = null;
			commitPendingNode(o);
		}
		if (flushTransaction === e) flushTransaction = null;
		if (n) globalQueue.un[1].push(() => releaseQueues(e));
		else releaseQueues(e);
	}
	/** The held runs join this flush's effect phase after its own runs (the
	* landing's re-passes, in height order): the frame's effects run as one
	* pass would have queued them — a shell re-derived at the landing before a
	* boundary swap held since the write (#3540's log order). */ function releaseQueues(e) {
		for (let n = 0; n < 2; n++) {
			append(globalQueue.un[n], e.un[n]);
			e.un[n] = [];
		}
	}
	/** `a.push(...b)` without the argument-count limit. */ function append(e, n) {
		for (let o = 0; o < n.length; o++) e.push(n[o]);
	}
	/** Nodes staged this flush (`_pendingValue` set), committed at its end. */ var pendingNodes = [];
	/** Passes that read a staging of this flush as the screen — lane work
	* (core.ts `stagedRead`), a verdict reader before the frame's verdict
	* (verdict.ts): if the frame parks they read a held write — re-derived next
	* round (lanes.ts; a lane's runs wait that round). */ var stagedReaders = [];
	/** A15's stale reader: `c` was served the committed value of a node `t`
	* holds (a render effect, a verdict reader, lane work) and is re-derived
	* after `t`'s landing (`_reruns`). Once per pass. */ function staleReader(e, n) {
		if (!(e.R & 2048)) {
			e.R |= REACTIVE_FRAME_READ;
			n.En.push(e);
		}
	}
	function queuePendingNode(e) {
		pendingNodes.push(e);
		if (!globalQueue.q) markUnflushedStaged();
	}
	/** §12d: bumped by every recompute and every new subscriber edge. A node's
	* staged-rewrite skip is sound only while NOTHING recomputed or linked since
	* its last notify — a mid-batch pull can clean a marked subscriber, and a
	* skipped re-write would leave it stale. */ var notifyEpoch = 0;
	function bumpNotifyEpoch() {
		notifyEpoch++;
	}
	function insertSubs(e) {
		e.Me = notifyEpoch;
		const o = (e.l & 512) !== 0 && e.T?.Pe !== void 0;
		for (let n = e.o; n !== null; n = n.t) {
			const e = n.u;
			if (e.R & 4 && n.Te === e.Ne && n !== e._) e.R |= REACTIVE_MISSED_WAKE;
			if (o && e.l & 8) {
				e.R |= 256;
				continue;
			}
			enqueueSub(e);
		}
	}
	/** Lane work re-staged (lanes.ts; `recompute`): the lane's members among
	* its subscribers re-derive as the lane's work (REACTIVE_LANE_DIRTY), their
	* runs held with it — not as stale readers republishing the committed view
	* (#3460). After `insertSubs`. A render effect on no lane is marked too:
	* inert for its pass (`recompute` seats a lane only from its own `_x`), it
	* is a live write if the effect becomes a zombie later this flush — an
	* on-screen reader whose removal an adopted write stages follows the lane
	* (the lane-membership ruling, 2026-10-05; `_update`). */ function laneDirty(e, n) {
		for (let o = e.o; o !== null; o = o.t) {
			const e = o.u.T?.Re;
			if (e?.v ? sameLane(e, n) : o.u.i) o.u.R |= REACTIVE_LANE_DIRTY;
		}
	}
	/** One lane, or two of one link group (#3335): one reveal unit. */ function sameLane(e, n) {
		return e === n || e.en !== null && e.en === n.en;
	}
	function commitPendingNode(e) {
		const n = e;
		if (!n.X) {
			e.l &= -385;
			if (e.ue !== NOT_PENDING) {
				e.Ie = e.ue;
				e.ue = NOT_PENDING;
			}
			return;
		}
		const o = e.ue === NOT_PENDING && (n.m & 1) !== 0;
		const t = e.l & CONFIG_STAGED_ERROR;
		if (!o && n.T) n.T.de = void 0;
		e.l = o ? e.l & -1048833 | CONFIG_INPUTS_PUBLISHED : e.l & -3147137;
		if (t) {
			const o = e.ue;
			e.ue = NOT_PENDING;
			e.ie = clock + 1;
			notifyStatus(n, 2, o);
		} else if (e.ue !== NOT_PENDING) {
			e.Ie = e.ue;
			e.ue = NOT_PENDING;
			n.m &= -5;
			if (n.T != null) n.T.Ve = false, n.T.je = NOT_PENDING;
			if (e.i && e.i !== 3) {
				e.Ae = true;
				globalQueue.enqueue(e.i, e.W ??= GlobalQueue.K.bind(null, n));
			}
		}
		n.ce = false;
		n.R &= ~REACTIVE_MANUAL_WRITE;
		if (n.T?.F == null) trimStaleDeps(n);
		if (!(n.m & 1)) n.m &= -5;
		if (!o && n.T != null && (n.T.Ue !== null || n.T.me !== null)) GlobalQueue.Ce(n, false, true);
	}
	function commitPendingNodes() {
		for (let e = 0; e < pendingNodes.length; e++) {
			const n = pendingNodes[e];
			if (!(n.l & 2304)) commitPendingNode(n);
		}
		pendingNodes.length = 0;
	}
	var globalQueue = new GlobalQueue();
	function flush(e) {
		if (actionDepth > 0) return e ? e() : void 0;
		if (e) {
			syncDepth++;
			try {
				return e();
			} finally {
				try {
					flush();
				} finally {
					syncDepth--;
				}
			}
		}
		if (globalQueue.q) return;
		if (halted) return;
		while (scheduled) globalQueue.flush();
		rethrowCleanupError();
	}
	function runQueue(e, n) {
		for (let o = 0; o < e.length; o++) e[o](n);
	}
	// node_modules/@solidjs/signals/dist/prod/core/heap.js
	/**
	* Schedule one subscriber to re-run on the next flush: inserted into the
	* dirty heap with the `_min` cursor pulled down. Tracked effects ride the
	* heap too — the heap visit is their (empty) compute phase, which hands the
	* callback to the user queue once the pass has committed (see
	* GlobalQueue._update, #3291).
	*/ function enqueueSub(e) {
		if (dirtyQueue.Ge > e.Fe) dirtyQueue.Ge = e.Fe;
		insertIntoHeap(e, dirtyQueue);
	}
	function actualInsertIntoHeap(e, t) {
		const E = (e._parent?.Qe ? e._parent.Ye?.Fe : e._parent?.Fe) ?? -1;
		if (E >= e.Fe) e.Fe = E + 1;
		const n = e.Fe;
		const I = t.$e[n];
		if (I === void 0) t.$e[n] = e;
		else {
			const t = I.We;
			t.be = e;
			e.We = t;
			I.We = e;
		}
		if (n > t.et) t.et = n;
	}
	function insertIntoHeap(e, t) {
		let E = e.R;
		if (E & 12) return;
		if (E & 1) e.R = E & -4 | 10;
		else {
			e.R = E | 8;
			if (t.p) markNode(e);
		}
		if (!(E & 16)) actualInsertIntoHeap(e, t);
	}
	function insertIntoHeapHeight(e, t) {
		let E = e.R;
		if (E & 28) return;
		e.R = E | 16;
		actualInsertIntoHeap(e, t);
	}
	function deleteFromHeap(e, t) {
		const E = e.R;
		if (!(E & 24)) return;
		e.R = E & -25;
		const n = e.Fe;
		if (e.We === e) t.$e[n] = void 0;
		else {
			const E = e.be;
			const I = t.$e[n];
			const i = E ?? I;
			if (e === I) t.$e[n] = E;
			else e.We.be = E;
			i.We = e.We;
		}
		e.We = e;
		e.be = void 0;
	}
	function markHeap(e) {
		if (e.p) return;
		e.p = true;
		for (let t = 0; t <= e.et; t++) for (let E = e.$e[t]; E !== void 0; E = E.be) if (E.R & 8) markNode(E);
	}
	function markNode(e, t = 2) {
		const E = e.R;
		if ((E & 3) >= t) return;
		e.R = E & -4 | t;
		for (let t = e.o; t !== null; t = t.t) markNode(t.u, 1);
	}
	function runHeap(e, t) {
		e.p = false;
		for (e.Ge = 0; e.Ge <= e.et; e.Ge++) {
			let E = e.$e[e.Ge];
			while (E !== void 0) {
				if (E.R & 8) t(E);
				else adjustHeight(E, e);
				E = e.$e[e.Ge];
			}
		}
		e.et = 0;
	}
	function adjustHeight(e, t) {
		deleteFromHeap(e, t);
		let E = e.Fe;
		for (let t = e.C; t; t = t.G) {
			const e = t.S;
			if (e.X && e.Fe >= E) E = e.Fe + 1;
		}
		if (e.Fe !== E) {
			e.Fe = E;
			for (let E = e.o; E !== null; E = E.t) insertIntoHeapHeight(E.u, t);
		}
	}
	// node_modules/@solidjs/signals/dist/prod/core/graph.js
	/** The store's shared slot-node release handler (store/store.ts installs it
	* once) — a live binding read directly by the sweep site: no wrapper frame,
	* no null check (a CONFIG_SLOT_NODE node existing implies the store module
	* loaded and registered it). */ var slotUnobservedHook;
	function unlinkSubs(e) {
		const n = e.S;
		const l = e.G;
		const o = e.t;
		const s = e.Xe;
		if (o !== null) o.Xe = s;
		else n.ve = s;
		if (s !== null) s.t = o;
		else {
			n.o = o;
			if (o === null) {
				if (n.l & 4096) slotUnobservedHook(n);
				else if (n.T?.we) runCleanup(n.T.we);
				const e = n;
				e.X && e.l & 32 && !(e.R & 32) && !(e.m & 1) && (deferredReleases ? deferredReleases.push(e) : unobserved(e));
			}
		}
		return l;
	}
	function trimStaleDeps(e) {
		const n = e._;
		let l = n !== null ? n.G : e.C;
		if (l !== null) {
			do
				l = unlinkSubs(l);
			while (l !== null);
			if (n !== null) n.G = null;
			else e.C = null;
		}
	}
	function clearDeps(e) {
		let n = e.C;
		if (!n) return;
		do
			n = unlinkSubs(n);
		while (n !== null);
		e.C = null;
		e._ = null;
	}
	/**
	* Last-one-out releases held back while a pass tears down the frame of an
	* earlier pass that never committed (#4142). The pass is about to rebuild
	* the same children, which read the same lazy nodes again. Released on the
	* spot, a lazy async memo whose only reader was the old frame's child memo
	* was torn down, re-ran on the new child's read, went pending, and the cycle
	* repeated forever. `recompute` collects them around that teardown and
	* releases what is still unobserved when the pass ends.
	*/ var deferredReleases = null;
	var deferReleases = (e) => deferredReleases = e;
	function unobserved(e) {
		deleteFromHeap(e, dirtyQueue);
		clearDeps(e);
		disposeChildren(e, true);
	}
	/**
	* Deferred dormancy for never-observed auto-dispose computeds (#3078).
	*
	* An untracked top-level read of a subscriber-less observation-lifecycle memo
	* used to call unobserved() inline at the end of read(). That kept the leak
	* closed (the compute links the memo into its deps' sub lists — without a
	* teardown point a never-observed memo is retained by its sources forever;
	* upstream alien-signals has exactly this retention), but it made reads
	* destructive: each read disposed the node, the next read revived it with a
	* full recompute in whatever ambient transition/lane context happened to be
	* current, so consecutive reads could return different answers with no write
	* in between.
	*
	* Instead, reads queue the node here and the scheduler sweeps at the top of
	* the next flush (before runHeap, so a same-tick dirtying is reclaimed
	* instead of recomputed). Reads become idempotent within a tick (the node
	* stays alive and serves its cache, uniform with observed memos) while
	* reclamation still happens within one microtask — the enqueue site arms
	* schedule(), so a flush is guaranteed even when no other work is queued.
	*/ var dormantNodes = new NewSet();
	function sweepDormant() {
		if (dormantNodes.size === 0) return;
		for (const e of dormantNodes) if (!e.o && e.l & 32 && !(e.m & 1) && !(e.R & 96)) unobserved(e);
		dormantNodes.clear();
	}
	function link(e, n) {
		const l = n._;
		if (l !== null && l.S === e) return;
		let o = null;
		const s = n.R & 4;
		if (s) {
			o = l !== null ? l.G : n.C;
			if (o !== null && o.S === e) {
				o.Te = n.Ne;
				n._ = o;
				return;
			}
		}
		const r = e.ve;
		if (r !== null && r.u === n && (!s || r.Te === n.Ne)) return;
		const t = n._ = e.ve = {
			S: e,
			u: n,
			G: o,
			Xe: r,
			t: null,
			Te: n.Ne
		};
		if (l !== null) l.G = t;
		else n.C = t;
		if (r !== null) r.t = t;
		else e.o = t;
		bumpNotifyEpoch();
	}
	// node_modules/@solidjs/signals/dist/prod/core/async.js
	function addPendingSource(e, n) {
		if (e.T?.fe?.has(n)) return false;
		(ext(e).fe ??= new NewSet()).add(n);
		return true;
	}
	function removePendingSource(e, n) {
		const t = e.T?.fe;
		if (!t?.delete(n)) return false;
		if (!t.size) e.T.fe = void 0;
		return true;
	}
	function clearPendingSources(e) {
		if (e.T !== null) e.T.fe = void 0;
	}
	function retryReaches(e, n) {
		for (let t = e.C; t; t = t.G) {
			const e = t.S;
			if (e === n || e.T?.fe?.has(n)) return true;
		}
		return false;
	}
	/**
	* A loading-window node hit an unready source (sync throw in recompute, or a
	* NotReadyError-rejected flight): register for the source's settle — the
	* settlePendingSource walk runs off `_pendingSources` + `_blocked` alone —
	* with NO read-visible pending status and no downstream propagation. Commit
	* #0 keeps serving.
	*/ function parkLoadingWindow(e, n) {
		ext(e).se = true;
		if (n.source) addPendingSource(e, n.source);
		if (!(e.m & 2)) setPendingError(e, n.source, n);
	}
	function setPendingError(e, n, t) {
		if (!n) {
			if (e.T !== null) e.T.F = null;
			return;
		}
		if (t instanceof NotReadyError && t.source === n) {
			ext(e).F = t;
			return;
		}
		const r = e.T?.F;
		if (!(r instanceof NotReadyError) || r.source !== n) ext(e).F = new NotReadyError(n);
	}
	function forEachDependent(e, n) {
		for (let t = e.o; t !== null; t = t.t) n(t.u, t);
	}
	function releaseIfSettledUnobserved(e) {
		e.X && e.l & 32 && !e.o && !(e.R & 32) && !(e.m & 1) && unobserved(e);
	}
	function releaseSettledDependents(e) {
		let n;
		const t = new NewSet();
		const visit = (e) => {
			if (t.has(e)) return;
			t.add(e);
			if (!e.o && e.l & 32) (n ??= []).push(e);
			forEachDependent(e, visit);
		};
		forEachDependent(e, visit);
		if (n) for (const e of n) releaseIfSettledUnobserved(e);
	}
	/** D-41: an error a pass of a held node found is an answer of
	* that frame — it ends the wait like a value and shows when a value would.
	* Staged like one: `_pendingValue` carries it (CONFIG_STAGED_ERROR), readers
	* in the hold derive from it (`serve` throws it), and the commit publishes
	* it through the ordinary error path (`commitPendingNode` → `notifyStatus`),
	* dependents included. Not for a lane pass, nor a node with no shown value
	* (born held — its error has no frame to wait behind): those publish now,
	* as before. Returns whether the error was staged. */ function stageError(e, n, t) {
		if (!(e.l & 256 || t && e.R & 16384 && globalQueue.q && !e.fam) || passLane) return false;
		clearPendingSources(e);
		if (e.T) e.T.se = false;
		if (!((e.m &= 6) & 2)) setPendingError(e);
		e.ue = n instanceof StatusError ? n : new StatusError(e, n);
		e.l |= 128 | CONFIG_STAGED_ERROR;
		settlePendingSource(e);
		schedule();
		return true;
	}
	function settleErroredDependents(e, n) {
		let t = false;
		const r = new NewSet();
		const visit = (e) => {
			if (r.has(e)) return;
			r.add(e);
			if (e.T?.F === n) {
				enqueueSub(e);
				t = true;
			}
			forEachDependent(e, visit);
		};
		forEachDependent(e, visit);
		if (t) schedule();
	}
	function settlePendingSource(e, n = e) {
		removePendingSource(e, n);
		let t = false;
		let r;
		const o = new NewSet();
		const settle = (f) => {
			if (o.has(f) || n !== e && retryReaches(f, n) || !removePendingSource(f, n)) return f.l & 32768 && enqueueSub(f);
			o.add(f);
			f.ie = clock;
			const s = f.T?.fe?.values().next().value;
			const u = f.m & 2;
			if (s) {
				if (!u) setPendingError(f, s);
			} else {
				f.m &= -2;
				if (!u) setPendingError(f);
				if (f.l & 256) joinFuture(txOf(f));
				if (f.T?.se) {
					enqueueSub(f);
					t = true;
				}
				if (f.T !== null) f.T.se = false;
				if (!f.o && f.l & 32) (r ??= []).push(f);
			}
			forEachDependent(f, settle);
		};
		forEachDependent(e, settle);
		if (r) for (const e of r) releaseIfSettledUnobserved(e);
		if (t) schedule();
	}
	function isThenable(e) {
		return e != null && typeof e === "object" && typeof e.then === "function";
	}
	/** Fire and clear a node's iterator-flight cancellation hook (#3122). */ function releaseFlightTeardown(e) {
		const n = e.T?.ae;
		if (n != null) {
			e.T.ae = null;
			n();
		}
	}
	function handleAsync(e, n, t, r) {
		let o = false;
		let f = false;
		if (typeof n === "object" && n !== null) untrack(() => {
			o = n[Symbol.asyncIterator];
			f = !o && isThenable(n);
		});
		if (!f && !o) {
			if (e.T !== null) e.T.Se = null;
			e.ce = false;
			return n;
		}
		ext(e).Se = n;
		e.T.Ee = question || 2147483647;
		e.T.fe = void 0;
		let s;
		const handleError = (o) => {
			if (e.T?.Se !== n) return;
			let f = o instanceof NotReadyError;
			if (f && e.ce) {
				if (e.T !== null) e.T.Se = null;
				parkLoadingWindow(e, o);
				e.ie = clock;
				return;
			}
			if (f || t || !stageError(e, o)) {
				notifyStatus(e, f ? 1 : 2, o);
				if (!f) disposeChildren(e, false, true);
			}
			if (f) settlePendingSource(e);
			e.ie = clock;
			if (!f) releaseSettledDependents(e);
			r?.(o, f);
		};
		const asyncWrite = (r, o) => {
			if (e.T?.Se !== n) return;
			if (e.R & 2) return;
			const f = e.m & 4;
			landStatus(e);
			if (t) {
				try {
					t(r);
				} catch (e) {
					handleError(e);
					return;
				}
				if (!(e.l & 256)) e.T.de = void 0;
				if (f) landStatus(e, true);
			} else setSignal(e, () => r);
			if (e.ue === NOT_PENDING) {
				e.ce = false;
				trimStaleDeps(e);
			}
			settlePendingSource(e);
			schedule();
			flush();
			o?.();
		};
		const settleAutodispose = () => {
			if (e.l & 32 && !e.o && !(e.m & 1)) {
				unobserved(e);
				return true;
			}
			return false;
		};
		const consumeIterator = (t, r) => {
			const o = t[Symbol.asyncIterator]();
			let f = false;
			let u = false;
			let i = !r;
			const close = () => {
				if (u) return;
				u = true;
				try {
					const e = o.return?.();
					if (isThenable(e)) e.then(void 0, () => {});
				} catch {}
			};
			cleanup(close, r);
			ext(e).ae = close;
			const iterateOrRelease = () => {
				try {
					if (!settleAutodispose()) iterate();
				} catch (e) {
					handleError(e);
				}
			};
			const iterate = () => {
				let t, r, l = false, a = false, S = true;
				const c = o.next();
				(isThenable(c) ? c : { then: (e) => void e(c) }).then((r) => {
					if (S && i) {
						t = r;
						l = true;
						if (r.done) u = true;
					} else if (e.T?.Se !== n) return;
					else if (!r.done) {
						f = true;
						asyncWrite(r.value, iterateOrRelease);
					} else {
						u = true;
						if (f) {
							schedule();
							flush();
						} else asyncWrite(void 0);
						settleAutodispose();
					}
				}, (t) => {
					if (S && i) {
						r = t;
						a = true;
					} else if (e.T?.Se === n) {
						u = true;
						handleError(t);
						settleAutodispose();
					}
				});
				S = false;
				if (a) {
					u = true;
					handleError(r);
					if (i) throw r;
					return true;
				}
				if (l && !t.done) {
					s = t.value;
					f = true;
					return iterate();
				}
				return l && t.done;
			};
			const l = iterate();
			i = false;
			return f || l;
		};
		let u = null;
		const flattenIfIterable = (e, n) => {
			let t = false;
			if (typeof e === "object" && e !== null) untrack(() => {
				t = e[Symbol.asyncIterator];
			});
			if (!t) return false;
			s = void 0;
			const r = consumeIterator(e, n);
			if (!n) u = r;
			return true;
		};
		if (f) {
			let t = false, r = false, o, f = true;
			n.then((r) => {
				if (f) {
					s = r;
					t = true;
				} else {
					try {
						if (e.T?.Se === n && !(e.R & 64) && flattenIfIterable(r, e)) return;
						asyncWrite(r);
					} catch (e) {
						handleError(e);
					}
					settleAutodispose();
				}
			}, (e) => {
				if (f) {
					o = e;
					r = true;
				} else {
					handleError(e);
					settleAutodispose();
				}
			});
			f = false;
			if (r) {
				handleError(o);
				throw o;
			} else if (!t) u = false;
			else if (!flattenIfIterable(s)) e.ce = false;
		}
		if (o) flattenIfIterable(n);
		if (u !== null) {
			if (!u) {
				if (e.ce) return e.Ie;
				throw new NotReadyError(context);
			}
			e.ce = false;
		}
		return s;
	}
	function clearStatus(e, n = false) {
		if (e.T?.fe) clearPendingSources(e);
		if (e.T?.se) e.T.se = false;
		e.m = n ? 0 : e.m & 4;
		if (e.T?.F) setPendingError(e);
		const t = statusNotifierOf(e);
		if (t) t.call(e);
	}
	/**
	* Status clear for a flight LANDING (asyncWrite). A landing answers the
	* node's OWN question — it retires the node's self entry, not the pending
	* state its sources propagated onto it. An input re-asked while this flight
	* was up (a second write to the signal feeding `a` while `b`'s first flight
	* is in the air, #3373) marks `b` pending on `a` by propagation, with `b`'s
	* flight still current: nothing superseded it (the re-ask only changed `a`'s
	* status, not yet its value), so the landing arrives, and a full clear made
	* `b` answer with the stale value — the newer signal committed beside the
	* older derived value (`2 / 1`) for the gap (#3376).
	* With another source still pending the node stays derivatively pending on
	* it; the landed value is written below (the staged answer is still the
	* answer for the inputs it was asked with) and the input's own settle
	* releases it, or its value change recomputes the node into a fresh flight.
	* `_blocked` clears like a full clear: a landing that passed the `_inFlight`
	* guard was not superseded by a re-run (recompute nulls `_inFlight` first),
	* so the flag is the flight's own registration throw — the input settling
	* unchanged must not re-run the node (an extra flight for the same inputs).
	* The node is already STATUS_PENDING in that branch (only notifyStatus fills
	* the set, with status; a loading-window park cannot coexist with a live
	* flight since registration drops the set), so the flags only change when
	* the first landing retires UNINITIALIZED. `_error` must move off self: a
	* reader thrown NotReady(self) would park on a retired entry. Companions
	* keep their verdict (pending before and after; the write re-syncs them).
	*/ function landStatus(e, n = false) {
		const t = e.T?.fe;
		if (t && (t.delete(e), t.size)) {
			e.T.se = false;
			if (n) e.m = 1;
			setPendingError(e, t.values().next().value);
		} else clearStatus(e, n);
	}
	function notifyStatus(e, n, t) {
		if (n === 2 && !(t instanceof StatusError) && !(t instanceof NotReadyError)) t = new StatusError(e, t);
		const r = n === 1 && t instanceof NotReadyError ? t.source : void 0;
		if (n === 1 && r) {
			if (e.m & 2) e.T.de = e.T.F;
			addPendingSource(e, r);
			e.m = 1 | e.m & 4;
			setPendingError(e, r, t);
		} else {
			clearPendingSources(e);
			e.m = n | (n !== 2 ? e.m & 4 : 0);
			ext(e).F = t;
		}
		if (n === 1 && e.l & 8192) {
			if (passLane === null) joinFuture(null);
			return;
		}
		const o = statusNotifierOf(e);
		if (o) {
			o.call(e);
			return;
		}
		propagateStatus(e, n, t);
	}
	/** The dependents' half of `notifyStatus`: `el`'s status reaches each
	* subscriber as a propagated mark (or a re-derive). On its own for a store
	* family's leaves, which are not the derive's dependents — the family
	* propagates the derive's status from each leaf to the leaf's readers
	* (store/projection.ts `wakeFamily`), exactly as a memo's would reach its. */ function propagateStatus(e, n, t) {
		const r = n === 1 && t instanceof NotReadyError ? t.source : void 0;
		forEachDependent(e, (o, f) => {
			o.ie = clock;
			if (o.l & 49152 || n === 1 && f.Te !== o.Ne) {
				enqueueSub(o);
				schedule();
				return;
			}
			if (n === 1 && r && o.T?.fe?.has(r)) {
				if (passLane === null && (o.l & 2304) === 256 && globalQueue.q && !freshHook?.(o, r.ie === clock)) joinFuture(txOf(o));
				return;
			}
			if (n === 1 && r || n !== 1 && (o.T?.F !== t || o.T?.fe)) {
				if (laneStageHook && passLane !== null) laneStageHook(o, passLane, true, e);
				else {
					queuePendingNode(o);
					if (n === 1 && (o.l & 2304) === 256 && !o.i) joinFuture(txOf(o));
				}
				notifyStatus(o, n, t);
			}
		});
	}
	// node_modules/@solidjs/signals/dist/prod/core/core.js
	GlobalQueue._e = (e) => {
		if (e.i === 3) {
			deleteFromHeap(e, dirtyQueue);
			e.Ae = true;
			globalQueue.enqueue(2, e.M);
		} else if (e.R & 32 && !(e.R & 65536)) deferZombie(e);
		else if (laneStageHook && e.R & 32 && laneFrameMember(e)) {
			deleteFromHeap(e, dirtyQueue);
			e.R &= -65540;
		} else recompute(e);
	};
	/** The zombie's frame was parked by lane work: the nearest non-zombie owner
	* (the one whose pass parked it) carries a lane's derived value — or, an
	* effect (no lane value: `laneStage`), is listed in a lane (an `insert()`
	* hole's render effect). */ function laneFrameMember(e) {
		let t = e._parent;
		while (t.R & 32) t = t._parent;
		return (t.l & 10240) === 2048 || t.i && t.T?.Re?.v;
	}
	GlobalQueue.Ce = disposeChildren;
	var tracking = false;
	var context = null;
	var snapshotCaptureActive = false;
	/** The lane at the root of the running chain of first passes: the lane whose
	* pass created the chain's first node (a mount), inherited by every first
	* pass nested under it, whose seats are mainline (`recompute`, #4166). */ var laneRoot;
	var snapshotSources = null;
	function ownerInSnapshotScope(e) {
		while (e) {
			if (e.Oe) return true;
			e = e._parent;
		}
		return false;
	}
	function recompute(e, t = false) {
		bumpNotifyEpoch();
		const n = e.i;
		let o;
		const E = passLane;
		const s = laneRoot;
		const i = laneStageHook && (laneRoot = t && (E || s));
		setPassLane(!laneStageHook ? null : (e.R & 65536 || (e.l & 10240) === 2048) && e.T?.Re?.v ? e.T.Re : t && E?._parent.he != E && creatorPass(context)?.R & 4 ? E : null);
		if (!t) {
			deleteFromHeap(e, dirtyQueue);
			if (e.T !== null) {
				e.T.Se = null;
				releaseFlightTeardown(e);
			}
			if (e.m & 1) e.l &= ~CONFIG_VERDICT;
			if (e.l & 256) {
				const t = txOf(e);
				if (t.v || e.l & 524288);
				else if (n !== 1 && !(e.l & 32768)) joinPassTx(t, freshHook?.(e, e.m & 4));
				else if (t !== flushTransaction && !(e.m & 4 || e.l & 1048576)) {
					e.ue = NOT_PENDING;
					if (n === 1) e.l &= -257;
				}
			}
			if (n === 3 || e.l & 128) {
				const t = deferredReleases;
				deferReleases(o = []);
				disposeChildren(e);
				deferReleases(t);
			} else if (e.De !== null || e.He !== null) parkChildren(e);
			if (e.l & 2097152) {
				e.ue = NOT_PENDING;
				e.l ^= CONFIG_STAGED_ERROR;
			}
		}
		const l = !!(e.m & 4);
		const r = e.m & 2 ? e.T?.F : void 0;
		const _ = (e.m & 1) !== 0 ? e.T?.fe : void 0;
		const a = e.T?.fe?.has(e);
		let I = false;
		const N = (e.R & 8192) !== 0 && !(e.m & 1 && e.T !== null && !e.T.Ve);
		const f = context;
		context = e;
		e._ = null;
		e.Ne++;
		e.R = 4 | e.R & (32 | REACTIVE_REASK);
		e.ie = clock;
		let T = e.ue !== NOT_PENDING ? e.ue : e.l & 2048 && e.T.v !== NOT_PENDING ? e.T.v : e.Ie;
		let S = e.Fe;
		let c = false;
		let A = false;
		let R = tracking;
		tracking = true;
		try {
			if (e.l & 64) {
				T = e.X(T);
				if (e.T !== null) e.T.Se = null;
				e.ce = false;
			} else {
				const t = e.T?.Se;
				const n = e.X(T);
				const o = typeof n === "object" && n !== null;
				const E = e.T?.Se !== t;
				T = E || !o ? n : handleAsync(e, n);
				if (!E && !o) {
					if (e.T !== null) e.T.Se = null;
					e.ce = false;
				}
			}
			if (e.m !== 0 || e.T !== null) clearStatus(e, t);
		} catch (t) {
			const n = t instanceof NotReadyError;
			if (n && e.ce) parkLoadingWindow(e, t);
			else {
				if (n || !(I = stageError(e, t, true))) {
					if (n) ext(e).se = true;
					notifyStatus(e, n ? 1 : 2, t);
					if (n && a && !e.T?.Se) settlePendingSource(e);
				}
				if ((n || I) && _) {
					for (const t of _) if (t !== e && !e.T?.fe?.has(t)) settlePendingSource(e, t);
				}
			}
		} finally {
			tracking = R;
			if (laneStageHook) laneRoot = s;
			c = (e.R & REACTIVE_MISSED_WAKE) !== 0;
			A = !!(e.R & (i && (E || n || !(e.m & 1)) ? 128 | REACTIVE_STAGED_READ : 128));
			e.l = e.l & ~CONFIG_VERDICT | e.R & REACTIVE_PROBED;
			e.R = e.R & (96 | REACTIVE_FRAME_READ | REACTIVE_STAGED_READ | REACTIVE_LANE_READ | REACTIVE_SCREEN_READ | REACTIVE_PROBE_UNANSWERED) | (t ? e.R & 256 : 0);
			context = f;
			if (o) for (const e of o) releaseIfSettledUnobserved(e);
			if (e.T !== null) e.T.Ve = N && (e.m & 1) !== 0;
		}
		if (e.R & 64) {
			clearDeps(e);
			if (e.T !== null) e.T.Se = null;
			setPassLane(E);
			return;
		}
		let C = !laneStageHook ? null : passLane;
		const d = !!e.T?.F || I;
		if (laneStageHook && C !== null) {
			if (laneStageHook(e, C, t, d)) setPassLane(C);
			else C = null;
		}
		if (!d) {
			const o = e.ue !== NOT_PENDING ? e.ue : e.l & 2048 && e.T.v !== NOT_PENDING ? e.T.v : e.Ie;
			const E = !n && l || !!e.T?.de || !isSame(e, o, T);
			if (n && E && !(e.R & 262144 && !e.Ae && Object.is(e.ge, T)) && e.ue === NOT_PENDING) {
				e.Ae = !e.T?.F;
				if (!t || C !== null) globalQueue.enqueue(n, e.W ??= GlobalQueue.K.bind(null, e), C);
			}
			if (!t && C === null && e.l & 8192 && laneOutcomeHook(e, T, d));
			else if (d);
			else if (E) {
				if (C !== null) {
					if (n && e.ue === NOT_PENDING) e.Ie = T;
					else if (n || C.ke) e.ue = T;
					else e.T.v = T;
				} else if (t ? !((flushTransaction !== null || passTx !== null) && (A || creatorPass(f)?.R & 128)) : n && e.ue === NOT_PENDING) e.Ie = T;
				else {
					e.ue = T;
					if (t) {
						holdNode(e, flushTransaction ?? passTx);
						e.m |= 4;
						freshHook?.(e, !i && flushTransaction);
					}
				}
				if (e.o !== null) {
					insertSubs(e);
					if (C !== null) laneDirty(e, C);
				}
			} else if (e.Fe != S) for (let t = e.o; t !== null; t = t.t) insertIntoHeapHeight(t.u, dirtyQueue);
			if (!E && !e.T?.F) {
				if (r !== void 0) settleErroredDependents(e, r);
				if (_) {
					for (const t of _) if (t !== e) settlePendingSource(e, t);
				}
			}
			if (a && !(e.m & 5)) settlePendingSource(e);
		}
		if (t && C === null && A && e.m & 1) {
			const t = flushTransaction ?? passTx;
			if (t && !t.v && freshHook?.(e) !== 2) holdNode(e, t);
		}
		if (!e.T?.F && e.ue === NOT_PENDING && !(n && e.Ae)) {
			if (t || n === 3) trimStaleDeps(e);
			else heldTrim(e);
		}
		if (e.ue !== NOT_PENDING || e.T !== null && (e.T.Ue !== null || e.T.me !== null) || (e.m & 5) !== 0 && (!t || (e.m & 1) !== 0)) {
			e.l |= 128;
			if (C === null) queuePendingNode(e);
		}
		setPassLane(E);
		if (c) {
			enqueueSub(e);
			schedule();
		}
	}
	function updateIfNecessary(e) {
		if (e.R & 68) return;
		if (e.R & 1) for (let t = e.C; t; t = t.G) {
			const n = t.S;
			if (n.X) updateIfNecessary(n);
			if (e.R & 2) break;
		}
		if (e.R & 2 || e.T?.F && e.ie < clock && !e.T?.Se) recompute(e);
		e.R = e.R & (376 | REACTIVE_MANUAL_WRITE | REACTIVE_FRAME_READ | REACTIVE_STAGED_READ | REACTIVE_LANE_READ | REACTIVE_SCREEN_READ | REACTIVE_PROBE_UNANSWERED);
	}
	function computed(e, t) {
		const n = t?.transparent ?? false;
		const o = t !== null && typeof t === "object" && "loadingValue" in t;
		const E = {
			id: inheritId(t, n, context),
			l: (n ? 4 : 0) | (t?.ownedWrite ? 1 : 0) | (!context || t?.lazy ? 32 : 0) | (t?.sync ? 64 : 0) | (t?.le ? 2 : 0) | (t?.Le ?? 0) | (snapshotCaptureActive && ownerInSnapshotScope(context) ? 8 : 0),
			xe: t?.equals ?? isEqual,
			He: null,
			A: context?.A ?? defaultContext,
			ye: 0,
			X: e,
			Ie: o ? t.loadingValue : void 0,
			Fe: 0,
			be: void 0,
			We: null,
			C: null,
			_: null,
			Ne: 0,
			o: null,
			ve: null,
			_parent: context,
			pe: null,
			Ze: null,
			De: null,
			R: t?.lazy ? 512 : 0,
			m: o ? 0 : 4,
			ie: clock,
			ue: NOT_PENDING,
			Me: -1,
			ce: o,
			T: null
		};
		if (t?.unobserved) ext(E).we = t.unobserved;
		setupComputedNode(E, t);
		return E;
	}
	/** Lazily allocate a node's cold extension (ONE shape for signals and
	* computeds — `_x` access stays monomorphic). Installers write through
	* this; hot paths read `el._x?._field` gated by the _config presence bits.
	* Never call ext() just to store a field's default. */ function ext(e) {
		return e.T ??= {
			Se: null,
			ae: null,
			F: void 0,
			se: void 0,
			fe: void 0,
			we: void 0,
			Pe: void 0,
			Ue: null,
			me: null,
			Re: null,
			Ve: false,
			je: NOT_PENDING,
			Be: -1,
			Ee: 0,
			v: NOT_PENDING,
			I: 0,
			de: void 0
		};
	}
	/** A tracked read of a held node (the reader derives from its transaction's
	* world): the reading pass is marked as having read it (born-held decision
	* in `recompute`), and the flush joins the node's transaction — unless the
	* reader is a render effect. A render effect is the frame, not a derivation
	* (rule 3): in that transaction's own flush, or born into it (uninitialized,
	* A29), it reads the staged value and holds nothing of its own; otherwise it
	* reads the committed value instead (`frameRead`). A node born into the
	* future has no committed value: every reader joins it. A first pass is
	* something not ready under a loading boundary that has not shown content:
	* the boundary collects it and shows its fallback, and the pass is the
	* boundary's, not the tick's (A29's boundary exemption, #3540). */ function joinPass(e, t) {
		e.R |= 128;
		if (t.m & 4 || e.i !== 1) joinPassTx(txOf(t), !e.i && e.m & 4 || freshHook?.(e));
	}
	/** A15's stale reader (shared-hole and reveal corollaries): a render effect
	* reading a node held by a transaction that is not the flush's. It is served
	* the committed value — a pending one's too — publishes mainline, and is
	* re-derived after that transaction's landing (`_reruns`,
	* REACTIVE_FRAME_READ) so the frame catches up with it once it is the
	* committed world. Not a frame born into that transaction (held and never
	* committed — created by one of its held passes, A29; `bornInto`): that
	* one reads its transaction's values and keeps staging. Not of a flight
	* whose inputs are already visible (CONFIG_INPUTS_PUBLISHED, #3305): its
	* committed value would tear against them, so the reveal observes the
	* flight instead. Once per pass.
	*
	* Lane work is a stale reader too (maintainer, 2026-10-01: a lane sees the
	* screen plus its own guesses). A held write is held because showing it
	* would tear against the rest of its frame; a lane revealing a derivation
	* of it would show it anyway, beside inputs still committed elsewhere on
	* the page. The guess is the one value the user opted into predicting. So
	* a lane pass reading a transaction's held node — its parent's or any
	* other's — derives from the committed value and is re-derived at that
	* landing. The case read-through was built for — a corrected guess whose
	* downstream async must refetch with the truth at once, while another of
	* the parent's flights is still up — needs none of this: the correction
	* dissolves the lane, and the refetching pass is the parent's own, reading
	* the truth as a member (`joinPass`). */ function frameRead(e, t) {
		const n = observeFlightHook && e.l & 32768;
		const o = laneStageHook && passLane !== null;
		if ((!o || e.m & 4 && t.m & 1) && !n && (e.i !== 1 || t.l & 1024)) return false;
		const E = txOf(t);
		if (E === flushTransaction && !o && !n || bornInto(e, E)) return false;
		staleReader(e, E);
		return true;
	}
	/** A node born into transaction `t`: held by it and never committed (A29,
	* ruling A) — uninitialized (born held), or a member of the frame one of its
	* held passes built (CONFIG_HELD_FRAME). Its branch exists only in `t`: it
	* has no screen to read, so it reads `t`'s values, whichever flush runs it,
	* and keeps staging (#4010). */ function bornInto(e, t) {
		return (e.m & 4 || e.l & 1048576) && e.l & 256 && txOf(e) === t;
	}
	/** The computed whose pass a creation under `owner` belongs to (a root's is
	* its nearest computed ancestor's), or null outside every pass. */ function creatorPass(e) {
		return e !== null && e.Qe ? e.Ye : e;
	}
	/** L2 — park the previous pass's frame for this node's commit: the children
	* (already allocated — nothing new) and the `_disposal` list move to the
	* extension, keep reacting from the heap, and die when the commit publishes
	* the frame that replaces them (`commitPendingNode`) or when the owner does. */ function parkChildren(e) {
		markDisposal(e);
		const t = ext(e);
		t.me = e.He;
		t.Ue = e.De;
		e.He = null;
		e.De = null;
		e.ye = 0;
	}
	/**
	* Build an Effect node with all effect-specific fields baked into a single object literal,
	* so V8 sees the full hidden class shape at construction time. Effects always run in lazy
	* mode (recompute is called explicitly by `effect()`), so we hardcode the lazy bits and skip
	* the auto-dispose CONFIG bit (effect() previously cleared it post-construction).
	*/ function createEffectNode(e, t, n, o, E) {
		const s = E?.transparent ?? false;
		const i = {
			id: inheritId(E, s, context),
			l: (s ? 4 : 0) | (E?.ownedWrite ? 1 : 0) | (E?.sync ? 64 : 0) | (E?.Le ?? 0) | (snapshotCaptureActive && ownerInSnapshotScope(context) ? 8 : 0),
			xe: false,
			He: null,
			A: context?.A ?? defaultContext,
			ye: 0,
			X: e,
			Ie: void 0,
			Fe: 0,
			be: void 0,
			We: null,
			C: null,
			_: null,
			Ne: 0,
			o: null,
			ve: null,
			_parent: context,
			pe: null,
			Ze: null,
			De: null,
			R: 512,
			m: 4,
			ie: clock,
			ue: NOT_PENDING,
			Me: -1,
			ce: false,
			Ae: false,
			ge: void 0,
			Ke: t,
			qe: n,
			Je: void 0,
			i: o,
			T: null
		};
		if (E?.unobserved) ext(i).we = E.unobserved;
		setupComputedNode(i, lazyOptions);
		return i;
	}
	/**
	* The shared status notifier for effect nodes, installed once by effect.ts
	* at module evaluation (`this`-dispatched — one function serves every
	* effect, so nodes never store it). CARVE 4: the boundaries' per-node
	* channel (`_x._notifyStatus`) went with them; effects are the only
	* display consumers.
	*/ var effectStatusNotify = null;
	function setEffectStatusNotify(e) {
		effectStatusNotify = e;
	}
	/** Resolve a node's status notifier: effect nodes (`_type` — EFFECT_PURE is
	* 0, and only effect literals carry the field) get the shared notifier.
	* Presence doubles as the "display consumer" membership test in the status
	* walks, exactly as the per-node field did when every effect carried one. */ function statusNotifierOf(e) {
		return e.i ? effectStatusNotify : null;
	}
	var lazyOptions = { lazy: true };
	function setupComputedNode(e, t) {
		e.We = e;
		const n = context?.Qe ? context.Ye : context;
		if (context) linkChild(context, e);
		if (n) e.Fe = n.Fe + 1;
		wireExternalSourceHook?.(e);
		!t?.lazy && recompute(e, true);
		if (snapshotCaptureActive && !t?.lazy) {
			if (!(e.m & 1) && !(e.l & 2)) {
				ext(e).Pe = e.Ie === void 0 ? NO_SNAPSHOT : e.Ie;
				e.l |= 512;
				snapshotSources.add(e);
			}
		}
	}
	function signal(e, t) {
		const n = {
			xe: t?.equals ?? isEqual,
			l: (t?.ownedWrite ? 1 : 0) | (t?.le ? 2 : 0),
			Ie: e,
			o: null,
			ve: null,
			ie: clock,
			ue: NOT_PENDING,
			Me: -1,
			T: null
		};
		if (t?.unobserved) ext(n).we = t.unobserved;
		if (snapshotCaptureActive && !(n.l & 2)) {
			ext(n).Pe = e === void 0 ? NO_SNAPSHOT : e;
			n.l |= 512;
			snapshotSources.add(n);
		}
		return n;
	}
	function isEqual(e, t) {
		return e === t;
	}
	/**
	* When set to a component name string, any reactive read that is not inside a nested tracking
	* scope will log a dev-mode warning. Managed automatically by `untrack(fn, strictReadLabel)`.
	*/
	/** The verdict windows' read (verdict.ts), installed while a `latest` or
	* `isPending` window is open and null otherwise: `read` dispatches to it
	* then, and a program that never imports them never has one. */ var verdict = null;
	/**
	* Runs `fn` outside of any reactive tracking — reads inside `fn` will not
	* subscribe the current scope. Returns whatever `fn` returns.
	*
	* Use `untrack` inside a memo or effect when you need to read a signal once
	* without making the surrounding computation depend on its future changes.
	*
	* `untrack` stops dependency tracking, not async settlement. Reading an
	* uninitialized async source still suspends the owning computation; it runs
	* again when that source first resolves. Afterward, the untracked read is a
	* snapshot and does not subscribe the computation to later changes.
	*
	* If the first read must return immediately, give the async source a
	* `loadingValue` before reading it with `untrack`. `isPending` and `latest`
	* inspect updates to an existing value; neither supplies a missing initial
	* value.
	*
	* Pass a `strictReadLabel` string to enable a dev-mode warning: any reactive
	* read inside `fn` that isn't inside a nested tracking scope will log a
	* warning naming the label.
	*
	* @example
	* ```ts
	* createEffect(
	*   () => trigger(),                 // tracks `trigger` only
	*   () => {
	*     const snapshot = untrack(() => state); // read once, untracked
	*     log(snapshot);
	*   }
	* );
	*
	* const color = createMemo<string>(() => fetchColor(), { loadingValue: "gray" });
	* const initialColor = untrack(color); // "gray" while the fetch is unresolved
	* ```
	*/ function untrack(e, t) {
		const n = tracking;
		tracking = false;
		try {
			if (externalUntrackHook) return externalUntrackHook(e);
			return e();
		} finally {
			tracking = n;
		}
	}
	/**
	* Bring a computed to a readable state: lazy/disposed nodes are (re)computed;
	* `refresh` additionally pulls the node fully up to date so its status flags
	* reflect the current graph.
	*/ function prepareComputed(e, t) {
		if (e.R & 512) {
			e.R &= -513;
			recompute(e, true);
		} else if (e.R & 64) {
			if (e.l & 32) {
				const t = e._parent;
				if (t !== null) {
					if (t.R & 64) {
						e.l &= -33;
						return;
					}
					if (!(e.R & 32)) linkChild(t, e);
				}
				recompute(e, true);
			}
		}
	}
	/**
	* Rule 1 (value selection): does this reader see a STAGED node's COMMITTED
	* value? One implementation of the rule the fast paths (read's fast block)
	* carry as their trivial ternary. In order:
	* - no reader at all (an untracked read) — the committed frame;
	* - nothing staged;
	* - a children-forbidden reader (createTrackedEffect / onSettled: the frame,
	*   never the graph — A32).
	* False means the reader derives from the staged value.
	*/ function readerSeesCommitted(e, t) {
		return !t || e.ue === NOT_PENDING || t.l & 16;
	}
	/** A28 — set when a node is staged (queuePendingNode) OUTSIDE a flush;
	* cleared when the next flush begins. The read sites test this one module
	* boolean instead of `globalQueue._running`: inside a flush it is false and
	* the A28 arm costs nothing; outside, only a tick with unflushed writes pays
	* the staged-node check. */ var unflushedStaged = false;
	function markUnflushedStaged() {
		unflushedStaged = true;
	}
	/** A28 — a write becomes visible at flush. Outside a flush, a node holding a
	* staged value was written since the last flush: staging commits at flush
	* end, so nothing else leaves a node in this state. Inside a flush the rule
	* does not apply (A28 (4): promoted within the round). The value an
	* unflushed node serves is its committed value, or NOT_PENDING when nothing
	* is unflushed. Exempt: promoted writes (A28 (4): a write issued inside a
	* recompute is promoted at that recompute's end — boundary and loading
	* machinery, signals declared for in-computation writes). */ function unflushedValue(e) {
		if (globalQueue.q || e.ue === NOT_PENDING || e.l & 4194304) return NOT_PENDING;
		if (e.l & 256) return e.T.Be === clock ? e.T.je : NOT_PENDING;
		return e.Ie;
	}
	/** A28: a held node rewritten outside a flush keeps the staging the last
	* flush left (`_flushed`) until the flush that carries the rewrite — the
	* stash is stamped with the clock, which that flush advances. */ function stashFlushed(e) {
		const t = e.T;
		if (t.Be !== clock) {
			t.je = e.ue;
			t.Be = clock;
			unflushedStaged = true;
		}
	}
	/** Nodes written inside a creation-time recompute (CONFIG_PROMOTED). */ var promotedWrites = [];
	/** A derivation served the committed value because of an unflushed write
	* (A28) must run again in the flush that carries it — the late-linker case
	* (#3337's reason to defer the walk): it linked after the write walked. */ function markLateLinker(e) {
		e.R |= REACTIVE_MISSED_WAKE;
		return true;
	}
	function resyncUnflushedCompanions() {
		unflushedStaged = false;
		if (promotedWrites.length !== 0) {
			for (const e of promotedWrites) e.l &= ~CONFIG_PROMOTED;
			promotedWrites.length = 0;
		}
	}
	/** A tracked read's pull of a computed: bring it current when the flush has
	* reached its height (or the reader is a fresh-pull waiter), and sit the
	* reader above it. */ function pullComputed(e, t) {
		if (e.Fe >= dirtyQueue.Ge) {
			markNode(t);
			markHeap(dirtyQueue);
			updateIfNecessary(e);
		} else if (t.l & 65536) updateIfNecessary(e);
		const n = e.Fe;
		if (n >= t.Fe && e._parent !== t) t.Fe = n + 1;
	}
	function read(e) {
		let t = context;
		if (t?.Qe) t = t.Ye;
		const n = e;
		const o = e;
		if (typeof n.X === "function") prepareComputed(e);
		if (verdict !== null) return verdict(e, t);
		if (!n.X && e.T?.Pe === void 0 && !snapshotCaptureActive && (!unflushedStaged || e.ue === NOT_PENDING) && !(e.l & 2048) && true) {
			if (t) {
				if (tracking) link(e, t);
				if (e.l & 256 && !(t.l & 16)) {
					if (frameRead(t, e)) return e.Ie;
					joinPass(t, e);
				}
			}
			if (!t || e.ue === NOT_PENDING || t.l & 16) return e.Ie;
			if ((observeFlightHook && t.l & 32768 || laneStageHook && passLane?.folded) && stagedScreen(t)) return e.Ie;
			stagedRead(t);
			return e.ue;
		}
		let E = false;
		if (t) {
			if (tracking) {
				link(e, t);
				if (o.X) {
					pullComputed(o, t);
					if (!t.i) t.R |= o.l & CONFIG_VERDICT;
				}
			}
			if (e.l & 256 && !(e.l & 2048) && !(t.l & 16)) {
				if (o.m & 4 || !frameRead(t, e)) joinPass(t, e);
				else E = true;
			}
		}
		if (laneReadHook && e.l & 2048) {
			const n = laneReadHook(t, e);
			if (n !== NOT_PENDING) return n;
		}
		if (o.m & 1 && !E && !(e.l & 2048) && !(o.m & 4)) {
			if (laneStageHook && passLane !== null && !(t?.m & 4)) E = true;
			else if (observeFlightHook && t !== null && t.l & 32768) E = observeFlightHook(t, o);
		}
		if (o.m & 1 && !E) {
			if (t) {
				if (!(t.l & 16) || o.m & 4) {
					if (!tracking && e !== t) link(e, t);
					throw o.T?.F;
				}
			} else if (o.m & 4) throw o.T?.F;
		}
		if (o.X && o.m & 2) {
			if (tracking && o.ie < clock) {
				recompute(o);
				return read(e);
			} else throw o.T?.F;
		}
		if (snapshotCaptureActive && t && t.l & 8) {
			const n = e.T?.Pe;
			if (n !== void 0) {
				const o = n === NO_SNAPSHOT ? void 0 : n;
				if ((e.ue !== NOT_PENDING ? e.ue : e.Ie) !== o) t.R |= 256;
				return o;
			}
		}
		if (E) return e.Ie;
		if (!t && e.T?.de) throw e.T.de;
		const s = serve(e, t);
		if (!t && typeof n.X === "function" && e.l & 32 && !(o.m & 1) && !e.o) {
			dormantNodes.add(e);
			schedule();
		}
		return s;
	}
	/**
	* Rule 1, the one slow implementation (DESIGN-CONSOLIDATION move 3b, step
	* 6c): the value a reader `c` (null = untracked, no pass) is served from
	* `el`. Called by read()'s slow tail; the fast path (read's fast block) keeps
	* its trivial ternary by design (perf, see the doc). Arms, in order:
	* - a node born staged has nothing for an untracked reader (A19 exception 1);
	* - an unflushed write serves committed and re-runs the reader in the
	*   carrying flush (A28);
	* - readerSeesCommitted, else the staged value.
	*/ function serve(e, t) {
		if (e.ue !== NOT_PENDING && e.m & 4 && (!t || t.l & 16)) throw new NotReadyError(null);
		const n = t && unflushedStaged ? unflushedValue(e) : NOT_PENDING;
		if (n !== NOT_PENDING) {
			markLateLinker(t);
			return n;
		}
		if (readerSeesCommitted(e, t)) return e.Ie;
		if (observeFlightHook && t.l & 32768 && !(e.m & 4) && stagedScreen(t)) return e.Ie;
		stagedRead(t, e);
		if (e.l & 2097152) throw e.ue;
		return e.ue;
	}
	/** A pass read a staging of this flush: it derives from what the flush may
	* yet hold (REACTIVE_STAGED_READ — the seam decides). Lane work too (plan sec. 28, a
	* lane sees the screen plus its own guesses) — a folded lane's only before
	* the frame has a transaction (after, it reads the screen like a verdict
	* reader, `stagedScreen` — a list pass never pairs a held length with the
	* guess's rows, D-34): the staging is the screen if
	* the frame commits — one pass, the common case — and a held write if it
	* parks, which the seam repairs (`stagedReaders`): the pass re-derives on
	* the committed world and its lane's runs wait that round, so the held
	* write never shows through the lane. A verdict lane's work likewise: the
	* lane holds verdicts, not the frame's other stagings (#3851) — except a
	* verdict reader, which answered for itself (the lane seam, lanes.ts). Not
	* a read of a node born staged at all: it has no committed value to
	* re-derive on, and a re-run would read the same staging and re-queue every
	* round (#3969: nor does it make a later lane read a re-derive, `enterLane`). */ function stagedRead(e, t) {
		if (!(t?.m & 4)) {
			e.R |= REACTIVE_STAGED_READ;
			if (laneSeamsHook && passLane !== null) stagedReaders.push(e);
		}
	}
	/** A10 for a staged node: a verdict reader (the pass entered a window) that
	* also reads a frame's proposal plainly sees the screen — `[latest(q), q()]`
	* is `[b, a]` — once the frame has a transaction, and re-derives when it
	* lands: at this very seam if nothing holds it (the stale run is void,
	* #3322 — one run, on the committed world), or with the hold. Before any
	* transaction the answer is the seam's and the reader watches it
	* (verdict.ts). A node born into the future has no screen: its staging is
	* its only value (A29). Nor has a reader born into the flush's transaction
	* (`bornInto`, #4010): its branch exists only there. */ function stagedScreen(e) {
		if (flushTransaction === null || bornInto(e, flushTransaction)) return false;
		staleReader(e, flushTransaction);
		return true;
	}
	/** A28 (4) — written inside a recompute that runs OUTSIDE a flush (a
	* creation-time compute): promoted at that pass's end, visible to the rest of
	* the block. Cold: only contextual writes reach here. */ function notePromotedWrite(e) {
		if (globalQueue.q || e.l & 4194304) return;
		e.l |= CONFIG_PROMOTED;
		promotedWrites.push(e);
	}
	/** Cold half of setSignal's snapshot arm (see there), shared with a store
	* container's structural notify: first write during capture to a plain
	* signal without a live snapshot records the pre-write value. Only plain
	* user signals qualify. Computeds reach setSignal from an
	* async landing (asyncWrite), and a value arriving from async during the pass
	* REVEALS — the creation-time arm skips pending computeds for the same
	* reason. Firewall leaves belong to a projection whose compute is the tree's
	* own work, captured (or deliberately not) at creation. */ function captureWriteSnapshot(e, t) {
		if (e.l & 2 || e.X !== void 0 || e.T?.Pe !== void 0) return;
		ext(e).Pe = t === void 0 ? NO_SNAPSHOT : t;
		e.l |= 512;
		snapshotSources.add(e);
	}
	/**
	* A callback run before every signal or store write lands, while set, with
	* the written signal or the store proxy whose setter runs. The
	* server-components client sets it while slot occurrences are left
	* unmounted after hydration (deferred hydration): a write may be one an
	* unmounted component would have observed, so the client mounts what is
	* left before the write applies, and clears the hook. `null` otherwise.
	*/ var writeHook = null;
	/**
	* `el`'s comparator verdict (`_equals`), the one guarded call for recompute,
	* setSignal (user setters and async landings) and the seam's
	* staged-equals-committed check.
	* - A comparator that read an unresolved async source has not shown the
	*   values equal (#4111): falsy, a change, whose readers suspend in their own
	*   tracked context.
	* - Any other throw is an error of `el`'s computation (A3, #2837): routed
	*   through the status path so error boundaries contain it, instead of
	*   unwinding a flush or a setter; answered "same" so nothing commits.
	* @internal
	*/ function isSame(e, t, n) {
		if (e.xe === isEqual) return t === n;
		try {
			return e.xe && e.xe(t, n);
		} catch (t) {
			if (!(t instanceof NotReadyError)) return notifyStatus(e, 2, t), true;
		}
	}
	function setSignal(e, t) {
		if (writeHook !== null) writeHook(e);
		const n = e.ue === NOT_PENDING ? e.Ie : e.ue;
		if (typeof t === "function") t = t(n);
		if (laneWriteHook && e.l & 2048) return laneWriteHook(e, t);
		if (e.l & 256) joinFuture(txOf(e));
		if (!(!!(e.m & 4) || !!e.T?.de || !isSame(e, n, t))) return t;
		if (snapshotCaptureActive) captureWriteSnapshot(e, n);
		const E = e.ue !== NOT_PENDING;
		if (!E) queuePendingNode(e);
		else if (e.l & 256 && !globalQueue.q) stashFlushed(e);
		e.ue = t;
		if (context !== null) notePromotedWrite(e);
		if (e.X !== void 0) e.ie = clock;
		if (E && e.Me === notifyEpoch) return t;
		insertSubs(e);
		schedule();
		return t;
	}
	/**
	* User-facing setter for the memo form of `createSignal(fn)`. A write applies
	* first, then derivations re-run (A34 as amended 2026-10-01, rule B; core
	* R31): the write stages like any other, and a source change — in this flush
	* or a later one, under a hold or on mainline — re-derives with the staged
	* write as `prev`. The write never refuses the re-run (the frame-scoped mask
	* of #3733/#3740 and #2692's "write wins the tick" before it are gone; call
	* order inside a flush was never observable) and on its own never causes one.
	* REACTIVE_MANUAL_WRITE only marks the staging as a user proposal — the A34
	* (1)/(3) discriminator — until a pass re-derives it or the commit lands it.
	*/ function setMemo(e, t) {
		const n = e.l & 256 && !(e.R & 1024) && txOf(e) !== flushTransaction;
		if (n && typeof t === "function") {
			const n = t(e.Ie);
			t = () => n;
		}
		if (e.m & 2) {
			e.T.de = e.T.F;
			notifyStatus(e, 0, void 0);
		}
		t = setSignal(e, t);
		e.l &= ~CONFIG_STAGED_ERROR;
		if (n) {
			e.R = e.R & -2 | 2;
			insertIntoHeap(e, dirtyQueue);
			schedule();
		} else if (e.ue !== NOT_PENDING) e.R |= REACTIVE_MANUAL_WRITE;
		return t;
	}
	/**
	* Executes `fn` with the given `owner` set as the current owner. Any reactive
	* primitives (`createSignal`, `createMemo`, `createEffect`, `onCleanup`,
	* `cleanup`, etc.) created inside `fn` are attached to that owner, so they
	* are disposed when the owner is disposed.
	*
	* The classic pattern: capture the current owner with `getOwner()` inside a
	* component, then re-enter it from a callback (event handler, async resolve,
	* setTimeout) so disposables created in the callback get cleaned up with the
	* component.
	*
	* @example
	* ```ts
	* function delayed<T>(ms: number, fn: () => T) {
	*   const owner = getOwner();
	*   setTimeout(() => runWithOwner(owner, fn), ms);
	* }
	* ```
	*/ function runWithOwner(e, t) {
		const n = context;
		const o = tracking;
		context = e;
		tracking = false;
		try {
			return t();
		} finally {
			context = n;
			tracking = o;
		}
	}
	// node_modules/@solidjs/signals/dist/prod/core/identities.js
	/**
	* @internal Called with every plain signal `createSignal` makes, and every
	* plain store root `createStore` makes, while set (the namer above). Never
	* set unless `setSignalIdentities` is imported, so a bundle without it keeps
	* only a null check.
	*/ var signalHook = null;
	// node_modules/@solidjs/signals/dist/prod/core/effect.js
	/**
	* Effects are the leaf nodes of our reactive graph. When their sources change, they are
	* automatically added to the queue of effects to re-execute, which will cause them to fetch their
	* sources and recompute
	*/ function effect$1(t, e, E, u) {
		const f = createEffectNode(t, e, E, !!u?.user ? 2 : 1, u);
		recompute(f, true);
		!u?.defer && f.ue === NOT_PENDING && !f.T?.Re?.v && (f.i === 2 || u?.schedule ? globalQueue.enqueue(f.i, runEffect.bind(null, f)) : runEffect(f, f.i));
	}
	function notifyEffectStatus() {
		const t = this.m;
		const e = this.T?.F;
		if (t & 2) {
			globalQueue.notify(this, 1, 0);
			if (this.i === 2) {
				if (this.m & 2) {
					this.Ae = true;
					globalQueue.enqueue(this.i, this.W ??= runEffect.bind(null, this));
				}
				return;
			}
			escalate(this, unwrapStatusError(e), e, this);
		} else if (this.i === 1) globalQueue.notify(this, 3, t, e);
	}
	/** An effect's error no boundary takes halts the system (boundary-or-halt):
	* halted with `cause`, `thrown` rethrown; dev locates it at `subject`. */ function escalate(t, e, E = e, u = t) {
		if (!globalQueue.notify(t, 2, 2)) {
			haltReactivity(e);
			throw E;
		}
	}
	function runEffect(t, e) {
		if (!t.Ae || t.R & 64) return;
		if (heldRunHook?.(t)) return;
		if (t.m & 2 && t.i === 2) {
			const e = unwrapStatusError(t.T?.F);
			t.ge = t.Ie;
			t.Ae = false;
			try {
				t.qe ? t.qe(e, () => {
					const e = t.Je;
					t.Je = void 0;
					e?.();
				}) : console.error(e);
			} catch (e) {
				escalate(t, e);
			}
			return;
		}
		const E = t.T?.F == null;
		const u = t.Je;
		t.Je = void 0;
		try {
			u?.();
			t.Je = t.Ke(t.Ie, t.ge);
		} catch (e) {
			ext(t).F = new StatusError(t, e);
			t.m |= 2;
			escalate(t, e);
		} finally {
			t.ge = t.Ie;
			t.Ae = false;
			if (E) trimStaleDeps(t);
		}
	}
	GlobalQueue.K = runEffect;
	setEffectStatusNotify(notifyEffectStatus);
	// node_modules/@solidjs/signals/dist/prod/store/types.js
	/** Brand keys the proxy answers directly (never user data). */
	var $TRACK = Symbol(0);
	var $PROXY = Symbol(0);
	// node_modules/@solidjs/signals/dist/prod/signals.js
	/**
	* Low-level reactive-cleanup primitive. Registers a callback that runs when
	* the surrounding owner is disposed.
	*
	* **In 2.0 user code this is rare.** The two cases where you might reach for
	* it have better-shaped tools:
	*
	* - **Component lifecycle (mount/unmount, listeners, intervals):** use
	*   {@link onSettled} and **return** a cleanup function. Setup and teardown
	*   stay paired in one block. This replaces the 1.x `onMount` + `onCleanup`
	*   pairing.
	* - **Cleanup tied to an effect run:** `onCleanup` does not belong in
	*   `createEffect`'s apply phase. If a compute phase genuinely needs per-run
	*   teardown, that's usually a sign the work should be a memo/projection
	*   instead, or moved to `onSettled` if it's lifecycle-shaped.
	*
	* Where `onCleanup` is the right tool is **library / custom-primitive
	* internals** — coordinating disposal inside a `createRoot` body, or wiring
	* cleanup to a captured owner via `runWithOwner` from a custom factory.
	* Application code rarely needs to write any of those shapes directly.
	*
	* Must be called inside an owner. Calling outside an owner is a no-op (with a
	* dev-mode warning).
	*
	* Cannot be used inside `createTrackedEffect` or `onSettled` — return a
	* cleanup function from the callback body instead.
	*
	* Cleanups run in unwind order: an owner's children are disposed before its
	* own cleanups, and within one owner later registrations run before earlier
	* ones. In production a component body shares its enclosing owner, so
	* register cleanup before creating children when the order between them
	* matters.
	*
	* @example
	* ```ts
	* // Library shape: thread a resource's disposal into a *captured* owner
	* // from a factory that has no settle-phase setup of its own. `onSettled`
	* // would queue a callback we don't need; `onCleanup` is the leaner
	* // primitive when the only job is "register disposal on this owner".
	* function bindToOwner<T extends { dispose(): void }>(owner: Owner, resource: T): T {
	*   runWithOwner(owner, () => onCleanup(() => resource.dispose()));
	*   return resource;
	* }
	* ```
	*/ function onCleanup(e) {
		return cleanup(e);
	}
	function accessor(e) {
		const t = read.bind(null, e);
		t[$REFRESH] = e;
		return t;
	}
	function createSignal$1(e, t) {
		if (typeof e === "function") {
			const r = computed(e, t);
			r.l &= -33;
			return [accessor(r), setMemo.bind(null, r)];
		}
		const r = signal(e, t);
		if (signalHook !== null) signalHook(r);
		return [accessor(r), setSignal.bind(null, r)];
	}
	function createMemo$1(e, t) {
		return accessor(computed(e, t));
	}
	/**
	* Creates a reactive effect with **separate compute and effect phases**.
	*
	* - `compute(prev)` runs reactively — *put all reactive reads here*. The
	*   returned value is passed to `effect` and is also the new "previous" value
	*   for the next run.
	* - `effect(next, prev?)` runs imperatively (untracked) after the queue
	*   flushes. *Put DOM writes / fetch / logging / subscriptions here.* It may
	*   return a cleanup function which runs before the next effect or on
	*   disposal.
	*
	* Reactive reads inside `effect` will *not* re-trigger this effect — that's
	* intentional. If you need a single-phase tracked effect, use
	* `createTrackedEffect` (with the tradeoffs noted there).
	*
	* Pass an `EffectBundle` (`{ effect, error }`) instead of a plain function to
	* intercept **compute-phase** errors — errors thrown by `compute` or arriving
	* from upstream reactive sources (including async rejections), which your own
	* code has no frame to `try/catch`. The `error` handler is the error arm of
	* the effect phase: it runs on the same schedule and in the same imperative,
	* writable scope as `effect` (setting error state via signals is fine), and
	* only for *settled* errors — a transient error that recovers before the
	* effect phase runs `effect` with the recovered value instead, and a held
	* transition defers it exactly as it defers `effect`. Without an `error`
	* handler a compute-phase error is logged and the effect simply skips that
	* run — a non-render effect's reactivity failing does not crash the app.
	* Rethrowing from `error` escalates it to the nearest error boundary
	* (halting the system if none exists).
	*
	* The **effect phase is different**: it is your own imperative code, so handle
	* failures with `try/catch` where they occur. An uncaught effect-phase throw
	* is treated as an unhandled application error — caught by the nearest
	* `createErrorBoundary`/`<Errored>`, and permanently halting the reactive
	* system if there is none. It is *not* routed to the bundle's `error` handler.
	*
	* ```typescript
	* createEffect<T>(compute, effectFn | { effect, error }, options?: EffectOptions);
	* ```
	* @param compute a function that receives its previous value and returns a new value used to react on a computation
	* @param effectFn a function that receives the new value and is used to perform side effects (return a cleanup function), or an `EffectBundle` with `effect` and `error` handlers
	* @param options `EffectOptions` -- name, defer, schedule, transparent
	*
	* @example
	* ```ts
	* const [count, setCount] = createSignal(0);
	*
	* createEffect(
	*   () => count(),                  // compute: tracks `count`
	*   value => console.log(value)     // effect: side effect
	* );
	*
	* setCount(1); // logs 1 after the next flush
	* ```
	*
	* @example
	* ```ts
	* createEffect(
	*   () => userId(),
	*   id => {
	*     const ctrl = new AbortController();
	*     fetch(`/users/${id}`, { signal: ctrl.signal });
	*     return () => ctrl.abort(); // cleanup before next run / disposal
	*   }
	* );
	* ```
	*
	* @description https://v2.solidjs.com/reference/solid-js/reactivity/create-effect
	*/ function createEffect$1(e, t, r) {
		effect$1(e, t.effect || t, t.error, {
			user: true,
			...r
		});
	}
	/**
	* Creates a reactive computation that runs during the render phase as DOM elements
	* are created and updated but not necessarily connected.
	*
	* Same compute / effect split as `createEffect`, but scheduled inside the render
	* queue rather than after it. Reach for this only when authoring renderer
	* plumbing (custom DOM bindings, JSX-generated `insert()` / `spread()` calls).
	* App code should use `createEffect`.
	*
	* ```typescript
	* createRenderEffect<T>(compute, effectFn, options?: EffectOptions);
	* ```
	* @param compute a function that receives its previous value and returns a new value used to react on a computation
	* @param effectFn a function that receives the new value and is used to perform side effects
	* @param options `EffectOptions` -- name, defer, schedule, transparent
	*
	* @example
	* ```ts
	* // Custom directive: bind an element's textContent to a reactive source.
	* function bindText(el: HTMLElement, source: () => string) {
	*   createRenderEffect(
	*     () => source(),
	*     value => { el.textContent = value; }
	*   );
	* }
	* ```
	*
	* @description https://v2.solidjs.com/reference/solid-js/advanced/specialized-reactivity/create-render-effect
	*/ function createRenderEffect$1(e, t, r) {
		effect$1(e, t, void 0, r);
	}
	// node_modules/@solidjs/signals/dist/prod/map.js
	function mapArray(t, e, i) {
		const s = typeof i?.keyed === "function" ? i.keyed : void 0;
		const n = e.length > 1;
		const r = e;
		const o = {
			L: createOwner(),
			it: 0,
			st: t,
			ot: [],
			ft: r,
			ht: [],
			tn: [],
			ze: s,
			ct: s || i?.keyed === false ? [] : void 0,
			lt: n && i?.keyed !== false ? [] : void 0,
			ut: i?.keyed === false,
			H: i?.fallback
		};
		const f = computed(updateKeyedMap.bind(o), void 0);
		f.l &= -33;
		return accessor(f);
	}
	var pureOptions = { ownedWrite: true };
	function trySmallMove(t, e, i, s) {
		const n = t.ot;
		const r = t.it - 1;
		const o = [];
		const f = [];
		const h = [];
		let c = 256;
		let a = s;
		let l = s;
		let u = false;
		while (a <= r && l <= i - 1) {
			const t = n[a];
			const s = e[l];
			if (t === s) {
				if (!u) {
					h.push(a, l, 0);
					u = true;
				}
				h[h.length - 1]++;
				a++;
				l++;
				continue;
			}
			u = false;
			let d = -1;
			let w = Math.min(32 - o.length, r - a, c);
			for (let t = 1; t <= w; t++) if (n[a + t] === s) {
				d = t;
				break;
			}
			c -= d === -1 ? w : d;
			let p = -1;
			w = Math.min(32 - f.length, i - 1 - l, c);
			for (let i = 1; i <= w; i++) if (e[l + i] === t) {
				p = i;
				break;
			}
			c -= p === -1 ? w : p;
			if (d !== -1 && (p === -1 || d <= p)) {
				while (d-- > 0) o.push(a++);
				continue;
			}
			if (p !== -1) {
				while (p-- > 0) f.push(l++);
				continue;
			}
			if (c <= 0 || o.length === 32 || f.length === 32) return false;
			o.push(a++);
			f.push(l++);
		}
		for (; a <= r; a++) {
			if (o.length === 32) return false;
			o.push(a);
		}
		for (; l <= i - 1; l++) {
			if (f.length === 32) return false;
			f.push(l);
		}
		return commitSmallMove(t, e, i, o, f, h);
	}
	/** PHASE 2 of the small-move path, in its OWN function so that a pass which
	* only SCANS and bails (a full replace: the first structural pass of a page,
	* typically) compiles nothing but the scan — V8 parses and compiles lazily
	* per function, and cold `replace` measured +0.5 ms with both phases in one
	* body. Pairs displaced sources with destinations (an unmatched destination
	* is a replacement/insertion → general path), then commits: slice() the live
	* arrays, copy shifted runs, patch displaced pairs, dispose leftovers. */ function commitSmallMove(t, e, i, s, n, r) {
		const o = t.ot;
		let f;
		let h;
		let c;
		if (n.length !== 0) {
			c = new Array(s.length);
			for (h = 0; h < n.length; h++) {
				let t = -1;
				for (f = 0; f < s.length; f++) if (!c[f] && o[s[f]] === e[n[h]]) {
					t = f;
					break;
				}
				if (t === -1) return false;
				c[t] = true;
				n[h] = n[h] << 6 | t;
			}
		}
		if (s.length !== 0 || n.length !== 0) {
			const t = /* @__PURE__ */ new Set();
			for (f = 0; f < s.length; f++) t.add(o[s[f]]);
			for (h = 0; h < n.length; h++) t.add(e[n[h] >> 6]);
			for (let e = 0; e < r.length; e += 3) {
				const i = r[e];
				for (let s = 0, n = r[e + 2]; s < n; s++) if (t.has(o[i + s])) return false;
			}
		}
		const a = t.ht;
		const l = t.tn;
		const u = a.slice(0, i);
		const d = l.slice(0, i);
		for (let t = 0; t < r.length; t += 3) {
			const e = r[t];
			const i = r[t + 1];
			if (e !== i) for (let s = 0; s < r[t + 2]; s++) {
				u[i + s] = a[e + s];
				d[i + s] = l[e + s];
			}
		}
		for (h = 0; h < n.length; h++) {
			const t = n[h] >> 6;
			const e = s[n[h] & 63];
			u[t] = a[e];
			d[t] = l[e];
		}
		t.ht = u;
		t.tn = d;
		t.it = i;
		t.ot = e.slice(0);
		for (f = 0; f < s.length; f++) if (c === void 0 || !c[f]) l[s[f]].dispose();
		return true;
	}
	/** Stage a PURE REMOVAL without the key map: when the new window is the old
	* window with items dropped, in order (one-item removals, every-nth, the
	* table filters), a two-pointer walk lands every survivor in the window
	* stage with one key call per item and returns the leavers; a shape that is
	* not an ordered subsequence returns null with the node stage cleared, and
	* the map path below starts from scratch (it rewrites every window slot of
	* `temp` / `rows` / `indexes`, so only `tempNodes`' `!== undefined` probe
	* needs the reset). The stage arrays are scratch — nothing live is touched. */ function stageRemoval(t, e, i, s, n, r, o, f, h) {
		const c = t.ze;
		const a = t.ot;
		const l = t.tn;
		const u = [];
		let d = i;
		for (let w = i; w <= n; d++, w++) {
			const n = c ? c(e[w]) : e[w];
			while (d <= s && (c ? c(a[d]) : a[d]) !== n) u.push(l[d++]);
			if (d > s) {
				o.fill(void 0);
				return null;
			}
			r[w] = t.ht[d];
			o[w - i] = l[d];
			if (f) f[w - i] = t.ct[d];
			if (h) h[w - i] = t.lt[d];
		}
		for (; d <= s; d++) u.push(l[d]);
		return u;
	}
	/** Land a staged window into the live bookkeeping arrays in place: shift the
	* suffix by `dif` (a loop walked from the side that never overwrites an
	* unread slot), take the window from the stage, write survivors' row and
	* index signals. Its own function so the general path's body stays under
	* the JIT's optimization budget — the inlined commit measured ~10% slower on
	* full-window reorders (the small-move note has the same finding). */ function commitWindow(t, e, i, s, n, r, o, f, h) {
		const c = t.tn;
		const a = t.ct;
		const l = t.lt;
		const u = t.it;
		const d = i - u;
		let w, p;
		if (d > 0) {
			c.length = i;
			if (a) a.length = i;
			if (l) l.length = i;
			for (w = u - 1, p = i - 1; w > n; w--, p--) {
				c[p] = c[w];
				if (a) a[p] = a[w];
				if (l) l[p] = l[w];
			}
		} else if (d < 0) {
			for (w = n + 1, p = r + 1; w < u; w++, p++) {
				c[p] = c[w];
				if (a) a[p] = a[w];
				if (l) l[p] = l[w];
			}
			c.length = i;
			if (a) a.length = i;
			if (l) l.length = i;
		}
		for (p = s; p <= r; p++) {
			c[p] = o[p - s];
			if (a) setSignal(a[p] = f[p - s], e[p]);
			if (l) setSignal(l[p] = h[p - s], p);
		}
		for (p = r + 1; p < i; p++) {
			if (a) setSignal(a[p], e[p]);
			if (l && d !== 0) setSignal(l[p], p);
		}
	}
	function updateKeyedMap() {
		this.L.Ye = getOwner();
		const t = this.st() || [], e = t.length;
		t[$TRACK];
		runWithOwner(this.L, () => {
			let i, s, n, r, o, f = this.ct ? this.ut ? () => {
				r[n] = signal(t[s], pureOptions);
				return this.ft(accessor(r[n]), s);
			} : () => {
				r[n] = signal(t[s], pureOptions);
				o && (o[n] = signal(s, pureOptions));
				return this.ft(accessor(r[n]), o ? accessor(o[n]) : void 0);
			} : this.lt ? () => {
				const e = t[s];
				o[n] = signal(s, pureOptions);
				return this.ft(e, accessor(o[n]));
			} : () => {
				const e = t[s];
				return this.ft(e);
			};
			if (e === 0) {
				if (this.it !== 0) {
					this.L.dispose(false);
					this.tn = [];
					this.ot = [];
					this.ht = [];
					this.it = 0;
					this.ct && (this.ct = []);
					this.lt && (this.lt = []);
				}
				if (this.H && !this.ht.length) {
					this.tn[0]?.dispose();
					this.ht[0] = runWithOwner(this.tn[0] = createOwner(), this.H);
				}
			} else if (this.it === 0) {
				const h = new Array(e);
				const c = new Array(e);
				r = this.ct && new Array(e);
				o = this.lt && new Array(e);
				try {
					for (s = 0; s < e; s++) {
						n = s;
						h[s] = runWithOwner(c[s] = createOwner(), f);
					}
				} catch (t) {
					for (i = 0; i <= s; i++) c[i]?.dispose();
					throw t;
				}
				if (this.tn[0]) this.tn[0].dispose();
				this.ht = h;
				this.tn = c;
				r && (this.ct = r);
				o && (this.lt = o);
				this.ot = t.slice(0);
				this.it = e;
			} else {
				let h, c, a, l, u, d, w, p, m;
				const y = setSignal;
				for (h = 0, c = Math.min(this.it, e); h < c && (this.ot[h] === t[h] || this.ct && compare(this.ze, this.ot[h], t[h])); h++) if (this.ct) y(this.ct[h], t[h]);
				for (c = this.it - 1, a = e - 1; c >= h && a >= h && (this.ot[c] === t[a] || this.ct && compare(this.ze, this.ot[c], t[a])); c--, a--);
				if (h === e && this.it === e) {
					this.ot = t.slice(0);
					return;
				}
				if (e <= this.it && c - h > 64 && this.ct === void 0 && this.lt === void 0) {
					const i = h + (a - h >> 1);
					const s = t[i];
					const n = Math.min(c, i + 32);
					let r = Math.max(h, i - 32);
					while (r <= n && this.ot[r] !== s) r++;
					if (r <= n && trySmallMove(this, t, e, h)) return;
				}
				const g = e - this.it;
				const A = a - h + 1;
				const S = new Array(e);
				const M = new Array(A);
				r = this.ct ? new Array(A) : void 0;
				o = this.lt ? new Array(A) : void 0;
				const k = g < 0 ? stageRemoval(this, t, h, c, a, S, M, r, o) : null;
				if (k !== null) {
					if (k.length !== 0) p = k;
				} else {
					d = /* @__PURE__ */ new Map();
					w = new Array(A);
					for (s = a; s >= h; s--) {
						l = t[s];
						u = this.ze ? this.ze(l) : l;
						i = d.get(u);
						w[s - h] = i === void 0 ? -1 : i;
						d.set(u, s);
					}
					for (i = h; i <= c; i++) {
						l = this.ot[i];
						u = this.ze ? this.ze(l) : l;
						s = d.get(u);
						if (s !== void 0 && s !== -1) {
							S[s] = this.ht[i];
							M[s - h] = this.tn[i];
							r && (r[s - h] = this.ct[i]);
							o && (o[s - h] = this.lt[i]);
							s = w[s - h];
							d.set(u, s);
						} else (p ??= []).push(this.tn[i]);
					}
					try {
						for (s = h; s <= a; s++) {
							if (M[s - h] !== void 0) continue;
							(m ??= []).push(M[s - h] = createOwner());
							n = s - h;
							S[s] = runWithOwner(M[s - h], f);
						}
					} catch (t) {
						if (m) for (i = 0; i < m.length; i++) m[i].dispose();
						throw t;
					}
				}
				for (i = 0; i < h; i++) S[i] = this.ht[i];
				for (s = a + 1; s < e; s++) S[s] = this.ht[s - g];
				commitWindow(this, t, e, h, c, a, M, r, o);
				this.ht = S;
				this.it = e;
				this.ot = t.slice(0);
				if (p) for (i = 0; i < p.length; i++) p[i].dispose();
			}
		});
		return this.ht;
	}
	function compare(t, e, i) {
		return t ? t(e) === t(i) : true;
	}
	// node_modules/@solidjs/signals/dist/prod/flatten.js
	/**
	* Resolves nested accessors and arrays in a children tree to their rendered
	* values. See the `children()` helper in solid-js for the memoized form.
	*/
	function flatten(r, t) {
		if (typeof r === "function" && !r.length) {
			if (t?.doNotUnwrap) return r;
			do
				r = r();
			while (typeof r === "function" && !r.length);
		}
		if (t?.skipNonRendered && (r == null || r === true || r === false || r === "")) return;
		if (Array.isArray(r)) {
			let e = [];
			if (flattenArray(r, e, t)) return () => {
				let r = [];
				flattenArray(e, r, {
					...t,
					doNotUnwrap: false
				});
				return r;
			};
			return e;
		}
		return r;
	}
	function flattenArray(r, t = [], e) {
		let o = null;
		let f = false;
		for (let n = 0; n < r.length; n++) try {
			let o = r[n];
			if (typeof o === "function" && !o.length) {
				if (e?.doNotUnwrap) {
					t.push(o);
					f = true;
					continue;
				}
				do
					o = o();
				while (typeof o === "function" && !o.length);
			}
			if (Array.isArray(o)) f = flattenArray(o, t, e) || f;
			else if (e?.skipNonRendered && (o == null || o === true || o === false || o === "")) {} else t.push(o);
		} catch (r) {
			if (!(r instanceof NotReadyError)) throw r;
			o = r;
		}
		if (o) throw o;
		return f;
	}
	// node_modules/solid-js/dist/solid.js
	var IS_DEV = false;
	var sharedConfig$1 = {
		hydrating: false,
		registry: void 0,
		done: false
	};
	var _createRoot;
	var _createMemo;
	var _createSignal;
	var _createRenderEffect;
	var _createEffect;
	var createMemo = (...args) => {
		return (_createMemo || createMemo$1)(...args);
	};
	var createSignal = (...args) => {
		return (_createSignal || createSignal$1)(...args);
	};
	var createRoot = (...args) => (_createRoot || createRoot$1)(...args);
	var createRenderEffect = (...args) => (_createRenderEffect || createRenderEffect$1)(...args);
	var createEffect = (...args) => (_createEffect || createEffect$1)(...args);
	function createComponent(Comp, props, name, loc) {
		return untrack(() => Comp(props || {}));
	}
	var narrowedError = (name) => `Stale read from <${name}>.`;
	function For(props) {
		const options = "fallback" in props ? {
			keyed: props.keyed,
			fallback: () => props.fallback
		} : { keyed: props.keyed };
		const owner = getOwner();
		let mapped;
		const create = () => runWithOwner(owner, () => mapArray(() => props.each, props.children, options));
		if (sharedConfig$1.hydrating) mapped = create();
		const list = () => (mapped ?? (mapped = create()))();
		return list;
	}
	function Show(props) {
		const keyed = props.keyed;
		const conditionValue = createMemo$1(() => props.when, void 0);
		const condition = keyed ? conditionValue : createMemo$1(conditionValue, {
			equals: (a, b) => !a === !b,
			sync: true
		});
		let shown = false;
		return createMemo$1(() => {
			const c = condition();
			shown = c;
			if (c) {
				const child = props.children;
				return typeof child === "function" && child.length > 0 ? keyed ? untrack(() => child(c), IS_DEV) : untrack(() => child(() => {
					if (!shown) throw narrowedError("Show");
					return conditionValue();
				}), IS_DEV) : child;
			}
			return props.fallback;
		}, { sync: true });
	}
	// node_modules/solid-js/dist/internal.js
	var sharedConfig = sharedConfig$1;
	// node_modules/@solidjs/web/dist/web.js
	var $$SLOT = /*#__PURE__*/ Symbol("slot");
	var $$HOST = /*#__PURE__*/ Symbol("host");
	var transparentOptions = {
		transparent: true,
		sync: true
	};
	var syncOptions = { sync: true };
	function effect(fn, effectFn, options) {
		createRenderEffect(fn, effectFn, options ? {
			sync: true,
			...options,
			transparent: !options.scope
		} : transparentOptions);
	}
	function memo(fn) {
		return createMemo(() => fn(), syncOptions);
	}
	function reconcileArrays(parentNode, a, b, marker) {
		const isLive = (n) => {
			if (!n) return false;
			const tag = n[$$SLOT];
			return n.parentNode === parentNode && (!tag || tag === marker);
		};
		let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, tail = a[aEnd - 1], after = isLive(tail) ? tail.nextSibling : marker || null, map = null, anchor, anchorTag;
		while (aStart < aEnd || bStart < bEnd) {
			if (a[aStart] === b[bStart]) {
				aStart++;
				bStart++;
				continue;
			}
			while (aEnd > aStart && bEnd > bStart && a[aEnd - 1] === b[bEnd - 1]) {
				aEnd--;
				bEnd--;
			}
			if (aEnd === aStart) {
				let node;
				if (bEnd < bLength) {
					if (bStart && isLive(node = b[bStart - 1])) node = node.nextSibling;
					else {
						let k = bEnd;
						while (k < bLength && !isLive(b[k])) k++;
						node = k < bLength ? b[k] : after;
					}
				} else node = after;
				while (bStart < bEnd) {
					const n = b[bStart++];
					parentNode.insertBefore(n, node);
					if (marker) n[$$SLOT] = marker;
				}
			} else if (bEnd === bStart) while (aStart < aEnd) {
				const n = a[aStart++];
				if ((!map || !map.has(n)) && isLive(n)) n.remove();
			}
			else if ((anchor = a[aStart]) === b[bEnd - 1] && b[bStart] === a[aEnd - 1] && anchor.parentNode === parentNode && (!(anchorTag = anchor[$$SLOT]) || anchorTag === marker)) {
				if (marker) do {
					const n = a[--aEnd];
					parentNode.insertBefore(n, anchor);
					n[$$SLOT] = marker;
					bStart++;
					if (aStart >= aEnd - 1 || bStart >= bEnd) break;
				} while (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]);
				else do {
					parentNode.insertBefore(a[--aEnd], anchor);
					bStart++;
					if (aStart >= aEnd - 1 || bStart >= bEnd) break;
				} while (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]);
			} else {
				if (!isLive(a[aStart])) {
					aStart++;
					continue;
				}
				if (!map) {
					map = /* @__PURE__ */ new Map();
					let i = bStart;
					while (i < bEnd) map.set(b[i], i++);
				}
				const index = map.get(a[aStart]);
				if (index != null) {
					if (bStart < index && index < bEnd) {
						let i = aStart, sequence = 1, t;
						while (++i < aEnd && i < bEnd) {
							if ((t = map.get(a[i])) == null || t !== index + sequence) break;
							sequence++;
						}
						if (sequence > index - bStart) {
							const node = a[aStart];
							while (bStart < index) {
								const n = b[bStart++];
								parentNode.insertBefore(n, node);
								if (marker) n[$$SLOT] = marker;
							}
						} else {
							const newNode = b[bStart++];
							parentNode.replaceChild(newNode, a[aStart++]);
							if (marker) newNode[$$SLOT] = marker;
						}
					} else aStart++;
				} else a[aStart++].remove();
			}
		}
	}
	var EVENT_KEY = "_$$";
	var $$EVENT_OWNER = "_$SOLID_EVENT_OWNER";
	var INNER_OWNED = {};
	var delegatedEvents = /* @__PURE__ */ new Set();
	var delegatedContainers = /* @__PURE__ */ new Map();
	function render(code, element, init, options = {}) {
		let disposer;
		registerDelegatedRoot(element);
		try {
			createRoot((dispose) => {
				disposer = dispose;
				if (options.onError) getOwner()[ROOT_ERROR_HOOK] = options.onError;
				if (element === document) {
					const tree = code();
					effect(() => flatten(tree), () => {});
				} else {
					const tree = code();
					insert(element, () => tree, element.firstChild ? null : void 0, init, {
						...options.insertOptions,
						schedule: true
					});
				}
			}, { id: options.renderId });
			flush();
		} catch (err) {
			if (disposer) disposer();
			unregisterDelegatedRoot(element);
			throw err;
		}
		return () => {
			disposer();
			unregisterDelegatedRoot(element);
			element.textContent = "";
		};
	}
	function create(html, bypassGuard, flag) {
		const t = document.createElement("template");
		t.innerHTML = html;
		return flag === 2 ? t.content.firstChild.firstChild : t.content.firstChild;
	}
	function template(html, flag) {
		let node;
		return flag === 1 ? (bypassGuard) => document.importNode(node || (node = create(html, bypassGuard, flag)), true) : (bypassGuard) => (node || (node = create(html, bypassGuard, flag))).cloneNode(true);
	}
	function delegateEvents(eventNames) {
		for (let i = 0, l = eventNames.length; i < l; i++) {
			const name = eventNames[i];
			if (!delegatedEvents.has(name)) {
				delegatedEvents.add(name);
				delegatedContainers.forEach((state, container) => attachDelegatedEvent(name, container, state));
			}
		}
	}
	function registerDelegatedRoot(root) {
		const state = registerDelegatedContainer(root, root);
		if (state) state.roots = (state.roots || 0) + 1;
	}
	function unregisterDelegatedRoot(root) {
		const state = delegatedContainers.get(root);
		if (state) state.roots > 1 ? state.roots-- : delete state.roots;
		unregisterDelegatedContainer(root, root);
	}
	function registerDelegatedContainer(container, owner = container) {
		if (!container || !owner) return;
		let state = delegatedContainers.get(container);
		if (!state) delegatedContainers.set(container, state = {
			owners: /* @__PURE__ */ new Map(),
			handlers: /* @__PURE__ */ new Map()
		});
		state.owners.set(owner, (state.owners.get(owner) || 0) + 1);
		delegatedEvents.forEach((name) => attachDelegatedEvent(name, container, state));
		return state;
	}
	function unregisterDelegatedContainer(container, owner = container) {
		const state = delegatedContainers.get(container);
		if (!state) return;
		const count = state.owners.get(owner);
		if (count > 1) state.owners.set(owner, count - 1);
		else state.owners.delete(owner);
		if (state.owners.size) return;
		state.handlers.forEach((handler, name) => container.removeEventListener(name, handler));
		delegatedContainers.delete(container);
	}
	function attachDelegatedEvent(name, container, state) {
		if (state.handlers.has(name)) return;
		const handler = (e) => eventHandler(e, container, state);
		state.handlers.set(name, handler);
		container.addEventListener(name, handler);
	}
	function findOwner(target, state) {
		let node = target;
		let distance = 0;
		while (node) {
			if (state.owners.has(node)) return {
				owner: node,
				distance
			};
			distance++;
			node = node._$host || node.parentNode || node.host;
		}
	}
	var claimHandlers = null;
	var claimAttributeSets = [];
	function runClaimHandlers(handlers, node) {
		for (let i = 0; i < handlers.length; i++) handlers[i](node);
	}
	function reclaimAttribute(node, name) {
		if (claimHandlers !== null && node._$claimed && claimAttributeSets.some((set) => set.includes(name.slice(name.indexOf(":") + 1)))) runClaimHandlers(claimHandlers, node);
	}
	function setAttribute(node, name, value) {
		if (isHydrating(node)) return;
		const selectMultiple = name === "multiple" && node.localName === "select";
		if (value == null || value === false) node.removeAttribute(name);
		else {
			node.setAttribute(name, value === true ? "" : value);
			if (selectMultiple && !node._$multiple) {
				const options = node.options;
				for (let i = 0; i < options.length; i++) if (options[i].defaultSelected) options[i].selected = true;
			}
		}
		if (selectMultiple) node._$multiple = true;
		reclaimAttribute(node, name);
	}
	function className(node, value, prev) {
		if (typeof value === "number") value = "" + value;
		if (typeof prev === "number") prev = "" + prev;
		if (isHydrating(node)) {
			node._$classes = value && typeof value === "object" ? classListToObject(value) : void 0;
			return;
		}
		if (value == null || value === false) {
			if (prev || node._$classes) {
				node.removeAttribute("class");
				node._$classes = void 0;
			}
			return;
		}
		if (typeof value === "string") {
			node._$classes = void 0;
			value !== prev && node.setAttribute("class", value);
			return;
		}
		let applied;
		if (typeof prev === "string") {
			applied = {};
			node.removeAttribute("class");
		} else applied = node._$classes || classListToObject(prev || {});
		value = classListToObject(value);
		const classKeys = Object.keys(value);
		const prevKeys = Object.keys(applied);
		let i, len;
		for (i = 0, len = prevKeys.length; i < len; i++) {
			const key = prevKeys[i];
			if (!key || key === "undefined" || value[key]) continue;
			node.classList.remove(key);
		}
		for (i = 0, len = classKeys.length; i < len; i++) {
			const key = classKeys[i], classValue = !!value[key];
			if (!key || key === "undefined" || applied[key] === classValue || !classValue) continue;
			node.classList.add(key);
		}
		node._$classes = value;
	}
	function readShallow(value) {
		if (value === null || typeof value !== "object") return value;
		if (Array.isArray(value)) return value.map(readShallow);
		if (value[$PROXY] !== value) return value;
		const keys = Reflect.ownKeys(value);
		const out = {};
		for (let i = 0; i < keys.length; i++) {
			const k = keys[i];
			if (typeof k === "string") out[k] = value[k];
		}
		return out;
	}
	function setStyleProperty(node, name, value) {
		if (isHydrating(node)) return;
		value != null ? node.style.setProperty(name, value) : node.style.removeProperty(name);
	}
	function applyRef(r, element) {
		Array.isArray(r) ? r.flat(Infinity).forEach((f) => f && f(element)) : r(element);
	}
	function ref(fn, element) {
		const resolved = untrack(fn);
		runWithOwner(null, () => applyRef(resolved, element));
	}
	var SCOPE_OPTIONS = { scope: true };
	var hydrationRt = null;
	function insert(parent, accessor, marker, initial, options) {
		const multi = marker !== void 0;
		const host = options && options.host;
		if (multi && !initial) initial = [];
		if (hydrationRt !== null) initial = hydrationRt.claimInitial(parent, multi, initial);
		if (typeof accessor !== "function") {
			accessor = normalize(accessor, initial, multi, true);
			if (typeof accessor !== "function") {
				insertExpression(parent, accessor, initial, marker);
				host && tagHost(accessor, host);
				return;
			}
		}
		if (multi && initial.length === 0) {
			const placeholder = document.createTextNode("");
			parent.insertBefore(placeholder, marker);
			initial = [placeholder];
		}
		let current = initial;
		let ran = false;
		effect(() => {
			if (hydrationRt !== null) current = hydrationRt.reclaimRegion(current, parent, marker);
			const value = normalize(accessor(), current, multi, true);
			const again = ran;
			ran = true;
			if (typeof value !== "function") return value;
			effect(() => (hydrationRt !== null && (current = hydrationRt.reclaimRegion(current, parent, marker)), normalize(value, current, multi)), (inner) => {
				current = insertExpression(parent, inner, current, marker);
				host && tagHost(current, host);
			}, again && !(options && options.schedule) ? {
				...options,
				schedule: true
			} : options);
			return INNER_OWNED;
		}, (value) => {
			if (value === INNER_OWNED) return;
			current = insertExpression(parent, value, current, marker);
			host && tagHost(current, host);
		}, accessor.$s ? options ? {
			...options,
			scope: true
		} : SCOPE_OPTIONS : options);
	}
	function isHydrating(node) {
		if (!sharedConfig.hydrating) return false;
		if (sharedConfig.isClaiming && !sharedConfig.isClaiming()) return false;
		if (!node || node.isConnected) return true;
		return serverComponentClaims !== null && serverComponentClaims.claimed(node);
	}
	var serverComponentClaims = null;
	function classListToObject(classList) {
		if (Array.isArray(classList)) {
			const result = {};
			flattenClassList(classList, result);
			classList = result;
		}
		if (classList && typeof classList === "object") {
			const result = {}, keys = Object.keys(classList);
			for (let i = 0, len = keys.length; i < len; i++) {
				const key = keys[i];
				if (!classList[key]) continue;
				const classNames = key.trim().split(/\s+/);
				for (let j = 0, nameLen = classNames.length; j < nameLen; j++) classNames[j] && (result[classNames[j]] = true);
			}
			return result;
		}
		return classList;
	}
	function flattenClassList(list, result) {
		for (let i = 0, len = list.length; i < len; i++) {
			const item = list[i];
			if (Array.isArray(item)) flattenClassList(item, result);
			else if (typeof item === "object" && item != null) Object.assign(result, item);
			else if (typeof item !== "boolean" && (item || item === 0)) result[item] = true;
		}
	}
	function eventHandler(e, container, state) {
		if (hydrationRt !== null && hydrationRt.dedupEvent(e)) return;
		const prev = e[$$EVENT_OWNER];
		let resumeNode;
		if (prev) {
			if (prev === true || prev === container || !container.contains(prev)) return;
			resumeNode = prev;
		}
		const owner = state.owners.size === 1 && state.owners.has(container) ? container : findOwner(e.target, state)?.owner;
		if (!owner) return;
		if (owner === resumeNode) return;
		e[$$EVENT_OWNER] = owner;
		let node = resumeNode || e.target;
		const key = EVENT_KEY + e.type;
		const oriTarget = e.target;
		const retarget = (value) => Object.defineProperty(e, "target", {
			configurable: true,
			value
		});
		const handleNode = () => {
			const handler = node[key];
			if (handler && !node.disabled) {
				const data = node[`${key}Data`];
				data !== void 0 ? handler.call(node, data, e) : typeof handler === "function" ? handler.call(node, e) : handler.handleEvent(e);
				if (e.cancelBubble) return;
			}
			node.host && typeof node.host !== "string" && !node.host._$host && node.contains(e.target) && retarget(node.host);
			return true;
		};
		const walkUpTree = () => {
			while (node && handleNode()) {
				if (node === owner || node.parentNode === owner) break;
				node = node._$host || node.parentNode || node.host;
			}
		};
		Object.defineProperty(e, "currentTarget", {
			configurable: true,
			get() {
				return node || owner;
			}
		});
		if (resumeNode) {
			if (resumeNode === e.target) node = resumeNode._$host || resumeNode.parentNode || resumeNode.host;
			if (node && node !== owner) walkUpTree();
		} else if (e.composedPath) {
			const path = e.composedPath();
			if (path.length) {
				retarget(path[0]);
				for (let i = 0; i < path.length; i++) {
					node = path[i];
					if (!handleNode()) break;
					if (node._$host) {
						node = node._$host;
						walkUpTree();
						break;
					}
					if (node === owner || node.parentNode === owner) break;
				}
			} else walkUpTree();
		} else walkUpTree();
		retarget(oriTarget);
	}
	function insertExpression(parent, value, current, marker) {
		if (hydrationRt !== null && isHydrating(parent)) {
			if (value && value !== current) {
				const arr = Array.isArray(value);
				for (const n of arr ? value : [value]) if (n && n.nodeType) {
					if (!isHydrating(n)) return current;
				} else if (arr && (typeof n === "string" || typeof n === "number")) return current;
			}
			return value;
		}
		if (value === current) return value;
		if (hydrationRt !== null && sharedConfig.hydrating && value && value.length !== 0) {
			const tracked = [].concat(current ?? []);
			if ([].concat(value).every((n) => (n === tracked[0] && tracked.shift(), n?.parentNode === parent)) && !tracked.length) return value;
		}
		const t = typeof value, multi = marker !== void 0;
		if (t === "string" || t === "number") {
			const tc = typeof current;
			if (tc === "string" || tc === "number") parent.firstChild.data = value;
			else if (ownsAllChildren(parent, current)) parent.textContent = value;
			else {
				removeOwnedChildren(parent, current);
				parent.insertBefore(document.createTextNode(value), parent.firstChild);
			}
		} else if (value === void 0) cleanChildren(parent, current, marker);
		else if (value.nodeType) {
			if (Array.isArray(current)) cleanChildren(parent, current, multi ? marker : null, value);
			else if (current != null && current.nodeType) current.parentNode === parent ? parent.replaceChild(value, current) : parent.appendChild(value);
			else if (current != null && parent.firstChild) parent.replaceChild(value, parent.firstChild);
			else parent.appendChild(value);
			if (marker) value[$$SLOT] = marker;
		} else if (Array.isArray(value)) {
			const currentArray = Array.isArray(current);
			for (let i = 0, len = value.length; i < len; i++) {
				const item = value[i], t = typeof item;
				if (t === "string" || t === "number") {
					const prev = currentArray ? current[i] : void 0;
					if (prev && prev.nodeType === 3) {
						if (prev.data !== "" + item) prev.data = item;
						value[i] = prev;
					} else value[i] = document.createTextNode(item);
				}
			}
			if (value.length === 0) cleanChildren(parent, current, marker);
			else if (currentArray) {
				if (current.length === 0) appendNodes(parent, value, marker);
				else reconcileArrays(parent, current, value, marker);
			} else {
				if (current != null) cleanChildren(parent, current);
				appendNodes(parent, value);
			}
		}
		return value;
	}
	function normalize(value, current, multi, doNotUnwrap) {
		value = flatten(value, {
			skipNonRendered: true,
			doNotUnwrap
		});
		if (doNotUnwrap && typeof value === "function") return value;
		if (multi && !Array.isArray(value)) value = [value != null ? value : ""];
		if (hydrationRt !== null && sharedConfig.hydrating && Array.isArray(value)) for (let i = 0, len = value.length; i < len; i++) {
			const item = value[i], prev = current && current[i], t = typeof item;
			if ((t === "string" || t === "number") && prev && prev.nodeType === 3 && isHydrating(prev)) value[i] = prev;
		}
		return value;
	}
	function tagHost(value, host) {
		if (Array.isArray(value)) for (let i = 0, len = value.length; i < len; i++) tagHost(value[i], host);
		else if (value && value.nodeType && value[$$HOST] !== host) {
			value[$$HOST] = host;
			Object.defineProperty(value, "_$host", {
				get: host,
				configurable: true
			});
		}
	}
	function appendNodes(parent, array, marker = null) {
		for (let i = 0, len = array.length; i < len; i++) {
			const n = array[i];
			parent.insertBefore(n, marker);
			if (marker) n[$$SLOT] = marker;
		}
	}
	function ownsAllChildren(parent, current) {
		if (current == null) return true;
		if (Array.isArray(current)) return current.length ? parent.firstChild === current[0] && parent.lastChild === current[current.length - 1] : parent.firstChild === null;
		if (current === "") return parent.firstChild === null;
		if (current.nodeType) return parent.firstChild === current && parent.lastChild === current;
		const first = parent.firstChild;
		return first !== null && first.nodeType === 3 && parent.lastChild === first;
	}
	function removeOwnedChildren(parent, current) {
		if (Array.isArray(current)) for (let i = 0; i < current.length; i++) {
			const el = current[i];
			if (el.parentNode === parent) el.remove();
		}
		else if (current.nodeType) {
			if (current.parentNode === parent) current.remove();
		} else {
			const first = parent.firstChild;
			if (first && first.nodeType === 3) first.remove();
		}
	}
	function cleanChildren(parent, current, marker, replacement) {
		if (marker === void 0) {
			if (ownsAllChildren(parent, current)) return parent.textContent = "";
			return removeOwnedChildren(parent, current);
		}
		if (current.length) {
			let inserted = false;
			for (let i = current.length - 1; i >= 0; i--) {
				const el = current[i];
				if (replacement !== el) {
					const tag = el[$$SLOT];
					const owns = el.parentNode === parent && (!tag || tag === marker);
					if (replacement && !inserted && !i) owns ? parent.replaceChild(replacement, el) : parent.insertBefore(replacement, marker);
					else if (owns) el.remove();
				} else inserted = true;
			}
		} else if (replacement) parent.insertBefore(replacement, marker);
		if (replacement && marker) replacement[$$SLOT] = marker;
	}
	// node_modules/@openchamber/sdk/dist/api-version.js
	/** Wire envelope `v`. Guest postMessage and host pushes use this. */
	var OPENCHAMBER_SDK_CHANNEL = "openchamber.sdk";
	// node_modules/@openchamber/sdk/dist/scrollbar-style.js
	/**
	* Scrollbars in extension documents behave like the app's own overlay
	* scrollbars: invisible at rest, shown while the pointer is over the
	* scrolling element or while it scrolls, then hidden again after
	* one second (the app's `OverlayScrollbar` default).
	*
	* Hover works from CSS alone. "While it scrolls" needs the attribute set by
	* `installGuestScrollbarActivity`; without it (an authored CSP that blocks the
	* inline script), scrollbars still appear on hover.
	*
	* Shared by served extension documents and the UI kit, including older guest bundles.
	*/
	/** Attribute present on an element for a moment after it scrolled. */
	var GUEST_SCROLLING_ATTRIBUTE = "data-oc-scrolling";
	var GUEST_SCROLLBAR_CSS = `
:root {
  /* Quiet at rest like the app's own thumbs; hover gives a clear grab target. */
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 18%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 36%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
:hover, [${GUEST_SCROLLING_ATTRIBUTE}] {
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  :hover::-webkit-scrollbar-thumb, [${GUEST_SCROLLING_ATTRIBUTE}]::-webkit-scrollbar-thumb { background: var(--oc-scrollbar-thumb); }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;
	/**
	* Marks whichever element scrolls (the root for document scrolling) with
	* `GUEST_SCROLLING_ATTRIBUTE` and clears it once scrolling has been quiet for
	* the hide delay. One capturing, passive listener per document; installing
	* twice is a no-op. Self-contained on purpose: the server inlines its source.
	*/
	function installGuestScrollbarActivity(doc) {
		const root = doc.documentElement;
		if (root.hasAttribute("data-oc-scrollbar-activity")) return;
		root.setAttribute("data-oc-scrollbar-activity", "");
		const timers = /* @__PURE__ */ new WeakMap();
		doc.addEventListener("scroll", (event) => {
			const target = event.target === doc ? root : event.target;
			if (!(target instanceof Element)) return;
			if (!target.hasAttribute("data-oc-scrolling")) target.setAttribute("data-oc-scrolling", "");
			const pending = timers.get(target);
			if (pending !== void 0) clearTimeout(pending);
			timers.set(target, setTimeout(() => {
				timers.delete(target);
				target.removeAttribute("data-oc-scrolling");
			}, 1e3));
		}, {
			capture: true,
			passive: true
		});
	}
	`${installGuestScrollbarActivity.toString()}`;
	// node_modules/@openchamber/sdk/dist/shells.js
	var GUEST_SHELL_OUTPUT_TAIL_MAX = 65536;
	var GUEST_STATUS_CONTROL_ID = /^[a-z][a-z0-9-]{0,39}$/;
	var isControlObject = (value) => Object(value) === value && !Array.isArray(value);
	var hasOnlyKeys = (value, keys) => Object.keys(value).every((key) => keys.includes(key));
	var isLabel = (value) => String(value) === value && value.length >= 1 && value.length <= 60;
	var isValue = (value) => String(value) === value && value.length >= 1 && value.length <= 80;
	/**
	* Guest-side fast-fail guard for `setStatusControls`. The host zod schema is
	* still authoritative because JavaScript callers can bypass this SDK method.
	*/
	var isGuestStatusControls = (controls) => {
		if (!Array.isArray(controls) || controls.length > 4) return false;
		const ids = /* @__PURE__ */ new Set();
		for (const control of controls) {
			if (!isControlObject(control) || !GUEST_STATUS_CONTROL_ID.test(control.id) || !isLabel(control.label)) return false;
			if (control.disabled !== void 0 && control.disabled !== true && control.disabled !== false) return false;
			if (ids.has(control.id)) return false;
			ids.add(control.id);
			if (control.kind === "button") {
				if (!hasOnlyKeys(control, [
					"kind",
					"id",
					"label",
					"disabled"
				])) return false;
				continue;
			}
			if (control.kind !== "select" || !hasOnlyKeys(control, [
				"kind",
				"id",
				"label",
				"value",
				"options",
				"disabled"
			])) return false;
			if (!isValue(control.value) || !Array.isArray(control.options) || control.options.length < 1 || control.options.length > 16) return false;
			const values = /* @__PURE__ */ new Set();
			for (const option of control.options) {
				if (!isControlObject(option) || !hasOnlyKeys(option, ["value", "label"]) || !isValue(option.value) || !isLabel(option.label) || values.has(option.value)) return false;
				values.add(option.value);
			}
			if (!values.has(control.value)) return false;
		}
		return true;
	};
	// node_modules/@openchamber/sdk/dist/file-editor.js
	/**
	* Characters of file text, or bytes of a binary file, the host hands to an
	* editor and accepts back. Larger than `GUEST_FILE_CONTENT_MAX`: drawings with
	* embedded images and office documents run to several megabytes. A larger
	* file stays with the host's own view.
	*/
	var GUEST_FILE_EDITOR_CONTENT_MAX = 2e7;
	/** Characters of text or bytes a snapshot or document carries. */
	var fileEditorPayloadSize = (value) => "bytes" in value ? value.bytes.byteLength : value.content.length;
	/** Whether two documents are the same file with the same content, byte for byte. */
	var sameFileEditorDocument = (left, right) => {
		if (left.path !== right.path || left.readOnly !== right.readOnly) return false;
		if (left.encoding === "text" || right.encoding === "text") return left.encoding === "text" && right.encoding === "text" && left.content === right.content;
		if (left.bytes.byteLength !== right.bytes.byteLength) return false;
		for (let index = 0; index < left.bytes.byteLength; index += 1) if (left.bytes[index] !== right.bytes[index]) return false;
		return true;
	};
	// node_modules/@openchamber/sdk/dist/popover.js
	var GUEST_POPOVER_ID = /^[A-Za-z0-9_-]{1,80}$/;
	var GUEST_POPOVER_DATA_MAX = 16e3;
	var GUEST_POPOVER_SIDES = [
		"left",
		"right",
		"top",
		"bottom"
	];
	var hasBoundedJsonTree = (value, depth = 0, budget = { remaining: GUEST_POPOVER_DATA_MAX }) => {
		if (--budget.remaining < 0 || depth >= 32) return false;
		if (value === null) return true;
		const children = Array.isArray(value) ? value : Object(value) === value ? Object.values(value) : [];
		for (const item of children) if (!hasBoundedJsonTree(item, depth + 1, budget)) return false;
		return true;
	};
	var isFiniteJson = (value) => {
		if (value === null || value === true || value === false) return true;
		if (Array.isArray(value)) return Object.keys(value).every((key) => /^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length) && value.every(isFiniteJson);
		if (Object(value) === value) {
			const prototype = Object.getPrototypeOf(value);
			return (prototype === null || prototype === Object.prototype) && Object.values(value).every(isFiniteJson);
		}
		return String(value) === value || Number.isFinite(value);
	};
	/** Guest-side fast-fail guard. The host schema remains authoritative for untyped callers. */
	var isGuestPopoverRequest = (request) => {
		try {
			if (String(request.id) !== request.id || !GUEST_POPOVER_ID.test(request.id) || !Number.isFinite(request.anchor.x) || Math.abs(request.anchor.x) > 1e5 || !Number.isFinite(request.anchor.y) || Math.abs(request.anchor.y) > 1e5 || !Number.isFinite(request.anchor.width) || !Number.isFinite(request.anchor.height) || request.anchor.width <= 0 || request.anchor.height <= 0 || request.anchor.width > 1e5 || request.anchor.height > 1e5 || !Number.isInteger(request.width) || request.width < 160 || request.width > 640 || !Number.isInteger(request.height) || request.height < 48 || request.height > 480 || request.side !== void 0 && !GUEST_POPOVER_SIDES.includes(request.side) || request.focus !== void 0 && request.focus !== true && request.focus !== false || !hasBoundedJsonTree(request.data) || !isFiniteJson(request.data)) return false;
			return JSON.stringify(request.data).length <= GUEST_POPOVER_DATA_MAX;
		} catch {
			return false;
		}
	};
	// node_modules/@openchamber/sdk/dist/contract.js
	var GUEST_FILE_STAT_KINDS = [
		"file",
		"directory",
		"other",
		"missing"
	];
	var isStartSessionResult = (value) => Boolean(value && "sessionId" in value);
	var isPromptResult = (value) => Boolean(value && "sent" in value && !("sessionId" in value));
	/** Abbreviated or full hex commit id: 7 to 64 characters. The host resolves it in the open project. */
	var GUEST_COMMIT_SHA = /^[0-9a-f]{7,64}$/i;
	var isGuestCommitSha = (value) => GUEST_COMMIT_SHA.test(value);
	var GUEST_CLIPBOARD_TEXT_MAX = 32e3;
	var GUEST_COMPOSE_TEXT_MAX = 16e3;
	var GUEST_ATTACH_URL_MAX = 2e3;
	var GUEST_ATTACH_TEXT_MAX = 16e3;
	/** Guest file path, in characters. */
	var GUEST_FILE_PATH_MAX = 1024;
	/** File content in characters, read and write alike. */
	var GUEST_FILE_CONTENT_MAX = 2e6;
	/** Characters in a `generate` prompt. */
	var GUEST_GENERATE_PROMPT_MAX = 64e3;
	/** Characters in a `generate` system prompt. */
	var GUEST_GENERATE_SYSTEM_MAX = 8e3;
	/** Largest `maxOutputTokens` a guest may ask for. */
	var GUEST_GENERATE_OUTPUT_TOKENS_MAX = 4e3;
	/** Largest height a `resize` message may carry; the host clamps further per surface. */
	var GUEST_FRAME_HEIGHT_MAX = 1e4;
	var HOST_REQUEST_ERROR_CODES = [
		"HOST_UNAVAILABLE",
		"HOST_TIMEOUT",
		"HOST_REJECTED",
		"DISCONNECTED",
		"DISABLED",
		"BAD_PATH",
		"NO_INTEGRATION",
		"NO_SERVICE",
		"SERVICE_FAILED",
		"REQUEST_FAILED",
		"RESPONSE_TOO_LARGE",
		"NO_SESSION",
		"SESSION_BUSY",
		"NOT_GRANTED",
		"NO_DIRECTORY",
		"NOT_FOUND",
		"FILE_TOO_LARGE",
		"DENIED",
		"NO_MODEL",
		"MODEL_FAILED",
		"UNSUPPORTED"
	];
	var SERVICE_STATUS_VALUES = [
		"stopped",
		"starting",
		"ready",
		"failed"
	];
	var hostRequestErrorCodeSet = new Set(HOST_REQUEST_ERROR_CODES);
	var isHostRequestErrorCode = (value) => hostRequestErrorCodeSet.has(value);
	/** Unknown or omitted wire codes become HOST_REJECTED. */
	var resolveHostRequestErrorCode = (value) => value && isHostRequestErrorCode(value) ? value : "HOST_REJECTED";
	var isJsonValue = (value) => {
		if (value === void 0) return false;
		if (value === null || value === true || value === false) return true;
		if (String(value) === value) return true;
		if (Number(value) === value) return Number.isFinite(value);
		if (Array.isArray(value)) return value.every(isJsonValue);
		if (Object(value) === value) return Object.values(value).every(isJsonValue);
		return false;
	};
	/** Whether `data` is plain JSON that serializes within `GUEST_ATTACH_DATA_MAX`. */
	var isAttachData = (value) => isJsonValue(value) && JSON.stringify(value).length <= 16e3;
	var clampBranch = (value) => value?.trim().slice(0, 200) ?? "";
	/** Guest attach is dropped by the host schema if these limits overflow. */
	var clampAttachRequest = (request) => {
		const id = request.id.trim().slice(0, 128);
		const title = request.title.trim().slice(0, 200);
		const url = request.url.trim().slice(0, GUEST_ATTACH_URL_MAX);
		const text = request.text?.trim().slice(0, GUEST_ATTACH_TEXT_MAX);
		const author = request.author?.trim().slice(0, 80);
		const kind = request.kind === "pull" ? "pull" : "issue";
		const next = {
			providerId: request.providerId.trim(),
			id,
			title: title || id,
			url,
			kind
		};
		if (text) next.text = text;
		if (author) next.author = author;
		if (kind === "pull") {
			const head = clampBranch(request.branches?.head);
			const base = clampBranch(request.branches?.base);
			if (head && base) next.branches = {
				head,
				base
			};
		}
		if (isAttachData(request.data)) next.data = request.data;
		return next;
	};
	/** Same attach clamp. `worktree` stays only when the guest asked for one. */
	var clampStartSessionRequest = (request) => {
		const next = clampAttachRequest(request);
		if (request.projectId) next.projectId = request.projectId;
		if (request.navigation) next.navigation = request.navigation;
		if (request.worktree) next.worktree = request.worktree;
		return next;
	};
	/** Prompt text uses the compose limit. `send` stays only when the guest asked. */
	var clampPromptRequest = (request) => {
		const next = { text: request.text.trim().slice(0, GUEST_COMPOSE_TEXT_MAX) };
		if (request.send) next.send = true;
		return next;
	};
	/** Badge counts are whole numbers from 0 to `GUEST_BADGE_MAX`; anything else clears. */
	var clampBadgeCount = (count) => {
		if (count === null || !Number.isFinite(count)) return null;
		return Math.min(999, Math.max(0, Math.round(count)));
	};
	/** Resize heights are whole CSS pixels from 0 to `GUEST_FRAME_HEIGHT_MAX`; a non-number asks for 0. */
	var clampFrameHeight = (height) => {
		if (!Number.isFinite(height)) return 0;
		return Math.min(GUEST_FRAME_HEIGHT_MAX, Math.max(0, Math.ceil(height)));
	};
	/**
	* What the host schema accepts as a file path. Semantics (`..`, symlinks,
	* declared patterns) are the server's call and come back as `BAD_PATH`; this
	* only keeps a message from being dropped unanswered.
	*/
	var isGuestFilePath = (value) => value.length > 0 && value.length <= 1024 && !value.includes("\0") && !value.includes("\\");
	var isGuestRequestPath = (value) => {
		if (!value.startsWith("/") || value.includes("\0") || value.includes("\\") || value.includes("://")) return false;
		if (value.length > 2e3) return false;
		return !value.split("/").some((segment) => segment === "." || segment === "..");
	};
	var serviceStatusSet = new Set(SERVICE_STATUS_VALUES);
	var isServiceStatusResult = (value) => Boolean(value && "status" in value && serviceStatusSet.has(String(value.status)) && !("body" in value));
	var isGuestRequestResult = (value) => Boolean(value && "status" in value && "body" in value && Number.isInteger(value.status));
	var isFileReadResult = (value) => Boolean(value && "content" in value && String(value.content) === value.content);
	var isFileWriteResult = (value) => Boolean(value && "written" in value && value.written === true);
	var isFileListResult = (value) => Boolean(value && "entries" in value && Array.isArray(value.entries));
	var fileStatKindSet = new Set(GUEST_FILE_STAT_KINDS);
	var isFileStatResult = (value) => Boolean(value && "kind" in value && "size" in value && fileStatKindSet.has(String(value.kind)) && Number.isFinite(value.size));
	var isGenerateResult = (value) => Boolean(value && "text" in value && String(value.text) === value.text && !("status" in value));
	var HOST_PUSH_TYPES = /* @__PURE__ */ new Set([
		"workspace",
		"shells",
		"ready",
		"directory",
		"session",
		"connection",
		"settings",
		"session-lifecycle",
		"item",
		"resolve",
		"action",
		"status-control-event",
		"popover-closed",
		"file-open",
		"file-snapshot",
		"file-saved",
		"generate-late"
	]);
	var asWireRecord = (data) => Object(data) === data ? data : null;
	var isNonEmptyString = (value) => String(value) === value && value.length > 0;
	var readResultMessage = (wire) => {
		if (!isNonEmptyString(wire.id)) return null;
		if (wire.ok === true) {
			const message = {
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "result",
				id: wire.id,
				ok: true
			};
			if (Object(wire.payload) === wire.payload) message.payload = wire.payload;
			return message;
		}
		if (wire.ok === false && isNonEmptyString(wire.error)) return {
			channel: OPENCHAMBER_SDK_CHANNEL,
			v: 1,
			type: "result",
			id: wire.id,
			ok: false,
			error: wire.error,
			code: resolveHostRequestErrorCode(isNonEmptyString(wire.code) ? wire.code : void 0)
		};
		return null;
	};
	/**
	* The guest's read of a host message. The host is the trusted parent frame
	* (the client only listens to `event.source === parent`), so this checks the
	* envelope and the discriminant rather than every field, and the guest bundle
	* carries no schema library for it. The host side parses guest input with
	* `guestMessageSchema` in `@openchamber/sdk/schemas`.
	*/
	var readHostMessage = (data) => {
		const wire = asWireRecord(data);
		if (!wire || wire.channel !== "openchamber.sdk" || wire.v !== 1) return null;
		if (wire.type === "result") return readResultMessage(wire);
		if (!HOST_PUSH_TYPES.has(String(wire.type)) || Object(wire.payload) !== wire.payload) return null;
		return wire;
	};
	// node_modules/@openchamber/sdk/dist/host.js
	var isKeyEvent = (event) => "key" in event && "metaKey" in event && "ctrlKey" in event;
	var isSaveShortcut = (event) => (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "s";
	var HostRequestError = class extends Error {
		code;
		constructor(code, message) {
			super(message);
			this.name = "HostRequestError";
			this.code = code;
		}
	};
	var rejectBadPath = () => Promise.reject(new HostRequestError("BAD_PATH", "Request path must start with \"/\" and stay on the declared origin."));
	var rejectBadFilePath = () => Promise.reject(new HostRequestError("BAD_PATH", `File path must be 1 to ${GUEST_FILE_PATH_MAX} characters without NUL or backslash.`));
	var deviceStorageScope = (options) => {
		if (options === void 0) return void 0;
		if (Object(options) !== options || Array.isArray(options) || options.scope !== void 0 && options.scope !== "instance" && options.scope !== "device") throw new HostRequestError("HOST_REJECTED", "Storage scope must be \"instance\" or \"device\".");
		return options.scope === "device" ? "device" : void 0;
	};
	var nextId = (n) => {
		n.value += 1;
		return `oc-${n.value}`;
	};
	var connectHost = (options = {}) => {
		const target = options.target ?? ("window" in globalThis ? window : null);
		if (!target) throw new HostRequestError("HOST_UNAVAILABLE", "No window. connectHost runs in a browser frame.");
		const acceptSource = options.acceptSource ?? ((source) => source === target.parent);
		const requestTimeoutMs = options.requestTimeoutMs ?? 2e4;
		const readyListeners = /* @__PURE__ */ new Set();
		const directoryListeners = /* @__PURE__ */ new Set();
		const sessionListeners = /* @__PURE__ */ new Set();
		const lifecycleListeners = /* @__PURE__ */ new Set();
		const connectionListeners = /* @__PURE__ */ new Set();
		const settingsListeners = /* @__PURE__ */ new Set();
		const itemListeners = /* @__PURE__ */ new Set();
		const statusControlListeners = /* @__PURE__ */ new Set();
		const popoverClosedListeners = /* @__PURE__ */ new Set();
		const lateGenerateListeners = /* @__PURE__ */ new Set();
		const unclaimedLateGenerate = [];
		let resolveHandler = null;
		let actionHandler = null;
		const fileOpenListeners = /* @__PURE__ */ new Set();
		const fileSavedListeners = /* @__PURE__ */ new Set();
		let fileSnapshotHandler = null;
		let lastFile = null;
		let saveShortcutInstalled = false;
		const pending = /* @__PURE__ */ new Map();
		const workspaceListeners = /* @__PURE__ */ new Map();
		const shellsListeners = /* @__PURE__ */ new Map();
		let disposed = false;
		const ids = { value: 0 };
		let lastReady = null;
		let lastLifecycle = null;
		let popoverPointerActive = false;
		let popoverFocusActive = false;
		let popoverActivityReported = null;
		const lifecycleFromSession = (session) => {
			if (!session) return null;
			return {
				sessionId: session.id,
				phase: session.busy ? "started" : "completed"
			};
		};
		const post = (message) => {
			target.parent.postMessage(message, "*");
		};
		const listenForLateGenerate = () => {
			if (disposed || target.parent === target || lateGenerateListeners.size === 0 || lastReady?.features?.lateGenerateResults !== true) return;
			post({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "generate-late-listen"
			});
		};
		const emit = (listeners, value) => {
			for (const listener of listeners) try {
				listener(value);
			} catch (error) {
				console.error(error);
			}
		};
		const onMessage = (event) => {
			if (!(event instanceof MessageEvent)) return;
			if (!acceptSource(event.source)) return;
			const message = readHostMessage(event.data);
			if (!message) return;
			if (message.type === "workspace") {
				const listener = workspaceListeners.get(message.payload.subscriptionId);
				if (listener) emit([listener], message.payload.snapshot);
				return;
			}
			if (message.type === "shells") {
				const listener = shellsListeners.get(message.payload.subscriptionId);
				if (listener) emit([listener], message.payload.snapshot);
				return;
			}
			if (message.type === "ready") {
				lastReady = message.payload;
				lastLifecycle = lifecycleFromSession(message.payload.session);
				emit(readyListeners, message.payload);
				emit(directoryListeners, message.payload.directory);
				emit(sessionListeners, message.payload.session);
				if (lastLifecycle) emit(lifecycleListeners, lastLifecycle);
				emit(connectionListeners, message.payload.connection);
				emit(settingsListeners, message.payload.settings);
				emit(itemListeners, message.payload.item);
				listenForLateGenerate();
				return;
			}
			if (message.type === "generate-late") {
				if (lateGenerateListeners.size === 0) unclaimedLateGenerate.push(message.payload);
				else emit(lateGenerateListeners, message.payload);
				return;
			}
			if (message.type === "directory") {
				if (lastReady) lastReady = {
					...lastReady,
					directory: message.payload.directory
				};
				emit(directoryListeners, message.payload.directory);
				return;
			}
			if (message.type === "session") {
				if (lastReady) lastReady = {
					...lastReady,
					session: message.payload.session
				};
				if (!message.payload.session) lastLifecycle = null;
				else if (lastLifecycle?.sessionId !== message.payload.session.id) lastLifecycle = lifecycleFromSession(message.payload.session);
				emit(sessionListeners, message.payload.session);
				return;
			}
			if (message.type === "session-lifecycle") {
				lastLifecycle = message.payload;
				emit(lifecycleListeners, message.payload);
				return;
			}
			if (message.type === "connection") {
				if (lastReady) lastReady = {
					...lastReady,
					connection: message.payload.connection
				};
				emit(connectionListeners, message.payload.connection);
				return;
			}
			if (message.type === "settings") {
				if (lastReady) lastReady = {
					...lastReady,
					settings: message.payload.settings
				};
				emit(settingsListeners, message.payload.settings);
				return;
			}
			if (message.type === "item") {
				if (lastReady) lastReady = {
					...lastReady,
					item: message.payload.item
				};
				emit(itemListeners, message.payload.item);
				return;
			}
			if (message.type === "status-control-event") {
				emit(statusControlListeners, message.payload);
				return;
			}
			if (message.type === "popover-closed") {
				emit(popoverClosedListeners, message.payload);
				return;
			}
			if (message.type === "action") {
				const answer = (payload) => {
					if (!disposed) post({
						channel: OPENCHAMBER_SDK_CHANNEL,
						v: 1,
						type: "action-result",
						id: message.id,
						payload
					});
				};
				const handler = actionHandler;
				if (!handler) {
					answer({
						ok: false,
						error: "This extension does not handle background actions."
					});
					return;
				}
				Promise.resolve().then(() => handler(message.payload)).then(() => answer({ ok: true }), (error) => {
					const text = (error instanceof Error ? error.message : String(error)).trim();
					answer({
						ok: false,
						error: (text || "Action failed.").slice(0, 500)
					});
				});
				return;
			}
			if (message.type === "file-open") {
				const next = message.payload;
				if (lastFile && sameFileEditorDocument(lastFile, next)) return;
				lastFile = next;
				emit(fileOpenListeners, message.payload);
				return;
			}
			if (message.type === "file-saved") {
				emit(fileSavedListeners, message.payload.version);
				return;
			}
			if (message.type === "file-snapshot") {
				const answer = (payload) => {
					if (!disposed) post({
						channel: OPENCHAMBER_SDK_CHANNEL,
						v: 1,
						type: "file-snapshot-result",
						id: message.id,
						payload
					});
				};
				const fail = (text) => answer({ error: (text.trim() || "Could not read the edited file.").slice(0, 500) });
				const handler = fileSnapshotHandler;
				if (!handler) {
					fail("This extension does not edit files.");
					return;
				}
				Promise.resolve().then(() => handler(message.payload.purpose)).then((snapshot) => {
					if (fileEditorPayloadSize(snapshot) > 2e7) {
						fail(`The file is over ${GUEST_FILE_EDITOR_CONTENT_MAX} ${"bytes" in snapshot ? "bytes" : "characters"}.`);
						return;
					}
					if (snapshot.version.length > 256) {
						fail(`The snapshot version is over 256 characters.`);
						return;
					}
					answer({ snapshot: "bytes" in snapshot ? {
						bytes: snapshot.bytes,
						version: snapshot.version
					} : {
						content: snapshot.content,
						version: snapshot.version
					} });
				}, (error) => fail(error instanceof Error ? error.message : String(error)));
				return;
			}
			if (message.type === "resolve") {
				const answer = (payload) => {
					post({
						channel: OPENCHAMBER_SDK_CHANNEL,
						v: 1,
						type: "resolve-result",
						id: message.id,
						payload
					});
				};
				const handler = resolveHandler;
				if (!handler) {
					answer({ error: "This extension does not resolve commands." });
					return;
				}
				Promise.resolve().then(() => handler(message.payload)).then((item) => answer({ item: item ? clampAttachRequest(item) : null }), (error) => {
					const text = (error instanceof Error ? error.message : String(error)).trim();
					answer({ error: (text || "Command failed.").slice(0, 500) });
				});
				return;
			}
			const waiter = pending.get(message.id);
			if (!waiter) return;
			clearTimeout(waiter.timer);
			pending.delete(message.id);
			if (message.ok) {
				waiter.resolve(message.payload);
				return;
			}
			waiter.reject(new HostRequestError(message.code, message.error));
		};
		target.addEventListener("message", onMessage);
		post({
			channel: OPENCHAMBER_SDK_CHANNEL,
			v: 1,
			type: "hello"
		});
		const send = (message, timeoutMs = requestTimeoutMs) => {
			if (disposed || target.parent === target) return Promise.reject(new HostRequestError("HOST_UNAVAILABLE", "No host frame. This page is not in an iframe."));
			return new Promise((resolve, reject) => {
				const timer = setTimeout(() => {
					pending.delete(message.id);
					reject(new HostRequestError("HOST_TIMEOUT", "Host did not answer in time."));
				}, timeoutMs);
				pending.set(message.id, {
					resolve,
					reject,
					timer
				});
				post(message);
			});
		};
		const request = (message) => send(message).then(() => void 0);
		const envelope = {
			channel: OPENCHAMBER_SDK_CHANNEL,
			v: 1
		};
		const notify = (message) => {
			if (!disposed && target.parent !== target) post(message);
		};
		const requestFileSave = () => notify({
			...envelope,
			type: "file-save"
		});
		const onSaveShortcut = (event) => {
			if (!isKeyEvent(event) || !isSaveShortcut(event)) return;
			event.preventDefault();
			requestFileSave();
		};
		const onPopoverEscape = (event) => {
			if (!isKeyEvent(event) || event.key !== "Escape" || lastReady?.surface !== "popover" || !lastReady.popover) return;
			event.preventDefault();
			closePopover(lastReady.popover.id, "escape").catch(() => void 0);
		};
		const reportPopoverActivity = () => {
			const popover = lastReady?.surface === "popover" ? lastReady.popover : void 0;
			if (!popover) return;
			const active = popoverPointerActive || popoverFocusActive;
			if (popoverActivityReported === active) return;
			popoverActivityReported = active;
			setPopoverAnchorActive(popover.id, active).catch(() => void 0);
		};
		const onPopoverPointerOver = () => {
			if (lastReady?.surface !== "popover" || popoverPointerActive) return;
			popoverPointerActive = true;
			reportPopoverActivity();
		};
		const onPopoverPointerOut = (event) => {
			if (lastReady?.surface !== "popover" || event.relatedTarget !== null || !popoverPointerActive) return;
			popoverPointerActive = false;
			reportPopoverActivity();
		};
		const onPopoverFocus = () => {
			if (lastReady?.surface !== "popover" || popoverFocusActive) return;
			popoverFocusActive = true;
			reportPopoverActivity();
		};
		const onPopoverBlur = () => {
			if (lastReady?.surface !== "popover" || !popoverFocusActive) return;
			popoverFocusActive = false;
			reportPopoverActivity();
		};
		const requireIdentity = (value, maximum = 1024) => {
			if (!value.trim() || value.length > maximum) throw new HostRequestError("HOST_REJECTED", `Identity must contain 1 to ${maximum} characters.`);
		};
		const readWorkspace = async (query) => {
			if (query.kind !== "projects") requireIdentity(query.projectId);
			const result = await send({
				...envelope,
				type: "workspace-read",
				id: nextId(ids),
				payload: query
			});
			if (!result || !("kind" in result) || !("state" in result) || result.kind !== query.kind) throw new HostRequestError("HOST_REJECTED", "Host did not return workspace data.");
			return result;
		};
		const subscribeWorkspace = async (query, listener) => {
			if (query.kind !== "projects") requireIdentity(query.projectId);
			const subscriptionId = nextId(ids);
			workspaceListeners.set(subscriptionId, listener);
			try {
				await request({
					...envelope,
					type: "workspace-subscribe",
					id: nextId(ids),
					payload: {
						subscriptionId,
						query
					}
				});
			} catch (error) {
				workspaceListeners.delete(subscriptionId);
				if (!disposed) post({
					...envelope,
					type: "workspace-unsubscribe",
					id: nextId(ids),
					payload: { subscriptionId }
				});
				throw error;
			}
			return () => {
				if (!workspaceListeners.delete(subscriptionId) || disposed) return;
				post({
					...envelope,
					type: "workspace-unsubscribe",
					id: nextId(ids),
					payload: { subscriptionId }
				});
			};
		};
		const subscribeShells = async (scope, listener) => {
			if (scope.kind === "session") requireIdentity(scope.sessionId);
			if (scope.kind === "project") requireIdentity(scope.projectId);
			const subscriptionId = nextId(ids);
			shellsListeners.set(subscriptionId, listener);
			try {
				await request({
					...envelope,
					type: "shells-subscribe",
					id: nextId(ids),
					payload: {
						subscriptionId,
						scope
					}
				});
			} catch (error) {
				shellsListeners.delete(subscriptionId);
				if (!disposed) post({
					...envelope,
					type: "shells-unsubscribe",
					id: nextId(ids),
					payload: { subscriptionId }
				});
				throw error;
			}
			return () => {
				if (!shellsListeners.delete(subscriptionId) || disposed) return;
				post({
					...envelope,
					type: "shells-unsubscribe",
					id: nextId(ids),
					payload: { subscriptionId }
				});
			};
		};
		const storage = async (payload) => {
			if ("key" in payload && (payload.key.length === 0 || payload.key.length > 128)) throw new HostRequestError("HOST_REJECTED", "Storage key must contain 1 to 128 characters.");
			if (payload.op === "set" && !isJsonValue(payload.value)) throw new HostRequestError("HOST_REJECTED", "Storage values must be JSON.");
			if (payload.op === "set" && new TextEncoder().encode(JSON.stringify(payload.value)).length > 65536) throw new HostRequestError("HOST_REJECTED", "Storage value exceeds 64 KiB.");
			if (payload.scope === "device" && lastReady?.features?.deviceStorage !== true) throw new HostRequestError("UNSUPPORTED", "This host does not support device storage.");
			const result = await send({
				...envelope,
				type: "storage",
				id: nextId(ids),
				payload
			});
			if (!result || !("storage" in result) || result.op !== payload.op) throw new HostRequestError("HOST_REJECTED", "Host did not return storage data.");
			return result;
		};
		const closePopover = (id, reason) => lastReady?.features?.popovers !== true && !(lastReady?.surface === "popover" && lastReady.popover?.id === id) ? Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers.")) : request({
			...envelope,
			type: "popover-close",
			id: nextId(ids),
			payload: reason ? {
				id,
				reason
			} : { id }
		});
		const setPopoverAnchorActive = (id, active) => lastReady?.features?.popovers !== true && !(lastReady?.surface === "popover" && lastReady.popover?.id === id) ? Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers.")) : request({
			...envelope,
			type: "popover-anchor",
			id: nextId(ids),
			payload: {
				id,
				active
			}
		});
		target.addEventListener("keydown", onPopoverEscape, true);
		target.addEventListener("pointerover", onPopoverPointerOver);
		target.addEventListener("pointermove", onPopoverPointerOver);
		target.addEventListener("pointerout", onPopoverPointerOut);
		target.addEventListener("focus", onPopoverFocus);
		target.addEventListener("blur", onPopoverBlur);
		return {
			onAction: (handler) => {
				actionHandler = handler;
				return () => {
					if (actionHandler === handler) actionHandler = null;
				};
			},
			listProjects: async () => {
				const result = await readWorkspace({ kind: "projects" });
				if (result.kind !== "projects") throw new HostRequestError("HOST_REJECTED", "Expected projects.");
				return result;
			},
			listWorktrees: async (projectId) => {
				const result = await readWorkspace({
					kind: "worktrees",
					projectId
				});
				if (result.kind !== "worktrees") throw new HostRequestError("HOST_REJECTED", "Expected worktrees.");
				return result;
			},
			listSessions: async (projectId) => {
				const result = await readWorkspace({
					kind: "sessions",
					projectId
				});
				if (result.kind !== "sessions") throw new HostRequestError("HOST_REJECTED", "Expected sessions.");
				return result;
			},
			onProjects: (listener) => subscribeWorkspace({ kind: "projects" }, (snapshot) => {
				if (snapshot.kind === "projects") listener(snapshot);
			}),
			onWorktrees: (projectId, listener) => subscribeWorkspace({
				kind: "worktrees",
				projectId
			}, (snapshot) => {
				if (snapshot.kind === "worktrees") listener(snapshot);
			}),
			onSessions: (projectId, listener) => subscribeWorkspace({
				kind: "sessions",
				projectId
			}, (snapshot) => {
				if (snapshot.kind === "sessions") listener(snapshot);
			}),
			onRunningShells: (scope, listener) => subscribeShells(scope, listener),
			readShellOutput: async (shellId, options) => {
				requireIdentity(shellId, 128);
				const cursor = options?.cursor;
				if (cursor !== void 0 && (!Number.isInteger(cursor) || cursor < 0)) throw new HostRequestError("HOST_REJECTED", "Shell output cursor must be a non-negative integer.");
				const tailBytes = options?.tailBytes;
				if (tailBytes !== void 0 && (!Number.isInteger(tailBytes) || tailBytes < 1 || tailBytes > 65536)) throw new HostRequestError("HOST_REJECTED", `Shell output tailBytes must be an integer between 1 and ${GUEST_SHELL_OUTPUT_TAIL_MAX}.`);
				const output = await send({
					...envelope,
					type: "shell-output",
					id: nextId(ids),
					payload: {
						shellId,
						cursor,
						tailBytes
					}
				});
				if (!output || typeof output.output !== "string" || !Number.isFinite(output.cursor)) throw new HostRequestError("HOST_REJECTED", "Host did not return shell output.");
				return output;
			},
			stopShell: async (shellId) => {
				requireIdentity(shellId, 128);
				if ((await send({
					...envelope,
					type: "shell-stop",
					id: nextId(ids),
					payload: { shellId }
				}))?.stopped !== true) throw new HostRequestError("HOST_REJECTED", "Host did not stop the shell.");
				return { stopped: true };
			},
			openSession: async (sessionId) => {
				requireIdentity(sessionId);
				await request({
					...envelope,
					type: "open-session",
					id: nextId(ids),
					payload: { sessionId }
				});
			},
			storage: {
				get: async (key, options) => {
					const scope = deviceStorageScope(options);
					const payload = {
						op: "get",
						key
					};
					if (scope) payload.scope = scope;
					const result = await storage(payload);
					return result.op === "get" && result.found ? result.value : void 0;
				},
				set: async (key, value, options) => {
					const scope = deviceStorageScope(options);
					const payload = {
						op: "set",
						key,
						value
					};
					if (scope) payload.scope = scope;
					await storage(payload);
				},
				delete: async (key, options) => {
					const scope = deviceStorageScope(options);
					const payload = {
						op: "delete",
						key
					};
					if (scope) payload.scope = scope;
					await storage(payload);
				},
				keys: async (options) => {
					const scope = deviceStorageScope(options);
					const payload = { op: "keys" };
					if (scope) payload.scope = scope;
					const result = await storage(payload);
					if (result.op !== "keys") throw new HostRequestError("HOST_REJECTED", "Expected storage keys.");
					return result.keys;
				}
			},
			onReady: (listener) => {
				readyListeners.add(listener);
				if (lastReady) listener(lastReady);
				return () => {
					readyListeners.delete(listener);
				};
			},
			onDirectory: (listener) => {
				directoryListeners.add(listener);
				if (lastReady) listener(lastReady.directory);
				return () => {
					directoryListeners.delete(listener);
				};
			},
			onSession: (listener) => {
				sessionListeners.add(listener);
				if (lastReady) listener(lastReady.session);
				return () => {
					sessionListeners.delete(listener);
				};
			},
			onSessionLifecycle: (listener) => {
				lifecycleListeners.add(listener);
				if (lastLifecycle) listener(lastLifecycle);
				return () => {
					lifecycleListeners.delete(listener);
				};
			},
			onConnection: (listener) => {
				connectionListeners.add(listener);
				if (lastReady) listener(lastReady.connection);
				return () => {
					connectionListeners.delete(listener);
				};
			},
			onSettings: (listener) => {
				settingsListeners.add(listener);
				if (lastReady) listener(lastReady.settings);
				return () => {
					settingsListeners.delete(listener);
				};
			},
			onItem: (listener) => {
				itemListeners.add(listener);
				if (lastReady) listener(lastReady.item);
				return () => {
					itemListeners.delete(listener);
				};
			},
			onStatusControl: (listener) => {
				statusControlListeners.add(listener);
				return () => {
					statusControlListeners.delete(listener);
				};
			},
			onPopoverClosed: (listener) => {
				popoverClosedListeners.add(listener);
				return () => {
					popoverClosedListeners.delete(listener);
				};
			},
			setStatusControls: (controls) => {
				if (lastReady?.features?.statusControls !== true) return Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support status controls."));
				if (!isGuestStatusControls(controls)) return Promise.reject(new HostRequestError("HOST_REJECTED", "Status controls must have unique bounded ids and valid selected options."));
				return request({
					...envelope,
					type: "status-controls",
					id: nextId(ids),
					payload: { controls }
				});
			},
			openPopover: (payload) => {
				if (lastReady?.features?.popovers !== true) return Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers."));
				if (!isGuestPopoverRequest(payload)) return Promise.reject(new HostRequestError("HOST_REJECTED", "Popover requests need bounded geometry and JSON data."));
				return request({
					...envelope,
					type: "popover-open",
					id: nextId(ids),
					payload
				});
			},
			closePopover,
			setPopoverAnchorActive,
			onResolve: (handler) => {
				resolveHandler = handler;
				return () => {
					if (resolveHandler === handler) resolveHandler = null;
				};
			},
			toast: (payload) => {
				const message = payload.message.trim();
				if (!message || message.length > 500) return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast message must contain 1 to 500 characters.`));
				if (payload.copy && payload.copy !== true && (!payload.copy.text.length || payload.copy.text.length > 32e3)) return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast copy text must contain 1 to ${GUEST_CLIPBOARD_TEXT_MAX} characters.`));
				return request({
					channel: OPENCHAMBER_SDK_CHANNEL,
					v: 1,
					type: "toast",
					id: nextId(ids),
					payload: {
						...payload,
						message
					}
				});
			},
			openUrl: (url) => request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "open-url",
				id: nextId(ids),
				payload: { url }
			}),
			openCommit: (sha) => isGuestCommitSha(sha) ? request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "open-commit",
				id: nextId(ids),
				payload: { sha }
			}) : Promise.reject(new HostRequestError("HOST_REJECTED", "Commit id must be 7 to 64 hex characters.")),
			openSurface: (surfaceId) => request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "open-surface",
				id: nextId(ids),
				payload: { surfaceId }
			}),
			writeClipboard: (text) => request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "clipboard-write",
				id: nextId(ids),
				payload: { text }
			}),
			compose: (payload) => request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "compose",
				id: nextId(ids),
				payload
			}),
			attach: (payload) => request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "attach",
				id: nextId(ids),
				payload: clampAttachRequest(payload)
			}),
			startSession: async (payload) => {
				if (payload.projectId !== void 0) requireIdentity(payload.projectId);
				const worktree = payload.worktree;
				if (worktree && worktree !== true) {
					if (worktree.kind === "existing") requireIdentity(worktree.directory);
					else {
						if (worktree.name !== void 0) requireIdentity(worktree.name, 200);
						if (worktree.baseBranch !== void 0) requireIdentity(worktree.baseBranch, 200);
					}
				}
				const result = await send({
					channel: OPENCHAMBER_SDK_CHANNEL,
					v: 1,
					type: "start-session",
					id: nextId(ids),
					payload: clampStartSessionRequest(payload)
				}, options.requestTimeoutMs ?? 18e4);
				if (!isStartSessionResult(result)) throw new HostRequestError("HOST_REJECTED", "Host did not return a session.");
				return result;
			},
			prompt: (payload) => send({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "prompt",
				id: nextId(ids),
				payload: clampPromptRequest(payload)
			}).then((result) => {
				if (!isPromptResult(result)) throw new HostRequestError("HOST_REJECTED", "Host did not return a prompt result.");
				return result;
			}),
			sessionLink: (payload) => request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "session-link",
				id: nextId(ids),
				payload: clampAttachRequest(payload)
			}),
			close: () => request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "close",
				id: nextId(ids)
			}),
			oauthStart: () => request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "oauth-start",
				id: nextId(ids)
			}),
			oauthDisconnect: () => request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "oauth-disconnect",
				id: nextId(ids)
			}),
			request: (payload) => (isGuestRequestPath(payload.path) ? send({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "request",
				id: nextId(ids),
				payload
			}) : rejectBadPath()).then((result) => {
				if (!isGuestRequestResult(result)) throw new HostRequestError("HOST_REJECTED", "Host request result was empty.");
				return result;
			}),
			serviceRequest: (payload) => (isGuestRequestPath(payload.path) ? send({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "service-request",
				id: nextId(ids),
				payload
			}) : rejectBadPath()).then((result) => {
				if (!isGuestRequestResult(result)) throw new HostRequestError("HOST_REJECTED", "Host service request result was empty.");
				return result;
			}),
			serviceStatus: () => send({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "service-status",
				id: nextId(ids)
			}).then((result) => {
				if (!isServiceStatusResult(result)) throw new HostRequestError("HOST_REJECTED", "Host did not return service status.");
				return result;
			}),
			readFile: (path) => (isGuestFilePath(path) ? send({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "file-read",
				id: nextId(ids),
				payload: { path }
			}) : rejectBadFilePath()).then((result) => {
				if (!isFileReadResult(result)) throw new HostRequestError("HOST_REJECTED", "Host did not return file content.");
				return result;
			}),
			writeFile: (path, content) => {
				if (!isGuestFilePath(path)) return rejectBadFilePath();
				if (content.length > 2e6) return Promise.reject(new HostRequestError("FILE_TOO_LARGE", `Content is over ${GUEST_FILE_CONTENT_MAX} characters.`));
				return send({
					channel: OPENCHAMBER_SDK_CHANNEL,
					v: 1,
					type: "file-write",
					id: nextId(ids),
					payload: {
						path,
						content
					}
				}).then((result) => {
					if (!isFileWriteResult(result)) throw new HostRequestError("HOST_REJECTED", "Host did not confirm the write.");
					return result;
				});
			},
			listDir: (path) => (isGuestFilePath(path) ? send({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "file-list",
				id: nextId(ids),
				payload: { path }
			}) : rejectBadFilePath()).then((result) => {
				if (!isFileListResult(result)) throw new HostRequestError("HOST_REJECTED", "Host did not return directory entries.");
				return result;
			}),
			stat: (path) => (isGuestFilePath(path) ? send({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "file-stat",
				id: nextId(ids),
				payload: { path }
			}) : rejectBadFilePath()).then((result) => {
				if (!isFileStatResult(result)) throw new HostRequestError("HOST_REJECTED", "Host did not return file status.");
				return result;
			}),
			generate: (input) => {
				const prompt = input.prompt.trim();
				const system = input.system?.trim();
				if (prompt.length === 0 || prompt.length > 64e3) return Promise.reject(new HostRequestError("HOST_REJECTED", `Prompt must be 1 to ${GUEST_GENERATE_PROMPT_MAX} characters.`));
				if (system !== void 0 && (system.length === 0 || system.length > 8e3)) return Promise.reject(new HostRequestError("HOST_REJECTED", `System prompt must be 1 to ${GUEST_GENERATE_SYSTEM_MAX} characters.`));
				const maxOutputTokens = input.maxOutputTokens === void 0 ? void 0 : Math.min(GUEST_GENERATE_OUTPUT_TOKENS_MAX, Math.max(1, Math.floor(input.maxOutputTokens)));
				if (maxOutputTokens !== void 0 && !Number.isFinite(maxOutputTokens)) return Promise.reject(new HostRequestError("HOST_REJECTED", "maxOutputTokens must be a number."));
				const payload = { prompt };
				if (system !== void 0) payload.system = system;
				if (maxOutputTokens !== void 0) payload.maxOutputTokens = maxOutputTokens;
				return send({
					channel: OPENCHAMBER_SDK_CHANNEL,
					v: 1,
					type: "generate",
					id: nextId(ids),
					payload
				}, options.requestTimeoutMs ?? 96e4).then((result) => {
					if (!isGenerateResult(result)) throw new HostRequestError("HOST_REJECTED", "Host did not return generated text.");
					return result;
				});
			},
			onLateGenerateResult: (listener) => {
				lateGenerateListeners.add(listener);
				for (const result of unclaimedLateGenerate.splice(0)) emit([listener], result);
				listenForLateGenerate();
				return () => {
					lateGenerateListeners.delete(listener);
				};
			},
			setBadge: (count) => request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "badge",
				id: nextId(ids),
				payload: { count: clampBadgeCount(count) }
			}),
			setHeight: (height) => request({
				channel: OPENCHAMBER_SDK_CHANNEL,
				v: 1,
				type: "resize",
				id: nextId(ids),
				payload: { height: clampFrameHeight(height) }
			}),
			onFileOpen: (listener) => {
				fileOpenListeners.add(listener);
				if (!saveShortcutInstalled) {
					saveShortcutInstalled = true;
					target.addEventListener("keydown", onSaveShortcut, true);
				}
				if (lastFile) listener(lastFile);
				return () => {
					fileOpenListeners.delete(listener);
				};
			},
			onFileSnapshot: (handler) => {
				fileSnapshotHandler = handler;
				return () => {
					if (fileSnapshotHandler === handler) fileSnapshotHandler = null;
				};
			},
			onFileSaved: (listener) => {
				fileSavedListeners.add(listener);
				return () => {
					fileSavedListeners.delete(listener);
				};
			},
			reportFileChange: (change) => notify({
				...envelope,
				type: "file-change",
				payload: {
					dirty: change.dirty,
					edited: change.edited
				}
			}),
			requestFileSave,
			reportFileUnsupported: () => notify({
				...envelope,
				type: "file-unsupported"
			}),
			dispose: () => {
				for (const subscriptionId of workspaceListeners.keys()) post({
					...envelope,
					type: "workspace-unsubscribe",
					id: nextId(ids),
					payload: { subscriptionId }
				});
				workspaceListeners.clear();
				for (const subscriptionId of shellsListeners.keys()) post({
					...envelope,
					type: "shells-unsubscribe",
					id: nextId(ids),
					payload: { subscriptionId }
				});
				shellsListeners.clear();
				disposed = true;
				resolveHandler = null;
				actionHandler = null;
				fileSnapshotHandler = null;
				fileOpenListeners.clear();
				fileSavedListeners.clear();
				if (saveShortcutInstalled) target.removeEventListener("keydown", onSaveShortcut, true);
				target.removeEventListener("message", onMessage);
				target.removeEventListener("keydown", onPopoverEscape, true);
				target.removeEventListener("pointerover", onPopoverPointerOver);
				target.removeEventListener("pointermove", onPopoverPointerOver);
				target.removeEventListener("pointerout", onPopoverPointerOut);
				target.removeEventListener("focus", onPopoverFocus);
				target.removeEventListener("blur", onPopoverBlur);
				for (const waiter of pending.values()) {
					clearTimeout(waiter.timer);
					waiter.reject(new HostRequestError("HOST_UNAVAILABLE", "Host client was disposed."));
				}
				pending.clear();
				readyListeners.clear();
				directoryListeners.clear();
				sessionListeners.clear();
				lifecycleListeners.clear();
				connectionListeners.clear();
				settingsListeners.clear();
				itemListeners.clear();
				statusControlListeners.clear();
				popoverClosedListeners.clear();
				lateGenerateListeners.clear();
				unclaimedLateGenerate.length = 0;
			}
		};
	};
	// node_modules/@openchamber/sdk/dist/ui/theme.js
	var TOKEN_VARS = [
		["--oc-bg", "background"],
		["--oc-elevated", "elevated"],
		["--oc-fg", "foreground"],
		["--oc-muted", "muted"],
		["--oc-subtle", "subtle"],
		["--oc-border", "border"],
		["--oc-hover", "hover"],
		["--oc-selection", "selection"],
		["--oc-focus", "focus"],
		["--oc-primary", "primary"],
		["--oc-muted-surface", "mutedSurface"],
		["--oc-elevated-fg", "elevatedForeground"],
		["--oc-active", "active"],
		["--oc-selection-fg", "selectionForeground"],
		["--oc-primary-fg", "primaryForeground"],
		["--oc-primary-text", "primaryText"],
		["--oc-success-text", "successText"],
		["--oc-warning-text", "warningText"],
		["--oc-error-text", "errorText"],
		["--oc-info-text", "infoText"],
		["--oc-success", "success"],
		["--oc-warning", "warning"],
		["--oc-error", "error"],
		["--oc-info", "info"],
		["--oc-font", "font"],
		["--oc-mono", "mono"],
		["--oc-radius", "radius"],
		["--surface-background", "background"],
		["--surface-elevated", "elevated"],
		["--surface-foreground", "foreground"],
		["--surface-muted-foreground", "muted"],
		["--surface-subtle", "subtle"],
		["--interactive-border", "border"],
		["--interactive-hover", "hover"],
		["--interactive-selection", "selection"],
		["--interactive-focus-ring", "focus"],
		["--primary", "primary"],
		["--surface-muted", "mutedSurface"],
		["--surface-elevated-foreground", "elevatedForeground"],
		["--interactive-active", "active"],
		["--interactive-selection-foreground", "selectionForeground"],
		["--primary-foreground", "primaryForeground"],
		["--primary-text", "primaryText"],
		["--success-text", "successText"],
		["--warning-text", "warningText"],
		["--error-text", "errorText"],
		["--info-text", "infoText"],
		["--status-success", "success"],
		["--status-warning", "warning"],
		["--status-error", "error"],
		["--status-info", "info"],
		["--font-sans", "font"],
		["--font-mono", "mono"],
		["--radius", "radius"]
	];
	var SYNTAX_TOKEN_VARS = [
		[
			"--oc-syntax-keyword",
			"--syntax-keyword",
			"syntaxKeyword"
		],
		[
			"--oc-syntax-string",
			"--syntax-string",
			"syntaxString"
		],
		[
			"--oc-syntax-number",
			"--syntax-number",
			"syntaxNumber"
		],
		[
			"--oc-syntax-function",
			"--syntax-function",
			"syntaxFunction"
		],
		[
			"--oc-syntax-type",
			"--syntax-type",
			"syntaxType"
		],
		[
			"--oc-syntax-comment",
			"--syntax-comment",
			"syntaxComment"
		],
		[
			"--oc-syntax-variable",
			"--syntax-variable",
			"syntaxVariable"
		],
		[
			"--oc-syntax-operator",
			"--syntax-operator",
			"syntaxOperator"
		]
	];
	/**
	* Paint the host theme onto the iframe root. Guest chrome reads these
	* variables, and the root itself gets the host font and text colour so plain
	* DOM the guest draws outside the kit (a `<pre>`, a `<p>`) inherits them
	* instead of the browser's serif default.
	*/
	var applyHostTheme = (theme, root) => {
		root.style.colorScheme = theme.mode;
		for (const [name, key] of TOKEN_VARS) root.style.setProperty(name, theme.tokens[key]);
		for (const [alias, hostName, key] of SYNTAX_TOKEN_VARS) {
			const value = theme.tokens[key] ?? "";
			root.style.setProperty(alias, value);
			root.style.setProperty(hostName, value);
		}
		root.style.setProperty("font-family", theme.tokens.font);
		root.style.setProperty("font-size", "0.875rem");
		root.style.setProperty("line-height", "1.45");
		root.style.setProperty("color", theme.tokens.foreground);
	};
	var applyHostReady = (ctx, root) => {
		applyHostTheme(ctx.theme, root);
		if (root.dataset) {
			root.dataset.ocSurface = ctx.surface;
			root.dataset.ocTheme = ctx.theme.mode;
		}
	};
	// node_modules/@openchamber/sdk/dist/ui/style.js
	/** Host CSS variable → `--oc-*` alias written by `theme.ts`. */
	var OC_ALIAS = {
		"surface-background": "bg",
		"surface-elevated": "elevated",
		"surface-elevated-foreground": "elevated-fg",
		"surface-foreground": "fg",
		"surface-muted-foreground": "muted",
		"surface-muted": "muted-surface",
		"surface-subtle": "subtle",
		"interactive-border": "border",
		"interactive-hover": "hover",
		"interactive-active": "active",
		"interactive-selection": "selection",
		"interactive-selection-foreground": "selection-fg",
		"interactive-focus-ring": "focus",
		"primary": "primary",
		"primary-foreground": "primary-fg",
		"primary-text": "primary-text",
		"success-text": "success-text",
		"warning-text": "warning-text",
		"error-text": "error-text",
		"info-text": "info-text",
		"status-success": "success",
		"status-warning": "warning",
		"status-error": "error",
		"status-info": "info",
		"font-sans": "font",
		"font-mono": "mono",
		"radius": "radius"
	};
	var v = (name, fallback) => `var(--${name}, var(--oc-${OC_ALIAS[name]}, ${fallback}))`;
	var bg = v("surface-background", "transparent");
	var elevated = v("surface-elevated", "transparent");
	var elevatedFg = v("surface-elevated-foreground", "inherit");
	var fg = v("surface-foreground", "inherit");
	var muted = v("surface-muted-foreground", "gray");
	var secondary = v("surface-muted", "transparent");
	var border = v("interactive-border", "currentColor");
	var hover = v("interactive-hover", "transparent");
	var active = v("interactive-active", "transparent");
	var selection = v("interactive-selection", "transparent");
	var selectionFg = v("interactive-selection-foreground", "inherit");
	var primary = v("primary", "currentColor");
	var primaryText = v("primary-text", "inherit");
	var errorText = v("error-text", "inherit");
	var font = v("font-sans", "inherit");
	var mono = v("font-mono", "monospace");
	var radius = v("radius", "9px");
	/** The app's controls round a step below the host radius: 7px against its 9px. */
	var controlRadius = `calc(${radius} - 2px)`;
	var smallRadius = `calc(${radius} - 4px)`;
	var mix = (color, pct, base = "transparent") => `color-mix(in srgb, ${color} ${pct}%, ${base})`;
	/** Keyboard focus draws no ring, like the app: the focused control takes the hover fill. */
	var focusFill = `background-image: linear-gradient(${hover}, ${hover});`;
	/**
	* The app's `oc-field`, `oc-raised` and `oc-raised-button` light. Theme-dependent
	* parts live in custom properties on the root, which `applyHostReady` marks with
	* `data-oc-theme`: light themes press a field in and give a raised control the
	* canvas colour; dark themes give fields, controls and tinted buttons one lit
	* top line and one short shadow, and wash a field halfway toward the page so it
	* sits a tone below the buttons beside it. Without the attribute (a preview
	* outside the host) the light form applies.
	*
	* Buttons, triggers, tabs and popups keep a 1px border in their geometry so a
	* tinted variant, whose border is coloured, has the same size. Their hairline
	* is that border: an inset ring would paint inside it, 1px in from the edge,
	* with a strip of fill around it. Fields have no border and keep the ring.
	*/
	var field = (edge) => `box-shadow: inset 0 0 0 1px ${edge}, var(--oc-sdk-field-lift);`;
	var raised = "border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);";
	var litButton = "box-shadow: var(--oc-sdk-lit);";
	var darkLift = `inset 0 1px 0 0 ${mix(fg, 1.5)}, 0 1px 1px 0 rgb(0 0 0 / 0.28), 0 2px 3px -2px rgb(0 0 0 / 0.2)`;
	var THEME_VARS = `
:root {
  --oc-sdk-edge: ${mix(fg, 10)};
  --oc-sdk-field-bg: ${elevated};
  --oc-sdk-raised-bg: ${bg};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 2px 0 rgb(0 0 0 / 0.06);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.45), 0 1px 2px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.1);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.8), inset 0 0 0 1px rgb(0 0 0 / 0.04), 0 1px 2px -0.5px rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.08);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${mix(fg, 6)};
  --oc-sdk-field-bg: ${mix(bg, 50, elevated)};
  --oc-sdk-raised-bg: ${elevated};
  --oc-sdk-field-lift: ${darkLift};
  --oc-sdk-raised-lift: ${darkLift};
  --oc-sdk-lit: inset 0 1px 0 0 ${mix(fg, 1.5)}, 0 1px 1px 0 rgb(0 0 0 / 0.28), 0 2px 3px -2px rgb(0 0 0 / 0.2);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.36);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.06), inset 0 0 0 1px rgb(255 255 255 / 0.08), 0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.2), 0 6px 6px -3px rgb(0 0 0 / 0.16);
}`;
	var tone = (name) => {
		return `
.oc-sdk[data-tone="${name}"], .oc-sdk [data-tone="${name}"] { --oc-sdk-tone: ${v(`status-${name}`, "currentColor")}; --oc-sdk-tone-text: ${v(`${name}-text`, "inherit")}; }`;
	};
	var UI_CSS = `
${GUEST_SCROLLBAR_CSS}

.oc-sdk { box-sizing: border-box; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 32px; padding: 0 12px; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; }
.oc-sdk-btn[data-size="sm"] { gap: 6px; height: 28px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { gap: 4px; height: 24px; padding: 0 8px; font-size: 0.75rem; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 32px; padding: 0 10px; border: 0; font-size: 0.875rem; line-height: 1.45; appearance: none; }
textarea.oc-sdk-input { height: auto; padding: 8px 10px; resize: vertical; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; width: auto; max-width: 100%; min-width: 0; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; text-align: left; }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; }
.oc-sdk-popup { position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid transparent; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 28px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; }
.oc-sdk-option-check { flex: 0 0 auto; display: inline-flex; width: 14px; visibility: hidden; }
.oc-sdk-option[aria-selected="true"] > .oc-sdk-option-check { visibility: visible; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid transparent; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; max-width: 100%; overflow: auto; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; font-weight: 500; white-space: nowrap; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; text-align: left; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid transparent; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid transparent; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-banner-body { font-size: 0.8125rem; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; transform-origin: left; transition: transform 200ms ease-out; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; }

${`${THEME_VARS}
.oc-sdk { color: ${fg}; font-family: ${font}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${focusFill} }
.oc-sdk-mono { font-family: ${mono}; }
.oc-sdk-muted { color: ${muted}; }
${tone("success")}${tone("warning")}${tone("error")}${tone("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${primary}; --oc-sdk-tone-text: ${primaryText}; }

.oc-sdk-btn { border-radius: ${controlRadius}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${smallRadius}; }
.oc-sdk-btn[data-variant="default"] { color: ${primaryText}; background: ${mix(primary, 10, bg)}; border-color: ${mix(primary, 12)}; ${litButton} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${mix(primary, 16, bg)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${mix(primary, 22, bg)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${secondary}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${elevatedFg}; ${raised} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${active}, ${active}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${hover}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${active}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${v("status-error", "red")}; color: ${errorText}; background: ${mix("var(--oc-sdk-tone)", 7, bg)}; border-color: ${mix("var(--oc-sdk-tone)", 12)}; ${litButton} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${mix("var(--oc-sdk-tone)", 9, bg)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${mix("var(--oc-sdk-tone)", 11, bg)}; box-shadow: none; }

.oc-sdk-field-note { color: ${muted}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${errorText}; }
.oc-sdk-input { border-radius: ${controlRadius}; background: var(--oc-sdk-field-bg); color: ${elevatedFg}; ${field("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${muted}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${field(mix(fg, 26))} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${field(v("status-error", "red"))} }
.oc-sdk-input[data-mono="true"] { font-family: ${mono}; }

.oc-sdk-search-icon { color: ${muted}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${primary}; }
.oc-sdk-search-clear { border-radius: ${smallRadius}; color: ${muted}; }
.oc-sdk-search-clear:hover { background: ${hover}; color: ${fg}; }

.oc-sdk-trigger { border-radius: ${controlRadius}; background: var(--oc-sdk-raised-bg); color: ${elevatedFg}; ${raised} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${muted}; }
.oc-sdk-trigger-chevron { color: ${muted}; }
/* The app's dropdown light: lit top, hairline rings and a layered shadow. Its outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${elevatedFg}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${elevated}; background-clip: padding-box; color: ${elevatedFg}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${hover}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-option-check { color: ${fg}; }
.oc-sdk-option[data-destructive="true"] { color: ${errorText}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${mix(v("status-error", "red"), 10)}; }
.oc-sdk-option-hint { color: ${muted}; }
.oc-sdk-popup-empty { color: ${muted}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${border}; border-radius: 4px; color: ${fg}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${mix(fg, 60, border)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${border}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${bg}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${primary}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${focusFill} }
.oc-sdk-check-desc { color: ${muted}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${mix(fg, 4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${muted}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${fg}; }
.oc-sdk-tab[aria-selected="true"] { color: ${selectionFg}; background: ${selection}; border-color: ${border}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${elevatedFg}; background: var(--oc-sdk-raised-bg); ${raised} }
.oc-sdk-tab-count { color: ${muted}; }

.oc-sdk-badge { border-radius: 9999px; background: ${hover}; color: ${muted}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${mix("var(--oc-sdk-tone)", 15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${hover}; }
.oc-sdk-row[aria-selected="true"] { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-row-lead { font-family: ${mono}; color: ${muted}; }
.oc-sdk-row-sub { color: ${muted}; }
.oc-sdk-row-meta { color: ${muted}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${muted}; }

.oc-sdk-empty-body { color: ${muted}; }

.oc-sdk-spinner { color: ${muted}; }
.oc-sdk-spinner-ring { border-color: ${border}; border-top-color: ${primary}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${mix("var(--oc-sdk-tone)", 10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${muted}; }

.oc-sdk-separator { color: ${muted}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${mix(border, 40)}; }

.oc-sdk-progress-label { color: ${muted}; }
.oc-sdk-progress-track { border-radius: 9999px; background: ${border}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${primary}); }

.oc-sdk-text a { color: ${primaryText}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${mix(border, 60)}; }
`}`;
	// node_modules/@openchamber/sdk/dist/ui/dom.js
	var STYLE_ID = "oc-sdk-ui-style";
	var clearNode = (node) => {
		while (node.firstChild) node.removeChild(node.firstChild);
	};
	var ensureStyle = (css) => {
		const existing = document.getElementById(STYLE_ID);
		if (existing instanceof HTMLStyleElement) {
			if (existing.textContent !== css) existing.textContent = css;
			return;
		}
		installGuestScrollbarActivity(document);
		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = css;
		document.head.appendChild(style);
	};
	var el = (tag, className) => {
		const node = document.createElement(tag);
		if (className) node.className = className;
		return node;
	};
	var button = (className) => {
		const node = el("button", className);
		node.type = "button";
		return node;
	};
	/** Writes text only when it changed so a repaint does not disturb selection or layout. */
	var setText = (node, text) => {
		const next = text ?? "";
		if (node.textContent !== next) node.textContent = next;
	};
	/** Sets or removes an attribute depending on whether a value is present. */
	var setAttr = (node, name, value) => {
		if (value === void 0 || value === null || value === "") node.removeAttribute(name);
		else if (node.getAttribute(name) !== value) node.setAttribute(name, value);
	};
	// node_modules/@openchamber/sdk/dist/ui/button.js
	var ring = () => {
		const spinner = document.createElement("span");
		spinner.className = "oc-sdk-spinner-ring";
		spinner.setAttribute("aria-hidden", "true");
		return spinner;
	};
	var mountButton = (root, initial) => {
		ensureStyle(UI_CSS);
		let props = initial;
		const node = button("oc-sdk oc-sdk-btn");
		const spinner = ring();
		const label = document.createElement("span");
		node.append(label);
		root.append(node);
		const paint = () => {
			node.dataset.variant = props.variant ?? "default";
			node.dataset.size = props.size ?? "default";
			node.disabled = Boolean(props.disabled) || Boolean(props.loading);
			node.dataset.loading = props.loading ? "true" : "false";
			node.setAttribute("aria-busy", props.loading ? "true" : "false");
			if (props.loading && spinner.parentNode !== node) node.prepend(spinner);
			else if (!props.loading && spinner.parentNode === node) spinner.remove();
			setText(label, props.label);
		};
		const onClick = () => {
			if (props.disabled || props.loading) return;
			props.onClick();
		};
		node.addEventListener("click", onClick);
		paint();
		return {
			update: (next) => {
				props = {
					...props,
					...next
				};
				paint();
			},
			dispose: () => {
				node.removeEventListener("click", onClick);
				node.remove();
			}
		};
	};
	// node_modules/@openchamber/sdk/dist/ui/icons.js
	var SVG_NS = "http://www.w3.org/2000/svg";
	/** Remixicon outlines. Add a shape only when a primitive paints it. */
	var ICON_PATH = {
		search: "M18.031 16.617l4.283 4.282-1.415 1.415-4.282-4.283A8.96 8.96 0 0 1 11 20c-4.968 0-9-4.032-9-9s4.032-9 9-9 9 4.032 9 9a8.96 8.96 0 0 1-1.969 5.617zm-2.006-.742A6.977 6.977 0 0 0 18 11c0-3.868-3.133-7-7-7-3.868 0-7 3.132-7 7 0 3.867 3.132 7 7 7a6.977 6.977 0 0 0 4.875-1.975l.15-.15z",
		chevron: "M12 13.172l4.95-4.95 1.414 1.414L12 16 5.636 9.636 7.05 8.222z",
		check: "M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z",
		close: "M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z"
	};
	var icon = (name, size, className) => {
		const node = document.createElementNS(SVG_NS, "svg");
		node.setAttribute("viewBox", "0 0 24 24");
		node.setAttribute("width", String(size));
		node.setAttribute("height", String(size));
		node.setAttribute("aria-hidden", "true");
		node.setAttribute("fill", "currentColor");
		if (className) node.setAttribute("class", className);
		const path = document.createElementNS(SVG_NS, "path");
		path.setAttribute("d", ICON_PATH[name]);
		node.append(path);
		return node;
	};
	// node_modules/@openchamber/sdk/dist/ui/search.js
	var mountSearchField = (root, initial) => {
		ensureStyle(UI_CSS);
		let props = initial;
		const wrap = el("div", "oc-sdk oc-sdk-search");
		const input = el("input", "oc-sdk-input");
		input.type = "text";
		input.spellcheck = false;
		input.autocomplete = "off";
		input.setAttribute("role", "searchbox");
		const clear = button("oc-sdk-search-clear");
		clear.append(icon("close", 14));
		clear.tabIndex = -1;
		wrap.append(icon("search", 16, "oc-sdk-search-icon"), input, clear);
		root.append(wrap);
		const paint = () => {
			const placeholder = props.placeholder ?? "Search";
			setAttr(input, "placeholder", placeholder);
			input.setAttribute("aria-label", props.label ?? placeholder);
			clear.setAttribute("aria-label", "Clear search");
			if (input.value !== props.value) input.value = props.value;
			wrap.dataset.active = props.value.trim() === "" ? "false" : "true";
		};
		const clearValue = () => {
			if (props.value !== "") props.onChange("");
			input.focus();
		};
		const onInput = () => {
			props.onChange(input.value);
		};
		const onKeyDown = (event) => {
			if (event.key === "Escape" && input.value !== "") {
				event.preventDefault();
				clearValue();
			}
		};
		input.addEventListener("input", onInput);
		input.addEventListener("keydown", onKeyDown);
		clear.addEventListener("click", clearValue);
		paint();
		if (props.autofocus) input.focus();
		return {
			update: (next) => {
				props = {
					...props,
					...next
				};
				paint();
			},
			dispose: () => {
				input.removeEventListener("input", onInput);
				input.removeEventListener("keydown", onKeyDown);
				clear.removeEventListener("click", clearValue);
				wrap.remove();
			}
		};
	};
	// node_modules/@openchamber/sdk/dist/ui/navigation.js
	/** Pure keyboard navigation shared by list, select, menu, and tabs. No DOM here. */
	/** Maps a keyboard event to a navigation step. Ctrl+N / Ctrl+P mirror the arrow keys, as in the host. */
	var navigationKey = (event, axis = "vertical") => {
		const [next, previous] = axis === "vertical" ? ["ArrowDown", "ArrowUp"] : ["ArrowRight", "ArrowLeft"];
		if (event.key === next || event.ctrlKey && event.key.toLowerCase() === "n") return "next";
		if (event.key === previous || event.ctrlKey && event.key.toLowerCase() === "p") return "previous";
		if (event.key === "Home") return "first";
		if (event.key === "End") return "last";
		return null;
	};
	/**
	* Returns the id that `key` lands on from `currentId`, skipping disabled items and
	* stopping at the edges. Returns `null` when nothing is enabled.
	*/
	var moveListSelection = (items, currentId, key) => {
		const enabled = items.filter((item) => !item.disabled);
		if (enabled.length === 0) return null;
		const first = enabled[0];
		const last = enabled[enabled.length - 1];
		if (key === "first" || !first || !last) return first?.id ?? null;
		if (key === "last") return last.id;
		const index = enabled.findIndex((item) => item.id === currentId);
		if (index === -1) return key === "next" ? first.id : last.id;
		return enabled[Math.min(enabled.length - 1, Math.max(0, index + (key === "next" ? 1 : -1)))]?.id ?? null;
	};
	// node_modules/@openchamber/sdk/dist/ui/tabs.js
	var mountTabs = (root, initial) => {
		ensureStyle(UI_CSS);
		let props = initial;
		const track = el("div", "oc-sdk oc-sdk-tabs");
		track.setAttribute("role", "tablist");
		root.append(track);
		const paint = () => {
			clearNode(track);
			track.dataset.track = props.trackBackground ? "true" : "false";
			for (const item of props.items) {
				const tab = button("oc-sdk-tab");
				tab.setAttribute("role", "tab");
				const active = item.id === props.activeId;
				tab.setAttribute("aria-selected", active ? "true" : "false");
				tab.tabIndex = active ? 0 : -1;
				tab.dataset.id = item.id;
				const label = el("span");
				label.textContent = item.label;
				tab.append(label);
				if (item.count !== void 0) {
					const count = el("span", "oc-sdk-tab-count");
					count.textContent = String(item.count);
					tab.append(count);
				}
				tab.addEventListener("click", () => {
					if (item.id !== props.activeId) props.onChange(item.id);
				});
				track.append(tab);
			}
		};
		const onKeyDown = (event) => {
			const step = navigationKey(event, "horizontal");
			if (!step) return;
			const next = moveListSelection(props.items, props.activeId, step);
			if (next && next !== props.activeId) {
				event.preventDefault();
				props.onChange(next);
				const tab = track.querySelector(`[data-id="${CSS.escape(next)}"]`);
				if (tab instanceof HTMLElement) tab.focus();
			}
		};
		track.addEventListener("keydown", onKeyDown);
		paint();
		return {
			update: (next) => {
				props = {
					...props,
					...next
				};
				paint();
			},
			dispose: () => {
				track.removeEventListener("keydown", onKeyDown);
				track.remove();
			}
		};
	};
	// node_modules/@openchamber/sdk/dist/ui/empty.js
	var mountEmpty = (root, initial) => {
		ensureStyle(UI_CSS);
		let props = initial;
		const shell = el("div", "oc-sdk oc-sdk-empty");
		const title = el("h2", "oc-sdk-empty-title");
		const body = el("p", "oc-sdk-empty-body");
		const slot = el("div", "oc-sdk-empty-action");
		shell.append(title, body, slot);
		root.append(shell);
		let action = null;
		const paint = () => {
			setText(title, props.title);
			setText(body, props.body);
			body.hidden = !props.body;
			slot.hidden = !props.action;
			if (!props.action) {
				action?.dispose();
				action = null;
				return;
			}
			const next = {
				label: props.action.label,
				onClick: props.action.onClick
			};
			if (action) action.update(next);
			else action = mountButton(slot, {
				...next,
				variant: "outline",
				size: "sm"
			});
		};
		paint();
		return {
			update: (next) => {
				props = {
					...props,
					...next
				};
				paint();
			},
			dispose: () => {
				action?.dispose();
				action = null;
				shell.remove();
			}
		};
	};
	// node_modules/@openchamber/sdk/dist/ui/banner.js
	var mountBanner = (root, initial) => {
		ensureStyle(UI_CSS);
		let props = initial;
		const node = el("div", "oc-sdk oc-sdk-banner");
		const text = el("div", "oc-sdk-banner-text");
		const title = el("div", "oc-sdk-banner-title");
		const body = el("div", "oc-sdk-banner-body");
		const slot = el("div", "oc-sdk-banner-action");
		text.append(title, body);
		node.append(text, slot);
		root.append(node);
		let action = null;
		const paint = () => {
			node.dataset.tone = props.tone;
			node.setAttribute("role", props.tone === "error" || props.tone === "warning" ? "alert" : "status");
			setText(title, props.title);
			setText(body, props.body);
			body.hidden = !props.body;
			slot.hidden = !props.action;
			if (!props.action) {
				action?.dispose();
				action = null;
				return;
			}
			const next = {
				label: props.action.label,
				onClick: props.action.onClick
			};
			if (action) action.update(next);
			else action = mountButton(slot, {
				...next,
				variant: "outline",
				size: "xs"
			});
		};
		paint();
		return {
			update: (next) => {
				props = {
					...props,
					...next
				};
				paint();
			},
			dispose: () => {
				action?.dispose();
				action = null;
				node.remove();
			}
		};
	};
	// panel/i18n/index.ts
	var catalogs = {
		en: {
			"view.overview": "Overview",
			"view.memories": "Memories",
			"view.notes": "Notes",
			"chrome.tabsLabel": "Magic Context views",
			"chrome.backMemories": "Back to memories",
			"chrome.backNotes": "Back to notes",
			"chrome.updating": "Updating…",
			"chrome.refresh": "Refresh",
			"fresh.rpc": "Live",
			"fresh.session-meta": "Last sample",
			"fresh.none": "Unavailable",
			"fresh.age": "· {time}",
			"chrome.lastUpdate": "Last update {time}",
			"state.retry": "Try again",
			"state.liveOnly": "Needs the live service",
			"partial.title": "Live data unavailable",
			"partial.body": "The token split and cache lifetime need the Magic Context service, which isn't reachable. Context usage is the last sample; lists and counts are current.",
			"partial.action": "Retry",
			"stale.title": "Data is out of date",
			"stale.body": "This view refreshes automatically when the connection returns.",
			"stale.action": "Refresh now",
			"schema.title": "Database schema differs",
			"schema.body": "The plugin expects version {plugin}, the database is {db}. Memory and note lists may be out of date.",
			"overview.context": "Context window",
			"overview.windowNote": "{used} / {limit} tokens",
			"overview.meterLabel": "Context window {percent} percent full",
			"overview.threshold": "Compaction starts at {percent}% ({tokens} tokens)",
			"overview.raw": "raw {percent}%",
			"overview.meterTitle": "{soft} usable · {hard} hard limit",
			"overview.composition": "Token composition",
			"overview.contextShare": "Magic Context {tokens} · {share}",
			"overview.blocks": "{n} blocks",
			"overview.bandLabel": "Conversation and tool calls {conversation} · system and definitions {system} · Magic Context {context}",
			"overview.compositionOffline": "The token split comes from the live service. The database stores only the total.",
			"overview.system": "System prompt",
			"overview.conversationTools": "Conversation & tools",
			"overview.conversation": "Conversation",
			"overview.toolCalls": "Tool calls",
			"overview.toolDefinitions": "Tool definitions",
			"overview.compartments": "Compartments",
			"overview.memories": "Memories",
			"overview.facts": "Facts",
			"overview.profileDocs": "Profile & docs",
			"overview.inputTokens": "Input tokens",
			"overview.cache": "Cache",
			"overview.cacheTtl": "{ttl} lifetime",
			"overview.cacheLeft": "{m}m {s}s left",
			"overview.cacheMeterLabel": "Cache lifetime remaining",
			"overview.sessionCounts": "This session",
			"overview.compartmentsCount": "Compartments",
			"overview.memoryBlocks": "Memory blocks",
			"overview.sessionNotes": "Notes",
			"overview.projectCounts": "This project",
			"overview.memoryIndex": "Memory index",
			"overview.statActive": "active",
			"overview.statArchived": "archived",
			"overview.footSource": "{source} · plugin {plugin}",
			"overview.footDatabase": "database",
			"overview.footSchema": "schema {version}",
			"overview.noProject.title": "No project open",
			"overview.noProject.body": "Context is tracked per project. Open a session inside a project folder to see its numbers here.",
			"overview.nousage.title": "No live sample for this session",
			"overview.nousage.body": "Magic Context has not recorded this session yet. Its memories and notes are listed below.",
			"overview.nousage.action": "Browse memories",
			"overview.error.title": "Couldn't read this session",
			"overview.error.body": "The context database could not be read.",
			"memories.searchPlaceholder": "Search memories",
			"memories.searchLabel": "Search memories",
			"memories.clearSearch": "Clear search",
			"memories.filters": "Filters",
			"memories.filterStatus": "Status",
			"memories.filterCategory": "Category",
			"memories.all": "All",
			"memories.status.active": "Active",
			"memories.status.archived": "Archived",
			"memories.cat.rules": "Project rules",
			"memories.cat.architecture": "Architecture",
			"memories.cat.constraints": "Constraints",
			"memories.cat.config": "Config values",
			"memories.cat.naming": "Naming",
			"memories.listLabel": "Memories",
			"memories.loadMore": "Load more",
			"memories.countPage": "Showing {shown} of {total}",
			"memories.countActive": "{n} active",
			"memories.countMatching": "{n} matching",
			"memories.detail.importance": "Importance",
			"memories.detail.unclassified": "unclassified",
			"memories.detail.seen": "Seen",
			"memories.detail.retrieved": "Retrieved",
			"memories.detail.first": "First seen",
			"memories.detail.updated": "Updated",
			"memories.detail.category": "Category key",
			"memories.noProject.title": "No project open",
			"memories.noProject.body": "Memories belong to a project. Open a session inside a project folder and its memories appear here.",
			"memories.empty.title": "No memories for this project yet",
			"memories.empty.body": "Magic Context writes durable facts about the project as you work. They appear here once recorded.",
			"memories.noMatch.title": "No matching memories",
			"memories.noMatch.body": "Nothing matches this search and filter.",
			"memories.noMatch.action": "Clear filters",
			"memories.error.title": "Couldn't load memories",
			"memories.error.body": "The context database could not be read.",
			"notes.sessionGroup": "Session notes",
			"notes.noSessionNotes.body": "No session notes for this chat. Dismissed notes can be shown below.",
			"notes.showDismissed": "Show {n} dismissed notes",
			"notes.hideDismissed": "Hide {n} dismissed notes",
			"notes.dismissedListLabel": "Dismissed notes",
			"notes.smartGroup": "Smart notes",
			"notes.sessionListLabel": "Session notes",
			"notes.smartListLabel": "Smart notes",
			"notes.status.ready": "Ready",
			"notes.status.pending": "Pending",
			"notes.status.active": "Active",
			"notes.status.dismissed": "Dismissed",
			"notes.condition": "Waiting for",
			"notes.conditionReady": "Triggered by",
			"notes.kind.session": "Session note",
			"notes.kind.smart": "Smart note",
			"notes.detail.created": "Created",
			"notes.detail.updated": "Updated",
			"notes.detail.session": "Session",
			"notes.detail.project": "Project",
			"notes.noSmart.body": "No smart notes for this project.",
			"notes.noProject.title": "No project open",
			"notes.noProject.body": "Notes belong to a project and a chat. Open a session inside a project folder to see them.",
			"notes.empty.title": "No notes yet",
			"notes.empty.body": "A note appears when you or the agent pins something, or when a condition set for this project is met.",
			"notes.error.title": "Couldn't load notes",
			"notes.error.body": "The notes table could not be read.",
			"time.justNow": "just now",
			"time.s": "{n}s",
			"time.m": "{n}m",
			"time.h": "{n}h",
			"time.d": "{n}d",
			"time.mAgo": "{n}m ago",
			"time.hAgo": "{n}h ago",
			"time.dAgo": "{n}d ago",
			"source.rpc": "rpc",
			"overview.cacheExpired": "expired"
		},
		"zh-CN": {
			"view.overview": "概览",
			"view.memories": "记忆",
			"view.notes": "笔记",
			"chrome.tabsLabel": "Magic Context 视图",
			"chrome.backMemories": "返回记忆",
			"chrome.backNotes": "返回笔记",
			"chrome.updating": "正在更新…",
			"chrome.refresh": "刷新",
			"fresh.rpc": "实时",
			"fresh.session-meta": "上次样本",
			"fresh.none": "不可用",
			"fresh.age": "· {time}",
			"chrome.lastUpdate": "上次更新 {time}",
			"state.retry": "重试",
			"state.liveOnly": "需要实时服务",
			"partial.title": "实时数据不可用",
			"partial.body": "token 拆分和缓存时长需要 Magic Context 服务，目前无法连接。上下文用量是上次样本；列表与计数是当前数据。",
			"partial.action": "重试",
			"stale.title": "数据已过期",
			"stale.body": "连接恢复后会自动刷新。",
			"stale.action": "立即刷新",
			"schema.title": "数据库版本不一致",
			"schema.body": "插件期望版本 {plugin}，数据库是 {db}。记忆与笔记列表可能已过期。",
			"overview.context": "上下文窗口",
			"overview.windowNote": "{used} / {limit} token",
			"overview.meterLabel": "上下文窗口已用 {percent}%",
			"overview.threshold": "达到 {percent}%（{tokens} token）时开始压缩",
			"overview.raw": "原始 {percent}%",
			"overview.meterTitle": "可用 {soft} · 硬上限 {hard}",
			"overview.composition": "Token 组成",
			"overview.contextShare": "Magic Context {tokens} · {share}",
			"overview.blocks": "{n} 块",
			"overview.bandLabel": "对话与工具调用 {conversation} · 系统与定义 {system} · Magic Context {context}",
			"overview.compositionOffline": "token 拆分来自实时服务，数据库只保存总数。",
			"overview.system": "系统提示",
			"overview.conversationTools": "对话与工具",
			"overview.conversation": "对话",
			"overview.toolCalls": "工具调用",
			"overview.toolDefinitions": "工具定义",
			"overview.compartments": "分段",
			"overview.memories": "记忆",
			"overview.facts": "事实",
			"overview.profileDocs": "画像与文档",
			"overview.inputTokens": "输入 Token",
			"overview.cache": "缓存",
			"overview.cacheTtl": "有效期 {ttl}",
			"overview.cacheLeft": "剩余 {m} 分 {s} 秒",
			"overview.cacheMeterLabel": "缓存剩余时长",
			"overview.sessionCounts": "本会话",
			"overview.compartmentsCount": "分段",
			"overview.memoryBlocks": "记忆块",
			"overview.sessionNotes": "笔记",
			"overview.projectCounts": "本项目",
			"overview.memoryIndex": "记忆索引",
			"overview.statActive": "有效",
			"overview.statArchived": "归档",
			"overview.footSource": "{source} · 插件 {plugin}",
			"overview.footDatabase": "数据库",
			"overview.footSchema": "schema {version}",
			"overview.noProject.title": "没有打开项目",
			"overview.noProject.body": "上下文按项目统计。在项目目录里打开一个会话，这里才会显示数字。",
			"overview.nousage.title": "这个会话还没有样本",
			"overview.nousage.body": "Magic Context 还没有记录这个会话。它的记忆和笔记可以在下面查看。",
			"overview.nousage.action": "浏览记忆",
			"overview.error.title": "无法读取此会话",
			"overview.error.body": "无法读取上下文数据库。",
			"memories.searchPlaceholder": "搜索记忆",
			"memories.searchLabel": "搜索记忆",
			"memories.clearSearch": "清除搜索",
			"memories.filters": "筛选",
			"memories.filterStatus": "状态",
			"memories.filterCategory": "类别",
			"memories.all": "全部",
			"memories.status.active": "有效",
			"memories.status.archived": "已归档",
			"memories.cat.rules": "项目规则",
			"memories.cat.architecture": "架构",
			"memories.cat.constraints": "约束",
			"memories.cat.config": "配置",
			"memories.cat.naming": "命名",
			"memories.listLabel": "记忆列表",
			"memories.loadMore": "加载更多",
			"memories.countPage": "显示 {shown} / {total} 条",
			"memories.countActive": "{n} 条有效",
			"memories.countMatching": "{n} 条匹配",
			"memories.detail.importance": "重要性",
			"memories.detail.unclassified": "未分类",
			"memories.detail.seen": "写入次数",
			"memories.detail.retrieved": "取用次数",
			"memories.detail.first": "首次记录",
			"memories.detail.updated": "最近变化",
			"memories.detail.category": "类别键",
			"memories.noProject.title": "没有打开项目",
			"memories.noProject.body": "记忆属于项目。在项目目录里打开一个会话，它的记忆会显示在这里。",
			"memories.empty.title": "这个项目还没有记忆",
			"memories.empty.body": "随着工作推进，Magic Context 会把本项目的长期事实记录下来，并显示在这里。",
			"memories.noMatch.title": "没有匹配的记忆",
			"memories.noMatch.body": "当前搜索和筛选条件下没有结果。",
			"memories.noMatch.action": "清除筛选",
			"memories.error.title": "无法加载记忆",
			"memories.error.body": "无法读取上下文数据库。",
			"notes.sessionGroup": "会话笔记",
			"notes.noSessionNotes.body": "这个聊天没有会话笔记。已忽略的笔记可以在下方显示。",
			"notes.showDismissed": "显示 {n} 条已忽略笔记",
			"notes.hideDismissed": "隐藏 {n} 条已忽略笔记",
			"notes.dismissedListLabel": "已忽略笔记",
			"notes.smartGroup": "智能笔记",
			"notes.sessionListLabel": "会话笔记",
			"notes.smartListLabel": "智能笔记",
			"notes.status.ready": "已就绪",
			"notes.status.pending": "等待中",
			"notes.status.active": "有效",
			"notes.status.dismissed": "已忽略",
			"notes.condition": "等待条件",
			"notes.conditionReady": "触发条件",
			"notes.kind.session": "会话笔记",
			"notes.kind.smart": "智能笔记",
			"notes.detail.created": "创建于",
			"notes.detail.updated": "更新于",
			"notes.detail.session": "会话",
			"notes.detail.project": "项目",
			"notes.noSmart.body": "这个项目没有智能笔记。",
			"notes.noProject.title": "没有打开项目",
			"notes.noProject.body": "笔记属于项目和聊天。在项目目录里打开一个会话即可查看。",
			"notes.empty.title": "还没有笔记",
			"notes.empty.body": "当你或代理主动记下一件事，或本项目的条件被满足时，会出现笔记。",
			"notes.error.title": "无法加载笔记",
			"notes.error.body": "无法读取笔记记录。",
			"time.justNow": "刚刚",
			"time.s": "{n} 秒",
			"time.m": "{n}分钟",
			"time.h": "{n}小时",
			"time.d": "{n}天",
			"time.mAgo": "{n} 分钟前",
			"time.hAgo": "{n} 小时前",
			"time.dAgo": "{n} 天前",
			"source.rpc": "rpc",
			"overview.cacheExpired": "已过期"
		}
	};
	var [locale, setLocaleSignal] = createSignal("en");
	var currentLocale = locale;
	var setLocale = (tag) => {
		setLocaleSignal(tag?.startsWith("zh") ? "zh-CN" : "en");
	};
	var t = (key, args) => {
		return (catalogs[locale()][key] ?? catalogs.en[key] ?? key).replace(/\{(\w+)\}/g, (whole, name) => args && name in args ? String(args[name]) : whole);
	};
	var number = (value) => value === null || value === void 0 || !Number.isFinite(value) ? "—" : value.toLocaleString(locale());
	var percent = (value, digits = 1) => value === null || value === void 0 || !Number.isFinite(value) ? "—" : value.toFixed(digits);
	/** Rounds like the design fixture: <1m just now, then m / h / d. */
	var age = (iso, format = "short", now = Date.now()) => {
		if (!iso) return "";
		const at = Date.parse(iso);
		if (Number.isNaN(at)) return "";
		const minutes = Math.round(Math.max(0, now - at) / 6e4);
		if (minutes < 1) return t("time.justNow");
		const [value, unit] = minutes < 60 ? [minutes, "m"] : minutes < 1440 ? [Math.round(minutes / 60), "h"] : [Math.round(minutes / 1440), "d"];
		return format === "short" ? t(`time.${unit}`, { n: value }) : t(`time.${unit}Ago`, { n: value });
	};
	// panel/components/kit.tsx
	var _tmpl$$6 = /* @__PURE__ */ template(`<div class=mc-tabs>`);
	var _tmpl$2$6 = /* @__PURE__ */ template(`<div class=mc-search-host>`);
	var _tmpl$3$6 = /* @__PURE__ */ template(`<div>`);
	var _tmpl$4$6 = /* @__PURE__ */ template(`<div class="mc-state mc-state--center">`);
	var KitTabs = (props) => {
		let host;
		let handle = null;
		let lastItems = "";
		createEffect(() => ({
			items: props.items,
			active: props.active,
			label: props.label
		}), (propsNow) => {
			if (!host) return;
			if (!handle) {
				handle = mountTabs(host, {
					items: propsNow.items,
					activeId: propsNow.active,
					onChange: (id) => props.onChange(id)
				});
				host.querySelector("[role=\"tablist\"]")?.setAttribute("aria-label", propsNow.label);
				lastItems = JSON.stringify(propsNow.items);
				return;
			}
			host.querySelector("[role=\"tablist\"]")?.setAttribute("aria-label", propsNow.label);
			const key = JSON.stringify(propsNow.items);
			if (key !== lastItems) {
				handle.update({ items: propsNow.items });
				lastItems = key;
			}
			handle.update({ activeId: propsNow.active });
		});
		onCleanup(() => {
			handle?.dispose();
			handle = null;
		});
		var _el$ = _tmpl$$6();
		ref(() => {
			return (element) => {
				host = element;
			};
		}, _el$);
		return _el$;
	};
	var KitSearch = (props) => {
		let host;
		let input = null;
		let handle = null;
		createEffect(() => ({
			value: props.value,
			placeholder: props.placeholder,
			label: props.label
		}), (propsNow) => {
			if (!host) return;
			if (!handle) {
				handle = mountSearchField(host, {
					value: propsNow.value,
					onChange: (value) => props.onChange(value),
					placeholder: propsNow.placeholder,
					label: propsNow.label
				});
				input = host.querySelector("input");
				input?.addEventListener("keydown", (event) => props.onKeyDown?.(event));
				input?.setAttribute("autocomplete", "off");
				input?.setAttribute("spellcheck", "false");
				return;
			}
			handle.update({
				value: propsNow.value,
				placeholder: propsNow.placeholder,
				label: propsNow.label
			});
		});
		onCleanup(() => {
			handle?.dispose();
			handle = null;
		});
		var _el$2 = _tmpl$2$6();
		ref(() => {
			return (element) => {
				host = element;
			};
		}, _el$2);
		return _el$2;
	};
	var KitBanner = (props) => {
		let host;
		let handle = null;
		createEffect(() => ({
			tone: props.tone,
			title: props.title,
			body: props.body,
			action: props.action
		}), (propsNow) => {
			if (!host) return;
			if (!handle) {
				handle = mountBanner(host, propsNow);
				return;
			}
			handle.update(propsNow);
		});
		onCleanup(() => {
			handle?.dispose();
			handle = null;
		});
		var _el$3 = _tmpl$3$6();
		ref(() => {
			return (element) => {
				host = element;
			};
		}, _el$3);
		return _el$3;
	};
	var KitEmpty = (props) => {
		let host;
		let handle = null;
		createEffect(() => ({
			title: props.title,
			body: props.body,
			action: props.action
		}), (propsNow) => {
			if (!host) return;
			if (!handle) {
				handle = mountEmpty(host, propsNow);
				return;
			}
			handle.update(propsNow);
		});
		onCleanup(() => {
			handle?.dispose();
			handle = null;
		});
		var _el$4 = _tmpl$4$6();
		ref(() => {
			return (element) => {
				host = element;
			};
		}, _el$4);
		effect(() => props.tone === "alert" ? "alert" : "status", (_v$) => {
			setAttribute(_el$4, "role", _v$);
		});
		return _el$4;
	};
	// panel/views/Overview.tsx
	var _tmpl$$5 = /* @__PURE__ */ template(`<div class="mc-state mc-skeleton"><div class=mc-overview-inner><section class=mc-sec><div class=mc-skel data-h=8 style=width:92px></div><div class=mc-skeleton-hero><span class=mc-skel data-h=32 style=width:110px></span><span class=mc-skel data-h=8 style=flex:1></span></div><span class=mc-skel data-h=8 style=width:58%></span></section><section class=mc-sec><div class=mc-skel data-h=8 style=width:104px></div><div class=mc-skeleton-rows></div></section><section class=mc-sec><div class=mc-skel data-h=8 style=width:56px></div><span class=mc-skel data-h=8 style=width:72%>`);
	var _tmpl$2$5 = /* @__PURE__ */ template(`<span class=mc-skel data-h=8 style=width:100%>`);
	var _tmpl$3$5 = /* @__PURE__ */ template(`<span class=mc-meter-tick aria-hidden=true>`);
	var _tmpl$4$5 = /* @__PURE__ */ template(`<p class=mc-hint>`);
	var _tmpl$5$4 = /* @__PURE__ */ template(`<span class=mc-raw>`);
	var _tmpl$6$4 = /* @__PURE__ */ template(`<section class=mc-sec data-area=cache><div class=mc-sec-head><h2 class=mc-label></h2><span class=mc-sec-note></span></div><div class=mc-cache-line><span class="mc-cache-left mc-mono"></span><span class="mc-meter mc-meter--thin"role=progressbar aria-valuemin=0 aria-valuemax=100><span class=mc-meter-fill>`);
	var _tmpl$7$3 = /* @__PURE__ */ template(`<span class=mc-stat-sep aria-hidden=true>·`);
	var _tmpl$8$3 = /* @__PURE__ */ template(`<b>`);
	var _tmpl$9$1 = /* @__PURE__ */ template(`<i class=mc-stat-dim>`);
	var _tmpl$10$1 = /* @__PURE__ */ template(`<div class="mc-scroll mc-overview"><div class=mc-overview-inner><section class="mc-sec mc-sec--hero"data-area=hero><div class=mc-sec-head><h2 class=mc-label></h2><span class="mc-sec-note mc-mono"></span></div><div class=mc-hero><span class=mc-hero-num><span class=mc-hero-unit>%</span></span><div class=mc-meter role=progressbar aria-valuemin=0 aria-valuemax=100><span class=mc-meter-fill></span></div></div><div class=mc-hero-cap><!><!></div></section><section class=mc-sec data-area=bd><div class=mc-sec-head><h2 class=mc-label></h2></div></section><section class=mc-sec data-area=session><h2 class=mc-label></h2><ul class=mc-stats><li><span></span><b></b></li><li><span></span><b></b></li><li><span></span><b></b></li></ul></section><section class=mc-sec data-area=project><h2 class=mc-label></h2><ul class=mc-stats><li><span></span><b></b><i class=mc-stat-dim></i></li><li><span></span></li><li><span></span></li></ul></section><footer class=mc-foot><span class=mc-mono></span><span class=mc-foot-sep>·</span><span class=mc-mono></span><span class=mc-foot-sep>·</span><span class=mc-mono></span><span class=mc-foot-sep>·</span><span class=mc-mono>`);
	var _tmpl$11$1 = /* @__PURE__ */ template(`<section class=mc-view data-view=overview><!><!><!><!><!>`);
	var _tmpl$12$1 = /* @__PURE__ */ template(`<span class="mc-sec-note mc-context-share">`);
	var _tmpl$13$1 = /* @__PURE__ */ template(`<p class=mc-inline-note>`);
	var _tmpl$14 = /* @__PURE__ */ template(`<div class=mc-comp><div class=mc-band role=img><span class=mc-band-seg data-band=system></span><span class=mc-band-seg data-band=conversation></span><span class=mc-band-seg data-band=context></span></div><ul class=mc-bd><li class="mc-bd-row mc-bd-total"><span class=mc-bd-chip aria-hidden=true></span><span class=mc-bd-name></span><span class=mc-bd-fill></span><span class=mc-bd-tok></span><span class=mc-bd-share aria-hidden=true>`);
	var _tmpl$15 = /* @__PURE__ */ template(`<li class="mc-bd-row mc-bd-group"><button class=mc-bd-toggle type=button aria-controls=bd-conv><span class=mc-bd-chip aria-hidden=true></span><span class=mc-bd-name></span><span class=mc-bd-caret aria-hidden=true><svg width=9 height=9 viewBox="0 0 24 24"fill=currentColor><path d="M9.5 5.5L16 12l-6.5 6.5z"></path></svg></span><span class=mc-bd-fill></span><span class=mc-bd-tok></span><span class=mc-bd-share>%</span></button><ul class=mc-bd-sub id=bd-conv>`);
	var _tmpl$16 = /* @__PURE__ */ template(`<span class=mc-bd-count>`);
	var _tmpl$17 = /* @__PURE__ */ template(`<li class=mc-bd-row><span class=mc-bd-chip aria-hidden=true></span><span class=mc-bd-name></span><span class=mc-bd-fill></span><span class=mc-bd-tok></span><span class=mc-bd-share>%`);
	var _tmpl$18 = /* @__PURE__ */ template(`<li><span class=mc-bd-subname></span><span class=mc-bd-tok></span><span class=mc-bd-share>%`);
	var _tmpl$19 = /* @__PURE__ */ template(`<b data-missing=true>—`);
	var cacheLeftMs = (panel) => {
		const cache = panel.snapshot()?.cache;
		const observedAt = panel.snapshot()?.live.observedAt ?? panel.snapshot()?.observedAt;
		if (!cache || cache.remainingMs === null || !observedAt) return null;
		const at = Date.parse(observedAt);
		if (Number.isNaN(at)) return null;
		return Math.max(0, cache.remainingMs - Math.max(0, panel.nowTick() - at));
	};
	var Skeleton = () => (() => {
		var _el$ = _tmpl$$5();
		var _el$4 = _el$.firstChild.firstChild.nextSibling;
		var _el$6 = _el$4.firstChild.nextSibling;
		_el$4.nextSibling;
		insert(_el$6, createComponent(For, {
			each: [
				0,
				1,
				2,
				3,
				4,
				5
			],
			children: () => _tmpl$2$5()
		}));
		return _el$;
	})();
	var Overview = (props) => {
		const panel = props.panel;
		const state = () => panel.bodyState();
		var _el$9 = _tmpl$11$1();
		var _el$10 = _el$9.firstChild;
		var _el$11 = _el$10.nextSibling;
		var _el$12 = _el$11.nextSibling;
		var _el$13 = _el$12.nextSibling;
		var _el$78 = _el$13.nextSibling;
		insert(_el$9, createComponent(Show, {
			get when() {
				return state() === "loading";
			},
			get children() {
				return createComponent(Skeleton, {});
			}
		}), _el$10);
		insert(_el$9, createComponent(Show, {
			get when() {
				return state() === "no-project";
			},
			get children() {
				return createComponent(KitEmpty, {
					get title() {
						return t("overview.noProject.title");
					},
					get body() {
						return t("overview.noProject.body");
					}
				});
			}
		}), _el$11);
		insert(_el$9, createComponent(Show, {
			get when() {
				return state() === "no-usage";
			},
			get children() {
				return createComponent(KitEmpty, {
					get title() {
						return t("overview.nousage.title");
					},
					get body() {
						return t("overview.nousage.body");
					},
					get action() {
						return {
							label: t("overview.nousage.action"),
							onClick: props.onBrowse
						};
					}
				});
			}
		}), _el$12);
		insert(_el$9, createComponent(Show, {
			get when() {
				return state() === "error";
			},
			get children() {
				return createComponent(KitEmpty, {
					tone: "alert",
					get title() {
						return t("overview.error.title");
					},
					get body() {
						return t("overview.error.body");
					},
					get action() {
						return {
							label: t("state.retry"),
							onClick: () => panel.retry()
						};
					}
				});
			}
		}), _el$13);
		insert(_el$9, createComponent(Show, {
			get when() {
				return state() === "content";
			},
			get children() {
				var _el$14 = _tmpl$10$1();
				var _el$15 = _el$14.firstChild;
				var _el$16 = _el$15.firstChild;
				var _el$17 = _el$16.firstChild;
				var _el$18 = _el$17.firstChild;
				var _el$19 = _el$18.nextSibling;
				var _el$20 = _el$17.nextSibling;
				var _el$21 = _el$20.firstChild;
				var _el$22 = _el$21.firstChild;
				var _el$23 = _el$21.nextSibling;
				var _el$24 = _el$23.firstChild;
				var _el$26 = _el$20.nextSibling;
				var _el$28 = _el$26.firstChild;
				var _el$30 = _el$28.nextSibling;
				var _el$31 = _el$16.nextSibling;
				var _el$32 = _el$31.firstChild;
				var _el$33 = _el$32.firstChild;
				var _el$42 = _el$31.nextSibling;
				var _el$43 = _el$42.firstChild;
				var _el$45 = _el$43.nextSibling.firstChild;
				var _el$46 = _el$45.firstChild;
				var _el$47 = _el$46.nextSibling;
				var _el$48 = _el$45.nextSibling;
				var _el$49 = _el$48.firstChild;
				var _el$50 = _el$49.nextSibling;
				var _el$52 = _el$48.nextSibling.firstChild;
				var _el$53 = _el$52.nextSibling;
				var _el$54 = _el$42.nextSibling;
				var _el$55 = _el$54.firstChild;
				var _el$57 = _el$55.nextSibling.firstChild;
				var _el$58 = _el$57.firstChild;
				var _el$59 = _el$58.nextSibling;
				var _el$60 = _el$59.nextSibling;
				var _el$64 = _el$57.nextSibling;
				var _el$65 = _el$64.firstChild;
				var _el$67 = _el$64.nextSibling;
				var _el$68 = _el$67.firstChild;
				var _el$71 = _el$54.nextSibling.firstChild;
				var _el$73 = _el$71.nextSibling.nextSibling;
				var _el$75 = _el$73.nextSibling.nextSibling;
				var _el$77 = _el$75.nextSibling.nextSibling;
				insert(_el$18, () => {
					return t("overview.context");
				});
				insert(_el$19, () => {
					return t("overview.windowNote", {
						used: number(panel.usage()?.tokens),
						limit: number(panel.usage()?.limit)
					});
				});
				insert(_el$21, () => {
					return percent(panel.usage()?.percent);
				}, _el$22);
				insert(_el$23, createComponent(Show, {
					get when() {
						return panel.thresholds();
					},
					get children() {
						var _el$25 = _tmpl$3$5();
						effect(() => `${Math.min(100, Math.max(0, panel.thresholds().percent ?? 0))}%`, (_v$) => {
							setStyleProperty(_el$25, "inset-inline-start", _v$);
						});
						return _el$25;
					}
				}), null);
				insert(_el$26, createComponent(Show, {
					get when() {
						return panel.thresholds();
					},
					get children() {
						var _el$27 = _tmpl$4$5();
						insert(_el$27, () => {
							return t("overview.threshold", {
								percent: percent(panel.thresholds().percent),
								tokens: number(panel.thresholds().tokens)
							});
						});
						return _el$27;
					}
				}), _el$28);
				insert(_el$26, createComponent(Show, {
					get when() {
						return memo(() => {
							return panel.usage()?.native !== null;
						})() && panel.usage()?.native !== void 0;
					},
					get children() {
						var _el$29 = _tmpl$5$4();
						insert(_el$29, () => {
							return t("overview.raw", { percent: percent(panel.usage()?.native) });
						});
						return _el$29;
					}
				}), _el$30);
				insert(_el$33, () => {
					return t("overview.composition");
				});
				insert(_el$32, createComponent(Show, {
					get when() {
						return panel.composition();
					},
					children: (view) => (() => {
						var _el$79 = _tmpl$12$1();
						insert(_el$79, () => {
							return t("overview.contextShare", {
								tokens: number(view().magicContextTokens),
								share: `${view().magicContextShare.toFixed(1)}%`
							});
						});
						return _el$79;
					})()
				}), null);
				insert(_el$31, createComponent(Show, {
					get when() {
						return panel.composition();
					},
					get fallback() {
						var _el$80 = _tmpl$13$1();
						insert(_el$80, () => {
							return t("overview.compositionOffline");
						});
						return _el$80;
					},
					children: (view) => (() => {
						var _el$81 = _tmpl$14();
						var _el$82 = _el$81.firstChild;
						var _el$83 = _el$82.firstChild;
						var _el$84 = _el$83.nextSibling;
						var _el$85 = _el$84.nextSibling;
						var _el$86 = _el$82.nextSibling;
						var _el$87 = _el$86.firstChild;
						var _el$89 = _el$87.firstChild.nextSibling;
						var _el$91 = _el$89.nextSibling.nextSibling;
						insert(_el$86, createComponent(For, {
							get each() {
								return view().rows;
							},
							children: (row) => createComponent(Show, {
								get when() {
									return row.key === "conversation";
								},
								get fallback() {
									var _el$102 = _tmpl$17();
									var _el$103 = _el$102.firstChild;
									var _el$104 = _el$103.nextSibling;
									var _el$106 = _el$104.nextSibling;
									var _el$107 = _el$106.nextSibling;
									var _el$108 = _el$107.nextSibling;
									var _el$109 = _el$108.firstChild;
									insert(_el$104, () => {
										return t(row.label === "profile" ? "overview.profileDocs" : `overview.${row.label}`);
									});
									insert(_el$102, createComponent(Show, {
										get when() {
											return memo(() => {
												return row.count !== null;
											})() && row.count !== void 0;
										},
										get children() {
											var _el$105 = _tmpl$16();
											insert(_el$105, (() => {
												var _c$2 = memo(() => {
													return row.key === "memories";
												});
												return () => {
													return _c$2() ? t("overview.blocks", { n: number(row.count) }) : number(row.count);
												};
											})());
											return _el$105;
										}
									}), _el$106);
									insert(_el$107, () => {
										return number(row.tokens);
									});
									insert(_el$108, () => {
										return row.share.toFixed(1);
									}, _el$109);
									effect(() => {
										return {
											e: row.tokens === 0,
											t: row.band
										};
									}, ({ e, t }, _p$) => {
										e !== _p$?.e && setAttribute(_el$102, "data-zero", e);
										t !== _p$?.t && setAttribute(_el$103, "data-band", t);
									});
									return _el$102;
								},
								get children() {
									var _el$92 = _tmpl$15();
									var _el$93 = _el$92.firstChild;
									var _el$94 = _el$93.firstChild;
									var _el$95 = _el$94.nextSibling;
									var _el$98 = _el$95.nextSibling.nextSibling.nextSibling;
									var _el$99 = _el$98.nextSibling;
									var _el$100 = _el$99.firstChild;
									var _el$101 = _el$93.nextSibling;
									_el$93._$$click = () => void panel.setCompositionOpen(!panel.compositionOpen());
									insert(_el$95, () => {
										return t("overview.conversationTools");
									});
									insert(_el$98, () => {
										return number(row.tokens);
									});
									insert(_el$99, () => {
										return row.share.toFixed(1);
									}, _el$100);
									insert(_el$101, createComponent(For, {
										get each() {
											return view().subRows;
										},
										children: (sub) => (() => {
											var _el$110 = _tmpl$18();
											var _el$111 = _el$110.firstChild;
											var _el$112 = _el$111.nextSibling;
											var _el$113 = _el$112.nextSibling;
											var _el$114 = _el$113.firstChild;
											insert(_el$111, () => {
												return t(sub.key === "toolCalls" ? "overview.toolCalls" : sub.key === "toolDefinitions" ? "overview.toolDefinitions" : "overview.conversation");
											});
											insert(_el$112, () => {
												return number(sub.tokens);
											});
											insert(_el$113, () => {
												return sub.share.toFixed(1);
											}, _el$114);
											return _el$110;
										})()
									}));
									effect(() => {
										return {
											e: panel.compositionOpen() ? "true" : "false",
											t: row.band,
											a: !panel.compositionOpen()
										};
									}, ({ e, t, a }, _p$) => {
										e !== _p$?.e && setAttribute(_el$93, "aria-expanded", e);
										t !== _p$?.t && setAttribute(_el$94, "data-band", t);
										a !== _p$?.a && setAttribute(_el$101, "hidden", a);
									});
									return _el$92;
								}
							})
						}), _el$87);
						insert(_el$89, () => {
							return t("overview.inputTokens");
						});
						insert(_el$91, () => {
							return number(view().total);
						});
						effect(() => {
							return {
								e: t("overview.bandLabel", {
									conversation: number(view().rows.find((row) => row.key === "conversation")?.tokens),
									system: number(view().rows.find((row) => row.key === "system")?.tokens),
									context: number(view().magicContextTokens)
								}),
								t: `${view().bands.system}%`,
								a: `${view().bands.conversation}%`,
								o: `${view().bands.context}%`
							};
						}, ({ e, t, a, o }, _p$) => {
							e !== _p$?.e && setAttribute(_el$82, "aria-label", e);
							t !== _p$?.t && setStyleProperty(_el$83, "width", t);
							a !== _p$?.a && setStyleProperty(_el$84, "width", a);
							o !== _p$?.o && setStyleProperty(_el$85, "width", o);
						});
						return _el$81;
					})()
				}), null);
				insert(_el$15, createComponent(Show, {
					get when() {
						return memo(() => {
							return !!(panel.snapshot()?.live.source === "rpc" && !panel.isStale());
						})() ? panel.snapshot()?.cache : panel.snapshot()?.live.source === "rpc" && !panel.isStale();
					},
					get children() {
						var _el$34 = _tmpl$6$4();
						var _el$35 = _el$34.firstChild;
						var _el$36 = _el$35.firstChild;
						var _el$37 = _el$36.nextSibling;
						var _el$39 = _el$35.nextSibling.firstChild;
						var _el$40 = _el$39.nextSibling;
						var _el$41 = _el$40.firstChild;
						insert(_el$36, () => {
							return t("overview.cache");
						});
						insert(_el$37, () => {
							return t("overview.cacheTtl", { ttl: panel.snapshot()?.cache?.ttl ?? "—" });
						});
						insert(_el$39, createComponent(Show, {
							get when() {
								return (cacheLeftMs(panel) ?? 0) > 0;
							},
							get fallback() {
								return t("overview.cacheExpired");
							},
							get children() {
								return (() => {
									const left = Math.floor((cacheLeftMs(panel) ?? 0) / 1e3);
									return t("overview.cacheLeft", {
										m: Math.floor(left / 60),
										s: String(left % 60).padStart(2, "0")
									});
								})();
							}
						}));
						effect(() => {
							return {
								e: Math.round((cacheLeftMs(panel) ?? 0) / (panel.snapshot()?.cache?.ttlMs || 1) * 100),
								t: t("overview.cacheMeterLabel"),
								a: `${Math.min(100, Math.max(0, (cacheLeftMs(panel) ?? 0) / (panel.snapshot()?.cache?.ttlMs || 1) * 100))}%`
							};
						}, ({ e, t, a }, _p$) => {
							e !== _p$?.e && setAttribute(_el$40, "aria-valuenow", e);
							t !== _p$?.t && setAttribute(_el$40, "aria-label", t);
							a !== _p$?.a && setStyleProperty(_el$41, "width", a);
						});
						return _el$34;
					}
				}), _el$42);
				insert(_el$43, () => {
					return t("overview.sessionCounts");
				});
				insert(_el$46, () => {
					return t("overview.compartmentsCount");
				});
				insert(_el$47, () => {
					return number(panel.counts()?.compartments);
				});
				insert(_el$49, () => {
					return t("overview.memoryBlocks");
				});
				insert(_el$50, () => {
					return number(panel.counts()?.memoryBlocks);
				});
				insert(_el$52, () => {
					return t("overview.sessionNotes");
				});
				insert(_el$53, () => {
					return number(panel.counts()?.sessionNotes);
				});
				insert(_el$55, () => {
					return t("overview.projectCounts");
				});
				insert(_el$58, () => {
					return t("view.memories");
				});
				insert(_el$59, () => {
					return number(panel.counts()?.memoriesActive);
				});
				insert(_el$60, () => {
					return t("overview.statActive");
				});
				insert(_el$57, createComponent(Show, {
					get when() {
						return (panel.counts()?.memoriesArchived ?? 0) > 0;
					},
					get children() {
						return [
							_tmpl$7$3(),
							(() => {
								var _el$62 = _tmpl$8$3();
								insert(_el$62, () => {
									return number(panel.counts()?.memoriesArchived);
								});
								return _el$62;
							})(),
							(() => {
								var _el$63 = _tmpl$9$1();
								insert(_el$63, () => {
									return t("overview.statArchived");
								});
								return _el$63;
							})()
						];
					}
				}), null);
				insert(_el$65, () => {
					return t("notes.smartGroup");
				});
				insert(_el$64, createComponent(Show, {
					get when() {
						return panel.snapshot()?.live.source === "rpc";
					},
					get fallback() {
						return _tmpl$19();
					},
					get children() {
						var _el$66 = _tmpl$8$3();
						insert(_el$66, () => {
							return number(panel.counts()?.readySmartNotes);
						});
						return _el$66;
					}
				}), null);
				insert(_el$68, () => {
					return t("overview.memoryIndex");
				});
				insert(_el$67, createComponent(Show, {
					get when() {
						return memo(() => {
							return panel.snapshot()?.live.source === "rpc";
						})() && panel.counts()?.embedding;
					},
					get fallback() {
						return _tmpl$19();
					},
					get children() {
						var _el$69 = _tmpl$8$3();
						insert(_el$69, () => {
							return `${number(panel.counts()?.embedding?.indexed)} / ${number(panel.counts()?.embedding?.total)}`;
						});
						return _el$69;
					}
				}), null);
				insert(_el$71, () => {
					return panel.snapshot()?.project?.id?.slice(0, 11) ?? "—";
				});
				insert(_el$73, () => {
					return panel.target().sessionId?.slice(0, 16) ?? "—";
				});
				insert(_el$75, (() => {
					var _c$ = memo(() => {
						return panel.snapshot()?.live.source === "rpc";
					});
					return () => {
						return _c$() ? t("overview.footSource", {
							source: t("source.rpc"),
							plugin: panel.snapshot()?.live.pluginVersion ?? "—"
						}) : t("overview.footDatabase");
					};
				})());
				insert(_el$77, () => {
					return t("overview.footSchema", { version: number(panel.snapshot()?.schema.dbVersion) });
				});
				effect(() => {
					return {
						e: Math.round(panel.usage()?.percent ?? 0),
						t: t("overview.meterLabel", { percent: percent(panel.usage()?.percent) }),
						a: panel.thresholds() ? t("overview.meterTitle", {
							soft: number(panel.thresholds()?.soft),
							hard: number(panel.thresholds()?.hard)
						}) : void 0,
						o: `${Math.min(100, Math.max(0, panel.usage()?.percent ?? 0))}%`,
						i: panel.counts()?.compartments === null,
						n: panel.counts()?.memoryBlocks === null,
						s: panel.snapshot()?.project?.id ?? "",
						h: panel.target().sessionId ?? ""
					};
				}, ({ e, t, a, o, i, n, s, h }, _p$) => {
					e !== _p$?.e && setAttribute(_el$23, "aria-valuenow", e);
					t !== _p$?.t && setAttribute(_el$23, "aria-label", t);
					a !== _p$?.a && setAttribute(_el$23, "title", a);
					o !== _p$?.o && setStyleProperty(_el$24, "width", o);
					i !== _p$?.i && setAttribute(_el$47, "data-missing", i);
					n !== _p$?.n && setAttribute(_el$50, "data-missing", n);
					s !== _p$?.s && setAttribute(_el$71, "title", s);
					h !== _p$?.h && setAttribute(_el$73, "title", h);
				});
				return _el$14;
			}
		}), _el$78);
		effect(() => panel.view() === "overview" ? "true" : "false", (_v$) => {
			setAttribute(_el$9, "data-active", _v$);
		});
		return _el$9;
	};
	delegateEvents(["click"]);
	// panel/components/Content.tsx
	var _tmpl$$4 = /* @__PURE__ */ template(`<span class=mc-h>`);
	var _tmpl$2$4 = /* @__PURE__ */ template(`<code>`);
	var _tmpl$3$4 = /* @__PURE__ */ template(`<strong>`);
	var _tmpl$4$4 = /* @__PURE__ */ template(`<dl class=mc-prov>`);
	var _tmpl$5$3 = /* @__PURE__ */ template(`<dt>`);
	var _tmpl$6$3 = /* @__PURE__ */ template(`<dd>`);
	var _tmpl$7$2 = /* @__PURE__ */ template(`<div class=mc-detail-empty>`);
	var _tmpl$8$2 = /* @__PURE__ */ template(`<div class=mc-detail-head><span class=mc-label></span><span class="oc-sdk-badge mc-badge"></span><span class="mc-detail-id mc-mono">#`);
	var _tmpl$9 = /* @__PURE__ */ template(`<div class=mc-detail-inner><div class=mc-content></div><div class=oc-sdk-separator data-labeled=false>`);
	var _tmpl$10 = /* @__PURE__ */ template(`<span class="oc-sdk-badge mc-badge">`);
	var _tmpl$11 = /* @__PURE__ */ template(`<div class=mc-detail-head><span class=mc-label></span><span class="mc-detail-id mc-mono">#`);
	var _tmpl$12 = /* @__PURE__ */ template(`<div class=mc-condition><span class=mc-condition-label></span><span class=mc-condition-body>`);
	var _tmpl$13 = /* @__PURE__ */ template(`<div class=mc-detail-inner><div class=mc-content></div><div class=oc-sdk-separator data-labeled=false></div><!>`);
	var inline = (text) => {
		const segments = [];
		for (const part of text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)) {
			if (!part) continue;
			if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) segments.push({
				kind: "code",
				text: part.slice(1, -1)
			});
			else if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) segments.push({
				kind: "bold",
				text: part.slice(2, -2)
			});
			else segments.push({
				kind: "text",
				text: part
			});
		}
		return segments;
	};
	var parse = (text) => text.split("\n").map((line) => {
		const heading = /^#{1,6}\s+(.*)$/.exec(line);
		return {
			heading: heading !== null,
			segments: inline(heading ? heading[1] : line)
		};
	});
	var RichText = (props) => {
		const lines = () => parse(props.text ?? "");
		return createComponent(For, {
			get each() {
				return lines();
			},
			children: (line, index) => [memo(() => {
				return index() > 0 ? "\n" : "";
			}), createComponent(Show, {
				get when() {
					return line.heading;
				},
				get fallback() {
					return createComponent(Segments, { get segments() {
						return line.segments;
					} });
				},
				get children() {
					var _el$ = _tmpl$$4();
					insert(_el$, createComponent(Segments, { get segments() {
						return line.segments;
					} }));
					return _el$;
				}
			})]
		});
	};
	var Segments = (props) => createComponent(For, {
		get each() {
			return props.segments;
		},
		children: (segment) => createComponent(Show, {
			get when() {
				return segment.kind === "code";
			},
			get fallback() {
				return createComponent(Show, {
					get when() {
						return segment.kind === "bold";
					},
					get fallback() {
						return memo(() => {
							return segment.text;
						});
					},
					get children() {
						var _el$3 = _tmpl$3$4();
						insert(_el$3, () => {
							return segment.text;
						});
						return _el$3;
					}
				});
			},
			get children() {
				var _el$2 = _tmpl$2$4();
				insert(_el$2, () => {
					return segment.text;
				});
				return _el$2;
			}
		})
	});
	var categoryKey = (category) => {
		switch (category) {
			case "PROJECT_RULES": return "memories.cat.rules";
			case "CONSTRAINTS": return "memories.cat.constraints";
			case "CONFIG_VALUES": return "memories.cat.config";
			case "NAMING": return "memories.cat.naming";
			default: return "memories.cat.architecture";
		}
	};
	var Provenance = (props) => (() => {
		var _el$4 = _tmpl$4$4();
		insert(_el$4, createComponent(For, {
			get each() {
				return props.pairs.filter((pair) => pair.value !== "");
			},
			children: (pair) => [(() => {
				var _el$5 = _tmpl$5$3();
				insert(_el$5, () => {
					return pair.term;
				});
				effect(() => pair.iso ?? void 0, (_v$) => {
					setAttribute(_el$5, "title", _v$);
				});
				return _el$5;
			})(), (() => {
				var _el$6 = _tmpl$6$3();
				insert(_el$6, (() => {
					var _c$ = memo(() => {
						return !!pair.iso;
					});
					return () => {
						return _c$() ? age(pair.iso, "long", props.now) : pair.value;
					};
				})());
				effect(() => {
					return {
						e: readShallow(pair.mono || pair.id ? pair.id ? "mc-mono mc-id" : "mc-mono" : void 0),
						t: pair.id || pair.iso ? pair.value : void 0
					};
				}, ({ e, t }, _p$) => {
					className(_el$6, e, _p$?.e);
					t !== _p$?.t && setAttribute(_el$6, "title", t);
				});
				return _el$6;
			})()]
		}));
		return _el$4;
	})();
	var MemoryDetail = (props) => createComponent(Show, {
		get when() {
			return props.row;
		},
		get fallback() {
			return _tmpl$7$2();
		},
		children: (row) => [(() => {
			var _el$8 = _tmpl$8$2();
			var _el$9 = _el$8.firstChild;
			var _el$10 = _el$9.nextSibling;
			var _el$11 = _el$10.nextSibling;
			_el$11.firstChild;
			insert(_el$9, () => {
				return t(categoryKey(row().category));
			});
			insert(_el$10, () => {
				return t(row().status === "archived" ? "memories.status.archived" : "memories.status.active");
			});
			insert(_el$11, () => {
				return row().id;
			}, null);
			effect(() => row().status === "archived" ? "neutral" : void 0, (_v$) => {
				setAttribute(_el$10, "data-tone", _v$);
			});
			return _el$8;
		})(), (() => {
			var _el$13 = _tmpl$9();
			var _el$14 = _el$13.firstChild;
			_el$14.nextSibling;
			insert(_el$14, createComponent(RichText, { get text() {
				return row().content;
			} }));
			insert(_el$13, createComponent(Provenance, {
				get now() {
					return props.now;
				},
				get pairs() {
					return [
						{
							term: t("memories.detail.importance"),
							value: row().classifiedAt ? number(row().importance) : `${number(row().importance)} · ${t("memories.detail.unclassified")}`,
							mono: true
						},
						{
							term: t("memories.detail.seen"),
							value: number(row().seenCount),
							mono: true
						},
						{
							term: t("memories.detail.retrieved"),
							value: number(row().retrievalCount),
							mono: true
						},
						{
							term: t("memories.detail.first"),
							value: row().firstSeenAt ?? "",
							iso: row().firstSeenAt ?? void 0
						},
						{
							term: t("memories.detail.updated"),
							value: row().updatedAt ?? "",
							iso: row().updatedAt ?? void 0
						},
						{
							term: t("memories.detail.category"),
							value: row().category,
							mono: true
						}
					];
				}
			}), null);
			return _el$13;
		})()]
	});
	var NoteDetail = (props) => createComponent(Show, {
		get when() {
			return props.row;
		},
		get fallback() {
			return _tmpl$7$2();
		},
		children: (row) => [(() => {
			var _el$17 = _tmpl$11();
			var _el$18 = _el$17.firstChild;
			var _el$20 = _el$18.nextSibling;
			_el$20.firstChild;
			insert(_el$18, () => {
				return t(row().type === "smart" ? "notes.kind.smart" : "notes.kind.session");
			});
			insert(_el$17, createComponent(Show, {
				get when() {
					return row().status !== "active";
				},
				get children() {
					var _el$19 = _tmpl$10();
					insert(_el$19, () => {
						return t(`notes.status.${row().status}`);
					});
					effect(() => row().status === "ready" ? "success" : "neutral", (_v$) => {
						setAttribute(_el$19, "data-tone", _v$);
					});
					return _el$19;
				}
			}), _el$20);
			insert(_el$20, () => {
				return row().id;
			}, null);
			return _el$17;
		})(), (() => {
			var _el$22 = _tmpl$13();
			var _el$26 = _el$22.firstChild;
			var _el$28 = _el$26.nextSibling.nextSibling;
			insert(_el$22, createComponent(Show, {
				get when() {
					return memo(() => {
						return row().type === "smart";
					})() && row().surfaceCondition;
				},
				get children() {
					var _el$23 = _tmpl$12();
					var _el$24 = _el$23.firstChild;
					var _el$25 = _el$24.nextSibling;
					insert(_el$24, () => {
						return t(row().status === "ready" ? "notes.conditionReady" : "notes.condition");
					});
					insert(_el$25, () => {
						return row().surfaceCondition;
					});
					return _el$23;
				}
			}), _el$26);
			insert(_el$26, createComponent(RichText, { get text() {
				return row().content;
			} }));
			insert(_el$22, createComponent(Provenance, {
				get now() {
					return props.now;
				},
				get pairs() {
					return [
						{
							term: t("notes.detail.created"),
							value: row().createdAt ?? "",
							iso: row().createdAt ?? void 0
						},
						{
							term: t("notes.detail.updated"),
							value: row().updatedAt ?? "",
							iso: row().updatedAt ?? void 0
						},
						{
							term: t("notes.detail.session"),
							value: row().sessionId ?? "",
							id: true
						},
						{
							term: t("notes.detail.project"),
							value: row().projectId ?? "",
							id: true
						}
					];
				}
			}), _el$28);
			return _el$22;
		})()]
	});
	// panel/components/Lists.tsx
	var _tmpl$$3 = /* @__PURE__ */ template(`<button class="oc-sdk-trigger mc-filter-btn"type=button aria-haspopup=dialog><svg class=mc-filter-icon width=13 height=13 viewBox="0 0 24 24"aria-hidden=true fill=currentColor><path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"></path></svg><span class=oc-sdk-trigger-value></span><svg class=oc-sdk-trigger-chevron width=14 height=14 viewBox="0 0 24 24"aria-hidden=true fill=currentColor><path d="M12 13.172l4.95-4.95 1.414 1.414L12 16 5.636 9.636 7.05 8.222z">`);
	var _tmpl$2$3 = /* @__PURE__ */ template(`<div class="oc-sdk-popup mc-popup mc-filter-panel"role=dialog><div class=mc-chip-group role=group aria-labelledby=flt-status><span class=mc-label id=flt-status></span><div class=mc-chips></div></div><div class=mc-chip-group role=group aria-labelledby=flt-category><span class=mc-label id=flt-category></span><div class=mc-chips></div></div><div class=mc-filter-foot><button class=oc-sdk-btn data-variant=ghost data-size=xs type=button>`);
	var _tmpl$3$3 = /* @__PURE__ */ template(`<button class=oc-sdk-btn data-size=xs type=button><span></span><span class=mc-chip-count>`);
	var _tmpl$4$3 = /* @__PURE__ */ template(`<button class=oc-sdk-btn data-size=xs type=button>`);
	var _tmpl$5$2 = /* @__PURE__ */ template(`<span class="oc-sdk-badge mc-badge"data-tone=neutral>`);
	var _tmpl$6$2 = /* @__PURE__ */ template(`<div class=mc-item role=option><div class=mc-meta><span class=mc-cat></span><span class=mc-dotsep></span><span class=mc-age></span><span class=mc-imp></span></div><div class=mc-text>`);
	var _tmpl$7$1 = /* @__PURE__ */ template(`<span class="oc-sdk-badge mc-badge">`);
	var _tmpl$8$1 = /* @__PURE__ */ template(`<div class=mc-item role=option><div class=mc-meta><span class=mc-age></span></div><div class=mc-text>`);
	var CATEGORY_VALUES = [
		"all",
		"rules",
		"architecture",
		"constraints",
		"config",
		"naming"
	];
	var CATEGORY_LABELS = {
		all: "memories.all",
		rules: "memories.cat.rules",
		architecture: "memories.cat.architecture",
		constraints: "memories.cat.constraints",
		config: "memories.cat.config",
		naming: "memories.cat.naming"
	};
	var STATUS_VALUES = [
		"all",
		"active",
		"archived"
	];
	var FilterPanel = (props) => {
		const active = () => props.status !== "all" || props.category !== "all";
		const label = () => {
			const parts = [];
			if (props.status !== "all") parts.push(t(`memories.status.${props.status}`));
			if (props.category !== "all") parts.push(t(CATEGORY_LABELS[props.category] ?? "memories.all"));
			return parts.length > 0 ? parts.join(" · ") : t("memories.filters");
		};
		let popup;
		return [(() => {
			var _el$ = _tmpl$$3();
			var _el$3 = _el$.firstChild.nextSibling;
			_el$._$$click = () => props.onOpen(!props.open);
			insert(_el$3, label);
			effect(() => {
				return {
					e: props.open ? "true" : "false",
					t: active() ? "true" : "false",
					a: active() ? `${t("memories.filters")}: ${label()}` : t("memories.filters"),
					o: active() ? `${t("memories.filters")}: ${label()}` : t("memories.filters"),
					i: !active() ? "true" : "false"
				};
			}, ({ e, t, a, o, i }, _p$) => {
				e !== _p$?.e && setAttribute(_el$, "aria-expanded", e);
				t !== _p$?.t && setAttribute(_el$, "data-active", t);
				a !== _p$?.a && setAttribute(_el$, "aria-label", a);
				o !== _p$?.o && setAttribute(_el$, "title", o);
				i !== _p$?.i && setAttribute(_el$3, "data-empty", i);
			});
			return _el$;
		})(), (() => {
			var _el$4 = _tmpl$2$3();
			var _el$5 = _el$4.firstChild;
			var _el$6 = _el$5.firstChild;
			var _el$7 = _el$6.nextSibling;
			var _el$8 = _el$5.nextSibling;
			var _el$9 = _el$8.firstChild;
			var _el$10 = _el$9.nextSibling;
			var _el$11 = _el$8.nextSibling;
			var _el$12 = _el$11.firstChild;
			_el$4._$$keydown = (event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					props.onOpen(false);
					(popup?.previousElementSibling)?.focus();
				}
			};
			ref(() => {
				return (element) => {
					popup = element;
				};
			}, _el$4);
			insert(_el$6, () => {
				return t("memories.filterStatus");
			});
			insert(_el$7, createComponent(For, {
				each: STATUS_VALUES,
				children: (value) => (() => {
					var _el$13 = _tmpl$3$3();
					var _el$14 = _el$13.firstChild;
					var _el$15 = _el$14.nextSibling;
					_el$13._$$click = () => props.onStatus(value);
					insert(_el$14, () => {
						return t(value === "all" ? "memories.all" : `memories.status.${value}`);
					});
					insert(_el$15, () => {
						return value === "all" ? props.counts.total : value === "active" ? props.counts.active : props.counts.archived;
					});
					effect(() => {
						return {
							e: props.status === value ? "default" : "outline",
							t: props.status === value ? "true" : "false"
						};
					}, ({ e, t }, _p$) => {
						e !== _p$?.e && setAttribute(_el$13, "data-variant", e);
						t !== _p$?.t && setAttribute(_el$13, "aria-pressed", t);
					});
					return _el$13;
				})()
			}));
			insert(_el$9, () => {
				return t("memories.filterCategory");
			});
			insert(_el$10, createComponent(For, {
				each: CATEGORY_VALUES,
				children: (value) => (() => {
					var _el$16 = _tmpl$4$3();
					_el$16._$$click = () => props.onCategory(value);
					insert(_el$16, () => {
						return t(CATEGORY_LABELS[value]);
					});
					effect(() => {
						return {
							e: props.category === value ? "default" : "outline",
							t: props.category === value ? "true" : "false"
						};
					}, ({ e, t }, _p$) => {
						e !== _p$?.e && setAttribute(_el$16, "data-variant", e);
						t !== _p$?.t && setAttribute(_el$16, "aria-pressed", t);
					});
					return _el$16;
				})()
			}));
			_el$12._$$click = () => props.onClear();
			insert(_el$12, () => {
				return t("memories.noMatch.action");
			});
			effect(() => {
				return {
					e: t("memories.filters"),
					t: !props.open,
					a: !active()
				};
			}, ({ e, t, a }, _p$) => {
				e !== _p$?.e && setAttribute(_el$4, "aria-label", e);
				t !== _p$?.t && setAttribute(_el$4, "hidden", t);
				a !== _p$?.a && setAttribute(_el$11, "hidden", a);
			});
			return _el$4;
		})()];
	};
	var preview = (text) => text.replace(/^#{1,6}\s+/gm, "").replace(/\*\*|__/g, "").replace(/`/g, "").replace(/\s+/g, " ").trim();
	var MemoryRow = (props) => (() => {
		var _el$17 = _tmpl$6$2();
		var _el$18 = _el$17.firstChild;
		var _el$19 = _el$18.firstChild;
		var _el$21 = _el$19.nextSibling;
		var _el$22 = _el$21.nextSibling;
		var _el$23 = _el$22.nextSibling;
		var _el$24 = _el$18.nextSibling;
		_el$17._$$click = () => props.onSelect(props.row);
		insert(_el$19, () => {
			return t(categoryKey(props.row.category));
		});
		insert(_el$18, createComponent(Show, {
			get when() {
				return props.row.status === "archived";
			},
			get children() {
				var _el$20 = _tmpl$5$2();
				insert(_el$20, () => {
					return t("memories.status.archived");
				});
				return _el$20;
			}
		}), _el$21);
		insert(_el$22, () => {
			return age(props.row.updatedAt, "short", props.now);
		});
		insert(_el$23, () => {
			return number(props.row.importance);
		});
		insert(_el$24, () => {
			return preview(props.row.content);
		});
		effect(() => {
			return {
				e: props.selected ? "true" : "false",
				t: props.tabIndex,
				a: props.row.id
			};
		}, ({ e, t, a }, _p$) => {
			e !== _p$?.e && setAttribute(_el$17, "aria-selected", e);
			t !== _p$?.t && setAttribute(_el$17, "tabindex", t);
			a !== _p$?.a && setAttribute(_el$17, "data-id", a);
		});
		return _el$17;
	})();
	var noteTone = (status) => status === "ready" ? "success" : status === "pending" ? "warning" : "neutral";
	var NoteRow = (props) => (() => {
		var _el$25 = _tmpl$8$1();
		var _el$26 = _el$25.firstChild;
		var _el$28 = _el$26.firstChild;
		var _el$29 = _el$26.nextSibling;
		_el$25._$$click = () => props.onSelect(props.row);
		insert(_el$26, createComponent(Show, {
			get when() {
				return props.row.status !== "active" || props.row.type === "smart";
			},
			get children() {
				var _el$27 = _tmpl$7$1();
				insert(_el$27, () => {
					return t(`notes.status.${props.row.status}`);
				});
				effect(() => noteTone(props.row.status), (_v$) => {
					setAttribute(_el$27, "data-tone", _v$);
				});
				return _el$27;
			}
		}), _el$28);
		insert(_el$28, () => {
			return age(props.row.updatedAt, "long", props.now);
		});
		insert(_el$29, () => {
			return preview(props.row.content);
		});
		effect(() => {
			return {
				e: props.selected ? "true" : "false",
				t: props.tabIndex,
				a: props.row.id,
				o: props.row.type
			};
		}, ({ e, t, a, o }, _p$) => {
			e !== _p$?.e && setAttribute(_el$25, "aria-selected", e);
			t !== _p$?.t && setAttribute(_el$25, "tabindex", t);
			a !== _p$?.a && setAttribute(_el$25, "data-id", a);
			o !== _p$?.o && setAttribute(_el$25, "data-kind", o);
		});
		return _el$25;
	})();
	var walkList = (event) => {
		const rows = [...event.currentTarget.querySelectorAll(".mc-item")];
		if (rows.length === 0) return null;
		const current = rows.indexOf(document.activeElement);
		if (event.key === "ArrowDown") return rows[Math.min(rows.length - 1, current + 1)];
		if (event.key === "ArrowUp") return rows[Math.max(0, current - 1)];
		if (event.key === "Home") return rows[0];
		if (event.key === "End") return rows[rows.length - 1];
		return null;
	};
	delegateEvents(["click", "keydown"]);
	// panel/views/Memories.tsx
	var _tmpl$$2 = /* @__PURE__ */ template(`<div class=mc-filters><!><!>`);
	var _tmpl$2$2 = /* @__PURE__ */ template(`<button class="oc-sdk-btn mc-loadmore"data-variant=ghost data-size=sm type=button>`);
	var _tmpl$3$2 = /* @__PURE__ */ template(`<div class=mc-scroll><div class=mc-list role=listbox></div><div class=mc-list-foot><span class=mc-list-count>`);
	var _tmpl$4$2 = /* @__PURE__ */ template(`<div class="mc-state mc-skeleton"style="padding:4px 12px">`);
	var _tmpl$5$1 = /* @__PURE__ */ template(`<section class="mc-view mc-split"data-view=memories><div class=mc-list-pane><!><!><!><!><!><!><!></div><div class=mc-detail-pane><div class=mc-detail-scroll>`);
	var _tmpl$6$1 = /* @__PURE__ */ template(`<div class=mc-skeleton-row><span class=mc-skel data-h=8 style=width:38%></span><span class=mc-skel data-h=8 style=width:96%></span><span class=mc-skel data-h=8 style=width:64%>`);
	var Memories = (props) => {
		const panel = props.panel;
		createEffect(() => ({
			rows: panel.memoryRows(),
			selected: panel.selectedMemoryId()
		}), ({ rows, selected }) => {
			if (rows.length === 0 || selected !== null) return;
			if (matchMedia("(max-width: 599.98px)").matches) return;
			panel.selectMemory(rows[0].id);
		});
		let list;
		const selectElement = (element, open = false) => {
			const id = Number(element.dataset.id);
			const row = panel.memoryRows().find((candidate) => candidate.id === id);
			if (row) panel.selectMemory(row.id, open);
		};
		var _el$ = _tmpl$5$1();
		var _el$2 = _el$.firstChild;
		var _el$6 = _el$2.firstChild;
		var _el$12 = _el$6.nextSibling;
		var _el$14 = _el$12.nextSibling;
		var _el$15 = _el$14.nextSibling;
		var _el$16 = _el$15.nextSibling;
		var _el$17 = _el$16.nextSibling;
		var _el$18 = _el$17.nextSibling;
		var _el$20 = _el$2.nextSibling.firstChild;
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "content";
			},
			get children() {
				var _el$3 = _tmpl$$2();
				var _el$4 = _el$3.firstChild;
				var _el$5 = _el$4.nextSibling;
				insert(_el$3, createComponent(KitSearch, {
					get value() {
						return panel.query();
					},
					onChange: (value) => panel.setSearch(value),
					get placeholder() {
						return t("memories.searchPlaceholder");
					},
					get label() {
						return t("memories.searchLabel");
					},
					onKeyDown: (event) => {
						if (event.key === "ArrowDown" && list) {
							const first = list.querySelector(".mc-item");
							if (first) {
								event.preventDefault();
								first.focus();
								selectElement(first);
							}
						}
					}
				}), _el$4);
				insert(_el$3, createComponent(FilterPanel, {
					get open() {
						return panel.filterOpen();
					},
					get status() {
						return panel.filters().status;
					},
					get category() {
						return panel.filters().category;
					},
					get counts() {
						return {
							total: panel.snapshot()?.counts?.memories?.total ?? 0,
							active: panel.memoryActive(),
							archived: panel.memoryArchived()
						};
					},
					onOpen: (open) => panel.setFilterOpen(open),
					onStatus: (status) => panel.applyFilters({ status }),
					onCategory: (category) => panel.applyFilters({ category }),
					onClear: () => panel.clearFilters()
				}), _el$5);
				return _el$3;
			}
		}), _el$6);
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "content";
			},
			get children() {
				var _el$7 = _tmpl$3$2();
				var _el$8 = _el$7.firstChild;
				var _el$9 = _el$8.nextSibling;
				var _el$11 = _el$9.firstChild;
				_el$8._$$keydown = (event) => {
					if (event.key === "Escape") return;
					const next = walkList(event);
					if (next) {
						event.preventDefault();
						next.focus();
						selectElement(next);
						return;
					}
					if (event.key === "Enter" || event.key === " ") {
						const active = document.activeElement;
						if (active?.classList.contains("mc-item")) {
							event.preventDefault();
							selectElement(active, true);
						}
					}
				};
				ref(() => {
					return (element) => {
						list = element;
					};
				}, _el$8);
				insert(_el$8, createComponent(For, {
					get each() {
						return panel.memoryRows();
					},
					children: (row, index) => createComponent(MemoryRow, {
						row,
						get selected() {
							return panel.selectedMemoryId() === row.id;
						},
						get now() {
							return panel.nowTick();
						},
						get tabIndex() {
							return panel.selectedMemoryId() === row.id || panel.selectedMemoryId() === null && index() === 0 ? 0 : -1;
						},
						onSelect: (next) => panel.selectMemory(next.id, true)
					})
				}));
				insert(_el$9, createComponent(Show, {
					get when() {
						return memo(() => {
							return !panel.filtering();
						})() && panel.memoryRows().length < panel.memoryTotal();
					},
					get children() {
						var _el$10 = _tmpl$2$2();
						_el$10._$$click = () => panel.loadMore();
						insert(_el$10, () => {
							return t("memories.loadMore");
						});
						return _el$10;
					}
				}), _el$11);
				insert(_el$11, createComponent(Show, {
					get when() {
						return !panel.filtering();
					},
					get fallback() {
						return t("memories.countMatching", { n: panel.listCount().matching ?? 0 });
					},
					get children() {
						return `${t("memories.countPage", {
							shown: panel.listCount().shown ?? 0,
							total: panel.listCount().total ?? 0
						})} · ${t("memories.countActive", { n: panel.listCount().active ?? 0 })}`;
					}
				}));
				effect(() => t("memories.listLabel"), (_v$) => {
					setAttribute(_el$8, "aria-label", _v$);
				});
				return _el$7;
			}
		}), _el$12);
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "loading";
			},
			get children() {
				var _el$13 = _tmpl$4$2();
				insert(_el$13, createComponent(For, {
					each: [
						0,
						1,
						2,
						3,
						4
					],
					children: () => (() => {
						var _el$21 = _tmpl$6$1();
						_el$21.firstChild.nextSibling.nextSibling;
						return _el$21;
					})()
				}));
				return _el$13;
			}
		}), _el$14);
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "no-project";
			},
			get children() {
				return createComponent(KitEmpty, {
					get title() {
						return t("memories.noProject.title");
					},
					get body() {
						return t("memories.noProject.body");
					}
				});
			}
		}), _el$15);
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "no-usage";
			},
			get children() {
				return createComponent(KitEmpty, {
					get title() {
						return t("memories.empty.title");
					},
					get body() {
						return t("memories.empty.body");
					}
				});
			}
		}), _el$16);
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "no-match";
			},
			get children() {
				return createComponent(KitEmpty, {
					get title() {
						return t("memories.noMatch.title");
					},
					get body() {
						return t("memories.noMatch.body");
					},
					get action() {
						return {
							label: t("memories.noMatch.action"),
							onClick: () => panel.clearFilters()
						};
					}
				});
			}
		}), _el$17);
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "error";
			},
			get children() {
				return createComponent(KitEmpty, {
					tone: "alert",
					get title() {
						return t("memories.error.title");
					},
					get body() {
						return t("memories.error.body");
					},
					get action() {
						return {
							label: t("state.retry"),
							onClick: () => panel.retry()
						};
					}
				});
			}
		}), _el$18);
		insert(_el$20, createComponent(MemoryDetail, {
			get row() {
				return panel.activeMemory();
			},
			get now() {
				return panel.nowTick();
			}
		}));
		effect(() => panel.view() === "memories" ? "true" : "false", (_v$) => {
			setAttribute(_el$, "data-active", _v$);
		});
		return _el$;
	};
	delegateEvents(["keydown", "click"]);
	// panel/views/Notes.tsx
	var _tmpl$$1 = /* @__PURE__ */ template(`<span class=mc-group-count>`);
	var _tmpl$2$1 = /* @__PURE__ */ template(`<p class=mc-inline-empty>`);
	var _tmpl$3$1 = /* @__PURE__ */ template(`<div class=mc-list role=listbox>`);
	var _tmpl$4$1 = /* @__PURE__ */ template(`<button class=mc-reveal type=button aria-controls=notes-dismissed>`);
	var _tmpl$5 = /* @__PURE__ */ template(`<div class="mc-list mc-list--muted"id=notes-dismissed role=listbox><!><!><!>`);
	var _tmpl$6 = /* @__PURE__ */ template(`<div class=mc-scroll><div class=mc-group data-group=session><div class=mc-group-head><h2 class=mc-label></h2></div><!><!><!><!></div><div class=mc-group data-group=smart><div class=mc-group-head><h2 class=mc-label></h2></div><!><!>`);
	var _tmpl$7 = /* @__PURE__ */ template(`<div class="mc-state mc-skeleton"style="padding:12px 12px 0"><div class=mc-skel data-h=8 style=width:88px;margin-bottom:10px></div><div class=mc-skeleton-row><span class=mc-skel data-h=8 style=width:26%></span><span class=mc-skel data-h=8 style=width:94%></span><span class=mc-skel data-h=8 style=width:60%></span></div><div class=mc-skeleton-row style=margin-top:14px><span class=mc-skel data-h=8 style=width:30%></span><span class=mc-skel data-h=8 style=width:86%></span><span class=mc-skel data-h=8 style=width:48%>`);
	var _tmpl$8 = /* @__PURE__ */ template(`<section class="mc-view mc-split"data-view=notes><div class=mc-list-pane><!><!><!><!><!></div><div class=mc-detail-pane><div class=mc-detail-scroll>`);
	var Notes = (props) => {
		const panel = props.panel;
		createEffect(() => ({
			notes: panel.notes(),
			selected: panel.selectedNoteId()
		}), ({ notes, selected }) => {
			if (notes === null || selected !== null) return;
			if (matchMedia("(max-width: 599.98px)").matches) return;
			const row = notes.sessionNotes?.[0] ?? notes.smartNotes?.[0];
			if (row) panel.selectNote(row.id);
		});
		const selectElement = (element, open = false) => {
			const id = Number(element.dataset.id);
			if (panel.allNotes().some((row) => row.id === id)) panel.selectNote(id, open);
		};
		const keyHandler = (event) => {
			if (event.key === "Escape") return;
			const next = walkList(event);
			if (next) {
				event.preventDefault();
				next.focus();
				selectElement(next);
				return;
			}
			if (event.key === "Enter" || event.key === " ") {
				const active = document.activeElement;
				if (active?.classList.contains("mc-item")) {
					event.preventDefault();
					selectElement(active, true);
				}
			}
		};
		var _el$ = _tmpl$8();
		var _el$2 = _el$.firstChild;
		var _el$29 = _el$2.firstChild;
		var _el$34 = _el$29.nextSibling;
		var _el$35 = _el$34.nextSibling;
		var _el$36 = _el$35.nextSibling;
		var _el$37 = _el$36.nextSibling;
		var _el$39 = _el$2.nextSibling.firstChild;
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "content";
			},
			get children() {
				var _el$3 = _tmpl$6();
				var _el$4 = _el$3.firstChild;
				var _el$5 = _el$4.firstChild;
				var _el$6 = _el$5.firstChild;
				var _el$9 = _el$5.nextSibling;
				var _el$11 = _el$9.nextSibling;
				var _el$13 = _el$11.nextSibling;
				var _el$20 = _el$13.nextSibling;
				var _el$21 = _el$4.nextSibling;
				var _el$22 = _el$21.firstChild;
				var _el$23 = _el$22.firstChild;
				var _el$26 = _el$22.nextSibling;
				var _el$28 = _el$26.nextSibling;
				insert(_el$6, () => {
					return t("notes.sessionGroup");
				});
				insert(_el$5, createComponent(Show, {
					get when() {
						return (panel.notes()?.counts?.session?.active ?? 0) > 0;
					},
					get children() {
						var _el$7 = _tmpl$$1();
						insert(_el$7, () => {
							return panel.notes()?.counts?.session?.active;
						});
						return _el$7;
					}
				}), null);
				insert(_el$4, createComponent(Show, {
					get when() {
						return (panel.notes()?.sessionNotes?.length ?? 0) === 0;
					},
					get children() {
						var _el$8 = _tmpl$2$1();
						insert(_el$8, () => {
							return t("notes.noSessionNotes.body");
						});
						return _el$8;
					}
				}), _el$9);
				insert(_el$4, createComponent(Show, {
					get when() {
						return (panel.notes()?.sessionNotes?.length ?? 0) > 0;
					},
					get children() {
						var _el$10 = _tmpl$3$1();
						_el$10._$$keydown = keyHandler;
						insert(_el$10, createComponent(For, {
							get each() {
								return panel.notes()?.sessionNotes ?? [];
							},
							children: (row, index) => createComponent(NoteRow, {
								row,
								get selected() {
									return panel.selectedNoteId() === row.id;
								},
								get now() {
									return panel.nowTick();
								},
								get tabIndex() {
									return panel.selectedNoteId() === row.id || panel.selectedNoteId() === null && index() === 0 ? 0 : -1;
								},
								onSelect: (next) => panel.selectNote(next.id, true)
							})
						}));
						effect(() => t("notes.sessionListLabel"), (_v$) => {
							setAttribute(_el$10, "aria-label", _v$);
						});
						return _el$10;
					}
				}), _el$11);
				insert(_el$4, createComponent(Show, {
					get when() {
						return (panel.notes()?.counts?.session?.dismissed ?? 0) > 0;
					},
					get children() {
						var _el$12 = _tmpl$4$1();
						_el$12._$$click = () => void panel.openDismissed();
						insert(_el$12, () => {
							return t(panel.dismissedOpen() ? "notes.hideDismissed" : "notes.showDismissed", { n: panel.notes()?.counts?.session?.dismissed ?? 0 });
						});
						effect(() => panel.dismissedOpen() ? "true" : "false", (_v$) => {
							setAttribute(_el$12, "aria-expanded", _v$);
						});
						return _el$12;
					}
				}), _el$13);
				insert(_el$4, createComponent(Show, {
					get when() {
						return panel.dismissedOpen();
					},
					get children() {
						var _el$14 = _tmpl$5();
						var _el$16 = _el$14.firstChild;
						var _el$18 = _el$16.nextSibling;
						var _el$19 = _el$18.nextSibling;
						_el$14._$$keydown = keyHandler;
						insert(_el$14, createComponent(Show, {
							get when() {
								return panel.dismissedLoading();
							},
							get children() {
								var _el$15 = _tmpl$2$1();
								insert(_el$15, () => {
									return t("chrome.updating");
								});
								return _el$15;
							}
						}), _el$16);
						insert(_el$14, createComponent(Show, {
							get when() {
								return panel.dismissedError();
							},
							get children() {
								var _el$17 = _tmpl$2$1();
								insert(_el$17, () => {
									return t("notes.error.body");
								});
								return _el$17;
							}
						}), _el$18);
						insert(_el$14, createComponent(For, {
							get each() {
								return panel.dismissedNotes() ?? [];
							},
							children: (row) => createComponent(NoteRow, {
								row,
								get selected() {
									return panel.selectedNoteId() === row.id;
								},
								get now() {
									return panel.nowTick();
								},
								tabIndex: -1,
								onSelect: (next) => panel.selectNote(next.id, true)
							})
						}), _el$19);
						effect(() => t("notes.dismissedListLabel"), (_v$) => {
							setAttribute(_el$14, "aria-label", _v$);
						});
						return _el$14;
					}
				}), _el$20);
				insert(_el$23, () => {
					return t("notes.smartGroup");
				});
				insert(_el$22, createComponent(Show, {
					get when() {
						return (panel.notes()?.counts?.smart?.active ?? 0) > 0;
					},
					get children() {
						var _el$24 = _tmpl$$1();
						insert(_el$24, () => {
							return panel.notes()?.counts?.smart?.total;
						});
						return _el$24;
					}
				}), null);
				insert(_el$21, createComponent(Show, {
					get when() {
						return (panel.notes()?.smartNotes?.length ?? 0) === 0;
					},
					get children() {
						var _el$25 = _tmpl$2$1();
						insert(_el$25, () => {
							return t("notes.noSmart.body");
						});
						return _el$25;
					}
				}), _el$26);
				insert(_el$21, createComponent(Show, {
					get when() {
						return (panel.notes()?.smartNotes?.length ?? 0) > 0;
					},
					get children() {
						var _el$27 = _tmpl$3$1();
						_el$27._$$keydown = keyHandler;
						insert(_el$27, createComponent(For, {
							get each() {
								return panel.notes()?.smartNotes ?? [];
							},
							children: (row) => createComponent(NoteRow, {
								row,
								get selected() {
									return panel.selectedNoteId() === row.id;
								},
								get now() {
									return panel.nowTick();
								},
								tabIndex: -1,
								onSelect: (next) => panel.selectNote(next.id, true)
							})
						}));
						effect(() => t("notes.smartListLabel"), (_v$) => {
							setAttribute(_el$27, "aria-label", _v$);
						});
						return _el$27;
					}
				}), _el$28);
				return _el$3;
			}
		}), _el$29);
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "loading";
			},
			get children() {
				var _el$30 = _tmpl$7();
				_el$30.firstChild.nextSibling.nextSibling;
				return _el$30;
			}
		}), _el$34);
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "no-project";
			},
			get children() {
				return createComponent(KitEmpty, {
					get title() {
						return t("notes.noProject.title");
					},
					get body() {
						return t("notes.noProject.body");
					}
				});
			}
		}), _el$35);
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "no-usage";
			},
			get children() {
				return createComponent(KitEmpty, {
					get title() {
						return t("notes.empty.title");
					},
					get body() {
						return t("notes.empty.body");
					}
				});
			}
		}), _el$36);
		insert(_el$2, createComponent(Show, {
			get when() {
				return panel.bodyState() === "error";
			},
			get children() {
				return createComponent(KitEmpty, {
					tone: "alert",
					get title() {
						return t("notes.error.title");
					},
					get body() {
						return t("notes.error.body");
					},
					get action() {
						return {
							label: t("state.retry"),
							onClick: () => panel.retry()
						};
					}
				});
			}
		}), _el$37);
		insert(_el$39, createComponent(NoteDetail, {
			get row() {
				return panel.activeNote();
			},
			get now() {
				return panel.nowTick();
			}
		}));
		effect(() => panel.view() === "notes" ? "true" : "false", (_v$) => {
			setAttribute(_el$, "data-active", _v$);
		});
		return _el$;
	};
	delegateEvents(["keydown", "click"]);
	// panel/App.tsx
	var _tmpl$ = /* @__PURE__ */ template(`<span class=mc-fresh-age>`);
	var _tmpl$2 = /* @__PURE__ */ template(`<span class=mc-fresh role=status aria-live=off><span class=mc-fresh-dot aria-hidden=true></span><span class=mc-fresh-label>`);
	var _tmpl$3 = /* @__PURE__ */ template(`<div class=mc-banner-slot>`);
	var _tmpl$4 = /* @__PURE__ */ template(`<div class="oc-sdk mc"><header class=mc-chrome><button class=mc-back type=button><svg width=14 height=14 viewBox="0 0 24 24"aria-hidden=true fill=currentColor><path d="M7.82843 10.9999H20V12.9999H7.82843L13.1924 18.3638L11.7782 19.778L4 11.9999L11.7782 4.22168L13.1924 5.63589L7.82843 10.9999Z"></path></svg><span></span></button><div class=mc-chrome-end><button class="oc-sdk-btn mc-icon-btn"data-variant=ghost data-size=sm type=button><svg width=14 height=14 viewBox="0 0 24 24"aria-hidden=true fill=currentColor><path d="M5.46257 4.43262C7.21556 2.91688 9.5007 2 12 2C17.5228 2 22 6.47715 22 12C22 14.1361 21.3302 16.1158 20.1892 17.7406L17 12H20C20 7.58172 16.4183 4 12 4C9.84982 4 7.89777 4.84827 6.46023 6.22842L5.46257 4.43262ZM18.5374 19.5674C16.7844 21.0831 14.4993 22 12 22C6.47715 22 2 17.5228 2 12C2 9.86386 2.66979 7.88416 3.8108 6.25944L7 12H4C4 16.4183 7.58172 20 12 20C14.1502 20 16.1022 19.1517 17.5398 17.7716L18.5374 19.5674Z"></path></svg></button></div></header><main class=mc-body><!><!><!>`);
	var App = (props) => {
		const panel = props.panel;
		const stateName = () => {
			const body = panel.bodyState();
			if (body === "content") {
				const banner = panel.banner();
				if (banner?.kind === "drift") return "drift";
				if (banner?.kind === "partial") return "partial";
				if (banner?.kind === "stale") return "stale";
				return "ready";
			}
			if (body === "no-project" || body === "no-match") return "empty";
			return body;
		};
		const ageText = () => {
			const ms = panel.liveAgeMs();
			if (ms === null) return null;
			if (ms < 6e4) return t("time.s", { n: Math.round(ms / 1e3) });
			const current = panel.snapshot();
			const iso = current?.live.observedAt ?? current?.observedAt;
			return iso ? age(iso, "long", panel.nowTick()) : null;
		};
		const bannerBody = () => {
			const banner = panel.banner();
			if (!banner) return "";
			if (banner.kind === "drift") return t("schema.body", {
				plugin: number(panel.snapshot()?.schema.pluginSupportedVersion),
				db: number(panel.snapshot()?.schema.dbVersion)
			});
			return t(banner.body);
		};
		const bannerAction = () => {
			const banner = panel.banner();
			if (!banner?.action) return void 0;
			if (banner.kind === "stale") return {
				label: t("stale.action"),
				onClick: () => void panel.refresh()
			};
			return {
				label: t(banner.action),
				onClick: () => panel.retry()
			};
		};
		const focusSearch = () => {
			const input = document.querySelector(".mc-search-host input");
			if (!input) return;
			input.focus();
			input.select();
		};
		const keydown = (event) => {
			const target = event.target;
			const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
			if (event.key === "Escape") {
				if (panel.filterOpen()) {
					panel.setFilterOpen(false);
					document.querySelector(".mc-filter-btn")?.focus();
					return;
				}
				if (panel.pane() === "detail") {
					panel.setPane("list");
					return;
				}
				if (panel.query()) {
					panel.setSearch("");
					return;
				}
				return;
			}
			if (event.key === "/" && !event.metaKey && !event.ctrlKey && !typing) {
				if (panel.view() !== "memories" || panel.bodyState() === "loading") return;
				event.preventDefault();
				focusSearch();
			}
		};
		const click = (event) => {
			if (!panel.filterOpen()) return;
			const target = event.target;
			const popup = document.querySelector(".mc-filter-panel");
			const trigger = document.querySelector(".mc-filter-btn");
			if (popup?.contains(target) || trigger?.contains(target)) return;
			panel.setFilterOpen(false);
		};
		document.addEventListener("keydown", keydown);
		document.addEventListener("click", click);
		let lastPane = panel.pane();
		createEffect(() => ({
			pane: panel.pane(),
			view: panel.view(),
			selected: panel.selectedMemoryId(),
			selectedNote: panel.selectedNoteId()
		}), (now) => {
			if (now.pane === lastPane) return;
			const previous = lastPane;
			lastPane = now.pane;
			queueMicrotask(() => {
				if (now.pane === "detail") {
					document.querySelector(".mc-back")?.focus();
					return;
				}
				if (previous === "detail") {
					const id = now.view === "memories" ? now.selected : now.selectedNote;
					((id === null ? null : document.querySelector(`.mc-view[data-active="true"] .mc-item[data-id="${id}"]`)) ?? document.querySelector(".mc-view[data-active=\"true\"] .mc-item"))?.focus();
				}
			});
		});
		onCleanup(() => {
			document.removeEventListener("keydown", keydown);
			document.removeEventListener("click", click);
		});
		const tabs = () => [
			{
				id: "overview",
				label: t("view.overview")
			},
			...panel.memoriesTabCount() > 0 ? [{
				id: "memories",
				label: t("view.memories"),
				count: panel.memoriesTabCount()
			}] : [{
				id: "memories",
				label: t("view.memories")
			}],
			...panel.notesTabCount() > 0 ? [{
				id: "notes",
				label: t("view.notes"),
				count: panel.notesTabCount()
			}] : [{
				id: "notes",
				label: t("view.notes")
			}]
		];
		var _el$ = _tmpl$4();
		var _el$2 = _el$.firstChild;
		var _el$3 = _el$2.firstChild;
		var _el$5 = _el$3.firstChild.nextSibling;
		var _el$6 = _el$3.nextSibling;
		var _el$11 = _el$6.firstChild;
		var _el$13 = _el$2.nextSibling;
		var _el$14 = _el$13.firstChild;
		var _el$15 = _el$14.nextSibling;
		var _el$16 = _el$15.nextSibling;
		insert(_el$2, createComponent(KitTabs, {
			get items() {
				return tabs();
			},
			get active() {
				return panel.view();
			},
			get label() {
				return t("chrome.tabsLabel");
			},
			onChange: (id) => panel.setView(id)
		}), _el$3);
		_el$3._$$click = () => panel.setPane("list");
		insert(_el$5, () => {
			return t(panel.view() === "memories" ? "chrome.backMemories" : "chrome.backNotes");
		});
		insert(_el$6, createComponent(Show, {
			get when() {
				return memo(() => {
					return !panel.loading();
				})() && panel.fresh();
			},
			get children() {
				var _el$7 = _tmpl$2();
				var _el$9 = _el$7.firstChild.nextSibling;
				insert(_el$9, () => {
					return t(panel.fresh().word);
				});
				insert(_el$7, createComponent(Show, {
					get when() {
						return ageText();
					},
					get children() {
						var _el$10 = _tmpl$();
						insert(_el$10, () => {
							return t("fresh.age", { time: ageText() ?? "" });
						});
						return _el$10;
					}
				}), null);
				effect(() => {
					return {
						e: panel.fresh().source,
						t: panel.fresh().stale ? "true" : "false"
					};
				}, ({ e, t }, _p$) => {
					e !== _p$?.e && setAttribute(_el$7, "data-source", e);
					t !== _p$?.t && setAttribute(_el$7, "data-stale", t);
				});
				return _el$7;
			}
		}), _el$11);
		_el$11._$$click = () => void panel.refresh();
		insert(_el$, createComponent(Show, {
			get when() {
				return panel.banner();
			},
			get children() {
				var _el$12 = _tmpl$3();
				insert(_el$12, createComponent(KitBanner, {
					tone: "warning",
					get title() {
						return t(panel.banner().title);
					},
					get body() {
						return bannerBody();
					},
					get action() {
						return bannerAction();
					}
				}));
				return _el$12;
			}
		}), _el$13);
		insert(_el$13, createComponent(Overview, {
			panel,
			onBrowse: () => panel.setView("memories")
		}), _el$14);
		insert(_el$13, createComponent(Memories, { panel }), _el$15);
		insert(_el$13, createComponent(Notes, { panel }), _el$16);
		effect(() => {
			return {
				e: panel.view(),
				t: stateName(),
				a: panel.pane(),
				o: currentLocale(),
				i: t("chrome.refresh"),
				n: panel.updating() ? t("chrome.updating") : t("chrome.lastUpdate", { time: ageText() ?? "—" }),
				s: panel.loading() || panel.updating()
			};
		}, ({ e, t, a, o, i, n, s }, _p$) => {
			e !== _p$?.e && setAttribute(_el$, "data-view", e);
			t !== _p$?.t && setAttribute(_el$, "data-state", t);
			a !== _p$?.a && setAttribute(_el$, "data-pane", a);
			o !== _p$?.o && setAttribute(_el$, "lang", o);
			i !== _p$?.i && setAttribute(_el$11, "aria-label", i);
			n !== _p$?.n && setAttribute(_el$11, "title", n);
			s !== _p$?.s && setAttribute(_el$11, "disabled", s);
		});
		return _el$;
	};
	delegateEvents(["click"]);
	// panel/state/service.ts
	/** UI filter slug -> the DB category value the service whitelists. */
	var CATEGORY_QUERY = {
		rules: "PROJECT_RULES",
		architecture: "ARCHITECTURE",
		constraints: "CONSTRAINTS",
		config: "CONFIG_VALUES",
		naming: "NAMING"
	};
	var ServiceError = class extends Error {
		status;
		reason;
		constructor(message, status = 0, reason = "") {
			super(message);
			this.name = "ServiceError";
			this.status = status;
			this.reason = reason;
		}
	};
	var queryOf = (target, extra = {}) => {
		const query = {};
		if (target.sessionId) query.sessionId = target.sessionId;
		if (target.directory) query.directory = target.directory;
		for (const [key, value] of Object.entries(extra)) if (value !== void 0 && value !== "") query[key] = String(value);
		return query;
	};
	var get = async (request, path, query) => {
		let result;
		try {
			result = await request({
				method: "GET",
				path,
				query
			});
		} catch (error) {
			throw new ServiceError(error instanceof Error ? error.message : String(error), 0, "host-unavailable");
		}
		let body = null;
		try {
			body = JSON.parse(result.body);
		} catch {
			body = null;
		}
		if (result.status !== 200) {
			const reason = typeof body === "object" && body !== null && "reason" in body ? String(body.reason ?? "") : "";
			throw new ServiceError(reason || `HTTP ${result.status}`, result.status, reason);
		}
		if (body === null || typeof body !== "object") throw new ServiceError("invalid response", 200, "invalid-response");
		return body;
	};
	var snapshot = (request, target) => get(request, "/snapshot", queryOf(target));
	var memories = (request, target, options) => get(request, "/memories", queryOf(target, {
		search: options.search || void 0,
		status: options.status === "all" ? void 0 : options.status,
		category: options.category === "all" ? void 0 : CATEGORY_QUERY[options.category] ?? options.category,
		limit: options.limit,
		offset: options.offset
	}));
	var notes = (request, target, includeDismissed = false) => get(request, "/notes", queryOf(target, includeDismissed ? { includeDismissed: "true" } : {}));
	var health = (request) => get(request, "/health", {});
	// panel/state/panel.ts
	var REFRESH_MS = 4e3;
	var STALE_AFTER_MS = 12e3;
	var SEARCH_DEBOUNCE_MS = 200;
	var PAGE_SIZE = 50;
	var createPanel = (request) => {
		const [target, setTargetSignal] = createSignal({
			sessionId: null,
			directory: null
		});
		const [snapshot$1, setSnapshot] = createSignal(null);
		const [snapshotError, setSnapshotError] = createSignal(null);
		const [listError, setListError] = createSignal(null);
		const [memoryRows, setMemoryRows] = createSignal([]);
		const [memoryTotal, setMemoryTotal] = createSignal(0);
		const [notes$1, setNotes] = createSignal(null);
		const [dismissedNotes, setDismissedNotes] = createSignal(null);
		const [dismissedLoading, setDismissedLoading] = createSignal(false);
		const [dismissedError, setDismissedError] = createSignal(null);
		const [dismissedOpen, setDismissedOpen] = createSignal(false);
		const [loading, setLoading] = createSignal(true);
		const [updating, setUpdating] = createSignal(false);
		const [view, setViewSignal] = createSignal("overview");
		const [pane, setPane] = createSignal("list");
		const [selectedNoteId, setSelectedNoteId] = createSignal(null);
		const [selectedMemoryId, setSelectedMemoryId] = createSignal(null);
		const [filters, setFiltersSignal] = createSignal({
			status: "all",
			category: "all"
		});
		const [query, setQuerySignal] = createSignal("");
		const [compositionOpen, setCompositionOpen] = createSignal(false);
		const [filterOpen, setFilterOpen] = createSignal(false);
		const [nowTick, setNowTick] = createSignal(Date.now());
		const [healthOk, setHealthOk] = createSignal(null);
		let currentTarget = {
			sessionId: null,
			directory: null
		};
		let listToken = 0;
		let inFlight = null;
		let again = false;
		let started = false;
		let pollTimer = null;
		let searchTimer = null;
		let tickTimer = null;
		let noteRequest = 0;
		const reasonOf = (error) => {
			if (error instanceof ServiceError) return error.reason || error.message;
			return error instanceof Error ? error.message : String(error);
		};
		const live = createMemo(() => {
			return snapshot$1()?.live ?? {
				state: "unavailable",
				source: "none"
			};
		});
		const liveAgeMs = createMemo(() => {
			const current = snapshot$1();
			const observedAt = current?.live.observedAt ?? current?.observedAt;
			if (!observedAt) return null;
			const at = Date.parse(observedAt);
			return Number.isNaN(at) ? null : Math.max(0, nowTick() - at);
		});
		const isStale = createMemo(() => live().source === "rpc" && (liveAgeMs() ?? 0) > STALE_AFTER_MS);
		const banner = createMemo(() => {
			const current = snapshot$1();
			if (!current) return null;
			if (current.schema?.compatible === false) return {
				kind: "drift",
				title: "schema.title",
				body: "schema.body",
				action: null
			};
			if (live().source === "session-meta") return {
				kind: "partial",
				title: "partial.title",
				body: "partial.body",
				action: "partial.action"
			};
			if (isStale()) return {
				kind: "stale",
				title: "stale.title",
				body: "stale.body",
				action: "stale.action"
			};
			return null;
		});
		const filtering = createMemo(() => filters().status !== "all" || filters().category !== "all" || query() !== "");
		const hasUsageSample = createMemo(() => {
			const usage = snapshot$1()?.usage;
			return Boolean(usage && ((usage.inputTokens ?? 0) > 0 || (usage.usagePercentage ?? 0) > 0));
		});
		const notesEmpty = createMemo(() => {
			const payload = notes$1();
			if (!payload) return false;
			const counts = payload.counts;
			return (payload.sessionNotes?.length ?? 0) === 0 && (payload.smartNotes?.length ?? 0) === 0 && (counts?.session?.total ?? 0) === 0 && (counts?.smart?.total ?? 0) === 0;
		});
		const bodyState = createMemo(() => {
			if (loading()) return "loading";
			if (snapshotError() && !snapshot$1()) return "error";
			if (!snapshot$1()?.project) return "no-project";
			if (view() === "overview") return hasUsageSample() ? "content" : "no-usage";
			if (view() === "memories") {
				if (listError() && memoryRows().length === 0) return "error";
				if (filtering() && memoryRows().length === 0 && memoryTotal() === 0) return "no-match";
				if (memoryTotal() === 0 && memoryRows().length === 0) return "no-usage";
				return "content";
			}
			if (listError() && !notes$1()) return "error";
			return notesEmpty() ? "no-usage" : "content";
		});
		const usage = createMemo(() => {
			const current = snapshot$1();
			const usageValue = current?.usage;
			if (!current || !usageValue) return null;
			const percentage = usageValue.usagePercentage;
			const limit = usageValue.contextLimit ?? 0;
			return {
				percent: percentage === null || percentage === void 0 ? usageValue.inputTokens !== null && limit > 0 ? (usageValue.inputTokens ?? 0) / limit * 100 : null : percentage,
				tokens: usageValue.inputTokens,
				limit: usageValue.contextLimit,
				native: current.live.source === "rpc" ? usageValue.nativeContextUsagePercentage : null
			};
		});
		const thresholds = createMemo(() => {
			const t = snapshot$1()?.thresholds;
			if (!t || t.executeThreshold === null || t.executeThresholdTokens === null) return null;
			return {
				percent: t.executeThreshold,
				tokens: t.executeThresholdTokens,
				soft: t.usableSoft,
				hard: t.usableHard
			};
		});
		const composition = createMemo(() => {
			const current = snapshot$1();
			if (!current || current.live.source !== "rpc" || !current.composition) return null;
			const c = current.composition;
			const total = Object.values(c).reduce((sum, value) => sum + value, 0);
			if (!total || !current.usage?.inputTokens) return null;
			const share = (value) => value / total * 100;
			const system = c.systemPromptTokens;
			const conversation = c.conversationTokens;
			const toolCalls = c.toolCallTokens;
			const toolDefinitions = c.toolDefinitionTokens;
			const conversationTools = conversation + toolCalls + toolDefinitions;
			const compartments = c.compartmentTokens;
			const memories = c.memoryTokens;
			const profile = c.profileTokens + c.docsTokens;
			const facts = c.factTokens;
			const context = compartments + memories + profile + facts;
			if (system + conversationTools + context !== total) return null;
			const liveCounts = current.liveCounts;
			return {
				total,
				magicContextTokens: context,
				magicContextShare: share(context),
				bands: {
					system: share(system),
					conversation: share(conversationTools),
					context: share(context)
				},
				rows: [
					{
						key: "system",
						label: "system",
						tokens: system,
						share: share(system),
						band: "system"
					},
					{
						key: "conversation",
						label: "conversation",
						tokens: conversationTools,
						share: share(conversationTools),
						band: "conversation"
					},
					{
						key: "compartments",
						label: "compartments",
						tokens: compartments,
						share: share(compartments),
						band: "context",
						count: liveCounts?.compartments ?? null
					},
					{
						key: "memories",
						label: "memories",
						tokens: memories,
						share: share(memories),
						band: "context",
						count: liveCounts?.memoryBlocks ?? null
					},
					{
						key: "profile",
						label: "profile",
						tokens: profile,
						share: share(profile),
						band: "context"
					},
					{
						key: "facts",
						label: "facts",
						tokens: facts,
						share: share(facts),
						band: "context"
					}
				],
				subRows: [
					{
						key: "conversation",
						tokens: conversation,
						share: share(conversation)
					},
					{
						key: "toolCalls",
						tokens: toolCalls,
						share: share(toolCalls)
					},
					{
						key: "toolDefinitions",
						tokens: toolDefinitions,
						share: share(toolDefinitions)
					}
				]
			};
		});
		const memoryActive = createMemo(() => snapshot$1()?.counts?.memories?.active ?? 0);
		const memoryArchived = createMemo(() => snapshot$1()?.counts?.memories?.archived ?? 0);
		const memoryCount = createMemo(() => snapshot$1()?.counts?.memories?.total ?? 0);
		const counts = createMemo(() => {
			if (!snapshot$1()?.project) return null;
			const liveCounts = snapshot$1()?.liveCounts;
			const rpc = live().source === "rpc";
			const payload = notes$1();
			return {
				compartments: rpc ? liveCounts?.compartments ?? null : null,
				memoryBlocks: rpc ? liveCounts?.memoryBlocks ?? null : null,
				sessionNotes: payload?.counts?.session?.active ?? null,
				dismissed: payload?.counts?.session?.dismissed ?? null,
				smartNotes: payload?.counts?.smart?.total ?? null,
				liveMemories: rpc ? liveCounts?.memories ?? null : null,
				readySmartNotes: rpc ? liveCounts?.readySmartNotes ?? null : null,
				embedding: rpc ? snapshot$1()?.embedding ?? null : null,
				memoriesActive: memoryActive(),
				memoriesArchived: memoryArchived(),
				memoriesTotal: memoryCount()
			};
		});
		const notesTabCount = createMemo(() => {
			const payload = notes$1();
			if (!payload) return 0;
			return (payload.sessionNotes?.length ?? 0) + (payload.smartNotes?.length ?? 0);
		});
		const memoriesTabCount = createMemo(() => snapshot$1()?.counts?.memories?.total ?? 0);
		const fresh = createMemo(() => {
			if (loading() || !snapshot$1()) return null;
			const source = live().source;
			const ageMs = liveAgeMs();
			return {
				source,
				word: source === "rpc" ? "fresh.rpc" : source === "session-meta" ? "fresh.session-meta" : "fresh.none",
				seconds: ageMs === null ? null : Math.round(ageMs / 1e3),
				stale: isStale() || source === "session-meta"
			};
		});
		const listCount = createMemo(() => {
			if (filtering()) return {
				matching: memoryTotal(),
				shown: memoryRows().length
			};
			return {
				shown: memoryRows().length,
				total: memoryTotal(),
				active: memoryActive()
			};
		});
		const activeMemory = createMemo(() => {
			const rows = memoryRows();
			if (rows.length === 0) return null;
			return rows.find((row) => row.id === selectedMemoryId()) ?? rows[0];
		});
		const allNotes = createMemo(() => {
			const payload = notes$1();
			if (!payload) return [];
			return [
				...payload.sessionNotes ?? [],
				...payload.smartNotes ?? [],
				...dismissedOpen() ? dismissedNotes() ?? [] : []
			];
		});
		const activeNote = createMemo(() => {
			const list = allNotes();
			if (list.length === 0) return null;
			return list.find((row) => row.id === selectedNoteId()) ?? list[0];
		});
		const readSnapshotOnce = (override) => {
			if (inFlight) {
				again = true;
				return inFlight;
			}
			inFlight = snapshot(request, override ?? currentTarget).then((next) => {
				const previous = snapshot$1();
				if (previous && Date.parse(next.observedAt) <= Date.parse(previous.observedAt)) return previous;
				setSnapshot(next);
				setSnapshotError(null);
				return next;
			}).catch((error) => {
				setSnapshotError(reasonOf(error));
				return null;
			}).finally(() => {
				inFlight = null;
				if (again) {
					again = false;
					readSnapshotOnce();
				}
			});
			return inFlight;
		};
		const loadMemories = async (reset, override) => {
			const mine = ++listToken;
			const current = override?.target ?? currentTarget;
			const activeFilters = override?.filters ?? filters();
			try {
				const result = await memories(request, current, {
					search: override?.search ?? query(),
					status: activeFilters.status,
					category: activeFilters.category,
					limit: PAGE_SIZE,
					offset: reset ? 0 : memoryRows().length
				});
				if (mine !== listToken) return;
				const nextRows = reset ? result.rows : [...memoryRows(), ...result.rows.filter((row) => !memoryRows().some((existing) => existing.id === row.id))];
				setMemoryRows(nextRows);
				setMemoryTotal(result.page.total);
				const selected = selectedMemoryId();
				if (selected !== null && !nextRows.some((row) => row.id === selected)) setSelectedMemoryId(null);
				setListError(null);
			} catch (error) {
				if (mine !== listToken) return;
				setListError(reasonOf(error));
			}
		};
		const loadNotes = async (override) => {
			const mine = ++noteRequest;
			try {
				const result = await notes(request, override ?? currentTarget);
				if (mine !== noteRequest) return;
				setNotes(result);
				setListError(null);
			} catch (error) {
				if (mine !== noteRequest) return;
				setListError(reasonOf(error));
			}
		};
		const loadAll = async (override) => {
			const current = override ?? currentTarget;
			const failed = (await Promise.allSettled([
				readSnapshotOnce(current),
				loadMemories(true, {
					target: current,
					filters: filters(),
					search: query()
				}),
				loadNotes(current)
			])).find((result) => result.status === "rejected");
			if (failed) setListError(reasonOf(failed.reason));
			setLoading(false);
		};
		const setTarget = (next) => {
			const previous = currentTarget;
			const merged = {
				sessionId: next.sessionId !== void 0 ? next.sessionId : previous.sessionId,
				directory: next.directory !== void 0 ? next.directory : previous.directory
			};
			if (merged.sessionId === previous.sessionId && merged.directory === previous.directory) return;
			currentTarget = merged;
			listToken += 1;
			noteRequest += 1;
			setTargetSignal(merged);
			setMemoryRows([]);
			setMemoryTotal(0);
			setSelectedMemoryId(null);
			setSelectedNoteId(null);
			setNotes(null);
			setDismissedNotes(null);
			setDismissedOpen(false);
			setSnapshot(null);
			setSnapshotError(null);
			setListError(null);
			setPane("list");
			setLoading(true);
			if (started) loadAll(merged);
		};
		const refresh = async () => {
			if (updating()) return;
			setUpdating(true);
			try {
				await loadAll();
			} finally {
				setUpdating(false);
				setNowTick(Date.now());
			}
		};
		const retry = () => {
			loadAll();
		};
		const checkHealth = async () => {
			try {
				const result = await health(request);
				setHealthOk(Boolean(result.ok));
			} catch {
				setHealthOk(false);
			}
		};
		const openDismissed = async () => {
			if (dismissedOpen()) {
				setDismissedOpen(false);
				return;
			}
			setDismissedOpen(true);
			if (dismissedNotes() !== null || dismissedLoading()) return;
			setDismissedLoading(true);
			try {
				const result = await notes(request, currentTarget, true);
				setDismissedNotes((result.sessionNotes ?? []).filter((row) => row.status === "dismissed"));
				setDismissedError(null);
			} catch (error) {
				setDismissedError(reasonOf(error));
			} finally {
				setDismissedLoading(false);
			}
		};
		const selectMemory = (id, open = false) => {
			setSelectedMemoryId(id);
			if (open && matchMedia("(max-width: 599.98px)").matches) setPane("detail");
		};
		const selectNote = (id, open = false) => {
			setSelectedNoteId(id);
			if (open && matchMedia("(max-width: 599.98px)").matches) setPane("detail");
		};
		const setView = (next) => {
			setViewSignal(next);
			setPane("list");
			setFilterOpen(false);
		};
		const clearFilters = () => {
			const cleared = {
				status: "all",
				category: "all"
			};
			setFiltersSignal(cleared);
			setQuerySignal("");
			if (started) loadMemories(true, {
				filters: cleared,
				search: ""
			});
		};
		const applyFilters = (next) => {
			const merged = {
				...filters(),
				...next
			};
			setFiltersSignal(merged);
			if (started) loadMemories(true, { filters: merged });
		};
		const setSearch = (value) => {
			setQuerySignal(value);
			if (searchTimer) clearTimeout(searchTimer);
			searchTimer = setTimeout(() => {
				if (started) loadMemories(true, { search: value });
			}, SEARCH_DEBOUNCE_MS);
		};
		const loadMore = () => {
			if (!filtering()) loadMemories(false);
		};
		const resetSelection = () => {
			setSelectedMemoryId(null);
			setSelectedNoteId(null);
		};
		const startPolling = () => {
			const stop = () => {
				if (pollTimer) clearInterval(pollTimer);
				pollTimer = null;
			};
			const tick = () => {
				if (document.visibilityState === "visible") readSnapshotOnce();
			};
			const schedule = () => {
				stop();
				if (document.visibilityState === "visible") pollTimer = setInterval(tick, REFRESH_MS);
			};
			const onVisibility = () => {
				if (document.visibilityState === "visible") {
					readSnapshotOnce();
					schedule();
				} else stop();
			};
			document.addEventListener("visibilitychange", onVisibility);
			schedule();
			tickTimer = setInterval(() => setNowTick(Date.now()), 1e3);
			return () => {
				stop();
				if (tickTimer) clearInterval(tickTimer);
				if (searchTimer) clearTimeout(searchTimer);
				document.removeEventListener("visibilitychange", onVisibility);
			};
		};
		let stopPolling = null;
		const start = (initial) => {
			if (started) return;
			if (initial) {
				currentTarget = initial;
				setTargetSignal(initial);
			}
			started = true;
			checkHealth();
			stopPolling = startPolling();
			loadAll(initial ?? target());
		};
		const dispose = () => {
			stopPolling?.();
			stopPolling = null;
			started = false;
		};
		return {
			target,
			isStarted: () => started,
			snapshot: snapshot$1,
			snapshotError,
			listError,
			memoryRows,
			memoryTotal,
			notes: notes$1,
			dismissedNotes,
			dismissedLoading,
			dismissedError,
			dismissedOpen,
			loading,
			updating,
			view,
			pane,
			selectedMemoryId,
			selectedNoteId,
			filters,
			query,
			compositionOpen,
			filterOpen,
			nowTick,
			healthOk,
			live,
			liveAgeMs,
			isStale,
			banner,
			bodyState,
			usage,
			thresholds,
			composition,
			counts,
			notesTabCount,
			memoriesTabCount,
			fresh,
			listCount,
			activeMemory,
			allNotes,
			activeNote,
			memoryActive,
			memoryArchived,
			filtering,
			setTarget,
			start,
			dispose,
			refresh,
			retry,
			openDismissed,
			selectMemory,
			selectNote,
			setView,
			setPane,
			setCompositionOpen,
			setFilterOpen,
			clearFilters,
			applyFilters,
			setSearch,
			loadMore,
			resetSelection,
			setSnapshot,
			setSnapshotError,
			setListError,
			setLoading,
			setNotes,
			setMemoryRows,
			setMemoryTotal,
			setNowTick,
			setTargetSignal
		};
	};
	// panel/styles/panel.css?inline
	var panel_default = "/* ==========================================================================\n   Magic Context panel — guest composition CSS.\n   Only what the kit does not draw: the panel shell, the reading layout, and\n   the content rows. Every colour is a host token; every control is a kit class.\n   ========================================================================== */\n\nhtml,\nbody {\n  height: 100%;\n  margin: 0;\n}\n\nbody {\n  display: flex;\n  flex-direction: column;\n  background: var(--surface-background);\n  color: var(--surface-foreground);\n  font-family: var(--font-sans);\n}\n\n/* The host writes 0.875rem on <html>; the kit's rem scale is authored for a\n   16px root. Without this line every kit text is 12.25px, not 14px. */\nhtml {\n  font-size: 16px !important;\n}\n\n.mc {\n  display: flex;\n  flex-direction: column;\n  flex: 1 1 auto;\n  min-height: 0;\n  container-type: inline-size;\n}\n\n/* The hidden attribute beats the layout display values above. */\n.mc [hidden] {\n  display: none !important;\n}\n\n/* ---- chrome: one row, ever ---------------------------------------------- */\n\n.mc-chrome {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 0 0 auto;\n  height: 36px;\n  padding: 0 8px;\n}\n\n.mc-tabs {\n  display: flex;\n  gap: 2px;\n  padding: 2px;\n  min-width: 0;\n  overflow: hidden;\n}\n\n.mc-chrome-end {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  margin-inline-start: auto;\n  flex: 0 0 auto;\n}\n\n/* Source + age. The word names where the numbers came from (rpc → Live,\n   session-meta → Last sample, none → Unavailable); the age comes from\n   observedAt and turns warning when the poll is not landing. */\n.mc-fresh {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  font-size: 0.75rem;\n  color: var(--surface-muted-foreground);\n  white-space: nowrap;\n}\n\n.mc-fresh-dot {\n  width: 5px;\n  height: 5px;\n  border-radius: 9999px;\n  background: var(--status-success);\n  flex: 0 0 auto;\n}\n\n.mc-fresh-age {\n  font-variant-numeric: tabular-nums;\n  color: color-mix(in srgb, var(--surface-muted-foreground) 80%, transparent);\n}\n\n.mc-fresh[data-source=\"session-meta\"] .mc-fresh-dot,\n.mc-fresh[data-stale=\"true\"] .mc-fresh-dot {\n  background: var(--status-warning);\n}\n\n.mc-fresh[data-source=\"none\"] .mc-fresh-dot {\n  background: color-mix(in srgb, var(--surface-muted-foreground) 45%, transparent);\n}\n\n.mc-fresh[data-source=\"session-meta\"],\n.mc-fresh[data-stale=\"true\"] {\n  color: var(--warning-text);\n}\n\n.mc-icon-btn {\n  width: 28px;\n  padding: 0;\n  flex: 0 0 auto;\n}\n\n.mc-back {\n  display: none;\n  align-items: center;\n  gap: 6px;\n  height: 28px;\n  padding: 0 8px 0 6px;\n  font-size: 0.8125rem;\n  color: var(--surface-muted-foreground);\n  border-radius: 7px;\n}\n\n.mc-back:hover {\n  color: var(--surface-foreground);\n  background: var(--interactive-hover);\n}\n\n.mc-back svg {\n  flex: 0 0 auto;\n}\n\n/* ---- body --------------------------------------------------------------- */\n\n.mc-body {\n  flex: 1 1 auto;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n}\n\n.mc-banner-slot {\n  flex: 0 0 auto;\n  padding: 0 8px 8px;\n}\n\n.mc-banner {\n  padding: 7px 10px;\n  gap: 12px;\n}\n\n.mc-banner .oc-sdk-banner-text {\n  gap: 1px;\n}\n\n/* Narrow panel: the banner keeps its text only. The header's refresh button is\n   the same action and stays visible at every width, so nothing is lost here. */\n@container (max-width: 419.98px) {\n  .mc-banner .oc-sdk-banner-action {\n    display: none;\n  }\n}\n\n.mc-view {\n  display: none;\n  flex: 1 1 auto;\n  min-height: 0;\n}\n\n.mc-view[data-active=\"true\"] {\n  display: flex;\n  flex-direction: column;\n}\n\n.mc-scroll {\n  flex: 1 1 auto;\n  min-height: 0;\n  overflow: auto;\n  overscroll-behavior: contain;\n}\n\n/* ---- typography primitives --------------------------------------------- */\n\n.mc-label {\n  margin: 0;\n  font-size: 0.6875rem;\n  font-weight: 500;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--surface-muted-foreground);\n  white-space: nowrap;\n}\n\n.mc-mono {\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n}\n\n/* Shouting is an English convention; Chinese labels keep their own case. */\n.mc[lang=\"zh-CN\"] .mc-label {\n  text-transform: none;\n  letter-spacing: 0.02em;\n  font-size: 0.75rem;\n}\n\n.mc[lang=\"zh-CN\"] .mc-cat {\n  text-transform: none;\n  letter-spacing: 0.02em;\n}\n\n.mc[lang=\"zh-CN\"] .mc-condition-label {\n  text-transform: none;\n  letter-spacing: 0.02em;\n  font-size: 0.75rem;\n}\n\n/* ---- overview ----------------------------------------------------------- */\n\n.mc-overview {\n  padding: 10px 16px 20px;\n}\n\n.mc-overview-inner {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  width: 100%;\n}\n\n.mc-sec {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n  min-width: 0;\n}\n\n.mc-sec-head {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  min-width: 0;\n}\n\n.mc-sec-note {\n  margin-inline-start: auto;\n  font-size: 0.75rem;\n  color: var(--surface-muted-foreground);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n/* hero: one number, one meter, one threshold */\n\n.mc-hero {\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  min-width: 0;\n}\n\n.mc-hero-num {\n  flex: 0 0 auto;\n  font-size: 2rem;\n  line-height: 1;\n  font-weight: 500;\n  letter-spacing: -0.02em;\n  font-variant-numeric: tabular-nums;\n}\n\n.mc-hero-unit {\n  font-size: 0.9375rem;\n  font-weight: 400;\n  color: var(--surface-muted-foreground);\n  margin-inline-start: 1px;\n}\n\n.mc-meter {\n  position: relative;\n  flex: 1 1 auto;\n  min-width: 40px;\n  height: 8px;\n  border-radius: 9999px;\n  background: color-mix(in srgb, var(--surface-foreground) 8%, transparent);\n}\n\n.mc-meter-fill {\n  display: block;\n  height: 100%;\n  border-radius: inherit;\n  background: var(--primary);\n  transition: width 160ms ease-out;\n}\n\n.mc-meter--thin {\n  height: 3px;\n}\n\n/* The compaction trigger, drawn where it will happen. */\n.mc-meter-tick {\n  position: absolute;\n  top: -2px;\n  width: 1px;\n  height: 12px;\n  background: color-mix(in srgb, var(--surface-foreground) 34%, transparent);\n  border-radius: 1px;\n}\n\n.mc-meter-tick-void {\n  display: none;\n}\n\n/* composition */\n\n.mc-bd {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: flex;\n  flex-direction: column;\n}\n\n.mc-bd-row {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  height: 24px;\n  font-size: 0.8125rem;\n  line-height: 24px;\n}\n\n/* The bar's three colours, reused as a 3px mark on every row, so a row can be\n   traced back to its segment without a legend. */\n.mc-bd-chip {\n  flex: 0 0 auto;\n  width: 3px;\n  height: 9px;\n  border-radius: 1px;\n  background: color-mix(in srgb, var(--surface-foreground) 30%, transparent);\n  align-self: center;\n}\n\n.mc-bd-chip[data-band=\"conversation\"] {\n  background: color-mix(in srgb, var(--surface-foreground) 62%, transparent);\n}\n\n.mc-bd-chip[data-band=\"system\"] {\n  background: color-mix(in srgb, var(--surface-foreground) 20%, transparent);\n}\n\n.mc-bd-chip[data-band=\"context\"] {\n  background: var(--primary);\n}\n\n.mc-bd-total .mc-bd-chip {\n  background: transparent;\n}\n\n/* A count of things beside a token figure: \"6\", \"42 blocks\". Small enough to\n   read as metadata, bordered enough not to merge with the label. */\n.mc-bd-count {\n  flex: 0 0 auto;\n  padding: 0 4px;\n  height: 14px;\n  line-height: 14px;\n  border-radius: 3px;\n  font-family: var(--font-mono);\n  font-size: 0.625rem;\n  font-variant-numeric: tabular-nums;\n  color: var(--surface-muted-foreground);\n  background: color-mix(in srgb, var(--surface-foreground) 6%, transparent);\n  white-space: nowrap;\n}\n\n/* One row is a disclosure: same metrics, plus a caret that says there is more. */\n.mc-bd-group {\n  display: block;\n  height: auto;\n}\n\n.mc-bd-toggle {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  width: 100%;\n  height: 24px;\n  font-size: 0.8125rem;\n  line-height: 24px;\n  text-align: start;\n  color: inherit;\n  border-radius: 4px;\n}\n\n.mc-bd-toggle:hover .mc-bd-name {\n  color: var(--primary);\n}\n\n.mc-bd-caret {\n  flex: 0 0 auto;\n  display: inline-flex;\n  align-self: center;\n  color: var(--surface-muted-foreground);\n  transition: transform 120ms ease-out;\n}\n\n.mc-bd-toggle[aria-expanded=\"true\"] .mc-bd-caret {\n  transform: rotate(90deg);\n}\n\n.mc-bd-sub {\n  list-style: none;\n  margin: 0 0 2px;\n  padding: 0 0 0 11px;\n  display: flex;\n  flex-direction: column;\n  border-inline-start: 1px solid color-mix(in srgb, var(--interactive-border) 70%, transparent);\n  margin-inline-start: 1px;\n}\n\n.mc-bd-sub li {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  height: 22px;\n  font-size: 0.75rem;\n  line-height: 22px;\n}\n\n.mc-bd-subname {\n  flex: 1 1 auto;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  color: var(--surface-muted-foreground);\n}\n\n\n/* One flexible spacer per row: the label cluster (name + badge) stays left, the\n   figures stay right, and a long label truncates instead of pushing the value. */\n.mc-bd-fill {\n  flex: 1 1 auto;\n  min-width: 4px;\n}\n\n.mc-bd-tok {\n  color: var(--surface-muted-foreground);\n  font-size: 0.75rem;\n}\n\n.mc-bd-sub .mc-bd-share {\n  font-size: 0.625rem;\n}\n\n.mc-bd-share {\n  flex: 0 0 auto;\n  width: 42px;\n  text-align: end;\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-size: 0.6875rem;\n  color: var(--surface-muted-foreground);\n}\n\n.mc-bd-total .mc-bd-share {\n  width: 42px;\n}\n\n.mc-bd-name {\n  flex: 0 0 auto;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  color: var(--surface-foreground);\n}\n\n.mc-bd-tok {\n  flex: 0 0 auto;\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  color: var(--surface-foreground);\n}\n\n.mc-bd-row[data-zero=\"true\"] .mc-bd-name,\n.mc-bd-row[data-zero=\"true\"] .mc-bd-tok {\n  color: color-mix(in srgb, var(--surface-muted-foreground) 62%, transparent);\n}\n\n/* A zero row states its zero once, in the value column. */\n.mc-bd-row[data-zero=\"true\"] .mc-bd-chip,\n.mc-bd-row[data-zero=\"true\"] .mc-bd-share {\n  visibility: hidden;\n}\n\n.mc-bd-total {\n  margin-top: 5px;\n  border-top: 1px solid color-mix(in srgb, var(--interactive-border) 85%, transparent);\n  font-weight: 500;\n}\n\n.mc-bd-total .mc-bd-name,\n.mc-bd-total .mc-bd-tok {\n  padding-top: 3px;\n}\n\n/* composition = one bar + one table, hidden together when the RPC is gone */\n.mc-comp {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  min-width: 0;\n}\n\n/* composition bar: full width of the section, 6px, no rounding on the inside */\n.mc-band {\n  display: flex;\n  height: 6px;\n  border-radius: 2px;\n  overflow: hidden;\n  background: color-mix(in srgb, var(--surface-foreground) 6%, transparent);\n}\n\n.mc-band-seg {\n  height: 100%;\n}\n\n.mc-band-seg[data-band=\"conversation\"] {\n  background: color-mix(in srgb, var(--surface-foreground) 62%, transparent);\n}\n\n.mc-band-seg[data-band=\"system\"] {\n  background: color-mix(in srgb, var(--surface-foreground) 26%, transparent);\n}\n\n.mc-band-seg[data-band=\"context\"] {\n  background: var(--primary);\n}\n\n/* 1.5px of surface between segments, so the boundary reads at any width */\n.mc-band-seg + .mc-band-seg {\n  box-shadow: -1px 0 0 0 var(--surface-background);\n}\n\n.mc-context-share {\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n}\n\n/* cache */\n\n.mc-cache-line {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  height: 22px;\n  font-size: 0.8125rem;\n}\n\n.mc-cache-left {\n  color: var(--surface-foreground);\n  font-size: 0.8125rem;\n}\n\n.mc-cache-cap {\n  font-size: 0.75rem;\n  color: var(--surface-muted-foreground);\n}\n\n.mc-cache-line .mc-meter {\n  margin-inline-start: 6px;\n  background: color-mix(in srgb, var(--surface-foreground) 6%, transparent);\n}\n\n/* A countdown is not a filling tank: the fill is what is left, so it shrinks,\n   and it stays monochrome so it never reads as a warning next to the accent. */\n.mc-cache-line .mc-meter-fill {\n  background: color-mix(in srgb, var(--surface-foreground) 34%, transparent);\n}\n\n/* count lines: label/value pairs, never a wall of equal numbers */\n\n.mc-stats {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px 18px;\n  font-size: 0.75rem;\n  color: var(--surface-muted-foreground);\n}\n\n.mc-stats li {\n  display: inline-flex;\n  align-items: baseline;\n  gap: 6px;\n  min-width: 0;\n}\n\n.mc-stats b {\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-weight: 400;\n  color: var(--surface-foreground);\n}\n\n/* \"67 active · 11 archived\": the numerals carry the weight, the qualifiers stay\n   in the muted 11px they belong to — a slash would read as a ratio. */\n.mc-stat-dim {\n  font-style: normal;\n  font-size: 0.6875rem;\n  color: var(--surface-muted-foreground);\n  margin-inline-start: -3px;\n}\n\n.mc-stat-sep {\n  color: color-mix(in srgb, var(--surface-muted-foreground) 55%, transparent);\n  margin-inline-start: 3px;\n}\n\n.mc-stats b[data-missing=\"true\"] {\n  color: var(--surface-muted-foreground);\n  cursor: help;\n}\n\n.mc-inline-note {\n  margin: 0;\n  font-size: 0.75rem;\n  line-height: 1.5;\n  color: var(--surface-muted-foreground);\n}\n\n.mc-hint {\n  margin: 0;\n  font-size: 0.75rem;\n  line-height: 1.45;\n  color: var(--surface-muted-foreground);\n}\n\n/* The compression-aware figure is the headline; the raw one is a remark next to\n   the same sentence, not a second hero number. */\n.mc-hero-cap {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  min-width: 0;\n}\n\n.mc-hero-cap .mc-hint {\n  min-width: 0;\n}\n\n.mc-raw {\n  margin-inline-start: auto;\n  flex: 0 0 auto;\n  font-family: var(--font-mono);\n  font-size: 0.6875rem;\n  color: var(--surface-muted-foreground);\n  white-space: nowrap;\n  cursor: help;\n}\n\n.mc-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n  gap: 4px 6px;\n  font-size: 0.6875rem;\n  color: var(--surface-muted-foreground);\n  min-width: 0;\n}\n\n.mc-foot .mc-mono {\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.mc-foot-sep {\n  color: color-mix(in srgb, var(--surface-muted-foreground) 55%, transparent);\n}\n\n/* ---- split views -------------------------------------------------------- */\n\n.mc-split {\n  grid-template-columns: minmax(0, 1fr);\n}\n\n.mc-view.mc-split[data-active=\"true\"] {\n  display: grid;\n}\n\n.mc-list-pane,\n.mc-detail-pane {\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n  min-height: 0;\n  overflow: hidden;\n}\n\n.mc-detail-pane {\n  background: var(--surface-background);\n}\n\n/* A list's chrome appears with the list: while the first read is in flight, on\n   an empty project, and after a failed read there is nothing to search. */\n.mc[data-state=\"loading\"] .mc-filters,\n.mc[data-state=\"empty\"] .mc-filters,\n.mc[data-state=\"error\"] .mc-filters {\n  display: none;\n}\n\n/* filters */\n\n.mc-filters {\n  position: relative;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  flex: 0 0 auto;\n  padding: 4px 8px 8px;\n}\n\n.mc-filters .oc-sdk-search {\n  flex: 1 1 auto;\n  min-width: 0;\n}\n\n/* the kit's compact field geometry, the same numbers its popup search uses */\n.mc-filters .oc-sdk-input {\n  height: 28px;\n  font-size: 0.8125rem;\n}\n\n.mc-filter-btn {\n  flex: 0 0 auto;\n  max-width: 50%;\n}\n\n.mc-popup {\n  position: absolute;\n  top: 34px;\n  inset-inline-end: 0;\n  width: 264px;\n  max-width: calc(100% - 16px);\n  z-index: 5;\n  gap: 10px;\n  padding: 10px;\n}\n\n.mc-chip-group {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n.mc-chips {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n}\n\n.mc-chips .oc-sdk-btn {\n  max-width: 100%;\n  justify-content: flex-start;\n  gap: 5px;\n}\n\n.mc-chip-count {\n  font-family: var(--font-mono);\n  font-size: 0.625rem;\n  font-variant-numeric: tabular-nums;\n  opacity: 0.62;\n}\n\n/* A chosen chip is a selection, not a call to action: it takes the same\n   treatment as a selected row. */\n.mc-chips .oc-sdk-btn[aria-pressed=\"true\"] {\n  background: var(--interactive-selection);\n  color: var(--interactive-selection-foreground);\n  border-color: transparent;\n}\n\n.mc-filter-foot {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding-top: 2px;\n  border-top: 1px solid color-mix(in srgb, var(--interactive-border) 60%, transparent);\n}\n\n.mc-filter-count {\n  font-size: 0.6875rem;\n  color: var(--surface-muted-foreground);\n  font-variant-numeric: tabular-nums;\n}\n\n.mc-filter-foot .oc-sdk-btn {\n  margin-inline-start: auto;\n}\n\n/* list */\n\n.mc-list {\n  display: flex;\n  flex-direction: column;\n  padding: 0 8px;\n}\n\n.mc-item {\n  position: relative;\n  display: block;\n  width: 100%;\n  padding: 10px 8px;\n  border-radius: 6px;\n  text-align: start;\n  transition: background 120ms ease-out;\n}\n\n/* One hairline between rows, inset to the text column so it never touches the\n   scrollbar or the row's rounded corner. `:not([hidden])` keeps it away from\n   the top of the list after a filter hides the first row. */\n.mc-item:not([hidden]) + .mc-item:not([hidden])::before {\n  content: \"\";\n  position: absolute;\n  inset-inline: 8px;\n  top: 0;\n  height: 1px;\n  background: color-mix(in srgb, var(--surface-foreground) 12%, transparent);\n  pointer-events: none;\n}\n\n.mc-item:hover {\n  background: var(--interactive-hover);\n}\n\n/* The kit marks a focused option with its hover fill; a row list needs to tell\n   focus from hover and from selection, so a focused row also takes a hairline\n   inset ring. Selected rows keep their fill and gain the ring. */\n.mc-item:focus-visible {\n  background-image: linear-gradient(var(--interactive-hover), var(--interactive-hover));\n  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--surface-foreground) 26%, transparent);\n}\n\n.mc-item[aria-selected=\"true\"]:focus-visible {\n  background-image: none;\n}\n\n.mc-item[aria-selected=\"true\"] {\n  background: var(--interactive-selection);\n  color: var(--interactive-selection-foreground);\n}\n\n.mc-item[aria-selected=\"true\"] .mc-meta,\n.mc-item[aria-selected=\"true\"] .mc-imp {\n  color: inherit;\n  opacity: 0.72;\n}\n\n.mc-meta {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  min-width: 0;\n  height: 16px;\n  font-size: 0.6875rem;\n  line-height: 16px;\n  color: var(--surface-muted-foreground);\n}\n\n.mc-cat {\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-weight: 500;\n  letter-spacing: 0.05em;\n  text-transform: uppercase;\n}\n\n.mc-dotsep {\n  flex: 0 0 auto;\n  width: 2px;\n  height: 2px;\n  border-radius: 9999px;\n  background: currentColor;\n  opacity: 0.55;\n}\n\n.mc-age {\n  flex: 0 0 auto;\n  font-variant-numeric: tabular-nums;\n}\n\n.mc-imp {\n  flex: 0 0 auto;\n  margin-inline-start: auto;\n  padding-inline-start: 6px;\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  letter-spacing: 0;\n  color: var(--surface-muted-foreground);\n}\n\n.mc-badge {\n  flex: 0 0 auto;\n}\n\n.mc-text {\n  margin-top: 1px;\n  font-size: 0.8125rem;\n  line-height: 1.45;\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n  overflow-wrap: anywhere;\n}\n\n.mc-text code,\n.mc-content code {\n  font-family: var(--font-mono);\n  font-size: 0.92em;\n  padding: 0.5px 4px;\n  border-radius: 4px;\n  background: color-mix(in srgb, var(--surface-foreground) 6%, transparent);\n}\n\n/* list footer: paging, and the one number that says how much is here */\n\n.mc-list-foot {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 6px 16px 14px;\n  min-height: 34px;\n}\n\n.mc-loadmore {\n  margin-inline-start: -6px;\n}\n\n.mc-list-count {\n  margin-inline-start: auto;\n  font-size: 0.6875rem;\n  color: var(--surface-muted-foreground);\n  font-variant-numeric: tabular-nums;\n  white-space: nowrap;\n}\n\n.mc-group + .mc-group {\n  margin-top: 16px;\n}\n\n/* Notes are blocks, not a continuous list: a 14px gap whose centre carries the\n   hairline, so the eye reads three levels — section label, note, meta line. */\n.mc-view[data-view=\"notes\"] .mc-item:not([hidden]) + .mc-item:not([hidden]) {\n  margin-top: 14px;\n}\n\n.mc-view[data-view=\"notes\"] .mc-item:not([hidden]) + .mc-item:not([hidden])::before {\n  top: -7px;\n}\n\n/* \"Show 9 dismissed notes\": a quiet disclosure where the extra rows appear,\n   never a header filter — the rows themselves are the destination. */\n.mc-reveal {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  margin: 6px 8px 0;\n  padding: 5px 8px;\n  border-radius: 6px;\n  font-size: 0.75rem;\n  color: var(--surface-muted-foreground);\n  text-align: start;\n  transition: background 120ms ease-out;\n}\n\n.mc-reveal:hover {\n  background: var(--interactive-hover);\n  color: var(--surface-foreground);\n}\n\n.mc-reveal::before {\n  content: \"\";\n  width: 0;\n  height: 0;\n  border-inline-start: 4px solid currentColor;\n  border-block: 3.5px solid transparent;\n  transition: transform 120ms ease-out;\n}\n\n.mc-reveal[aria-expanded=\"true\"]::before {\n  transform: rotate(90deg);\n  transform-origin: 25% 50%;\n}\n\n/* Dismissed rows keep their text but lose their weight: the badge says what they\n   are and the reading colour recedes, so they never pass for current. No opacity\n   here — a dimmed layer would also dim the badge and the focus ring. */\n.mc-list--muted .mc-text {\n  color: var(--surface-muted-foreground);\n}\n\n.mc-list--muted .mc-meta .mc-age,\n.mc-list--muted .mc-imp {\n  color: color-mix(in srgb, var(--surface-muted-foreground) 72%, transparent);\n}\n\n.mc-list--muted .mc-item[aria-selected=\"true\"] {\n  background: var(--interactive-selection);\n}\n\n.mc-list--muted .mc-item[aria-selected=\"true\"] .mc-text {\n  color: var(--interactive-selection-foreground);\n}\n\n.mc-group-head {\n  display: flex;\n  align-items: baseline;\n  gap: 6px;\n  /* The rule spans the text column exactly: [16, width - 16], the same\n     extent as the row hairlines, so label / row / meta share one axis. */\n  margin: 0 16px 6px;\n  padding: 8px 0 6px;\n  min-width: 0;\n  border-bottom: 1px solid color-mix(in srgb, var(--surface-foreground) 12%, transparent);\n}\n\n.mc-group-count {\n  font-size: 0.6875rem;\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  color: var(--surface-muted-foreground);\n}\n\n.mc-group-dim {\n  margin-inline-start: auto;\n  font-size: 0.6875rem;\n  color: var(--surface-muted-foreground);\n  white-space: nowrap;\n}\n\n.mc-inline-empty {\n  margin: 0;\n  padding: 4px 16px 8px;\n  font-size: 0.75rem;\n  line-height: 1.5;\n  color: var(--surface-muted-foreground);\n}\n\n/* ---- detail ------------------------------------------------------------- */\n\n.mc-detail-scroll {\n  flex: 1 1 auto;\n  min-height: 0;\n  overflow: auto;\n  overscroll-behavior: contain;\n}\n\n.mc-detail-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 14px 16px 0;\n}\n\n.mc-detail-head .mc-label {\n  flex: 0 1 auto;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.mc-detail-id {\n  margin-inline-start: auto;\n  font-size: 0.6875rem;\n  color: var(--surface-muted-foreground);\n  white-space: nowrap;\n}\n\n.mc-detail-inner {\n  padding: 10px 16px 24px;\n  max-width: 68ch;\n}\n\n.mc-h {\n  display: inline;\n  font-size: 0.9375rem;\n  font-weight: 600;\n  letter-spacing: -0.01em;\n}\n\n.mc-content {\n  font-size: 0.875rem;\n  line-height: 1.6;\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n}\n\n.mc-detail .oc-sdk-separator,\n.mc-detail-pane .oc-sdk-separator {\n  margin: 16px 0 10px;\n}\n\n.mc-prov {\n  display: grid;\n  grid-template-columns: auto minmax(0, 1fr);\n  column-gap: 14px;\n  row-gap: 3px;\n  margin: 0;\n  font-size: 0.75rem;\n  line-height: 1.5;\n}\n\n.mc-prov dt {\n  color: var(--surface-muted-foreground);\n  white-space: nowrap;\n}\n\n.mc-prov dd {\n  margin: 0;\n  min-width: 0;\n  overflow-wrap: anywhere;\n}\n\n.mc-prov dd.mc-mono {\n  font-size: 0.6875rem;\n}\n\n/* Ids never wrap: a mid-token break is noise, and the start is what identifies them. */\n.mc-prov dd.mc-id {\n  font-size: 0.6875rem;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.mc-condition {\n  margin: 0 0 14px;\n  padding: 9px 11px;\n  border-radius: 8px;\n  background: var(--surface-muted);\n  display: flex;\n  flex-direction: column;\n  gap: 3px;\n}\n\n.mc-condition-label {\n  font-size: 0.6875rem;\n  font-weight: 500;\n  letter-spacing: 0.05em;\n  text-transform: uppercase;\n  color: var(--surface-muted-foreground);\n}\n\n.mc-condition-body {\n  font-size: 0.75rem;\n  line-height: 1.5;\n  color: var(--surface-foreground);\n}\n\n/* ---- empty / error / loading ------------------------------------------- */\n\n.mc-state {\n  flex: 1 1 auto;\n  min-height: 0;\n  overflow: auto;\n}\n\n.mc-state--center {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 8px 0;\n}\n\n.mc-skel {\n  display: block;\n  height: 10px;\n  border-radius: 4px;\n  background: color-mix(in srgb, var(--surface-foreground) 8%, transparent);\n  animation: mc-blink 2s steps(1, end) infinite;\n}\n\n.mc-skel[data-h=\"8\"] { height: 8px; }\n.mc-skel[data-h=\"12\"] { height: 12px; }\n.mc-skel[data-h=\"32\"] { height: 32px; }\n\n@keyframes mc-blink {\n  0%, 100% { opacity: 1; }\n  50% { opacity: 0.5; }\n}\n\n.mc-skeleton {\n  padding: 8px 16px 20px;\n}\n\n.mc-skeleton .mc-overview-inner {\n  gap: 24px;\n}\n\n.mc-skeleton-rows {\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n  padding: 4px 10px;\n}\n\n.mc-skeleton-row {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n.mc-skeleton-hero {\n  display: flex;\n  align-items: center;\n  gap: 14px;\n}\n\n.mc-detail-skeleton {\n  padding: 16px;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  max-width: 60ch;\n}\n\n/* ---- responsive --------------------------------------------------------- */\n\n@container (max-width: 479.98px) {\n  .mc-updated {\n    display: none;\n  }\n\n  /* The composition note is the section's thesis (\"Magic Context 9,830 · 7.9%\").\n     Truncating it would hide the number; give it its own line instead. */\n  .mc-sec[data-area=\"bd\"] .mc-sec-head {\n    flex-wrap: wrap;\n    row-gap: 2px;\n  }\n\n  .mc-sec[data-area=\"bd\"] .mc-sec-note {\n    width: 100%;\n    margin-inline-start: 0;\n  }\n\n  /* The compaction sentence wraps to two lines at this width; the raw figure\n     drops under it rather than sitting on the first line's baseline. */\n  .mc-hero-cap {\n    flex-direction: column;\n    gap: 2px;\n  }\n\n  .mc-raw {\n    margin-inline-start: 0;\n  }\n}\n\n@container (max-width: 349.98px) {\n  .oc-sdk-tab-count {\n    display: none;\n  }\n}\n\n/* compact: one pane at a time, the tab strip becomes a back button */\n@container (max-width: 599.98px) {\n  .mc[data-pane=\"list\"] .mc-detail-pane {\n    display: none;\n  }\n  .mc[data-pane=\"detail\"] .mc-list-pane {\n    display: none;\n  }\n  .mc[data-pane=\"detail\"] .mc-tabs {\n    display: none;\n  }\n  .mc[data-pane=\"detail\"] .mc-back {\n    display: inline-flex;\n  }\n  .mc-detail-inner {\n    padding-top: 8px;\n  }\n}\n\n/* wide: master-detail, and an overview that reads in two columns */\n@container (min-width: 600px) {\n  .mc-split {\n    grid-template-columns: clamp(232px, 36%, 300px) minmax(0, 1fr);\n  }\n  .mc-detail-pane {\n    border-inline-start: 1px solid color-mix(in srgb, var(--interactive-border) 75%, transparent);\n  }\n  .mc-detail-head {\n    padding-top: 16px;\n  }\n}\n\n@container (min-width: 720px) {\n  .mc-overview {\n    padding-inline: 20px;\n  }\n  .mc-overview-inner {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);\n    grid-template-areas:\n      \"hero bd\"\n      \"cache bd\"\n      \"session bd\"\n      \"project bd\";\n    column-gap: 36px;\n    row-gap: 26px;\n    align-items: start;\n  }\n  /* One table per column: the numbers keep a readable measure instead of\n     drifting to the far edge of a wide panel. */\n  .mc-overview-inner > [data-area=\"bd\"] .mc-bd,\n  .mc-overview-inner > [data-area=\"bd\"] .mc-band {\n    max-width: 340px;\n  }\n  .mc-bd-row {\n    height: 26px;\n    line-height: 26px;\n  }\n  .mc-overview-inner > .mc-sec--hero { grid-area: hero; }\n  .mc-overview-inner > [data-area=\"bd\"] { grid-area: bd; }\n  .mc-overview-inner > [data-area=\"cache\"] { grid-area: cache; }\n  .mc-overview-inner > [data-area=\"session\"] { grid-area: session; }\n  .mc-overview-inner > [data-area=\"project\"] { grid-area: project; }\n  /* Identity belongs to the whole panel, not to the left column. */\n  .mc-overview-inner > .mc-foot {\n    grid-column: 1 / -1;\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .mc-item,\n  .mc-meter-fill,\n  .oc-sdk-tab {\n    transition: none;\n  }\n  .mc-skel {\n    animation: none;\n    opacity: 0.6;\n  }\n}\n\n/* ---------------------------------------------------------------------------\n   Split mode: the master column is 232–300px. The filter trigger keeps its icon\n   and gives up its label there, so the search field keeps its placeholder; when\n   a filter is on, the icon turns primary and the accessible name spells it out.\n   ------------------------------------------------------------------------- */\n@container (min-width: 600px) {\n  .mc-filter-btn {\n    width: 28px;\n    padding-inline: 0;\n    justify-content: center;\n    gap: 0;\n    max-width: none;\n  }\n\n  .mc-filter-btn .oc-sdk-trigger-value,\n  .mc-filter-btn .oc-sdk-trigger-chevron {\n    display: none;\n  }\n\n  .mc-filter-btn[data-active=\"true\"] .mc-filter-icon {\n    color: var(--primary);\n  }\n}\n\n/* ---------------------------------------------------------------------------\n   Below 420 the tab strip and the freshness cluster cannot share a row: three\n   labels plus a source word plus a refresh control need 320px that don't exist.\n   The strip takes its own row (all three views stay visible, nothing scrolls\n   horizontally) and the cluster keeps the second row, right-aligned.\n   ------------------------------------------------------------------------- */\n@container (max-width: 419.98px) {\n  .mc-chrome {\n    flex-wrap: wrap;\n    height: auto;\n    padding-block: 4px 5px;\n    row-gap: 2px;\n  }\n\n  .mc-tabs {\n    flex: 1 1 100%;\n    overflow: visible;\n  }\n\n  /* Section heads wrap the note instead of ellipsizing a figure. */\n  .mc-sec-head {\n    flex-wrap: wrap;\n    row-gap: 2px;\n  }\n\n  .mc-sec-note {\n    flex: 1 1 100%;\n    margin-inline-start: 0;\n    white-space: normal;\n  }\n}\n";
	// panel/styles/app.css?inline
	var app_default = "#root {\n  display: flex;\n  flex-direction: column;\n  flex: 1 1 auto;\n  min-height: 0;\n}\n\n.mc-search-host {\n  flex: 1 1 auto;\n  min-width: 0;\n}\n\n.mc-search-host .oc-sdk-search {\n  width: 100%;\n}\n\n.mc-search-host .oc-sdk-input {\n  height: 28px;\n  font-size: 0.8125rem;\n}\n\n.mc-tabs {\n  min-width: 0;\n}\n\n.mc-list-foot .mc-list-count {\n  margin-inline-start: auto;\n}\n\n.mc-state {\n  flex: 1 1 auto;\n  min-height: 0;\n}\n";
	// panel/main.tsx
	var host = connectHost();
	var root = document.querySelector("#root");
	if (!root) throw new Error("missing #root");
	var style = document.createElement("style");
	style.textContent = `${panel_default}\n${app_default}`;
	document.head.append(style);
	var panel = createPanel((request) => host.serviceRequest(request));
	render(() => createComponent(App, { panel }), root);
	host.onReady((ctx) => {
		applyHostReady(ctx, document.documentElement);
		setLocale(ctx.locale);
		panel.start({
			directory: ctx.directory,
			sessionId: ctx.session?.id ?? null
		});
	});
	host.onSession((session) => {
		panel.setTarget({ sessionId: session?.id ?? null });
	});
	host.onDirectory((directory) => {
		panel.setTarget({ directory });
	});
	window.addEventListener("beforeunload", () => {
		panel.dispose();
		host.dispose();
	});
})();
