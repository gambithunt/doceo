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
		client: {start:"_app/immutable/entry/start.COvhKRB8.js",app:"_app/immutable/entry/app.BnhdppZx.js",imports:["_app/immutable/entry/start.COvhKRB8.js","_app/immutable/chunks/VnilDVIm.js","_app/immutable/chunks/wgxlZxHc.js","_app/immutable/entry/app.BnhdppZx.js","_app/immutable/chunks/wgxlZxHc.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
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
				id: "/api/onboarding/complete",
				pattern: /^\/api\/onboarding\/complete\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/onboarding/complete/_server.ts.js'))
			},
			{
				id: "/api/onboarding/options",
				pattern: /^\/api\/onboarding\/options\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/onboarding/options/_server.ts.js'))
			},
			{
				id: "/api/onboarding/progress",
				pattern: /^\/api\/onboarding\/progress\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/onboarding/progress/_server.ts.js'))
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
