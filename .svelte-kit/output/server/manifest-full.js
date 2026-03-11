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
		client: {start:"_app/immutable/entry/start.B1WhRCDc.js",app:"_app/immutable/entry/app.OqSSuRtQ.js",imports:["_app/immutable/entry/start.B1WhRCDc.js","_app/immutable/chunks/B2eDWqRQ.js","_app/immutable/chunks/BMOPieSH.js","_app/immutable/chunks/C8mE_EF6.js","_app/immutable/entry/app.OqSSuRtQ.js","_app/immutable/chunks/BMOPieSH.js","_app/immutable/chunks/ByAQXraS.js","_app/immutable/chunks/ULgTuGFF.js","_app/immutable/chunks/C8mE_EF6.js","_app/immutable/chunks/Bd7UQKXC.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
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
			},
			{
				id: "/api/ai/tutor",
				pattern: /^\/api\/ai\/tutor\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/tutor/_server.ts.js'))
			},
			{
				id: "/api/state/bootstrap",
				pattern: /^\/api\/state\/bootstrap\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/state/bootstrap/_server.ts.js'))
			},
			{
				id: "/api/state/sync",
				pattern: /^\/api\/state\/sync\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/state/sync/_server.ts.js'))
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
