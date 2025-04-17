import { createStreamedResource } from '@sejohnson/streamed-resource';
import { error } from '@sveltejs/kit';

export function load() {
	return {
		test: createStreamedResource(['test'], createPromise())
	};
}

async function createPromise() {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return Math.random() > 0.5 ? 'hi' : error(500, 'Oops, failed!');
}
