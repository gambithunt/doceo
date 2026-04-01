

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.D7qpRM38.js","_app/immutable/chunks/MHYgLwzm.js","_app/immutable/chunks/iI6cDhf1.js"];
export const stylesheets = [];
export const fonts = [];
