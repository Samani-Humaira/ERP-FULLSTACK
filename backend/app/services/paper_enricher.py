"""
Paper Enricher
==============
After the initial fetch, many papers (especially from CrossRef) have no abstract.
This module attempts to fill missing abstracts using:

  1. Semantic Scholar single-paper endpoint  → /paper/{DOI}  or  /paper/arXiv:{id}
  2. arXiv abstract page fetch               → for arXiv-sourced papers

All enrichment calls are made concurrently with a concurrency limit (semaphore)
to avoid hammering APIs. Papers that still have no abstract after all attempts
are flagged with enrichment_failed=True so the filter can drop them.
"""

import asyncio
import httpx
import re
import logging
from typing import Optional
from app.schemas import PaperResult, SearchSource

logger = logging.getLogger(__name__)

S2_PAPER_URL = "https://api.semanticscholar.org/graph/v1/paper"
S2_FIELDS = "abstract,year,citationCount,authors,externalIds"

# Max simultaneous enrichment HTTP calls — be polite to APIs
MAX_CONCURRENT = 5


#  Helpers 

def _extract_arxiv_id(url: str) -> Optional[str]:
    """Pull arXiv ID from a URL like https://arxiv.org/abs/2301.00001v2"""
    if not url:
        return None
    match = re.search(r"arxiv\.org/abs/([^\s/]+)", url, re.IGNORECASE)
    return match.group(1) if match else None


def _is_valid_abstract(abstract: Optional[str]) -> bool:
    """Abstract must exist and be at least 50 chars to be useful for NLP."""
    return bool(abstract and len(abstract.strip()) >= 50)


#  Single-paper enrichment via Semantic Scholar 

async def _enrich_via_s2(
    paper: PaperResult,
    client: httpx.AsyncClient,
    api_key: Optional[str] = None,
) -> PaperResult:
    """
    Try to fetch full paper details from S2 using DOI or arXiv ID.
    Updates abstract (and citation count if missing) in place.
    """
    headers = {"x-api-key": api_key} if api_key else {}

    # Build the S2 paper identifier
    identifier = None
    if paper.doi:
        identifier = paper.doi.strip()
    elif paper.url and "arxiv.org" in (paper.url or ""):
        arxiv_id = _extract_arxiv_id(paper.url)
        if arxiv_id:
            identifier = f"arXiv:{arxiv_id}"

    if not identifier:
        logger.debug(f"No identifier for enrichment: '{paper.title[:50]}'")
        return paper

    url = f"{S2_PAPER_URL}/{identifier}"
    params = {"fields": S2_FIELDS}

    try:
        response = await client.get(url, params=params, headers=headers, timeout=10.0)

        if response.status_code == 404:
            logger.debug(f"S2 404 for: {identifier}")
            return paper

        response.raise_for_status()
        data = response.json()

        # Fill abstract if missing or too short
        s2_abstract = data.get("abstract")
        if _is_valid_abstract(s2_abstract) and not _is_valid_abstract(paper.abstract):
            paper.abstract = s2_abstract.strip()
            logger.debug(f"Abstract filled from S2 for: '{paper.title[:50]}'")

        # Fill citation count if missing
        if paper.citation_count is None and data.get("citationCount") is not None:
            paper.citation_count = data["citationCount"]

        # Fill year if missing
        if paper.year is None and data.get("year"):
            paper.year = data["year"]

    except httpx.HTTPStatusError as e:
        logger.debug(f"S2 enrich HTTP error {e.response.status_code} for {identifier}")
    except Exception as e:
        logger.debug(f"S2 enrich failed for {identifier}: {e}")

    return paper


#  arXiv abstract fallback 

async def _enrich_via_arxiv_api(
    paper: PaperResult,
    client: httpx.AsyncClient,
) -> PaperResult:
    """
    For arXiv-sourced papers with missing abstracts,
    query the arXiv API directly with the paper ID.
    """
    if paper.source != SearchSource.ARXIV:
        return paper

    arxiv_id = _extract_arxiv_id(paper.url or "")
    if not arxiv_id:
        return paper

    # Strip version suffix for cleaner lookup (2301.00001v2 → 2301.00001)
    clean_id = re.sub(r"v\d+$", "", arxiv_id)

    try:
        response = await client.get(
            "http://export.arxiv.org/api/query",
            params={"id_list": clean_id, "max_results": 1},
            timeout=10.0,
        )
        response.raise_for_status()

        import xml.etree.ElementTree as ET
        NS = {"atom": "http://www.w3.org/2005/Atom"}
        root = ET.fromstring(response.text)
        entry = root.find("atom:entry", NS)

        if entry is not None:
            summary_el = entry.find("atom:summary", NS)
            if summary_el is not None and summary_el.text:
                abstract = summary_el.text.strip().replace("\n", " ")
                if _is_valid_abstract(abstract):
                    paper.abstract = abstract
                    logger.debug(f"Abstract filled from arXiv for: '{paper.title[:50]}'")

    except Exception as e:
        logger.debug(f"arXiv enrich failed for {arxiv_id}: {e}")

    return paper


#  Main enrichment pipeline 

async def enrich_papers(
    papers: list[PaperResult],
    api_key: Optional[str] = None,
) -> list[PaperResult]:
    """
    Enrich papers that are missing abstracts.
    Papers that already have a valid abstract are skipped (no unnecessary calls).

    Strategy per paper:
      1. If abstract already valid → skip
      2. Try Semantic Scholar single-paper endpoint (works for DOI + arXiv papers)
      3. If still missing + source is arXiv → try arXiv API
    
    Returns the same list with abstracts filled where possible.
    """
    # Separate papers that need enrichment from those that don't
    needs_enrichment = [p for p in papers if not _is_valid_abstract(p.abstract)]
    already_good = [p for p in papers if _is_valid_abstract(p.abstract)]

    if not needs_enrichment:
        logger.info("All papers already have abstracts — skipping enrichment")
        return papers

    logger.info(
        f"Enrichment needed: {len(needs_enrichment)} papers "
        f"(of {len(papers)} total, {len(already_good)} already have abstracts)"
    )

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async def enrich_one(paper: PaperResult) -> PaperResult:
        async with semaphore:
            async with httpx.AsyncClient() as client:
                # Step 1: Try Semantic Scholar
                paper = await _enrich_via_s2(paper, client, api_key)

                # Step 2: If still missing and arXiv source, try arXiv API
                if not _is_valid_abstract(paper.abstract):
                    paper = await _enrich_via_arxiv_api(paper, client)

        return paper

    enriched = await asyncio.gather(*[enrich_one(p) for p in needs_enrichment])

    # Count how many we actually filled
    filled = sum(1 for p in enriched if _is_valid_abstract(p.abstract))
    still_missing = len(enriched) - filled
    logger.info(f"Enrichment complete: {filled} filled, {still_missing} still missing")

    return list(enriched) + already_good