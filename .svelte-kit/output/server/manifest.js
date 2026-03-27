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
		client: {start:"_app/immutable/entry/start.kHrFNpDN.js",app:"_app/immutable/entry/app.7p9iA-4G.js",imports:["_app/immutable/entry/start.kHrFNpDN.js","_app/immutable/chunks/lvnZAqtj.js","_app/immutable/chunks/6odWZPzO.js","_app/immutable/entry/app.7p9iA-4G.js","_app/immutable/chunks/6odWZPzO.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js')),
			__memo(() => import('./nodes/12.js')),
			__memo(() => import('./nodes/13.js')),
			__memo(() => import('./nodes/14.js')),
			__memo(() => import('./nodes/15.js')),
			__memo(() => import('./nodes/16.js')),
			__memo(() => import('./nodes/17.js')),
			__memo(() => import('./nodes/18.js')),
			__memo(() => import('./nodes/19.js')),
			__memo(() => import('./nodes/20.js')),
			__memo(() => import('./nodes/21.js')),
			__memo(() => import('./nodes/22.js')),
			__memo(() => import('./nodes/23.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/admin/ai",
				pattern: /^\/admin\/ai\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/admin/content",
				pattern: /^\/admin\/content\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/admin/learning",
				pattern: /^\/admin\/learning\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/admin/messages",
				pattern: /^\/admin\/messages\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/admin/messages/[session_id]",
				pattern: /^\/admin\/messages\/([^/]+?)\/?$/,
				params: [{"name":"session_id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,3,], errors: [1,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/admin/revenue",
				pattern: /^\/admin\/revenue\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/admin/settings",
				pattern: /^\/admin\/settings\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/admin/system",
				pattern: /^\/admin\/system\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/admin/users",
				pattern: /^\/admin\/users\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/admin/users/[id]",
				pattern: /^\/admin\/users\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,3,], errors: [1,,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/api/ai/lesson-chat",
				pattern: /^\/api\/ai\/lesson-chat\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/lesson-chat/_server.ts.js'))
			},
			{
				id: "/api/ai/lesson-plan",
				pattern: /^\/api\/ai\/lesson-plan\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/lesson-plan/_server.ts.js'))
			},
			{
				id: "/api/ai/lesson-selector",
				pattern: /^\/api\/ai\/lesson-selector\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/lesson-selector/_server.ts.js'))
			},
			{
				id: "/api/ai/subject-hints",
				pattern: /^\/api\/ai\/subject-hints\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/subject-hints/_server.ts.js'))
			},
			{
				id: "/api/ai/topic-shortlist",
				pattern: /^\/api\/ai\/topic-shortlist\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/topic-shortlist/_server.ts.js'))
			},
			{
				id: "/api/ai/tutor",
				pattern: /^\/api\/ai\/tutor\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/tutor/_server.ts.js'))
			},
			{
				id: "/api/curriculum/program",
				pattern: /^\/api\/curriculum\/program\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/curriculum/program/_server.ts.js'))
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
				id: "/api/onboarding/reset",
				pattern: /^\/api\/onboarding\/reset\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/onboarding/reset/_server.ts.js'))
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
			},
			{
				id: "/api/subjects/verify",
				pattern: /^\/api\/subjects\/verify\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/subjects/verify/_server.ts.js'))
			},
			{
				id: "/(app)/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(app)/lesson",
				pattern: /^\/lesson\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/(app)/lesson/[id]",
				pattern: /^\/lesson\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/onboarding",
				pattern: /^\/onboarding\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/(app)/progress",
				pattern: /^\/progress\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/(app)/revision",
				pattern: /^\/revision\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/(app)/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/(app)/subjects/[id]",
				pattern: /^\/subjects\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 11 },
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
