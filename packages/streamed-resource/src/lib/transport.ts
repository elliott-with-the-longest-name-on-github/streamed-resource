import type { Transporter } from '@sveltejs/kit';
import { StreamedResource as ServerStreamedResource } from './streamed-resource-server.js';
import { StreamedResource as ClientStreamedResource } from './streamed-resource-client.svelte.js';
import type { Key } from './types.js';

export const transport: Transporter<
	ClientStreamedResource<unknown>,
	[Key, Promise<unknown>, unknown]
> = {
	// the other properties are static on the server, so there's no point in sending them over the wire
	encode: (value) =>
		value instanceof ServerStreamedResource && [value.key, value.promise, value.data],
	decode: ([key, promise, data]) => new ClientStreamedResource(key, promise, data)
};
