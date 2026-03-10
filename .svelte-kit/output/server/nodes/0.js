

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.NVf5lJQF.js","_app/immutable/chunks/BrIvAMXJ.js","_app/immutable/chunks/BxqxDuOX.js","_app/immutable/chunks/B6IUGxYS.js"];
export const stylesheets = ["_app/immutable/assets/0.7bU1EpnE.css"];
export const fonts = [];
