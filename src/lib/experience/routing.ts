export function isBlackHoleCuriosity(question: string) {
	return /\bblack[\s-]?holes?\b/i.test(question.trim());
}

export function isSoapCuriosity(question: string) {
	return /\bsoap\b|\bgreas(?:e|y)\b/i.test(question.trim());
}
