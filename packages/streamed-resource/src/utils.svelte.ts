import { tick, untrack } from 'svelte';
import type { Key } from './types.js';

/**
 * There's a tough problem with this library: The state from a streamed promise needs to live somewhere outside of the normal effect lifecycle,
 * because when a new promise comes in, we have to destroy the StreamedResource and create a new one, which destroys all of the state inside of
 * the resource. Easy, store all of the state in a global Map, right? Unfortunately, that's a memory leak -- the Map will continually fill and
 * never empty.
 *
 * There's only really one time where the value in the map should be removed: When the `+page` (or `+layout`) component is destroyed. Unfortunately,
 * we don't really have any way to know when that happens, so we have to settle for second best. The heuristic is, "remove the data from the map after
 * no one has cared about it for 5 minutes".
 *
 * This function allows the StreamedResource to register a cleanup function that will be enqueued when there are no listeners to any of its properties.
 * That cleanup function will be canceled if a new listener is added before the timeout expires.
 */
export function createDeferredCleanup(cleanup: () => void) {
	let subscribers = 0;
	let stop: (() => void) | void;
	let timeout: NodeJS.Timeout | undefined;

	return () => {
		if (!$effect.tracking()) {
			return;
		}

		$effect(() => {
			if (subscribers === 0) {
				clearTimeout(timeout);
				stop = untrack(() => cleanup);
			}

			subscribers++;

			return () => {
				tick().then(() => {
					subscribers--;

					if (subscribers === 0) {
						timeout = setTimeout(
							() => {
								stop?.();
								stop = undefined;
							},
							5 * 60 * 1000
						);
					}
				});
			};
		});
	};
}

export class KeyedStore<T> extends Map<string, T> {
	#itemConstructor: new (key: string) => T;

	constructor(
		itemConstructor: new (key: string) => T,
		value?: Iterable<readonly [string, T]> | null | undefined
	) {
		super(value);
		this.#itemConstructor = itemConstructor;
	}

	get(key: string): T {
		const test =
			super.get(key) ??
			// Untrack here because this is technically a state mutation, meaning
			// deriveds downstream would fail. Because this is idempotent (even
			// though it's not pure), it's safe.
			untrack(() => this.set(key, new this.#itemConstructor(key))).get(key)!;

		return test;
	}
}

export function promiseWithResolvers<T>(): {
	promise: Promise<T>;
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (reason?: unknown) => void;
} {
	let resolve: (value: T | PromiseLike<T>) => void;
	let reject: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return {
		promise,
		resolve: resolve!,
		reject: reject!
	};
}

export function createRandomKey(): Key {
	return [crypto.randomUUID()];
}
