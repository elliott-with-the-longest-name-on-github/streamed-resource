import { describe, it, expect, vi } from 'vitest';
import { createRandomKey, promiseWithResolvers } from './utils.svelte.js';
import { createStreamedResource } from './index-client.js';
import { tick } from 'svelte';

describe('on the client', () => {
	it('goes through the correct lifecycle', async () => {
		const { promise: promise1, resolve: resolve1 } = promiseWithResolvers();
		const key = createRandomKey();
		const resource1 = createStreamedResource(key, promise1);

		expect(resource1).toMatchObject({
			data: undefined,
			error: undefined,
			status: 'loading',
			revalidating: false
		});

		resolve1('hello, world');
		await vi.waitFor(() => {
			expect(resource1).toMatchObject({
				data: 'hello, world',
				error: undefined,
				status: 'success',
				revalidating: false
			});
		});

		const { promise: promise2, reject: reject2 } = promiseWithResolvers();
		const resource2 = createStreamedResource(key, promise2);
		expect(resource2).toMatchObject({
			data: 'hello, world',
			error: undefined,
			status: 'success',
			revalidating: true
		});

		reject2(new Error('oh no'));
		await vi.waitFor(() => {
			expect(resource2).toMatchObject({
				data: undefined,
				error: new Error('oh no'),
				status: 'error',
				revalidating: false
			});
		});
	});

	it('correctly resolves race conditions', async () => {
		const { promise: promise1, resolve: resolve1 } = promiseWithResolvers();
		const { promise: promise2, resolve: resolve2 } = promiseWithResolvers();
		const { promise: promise3, reject: reject3 } = promiseWithResolvers();
		const key = createRandomKey();
		// created order: 1 -> 2 -> 3, resolved order: 2 -> 1 -> 3
		// keep in mind, only one of these resources is actually going to be "active" at a time
		// (since the resource is replaced when the page loads new data)
		// but the promise is still resolving in the background
		// With this order, we should see only the update from 2 and 3 take effect, since
		// 1 started before 2 but finished after (and therefore would be stale)
		createStreamedResource(key, promise1);
		await tick();
		createStreamedResource(key, promise2);
		await tick();
		const resource3 = createStreamedResource(key, promise3);
		await tick();

		expect(resource3).toMatchObject({
			data: undefined,
			error: undefined,
			status: 'loading',
			revalidating: false
		});

		resolve2('hello, world');
		await vi.waitFor(() => {
			expect(resource3).toMatchObject({
				data: 'hello, world',
				error: undefined,
				status: 'success',
				revalidating: true
			});
		});

		resolve1('hello, world, from before!');
		await vi.waitFor(() => {
			expect(resource3).toMatchObject({
				data: 'hello, world',
				error: undefined,
				status: 'success',
				revalidating: true
			});
		});

		reject3(new Error('oh no'));
		await vi.waitFor(() => {
			expect(resource3).toMatchObject({
				data: undefined,
				error: new Error('oh no'),
				status: 'error',
				revalidating: false
			});
		});
	});
});
