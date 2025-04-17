import type { Key, Status } from './types.js';

// on the server, StreamedResource is always loading and never revalidating
export class StreamedResource<TData, TError = unknown> {
	readonly key: Key;
	readonly promise: Promise<TData>;

	readonly status: Status = 'loading';
	readonly revalidating = false;
	readonly error: TError | undefined = undefined;
	readonly data: TData | undefined = undefined;

	constructor(key: Key, promise: Promise<TData>, initialValue?: TData) {
		this.key = key;
		this.data = initialValue;
		// TODO I would like to attach a catch handler here but it ruins the client error
		this.promise = promise;
		this.promise.catch(() => {});
	}
}
