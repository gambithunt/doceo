

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.C4ASRdU0.js","_app/immutable/chunks/B4NYH69I.js","_app/immutable/chunks/D1rk6QSl.js"];
export const stylesheets = [];
export const fonts = [];
