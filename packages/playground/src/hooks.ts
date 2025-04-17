import type { Transport } from '@sveltejs/kit';
import { transport as StreamedResource } from '@sejohnson/streamed-resource/transport';

export const transport: Transport = {
	StreamedResource
};
