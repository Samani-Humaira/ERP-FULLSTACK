import httpx
from typing import Optional
from app.schemas import PaperResult, SearchSource
import logging

logger = logging.getLogger(__name__)

CROSSREF_URL = "https://api.crossref.org/works"

POLITE_MAILTO = "research-assistant@example.com" 


async def fetch_crossref(query: str, limit: int = 50, year_from: Optional[int] = None, year_to: Optional[int] = None) -> list[PaperResult]:
    """
    Fetches papers from CrossRef REST API.
    CrossRef is free, no auth required. Using polite pool via mailto param.
    """
    params = {
        "query": query,
        "rows": min(limit, 100),
        "select": "title,abstract,author,published,DOI,URL,is-referenced-by-count,type",
        "mailto": POLITE_MAILTO,
        "filter": "type:journal-article",  # Only journal articles for quality
        "sort": "relevance",
        "order": "desc",
    }

    # Add year filters
    if year_from is not None:
        params["from-pub-date"] = f"{year_from}"
    if year_to is not None:
        params["until-pub-date"] = f"{year_to}"

    papers: list[PaperResult] = []

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(CROSSREF_URL, params=params)
            response.raise_for_status()
            data = response.json()

        items = data.get("message", {}).get("items", [])

        for item in items:
            # Title — CrossRef returns a list
            titles = item.get("title") or []
            title = titles[0].strip() if titles else "Untitled"

            # Abstract — often has JATS XML tags, strip them
            abstract_raw = item.get("abstract", "")
            abstract = _strip_jats(abstract_raw) if abstract_raw else None

            # Authors
            authors = []
            for a in item.get("author") or []:
                given = a.get("given", "")
                family = a.get("family", "")
                name = f"{given} {family}".strip()
                if name:
                    authors.append(name)

            # Year from published date parts
            year = None
            pub = item.get("published") or item.get("published-print") or item.get("published-online")
            if pub:
                date_parts = pub.get("date-parts", [[]])
                if date_parts and date_parts[0]:
                    try:
                        year = int(date_parts[0][0])
                    except (ValueError, TypeError):
                        pass

            doi = item.get("DOI")
            url = item.get("URL") or (f"https://doi.org/{doi}" if doi else None)
            citation_count = item.get("is-referenced-by-count")

            papers.append(
                PaperResult(
                    title=title,
                    abstract=abstract,
                    authors=authors,
                    year=year,
                    citation_count=citation_count,
                    doi=doi,
                    url=url,
                    source=SearchSource.CROSSREF,
                    relevance_score=0.0,
                )
            )

    except httpx.HTTPStatusError as e:
        logger.warning(f"CrossRef HTTP error: {e.response.status_code}")
    except Exception as e:
        logger.warning(f"CrossRef fetch failed: {e}")

    return papers


def _strip_jats(text: str) -> str:
    """Remove common JATS XML tags from CrossRef abstracts."""
    import re
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean