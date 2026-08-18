export function isBlackHoleCuriosity(question: string) {
	return /\bblack[\s-]?holes?\b/i.test(question.trim());
}
