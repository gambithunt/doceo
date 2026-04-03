

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.BYd3c9VB.js","_app/immutable/chunks/BYLevpFT.js","_app/immutable/chunks/D-PE12_F.js"];
export const stylesheets = [];
export const fonts = [];
