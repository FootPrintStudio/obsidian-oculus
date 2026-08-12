function normalizeSearchText(value: string): string {
	return value.normalize("NFKC").toLowerCase();
}

/** Literal, case-insensitive substring match against a media title. */
export function mediaTitleMatchesQuery(title: string, query: string): boolean {
	const normalizedQuery = normalizeSearchText(query.trim());
	if (!normalizedQuery) return false;
	return normalizeSearchText(title).includes(normalizedQuery);
}
