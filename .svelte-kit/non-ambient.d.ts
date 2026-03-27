
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
		RouteId(): "/(app)" | "/" | "/admin" | "/admin/ai" | "/admin/content" | "/admin/learning" | "/admin/messages" | "/admin/messages/[session_id]" | "/admin/revenue" | "/admin/settings" | "/admin/system" | "/admin/users" | "/admin/users/[id]" | "/api" | "/api/ai" | "/api/ai/lesson-chat" | "/api/ai/lesson-plan" | "/api/ai/lesson-selector" | "/api/ai/subject-hints" | "/api/ai/topic-shortlist" | "/api/ai/tutor" | "/api/curriculum" | "/api/curriculum/program" | "/api/onboarding" | "/api/onboarding/complete" | "/api/onboarding/options" | "/api/onboarding/progress" | "/api/onboarding/reset" | "/api/state" | "/api/state/bootstrap" | "/api/state/sync" | "/api/subjects" | "/api/subjects/verify" | "/(app)/dashboard" | "/(app)/lesson" | "/(app)/lesson/[id]" | "/onboarding" | "/(app)/progress" | "/(app)/revision" | "/(app)/settings" | "/(app)/subjects" | "/(app)/subjects/[id]";
		RouteParams(): {
			"/admin/messages/[session_id]": { session_id: string };
			"/admin/users/[id]": { id: string };
			"/(app)/lesson/[id]": { id: string };
			"/(app)/subjects/[id]": { id: string }
		};
		LayoutParams(): {
			"/(app)": { id?: string };
			"/": { session_id?: string; id?: string };
			"/admin": { session_id?: string; id?: string };
			"/admin/ai": Record<string, never>;
			"/admin/content": Record<string, never>;
			"/admin/learning": Record<string, never>;
			"/admin/messages": { session_id?: string };
			"/admin/messages/[session_id]": { session_id: string };
			"/admin/revenue": Record<string, never>;
			"/admin/settings": Record<string, never>;
			"/admin/system": Record<string, never>;
			"/admin/users": { id?: string };
			"/admin/users/[id]": { id: string };
			"/api": Record<string, never>;
			"/api/ai": Record<string, never>;
			"/api/ai/lesson-chat": Record<string, never>;
			"/api/ai/lesson-plan": Record<string, never>;
			"/api/ai/lesson-selector": Record<string, never>;
			"/api/ai/subject-hints": Record<string, never>;
			"/api/ai/topic-shortlist": Record<string, never>;
			"/api/ai/tutor": Record<string, never>;
			"/api/curriculum": Record<string, never>;
			"/api/curriculum/program": Record<string, never>;
			"/api/onboarding": Record<string, never>;
			"/api/onboarding/complete": Record<string, never>;
			"/api/onboarding/options": Record<string, never>;
			"/api/onboarding/progress": Record<string, never>;
			"/api/onboarding/reset": Record<string, never>;
			"/api/state": Record<string, never>;
			"/api/state/bootstrap": Record<string, never>;
			"/api/state/sync": Record<string, never>;
			"/api/subjects": Record<string, never>;
			"/api/subjects/verify": Record<string, never>;
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
		Pathname(): "/" | "/admin" | "/admin/ai" | "/admin/content" | "/admin/learning" | "/admin/messages" | `/admin/messages/${string}` & {} | "/admin/revenue" | "/admin/settings" | "/admin/system" | "/admin/users" | `/admin/users/${string}` & {} | "/api/ai/lesson-chat" | "/api/ai/lesson-plan" | "/api/ai/lesson-selector" | "/api/ai/subject-hints" | "/api/ai/topic-shortlist" | "/api/ai/tutor" | "/api/curriculum/program" | "/api/onboarding/complete" | "/api/onboarding/options" | "/api/onboarding/progress" | "/api/onboarding/reset" | "/api/state/bootstrap" | "/api/state/sync" | "/api/subjects/verify" | "/dashboard" | "/lesson" | `/lesson/${string}` & {} | "/onboarding" | "/progress" | "/revision" | "/settings" | `/subjects/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}