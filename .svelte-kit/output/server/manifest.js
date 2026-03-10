export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.BiUD03y3.js",app:"_app/immutable/entry/app.RPf-zXB9.js",imports:["_app/immutable/entry/start.BiUD03y3.js","_app/immutable/chunks/CEEoIZWD.js","_app/immutable/chunks/BxqxDuOX.js","_app/immutable/chunks/B1OHTdYM.js","_app/immutable/chunks/CeUSaZSI.js","_app/immutable/entry/app.RPf-zXB9.js","_app/immutable/chunks/BxqxDuOX.js","_app/immutable/chunks/DkcbHNXx.js","_app/immutable/chunks/BrIvAMXJ.js","_app/immutable/chunks/CeUSaZSI.js","_app/immutable/chunks/CWW4LRX7.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
