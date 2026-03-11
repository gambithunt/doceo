
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
		RouteId(): "/" | "/api" | "/api/ai" | "/api/ai/tutor" | "/api/onboarding" | "/api/onboarding/complete" | "/api/onboarding/options" | "/api/onboarding/progress" | "/api/state" | "/api/state/bootstrap" | "/api/state/sync";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/api": Record<string, never>;
			"/api/ai": Record<string, never>;
			"/api/ai/tutor": Record<string, never>;
			"/api/onboarding": Record<string, never>;
			"/api/onboarding/complete": Record<string, never>;
			"/api/onboarding/options": Record<string, never>;
			"/api/onboarding/progress": Record<string, never>;
			"/api/state": Record<string, never>;
			"/api/state/bootstrap": Record<string, never>;
			"/api/state/sync": Record<string, never>
		};
		Pathname(): "/" | "/api/ai/tutor" | "/api/onboarding/complete" | "/api/onboarding/options" | "/api/onboarding/progress" | "/api/state/bootstrap" | "/api/state/sync";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}