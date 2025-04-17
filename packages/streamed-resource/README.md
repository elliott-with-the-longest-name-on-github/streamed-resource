# `@sejohnson/streamed-resource`

Give me your promises, and I will keep them.

> [!NOTE]
> This library works great along with the excellent [`sveltekit-search-params`](https://www.npmjs.com/package/sveltekit-search-params)!

## Why?

SvelteKit's streamed promises are an awesome feature, but they can be annoying to work with. Consider the following setup:

```ts
// +page.server.ts
export function load() {
	return {
		postsQuery: getPosts()
	};
}
```

```svelte
<!-- +page.svelte -->
<script>
	const { data } = $props();
</script>

{#await data.postsQuery}
	<pre>Loading...</pre>
{:then result}
	<pre>{JSON.stringify(data, undefined, 2)}</pre>
{:catch error}
	<pre>{JSON.stringify(error, undefined, 2)}</pre>
{/await}

<button onclick={() => invalidateAll()}>invalidate</button>
```

This works _great_, right up until you revalidate the page by clicking the button. Because `data.postsQuery` becomes a new promise, you get the `Loading...` UI again, throwing out your old data instead of keeping the old data until the new data is ready. You can get around this by doing a bunch of gross effect-based stuff, but... that's gross and effect-based.

Instead... you can use this library!

Add the transporter to `hooks.ts`:

```ts
import type { Transport } from '@sveltejs/kit';
import { transport as StreamedResource } from '@sejohnson/streamed-resource/transport';

export const transport: Transport = {
	StreamedResource
};
```

...and your setup can now look like this:

```ts
import { createStreamedResource } from '@sejohnson/streamed-resource';

// +page.server.ts
export function load() {
	return {
		postsQuery: createStreamedResource(['posts'], getPosts())
	};
}
```

```svelte
<!-- +page.svelte -->
<script>
	const { data } = $props();
</script>

{#if data.postsQuery.status === 'loading'}
	<pre>Loading...</pre>
{:else if data.postsQuery.status === 'error'}
	<pre>{JSON.stringify(data.postsQuery.error, undefined, 2)}</pre>
{:else}
	<pre>{JSON.stringify(data.postsQuery.data, undefined, 2)}</pre>
{/if}

{#if data.revalidating}
	<pre>Revalidating...</pre>
{/if}

<button onclick={() => invalidateAll()}>invalidate</button>
```

What changed?

- We added a transporter that handles moving our streamed resource from the server to the client
- Instead of a `Promise<T>`, we now have a `StreamedResource<T>`, which has SWR-like behavior and typings
  - `status === 'loading'` is only true once, the first time the data for this key is fetched (this is reset on hard reloads)
  - `revalidating` is true every time we refetch the data, except when `status` is `'loading'` (the first time we fetch the data)
  - `data` is:
    - `undefined` while `status` is `'loading'`, unless `initialData` (the third argument to `createStreamedResource`) is provided, in which case it's always `T`
    - `undefined` while `status` is `'error'`
    - `T` while `status` is `'success'`
  - `error` is:
    - `undefined` while `status` is `'success'` or `'loading'`
    - `TError` while `status` is `'error'`
- The `StreamedResource` does not wipe out its `data` property on refetches!

## Things to be aware of

- This library expects that there is only ever one copy of a `StreamedResource` with a given key at the same time -- so don't go creating two resources with identical keys in two places that are both rendered simultaneously. Instead, create the resource in a shared layout -- it'll be inhereted on `data` and `page.data` just like it should be!
- If you want a refetch to re-trigger loading, you should key the resource on something that changes. For example, `createStreamedResource(['user', userId], getUser(userId))` will re-trigger when `userId` changes, but revalidate when it is the same.
