

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.BqZ0J0Nw.js","_app/immutable/chunks/6odWZPzO.js","_app/immutable/chunks/lvnZAqtj.js"];
export const stylesheets = [];
export const fonts = [];
