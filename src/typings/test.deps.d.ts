// Ambient modules for test-only dependencies (excluded from the published build).
declare module 'deepfreeze' {
	function deepfreeze<T>(obj: T): T;
	export = deepfreeze;
}
