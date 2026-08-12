function normalizeSearchText(value: string): string {
	return value.normalize("NFKC").toLowerCase();
}

/** Parse a comma-separated query list. Empty segments are invalid. */
export function parseMediaTitleQueries(value: string): string[] | null {
	const queries = value.split(",").map((query) => query.trim());
	if (queries.length === 0 || queries.some((query) => !query)) return null;
	return queries;
}

/** Literal, case-insensitive substring match against a media title. */
export function mediaTitleMatchesQuery(title: string, query: string): boolean {
	return mediaTitleMatchesQueries(title, [query]);
}

/** Match only when every query is a literal substring of the media title. */
export function mediaTitleMatchesQueries(title: string, queries: string[]): boolean {
	if (queries.length === 0) return false;
	const normalizedTitle = normalizeSearchText(title);
	return queries.every((query) => {
		const normalizedQuery = normalizeSearchText(query.trim());
		return Boolean(normalizedQuery) && normalizedTitle.includes(normalizedQuery);
	});
}
