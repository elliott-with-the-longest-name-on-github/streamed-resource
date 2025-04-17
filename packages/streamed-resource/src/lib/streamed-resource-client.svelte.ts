import type { Status, Key } from './types.js';
import { createDeferredCleanup, KeyedStore } from '$lib/utils.svelte.js';

class StoredData<TData, TError> {
	key: string;
	status = $state<Status>('loading');
	// these need to be boxed objects so that they can we WeakMap keys even when undefined
	error = $state.raw<{ value: TError | undefined }>({ value: undefined });
	data = $state.raw<{ value: TData | undefined }>({ value: undefined });
	revalidatingCount = $state(0);
	dataSets = new WeakMap<{ value: TData | undefined }, { startTime: number }>();
	errorSets = new WeakMap<{ value: TError | undefined }, { startTime: number }>();
	dependUpon = createDeferredCleanup(() => store.delete(this.key));

	constructor(key: string) {
		this.key = key;
	}

	commitResult(
		status: Status,
		data: { value: TData | undefined },
		error: { value: TError | undefined },
		startTime: number
	) {
		this.status = status;
		this.data = data;
		this.error = error;
		this.dataSets.set(data, { startTime });
		this.errorSets.set(error, { startTime });
	}
}

const store = new KeyedStore<StoredData<unknown, unknown>>(StoredData);

export class StreamedResource<TData, TError = unknown> {
	readonly promise: Promise<TData>;

	// some of these don't actually need to be state but it confuses TS if they're not
	readonly key = $state<Key>()!;
	#keyString = $derived(this.key.join('.'));
	#store = $derived(store.get(this.#keyString) as StoredData<TData, TError>);

	get status() {
		this.#store.dependUpon();
		return this.#store.status;
	}
	get revalidating() {
		this.#store.dependUpon();
		return this.#store.revalidatingCount > 0 && this.#store.status !== 'loading';
	}
	get data() {
		console.log(new Error().stack);
		this.#store.dependUpon();
		return this.#store.data.value;
	}
	get error() {
		this.#store.dependUpon();
		return this.#store.error.value;
	}

	constructor(key: Key, promise: Promise<TData>, initialData: TData | undefined = undefined) {
		this.key = key;
		this.promise = promise;

		if (this.#store.data === undefined) {
			this.#store.data = { value: initialData };
		}

		// This doesn't need to be an effect because this whole class will be recreated if the promise changes
		const oldData = this.#store.data;
		const oldError = this.#store.error;
		const startTime = Date.now();
		this.#store.revalidatingCount++;
		const shouldCommit = (): boolean => {
			if (this.#store.data === oldData && this.#store.error === oldError) {
				// state hasn't changed since we started resolving the promise
				return true;
			}
			let commit = true;

			// if `data` or `error` has changed, there was a race condition where a new promise was created
			// prior to the old one resolving, so we get the start time associated with `data`
			// and compare it to the start time of this fetch operation. If `data`'s fetch started
			// after this one, we can ignore the result of this fetch.
			const currentDataRevalidation = this.#store.dataSets.get(this.#store.data);
			if (currentDataRevalidation && currentDataRevalidation.startTime > startTime) {
				commit = false;
			}
			const currentErrorRevalidation = this.#store.errorSets.get(this.#store.error);
			if (currentErrorRevalidation && currentErrorRevalidation.startTime > startTime) {
				commit = false;
			}
			return commit;
		};
		this.promise
			.then((resolvedData) => {
				if (!shouldCommit()) {
					return;
				}
				this.#store.commitResult(
					'success',
					{ value: resolvedData },
					{ value: undefined },
					startTime
				);
			})
			.catch((err) => {
				if (!shouldCommit()) {
					return;
				}
				this.#store.commitResult('error', { value: undefined }, { value: err }, startTime);
			})
			.finally(() => {
				this.#store.revalidatingCount--;
			});
	}
}
