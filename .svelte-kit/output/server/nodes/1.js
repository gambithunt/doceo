

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.CuHmC97F.js","_app/immutable/chunks/D0AVAibJ.js","_app/immutable/chunks/d-1EktCD.js"];
export const stylesheets = [];
export const fonts = [];
