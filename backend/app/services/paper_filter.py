"""
Paper Filter
============
Drops papers that would break Phase 2 (SciBERT / Sentence-BERT processing).

A paper is KEPT only if it passes ALL of these checks:
    Has a non-empty abstract of at least 50 characters
    Has a title of at least 10 characters
    Has a year (needed for recency scoring and gap timeline analysis)
    Abstract is not a known junk/placeholder string
    Is not a retracted paper (basic heuristic on title)

Filtered papers are logged so you can audit what was dropped.
"""

import re
import logging
from app.schemas import PaperResult

logger = logging.getLogger(__name__)

# Minimum lengths
MIN_ABSTRACT_LENGTH = 50
MIN_TITLE_LENGTH = 10
MIN_YEAR = 1990          # Ignore papers older than this — unlikely to be relevant for gap detection

# Known junk abstracts returned by some APIs
JUNK_ABSTRACT_PATTERNS = [
    r"^\s*no abstract\s*$",
    r"^\s*abstract not available\s*$",
    r"^\s*n/a\s*$",
    r"^\s*unavailable\s*$",
    r"^\s*\.\s*$",
]

# Title patterns that indicate a retracted or invalid paper
INVALID_TITLE_PATTERNS = [
    r"\bretracted\b",
    r"\bcorrection\b",
    r"\berratum\b",
    r"\bwithdraw\w*\b",
]


#  Individual checks 

def _has_valid_abstract(paper: PaperResult) -> tuple[bool, str]:
    if not paper.abstract:
        return False, "missing abstract"
    
    abstract = paper.abstract.strip()
    
    if len(abstract) < MIN_ABSTRACT_LENGTH:
        return False, f"abstract too short ({len(abstract)} chars, min {MIN_ABSTRACT_LENGTH})"
    
    for pattern in JUNK_ABSTRACT_PATTERNS:
        if re.match(pattern, abstract, re.IGNORECASE):
            return False, "junk abstract placeholder"
    
    return True, ""


def _has_valid_title(paper: PaperResult) -> tuple[bool, str]:
    if not paper.title:
        return False, "missing title"
    
    title = paper.title.strip()
    
    if len(title) < MIN_TITLE_LENGTH:
        return False, f"title too short ({len(title)} chars)"
    
    for pattern in INVALID_TITLE_PATTERNS:
        if re.search(pattern, title, re.IGNORECASE):
            return False, f"invalid title pattern: '{title[:60]}'"
    
    return True, ""


def _has_valid_year(paper: PaperResult) -> tuple[bool, str]:
    if paper.year is None:
        return False, "missing year"
    if paper.year < MIN_YEAR:
        return False, f"year too old ({paper.year}, min {MIN_YEAR})"
    return True, ""


def _has_valid_authors(paper: PaperResult) -> tuple[bool, str]:
    if not paper.authors or len(paper.authors) == 0:
        return False, "no authors"
    return True, ""


#  Main filter 

def filter_papers(papers: list[PaperResult]) -> list[PaperResult]:
    """
    Filter out papers that would break Phase 2 NLP processing.
    Logs every dropped paper with the reason for full auditability.

    Returns only papers that pass ALL quality checks.
    """
    kept = []
    dropped = []

    for paper in papers:
        reasons = []

        # Run all checks
        ok_abstract, reason = _has_valid_abstract(paper)
        if not ok_abstract:
            reasons.append(reason)

        ok_title, reason = _has_valid_title(paper)
        if not ok_title:
            reasons.append(reason)

        ok_year, reason = _has_valid_year(paper)
        if not ok_year:
            reasons.append(reason)

        ok_authors, reason = _has_valid_authors(paper)
        if not ok_authors:
            reasons.append(reason)

        if reasons:
            dropped.append((paper.title[:60], reasons))
        else:
            kept.append(paper)

    # Log summary
    logger.info(f"Filter: {len(kept)} kept, {len(dropped)} dropped from {len(papers)} papers")

    # Log each dropped paper for auditability
    for title, reasons in dropped:
        logger.debug(f"  DROPPED '{title}': {', '.join(reasons)}")

    return kept


def filter_summary(before: int, after: int) -> dict:
    """Returns a summary dict for including in API responses (useful for debugging)."""
    return {
        "total_before_filter": before,
        "total_after_filter": after,
        "dropped": before - after,
    }