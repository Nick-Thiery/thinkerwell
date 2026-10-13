/** The app's version, from package.json at build time (vite.config.ts `define`); 'dev' where it isn't defined. */
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
