
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/(app)" | "/" | "/admin" | "/admin/ai" | "/admin/content" | "/admin/graph" | "/admin/graph/legacy" | "/admin/graph/[nodeId]" | "/admin/learning" | "/admin/messages" | "/admin/messages/[session_id]" | "/admin/revenue" | "/admin/settings" | "/admin/system" | "/admin/users" | "/admin/users/[id]" | "/api" | "/api/admin" | "/api/admin/audit-export" | "/api/admin/lesson-artifacts" | "/api/admin/promote-topics" | "/api/admin/tts" | "/api/admin/tts/preview" | "/api/ai" | "/api/ai/institution-verify" | "/api/ai/lesson-chat" | "/api/ai/lesson-evaluate" | "/api/ai/lesson-plan" | "/api/ai/lesson-selector" | "/api/ai/programme-verify" | "/api/ai/revision-evaluate" | "/api/ai/revision-pack" | "/api/ai/subject-hints" | "/api/ai/topic-shortlist" | "/api/ai/tutor" | "/api/auth" | "/api/auth/mode" | "/api/auth/register" | "/api/curriculum" | "/api/curriculum/program" | "/api/curriculum/subject-topics" | "/api/curriculum/topic-discovery" | "/api/curriculum/topic-discovery/abandon" | "/api/curriculum/topic-discovery/click" | "/api/curriculum/topic-discovery/complete" | "/api/curriculum/topic-discovery/feedback" | "/api/curriculum/topic-discovery/refresh" | "/api/geo" | "/api/geo/country" | "/api/lesson-artifacts" | "/api/lesson-artifacts/rate" | "/api/onboarding" | "/api/onboarding/complete" | "/api/onboarding/options" | "/api/onboarding/progress" | "/api/onboarding/reset" | "/api/payments" | "/api/payments/checkout" | "/api/payments/quota-status" | "/api/payments/webhook" | "/api/revision" | "/api/revision/planner-resolve" | "/api/state" | "/api/state/bootstrap" | "/api/state/sync" | "/api/subjects" | "/api/subjects/verify" | "/api/tts" | "/api/tts/lesson" | "/(app)/dashboard" | "/(app)/lesson" | "/(app)/lesson/[id]" | "/onboarding" | "/(app)/progress" | "/(app)/revision" | "/(app)/settings" | "/(app)/subjects" | "/(app)/subjects/[id]";
		RouteParams(): {
			"/admin/graph/[nodeId]": { nodeId: string };
			"/admin/messages/[session_id]": { session_id: string };
			"/admin/users/[id]": { id: string };
			"/(app)/lesson/[id]": { id: string };
			"/(app)/subjects/[id]": { id: string }
		};
		LayoutParams(): {
			"/(app)": { id?: string };
			"/": { nodeId?: string; session_id?: string; id?: string };
			"/admin": { nodeId?: string; session_id?: string; id?: string };
			"/admin/ai": Record<string, never>;
			"/admin/content": Record<string, never>;
			"/admin/graph": { nodeId?: string };
			"/admin/graph/legacy": Record<string, never>;
			"/admin/graph/[nodeId]": { nodeId: string };
			"/admin/learning": Record<string, never>;
			"/admin/messages": { session_id?: string };
			"/admin/messages/[session_id]": { session_id: string };
			"/admin/revenue": Record<string, never>;
			"/admin/settings": Record<string, never>;
			"/admin/system": Record<string, never>;
			"/admin/users": { id?: string };
			"/admin/users/[id]": { id: string };
			"/api": Record<string, never>;
			"/api/admin": Record<string, never>;
			"/api/admin/audit-export": Record<string, never>;
			"/api/admin/lesson-artifacts": Record<string, never>;
			"/api/admin/promote-topics": Record<string, never>;
			"/api/admin/tts": Record<string, never>;
			"/api/admin/tts/preview": Record<string, never>;
			"/api/ai": Record<string, never>;
			"/api/ai/institution-verify": Record<string, never>;
			"/api/ai/lesson-chat": Record<string, never>;
			"/api/ai/lesson-evaluate": Record<string, never>;
			"/api/ai/lesson-plan": Record<string, never>;
			"/api/ai/lesson-selector": Record<string, never>;
			"/api/ai/programme-verify": Record<string, never>;
			"/api/ai/revision-evaluate": Record<string, never>;
			"/api/ai/revision-pack": Record<string, never>;
			"/api/ai/subject-hints": Record<string, never>;
			"/api/ai/topic-shortlist": Record<string, never>;
			"/api/ai/tutor": Record<string, never>;
			"/api/auth": Record<string, never>;
			"/api/auth/mode": Record<string, never>;
			"/api/auth/register": Record<string, never>;
			"/api/curriculum": Record<string, never>;
			"/api/curriculum/program": Record<string, never>;
			"/api/curriculum/subject-topics": Record<string, never>;
			"/api/curriculum/topic-discovery": Record<string, never>;
			"/api/curriculum/topic-discovery/abandon": Record<string, never>;
			"/api/curriculum/topic-discovery/click": Record<string, never>;
			"/api/curriculum/topic-discovery/complete": Record<string, never>;
			"/api/curriculum/topic-discovery/feedback": Record<string, never>;
			"/api/curriculum/topic-discovery/refresh": Record<string, never>;
			"/api/geo": Record<string, never>;
			"/api/geo/country": Record<string, never>;
			"/api/lesson-artifacts": Record<string, never>;
			"/api/lesson-artifacts/rate": Record<string, never>;
			"/api/onboarding": Record<string, never>;
			"/api/onboarding/complete": Record<string, never>;
			"/api/onboarding/options": Record<string, never>;
			"/api/onboarding/progress": Record<string, never>;
			"/api/onboarding/reset": Record<string, never>;
			"/api/payments": Record<string, never>;
			"/api/payments/checkout": Record<string, never>;
			"/api/payments/quota-status": Record<string, never>;
			"/api/payments/webhook": Record<string, never>;
			"/api/revision": Record<string, never>;
			"/api/revision/planner-resolve": Record<string, never>;
			"/api/state": Record<string, never>;
			"/api/state/bootstrap": Record<string, never>;
			"/api/state/sync": Record<string, never>;
			"/api/subjects": Record<string, never>;
			"/api/subjects/verify": Record<string, never>;
			"/api/tts": Record<string, never>;
			"/api/tts/lesson": Record<string, never>;
			"/(app)/dashboard": Record<string, never>;
			"/(app)/lesson": { id?: string };
			"/(app)/lesson/[id]": { id: string };
			"/onboarding": Record<string, never>;
			"/(app)/progress": Record<string, never>;
			"/(app)/revision": Record<string, never>;
			"/(app)/settings": Record<string, never>;
			"/(app)/subjects": { id?: string };
			"/(app)/subjects/[id]": { id: string }
		};
		Pathname(): "/" | "/admin" | "/admin/ai" | "/admin/content" | "/admin/graph" | "/admin/graph/legacy" | `/admin/graph/${string}` & {} | "/admin/learning" | "/admin/messages" | `/admin/messages/${string}` & {} | "/admin/revenue" | "/admin/settings" | "/admin/system" | "/admin/users" | `/admin/users/${string}` & {} | "/api/admin/audit-export" | "/api/admin/lesson-artifacts" | "/api/admin/promote-topics" | "/api/admin/tts/preview" | "/api/ai/institution-verify" | "/api/ai/lesson-chat" | "/api/ai/lesson-evaluate" | "/api/ai/lesson-plan" | "/api/ai/lesson-selector" | "/api/ai/programme-verify" | "/api/ai/revision-evaluate" | "/api/ai/revision-pack" | "/api/ai/subject-hints" | "/api/ai/topic-shortlist" | "/api/ai/tutor" | "/api/auth/mode" | "/api/auth/register" | "/api/curriculum/program" | "/api/curriculum/subject-topics" | "/api/curriculum/topic-discovery" | "/api/curriculum/topic-discovery/abandon" | "/api/curriculum/topic-discovery/click" | "/api/curriculum/topic-discovery/complete" | "/api/curriculum/topic-discovery/feedback" | "/api/curriculum/topic-discovery/refresh" | "/api/geo/country" | "/api/lesson-artifacts/rate" | "/api/onboarding/complete" | "/api/onboarding/options" | "/api/onboarding/progress" | "/api/onboarding/reset" | "/api/payments/checkout" | "/api/payments/quota-status" | "/api/payments/webhook" | "/api/revision/planner-resolve" | "/api/state/bootstrap" | "/api/state/sync" | "/api/subjects/verify" | "/api/tts/lesson" | "/dashboard" | "/lesson" | `/lesson/${string}` & {} | "/onboarding" | "/progress" | "/revision" | "/settings" | `/subjects/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.ico" | string & {};
	}
}