import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command:
			'pnpm -F @sejohnson/streamed-resource build && pnpm -F playground build && pnpm -F playground preview',
		port: 4173
	},
	testDir: 'e2e'
});
