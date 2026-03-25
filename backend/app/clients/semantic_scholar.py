import httpx
from typing import Optional
from app.schemas import PaperResult, SearchSource
import logging

logger = logging.getLogger(__name__)

SEMANTIC_SCHOLAR_URL = "https://api.semanticscholar.org/graph/v1/paper/search"

FIELDS = "title,abstract,authors,year,citationCount,externalIds,url"


async def fetch_semantic_scholar(
    query: str,
    limit: int = 50,
    api_key: Optional[str] = None,
) -> list[PaperResult]:
    """
    Fetches papers from Semantic Scholar Graph API.
    Returns a list of PaperResult objects.
    Free tier: 100 requests/5 min (no key). With key: higher limits.
    """
    headers = {}
    if api_key:
        headers["x-api-key"] = api_key

    params = {
        "query": query,
        "limit": min(limit, 100),  # S2 max per request
        "fields": FIELDS,
    }

    papers: list[PaperResult] = []

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(SEMANTIC_SCHOLAR_URL, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

        for item in data.get("data", []):
            # Extract DOI from externalIds
            external_ids = item.get("externalIds") or {}
            doi = external_ids.get("DOI")

            authors = [
                a.get("name", "Unknown") for a in (item.get("authors") or [])
            ]

            papers.append(
                PaperResult(
                    title=item.get("title") or "Untitled",
                    abstract=item.get("abstract"),
                    authors=authors,
                    year=item.get("year"),
                    citation_count=item.get("citationCount"),
                    doi=doi,
                    url=item.get("url"),
                    source=SearchSource.SEMANTIC_SCHOLAR,
                    relevance_score=0.0,  # Scored later in ranker
                )
            )

    except httpx.HTTPStatusError as e:
        logger.warning(f"Semantic Scholar HTTP error: {e.response.status_code} — {e.response.text}")
    except Exception as e:
        logger.warning(f"Semantic Scholar fetch failed: {e}")

    return papers