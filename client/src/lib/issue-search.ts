interface SearchableIssue {
  key: string;
  number: number;
  title: string;
  description: string | null;
}

export function matchesIssueSearch(
  issue: SearchableIssue,
  query: string,
): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const searchableText =
    `${issue.key} ${issue.number} ${issue.title} ${issue.description ?? ""}`.toLowerCase();

  return terms.every((term) => searchableText.includes(term));
}
