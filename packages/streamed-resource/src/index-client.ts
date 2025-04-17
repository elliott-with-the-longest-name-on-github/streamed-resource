import { StreamedResource } from './streamed-resource-client.svelte.js';
import type { Key, Result } from './types.js';

export function createStreamedResource<
	TData,
	TError = unknown,
	TInitialValue extends TData | undefined = undefined
>(
	key: Key,
	streamedPromise: Promise<TData>,
	initialValue: TInitialValue = undefined as TInitialValue
): Result<TData, TError, TInitialValue> {
	return new StreamedResource(key, streamedPromise, initialValue) as Result<
		TData,
		TError,
		TInitialValue
	>;
}

export type { Result, Key, ErrorResult, LoadingResult, SuccessResult } from './types.js';
