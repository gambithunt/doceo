export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25')
];

export const server_loads = [3];

export const dictionary = {
		"/": [4],
		"/admin": [~12,[3]],
		"/admin/ai": [~13,[3]],
		"/admin/content": [~14,[3]],
		"/admin/graph": [~15,[3]],
		"/admin/graph/[nodeId]": [~16,[3]],
		"/admin/learning": [~17,[3]],
		"/admin/messages": [~18,[3]],
		"/admin/messages/[session_id]": [~19,[3]],
		"/admin/revenue": [~20,[3]],
		"/admin/settings": [~21,[3]],
		"/admin/system": [~22,[3]],
		"/admin/users": [~23,[3]],
		"/admin/users/[id]": [~24,[3]],
		"/(app)/dashboard": [5,[2]],
		"/(app)/lesson": [6,[2]],
		"/(app)/lesson/[id]": [7,[2]],
		"/onboarding": [25],
		"/(app)/progress": [8,[2]],
		"/(app)/revision": [9,[2]],
		"/(app)/settings": [10,[2]],
		"/(app)/subjects/[id]": [11,[2]]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));
export const encoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.encode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';