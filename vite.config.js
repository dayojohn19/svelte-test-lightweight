import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/svelte-test-lightweight/',
  plugins: [svelte()]
}));