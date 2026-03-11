

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.DfcKzb8x.js","_app/immutable/chunks/wgxlZxHc.js","_app/immutable/chunks/VnilDVIm.js"];
export const stylesheets = ["_app/immutable/assets/2.BuUgdUmc.css"];
export const fonts = [];
