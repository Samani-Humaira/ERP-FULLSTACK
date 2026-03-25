"""
Relevance Ranker
================
Scores and deduplicates papers fetched from multiple sources.

Scoring formula (all weights sum to 1.0):
  - Keyword match score  : 0.45  (query terms found in title + abstract)
  - Title match bonus    : 0.20  (query terms specifically in title)
  - Citation score       : 0.20  (log-normalised citation count)
  - Recency score        : 0.15  (papers from last 5 years score higher)

Deduplication:
  - Exact DOI match
  - Normalised title similarity (Jaccard on word tokens, threshold 0.85)
  - When duplicates found, keep the one with the most data (abstract, citations)
"""

import math
import re
from app.schemas import PaperResult

CURRENT_YEAR = 2026
RECENCY_WINDOW = 5          # years considered "recent"
CITATION_SCALE = 500        # citations at which recency score saturates at ~1.0
TITLE_JACCARD_THRESHOLD = 0.85


#  Scoring 

def _tokenise(text: str) -> set[str]:
    """Lowercase, remove punctuation, split into word tokens."""
    return set(re.sub(r"[^\w\s]", "", text.lower()).split())


def _keyword_score(query_tokens: set[str], title: str, abstract: str | None) -> float:
    """Fraction of query tokens found in title + abstract combined."""
    if not query_tokens:
        return 0.0
    haystack = _tokenise(title) | _tokenise(abstract or "")
    matched = query_tokens & haystack
    return len(matched) / len(query_tokens)


def _title_score(query_tokens: set[str], title: str) -> float:
    """Fraction of query tokens found specifically in the title."""
    if not query_tokens:
        return 0.0
    title_tokens = _tokenise(title)
    matched = query_tokens & title_tokens
    return len(matched) / len(query_tokens)


def _citation_score(citation_count: int | None) -> float:
    """Log-normalised citation score capped at 1.0."""
    if not citation_count or citation_count <= 0:
        return 0.0
    return min(math.log1p(citation_count) / math.log1p(CITATION_SCALE), 1.0)


def _recency_score(year: int | None) -> float:
    """Papers within RECENCY_WINDOW years get score proportional to freshness."""
    if year is None:
        return 0.0
    age = CURRENT_YEAR - year
    if age < 0:
        return 1.0
    if age > RECENCY_WINDOW * 2:
        return 0.0
    return max(0.0, 1.0 - (age / (RECENCY_WINDOW * 2)))


def score_paper(paper: PaperResult, query_tokens: set[str]) -> float:
    kw   = _keyword_score(query_tokens, paper.title, paper.abstract) * 0.45
    title = _title_score(query_tokens, paper.title) * 0.20
    cite  = _citation_score(paper.citation_count) * 0.20
    rec   = _recency_score(paper.year) * 0.15
    return round(kw + title + cite + rec, 4)


#  Deduplication 

def _jaccard(a: str, b: str) -> float:
    ta, tb = _tokenise(a), _tokenise(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _paper_completeness(paper: PaperResult) -> int:
    """Score how complete a paper record is (prefer richer records on dedup)."""
    score = 0
    if paper.abstract:
        score += 3
    if paper.citation_count is not None:
        score += 2
    if paper.doi:
        score += 2
    if paper.authors:
        score += 1
    if paper.year:
        score += 1
    return score


def deduplicate(papers: list[PaperResult]) -> list[PaperResult]:
    """
    Remove duplicate papers across sources.
    Priority: DOI match first, then high Jaccard title similarity.
    When duplicates collide, keep the richer record.
    """
    seen_dois: dict[str, int] = {}     # doi → index in `unique`
    seen_titles: list[str] = []        # normalised titles for Jaccard check
    unique: list[PaperResult] = []

    for paper in papers:
        doi_key = paper.doi.strip().lower() if paper.doi else None

        # 1. DOI dedup
        if doi_key:
            if doi_key in seen_dois:
                existing_idx = seen_dois[doi_key]
                existing = unique[existing_idx]
                if _paper_completeness(paper) > _paper_completeness(existing):
                    # Swap to richer record but preserve original source label
                    unique[existing_idx] = paper
                continue
            seen_dois[doi_key] = len(unique)

        # 2. Title Jaccard dedup
        is_dup = False
        for idx, existing_title in enumerate(seen_titles):
            if _jaccard(paper.title, existing_title) >= TITLE_JACCARD_THRESHOLD:
                # Keep the richer record
                if _paper_completeness(paper) > _paper_completeness(unique[idx]):
                    unique[idx] = paper
                    seen_titles[idx] = paper.title
                is_dup = True
                break

        if not is_dup:
            seen_titles.append(paper.title)
            unique.append(paper)

    return unique


#  Public entry point 

def rank_papers(papers: list[PaperResult], query: str, top_n: int) -> list[PaperResult]:
    """
    Score, deduplicate, and return the top_n most relevant papers.

    Steps:
      1. Score every paper against query tokens
      2. Deduplicate across sources
      3. Sort by relevance_score descending
      4. Return top_n
    """
    query_tokens = _tokenise(query)

    # Score
    for paper in papers:
        paper.relevance_score = score_paper(paper, query_tokens)

    # Dedup
    deduped = deduplicate(papers)

    # Sort and slice
    ranked = sorted(deduped, key=lambda p: p.relevance_score, reverse=True)
    return ranked[:top_n]