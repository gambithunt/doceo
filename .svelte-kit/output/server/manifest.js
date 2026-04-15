export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.ico"]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.D4SxjjCZ.js",app:"_app/immutable/entry/app.BN7jBAS9.js",imports:["_app/immutable/entry/start.D4SxjjCZ.js","_app/immutable/chunks/BChidGUp.js","_app/immutable/chunks/nPQwml6W.js","_app/immutable/entry/app.BN7jBAS9.js","_app/immutable/chunks/nPQwml6W.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
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
			__memo(() => import('./nodes/23.js')),
			__memo(() => import('./nodes/24.js')),
			__memo(() => import('./nodes/25.js')),
			__memo(() => import('./nodes/26.js'))
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
				id: "/admin/graph",
				pattern: /^\/admin\/graph\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/admin/graph/legacy",
				pattern: /^\/admin\/graph\/legacy\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/admin/graph/[nodeId]",
				pattern: /^\/admin\/graph\/([^/]+?)\/?$/,
				params: [{"name":"nodeId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,3,], errors: [1,,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/admin/learning",
				pattern: /^\/admin\/learning\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/admin/messages",
				pattern: /^\/admin\/messages\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/admin/messages/[session_id]",
				pattern: /^\/admin\/messages\/([^/]+?)\/?$/,
				params: [{"name":"session_id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,3,], errors: [1,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/admin/revenue",
				pattern: /^\/admin\/revenue\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/admin/settings",
				pattern: /^\/admin\/settings\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/admin/system",
				pattern: /^\/admin\/system\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/admin/users",
				pattern: /^\/admin\/users\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 24 },
				endpoint: null
			},
			{
				id: "/admin/users/[id]",
				pattern: /^\/admin\/users\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,3,], errors: [1,,], leaf: 25 },
				endpoint: null
			},
			{
				id: "/api/admin/audit-export",
				pattern: /^\/api\/admin\/audit-export\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/audit-export/_server.ts.js'))
			},
			{
				id: "/api/admin/lesson-artifacts",
				pattern: /^\/api\/admin\/lesson-artifacts\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/lesson-artifacts/_server.ts.js'))
			},
			{
				id: "/api/admin/promote-topics",
				pattern: /^\/api\/admin\/promote-topics\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/promote-topics/_server.ts.js'))
			},
			{
				id: "/api/ai/institution-verify",
				pattern: /^\/api\/ai\/institution-verify\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/institution-verify/_server.ts.js'))
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
				id: "/api/ai/programme-verify",
				pattern: /^\/api\/ai\/programme-verify\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/programme-verify/_server.ts.js'))
			},
			{
				id: "/api/ai/revision-evaluate",
				pattern: /^\/api\/ai\/revision-evaluate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/revision-evaluate/_server.ts.js'))
			},
			{
				id: "/api/ai/revision-pack",
				pattern: /^\/api\/ai\/revision-pack\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/revision-pack/_server.ts.js'))
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
				id: "/api/auth/mode",
				pattern: /^\/api\/auth\/mode\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/mode/_server.ts.js'))
			},
			{
				id: "/api/auth/register",
				pattern: /^\/api\/auth\/register\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/register/_server.ts.js'))
			},
			{
				id: "/api/curriculum/program",
				pattern: /^\/api\/curriculum\/program\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/curriculum/program/_server.ts.js'))
			},
			{
				id: "/api/curriculum/subject-topics",
				pattern: /^\/api\/curriculum\/subject-topics\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/curriculum/subject-topics/_server.ts.js'))
			},
			{
				id: "/api/curriculum/topic-discovery",
				pattern: /^\/api\/curriculum\/topic-discovery\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/curriculum/topic-discovery/_server.ts.js'))
			},
			{
				id: "/api/curriculum/topic-discovery/click",
				pattern: /^\/api\/curriculum\/topic-discovery\/click\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/curriculum/topic-discovery/click/_server.ts.js'))
			},
			{
				id: "/api/curriculum/topic-discovery/complete",
				pattern: /^\/api\/curriculum\/topic-discovery\/complete\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/curriculum/topic-discovery/complete/_server.ts.js'))
			},
			{
				id: "/api/curriculum/topic-discovery/feedback",
				pattern: /^\/api\/curriculum\/topic-discovery\/feedback\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/curriculum/topic-discovery/feedback/_server.ts.js'))
			},
			{
				id: "/api/curriculum/topic-discovery/refresh",
				pattern: /^\/api\/curriculum\/topic-discovery\/refresh\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/curriculum/topic-discovery/refresh/_server.ts.js'))
			},
			{
				id: "/api/geo/country",
				pattern: /^\/api\/geo\/country\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/geo/country/_server.ts.js'))
			},
			{
				id: "/api/lesson-artifacts/rate",
				pattern: /^\/api\/lesson-artifacts\/rate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/lesson-artifacts/rate/_server.ts.js'))
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
				id: "/api/payments/checkout",
				pattern: /^\/api\/payments\/checkout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/payments/checkout/_server.ts.js'))
			},
			{
				id: "/api/payments/quota-status",
				pattern: /^\/api\/payments\/quota-status\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/payments/quota-status/_server.ts.js'))
			},
			{
				id: "/api/payments/webhook",
				pattern: /^\/api\/payments\/webhook\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/payments/webhook/_server.ts.js'))
			},
			{
				id: "/api/revision/planner-resolve",
				pattern: /^\/api\/revision\/planner-resolve\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/revision/planner-resolve/_server.ts.js'))
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
				page: { layouts: [0,], errors: [1,], leaf: 26 },
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
