import httpx
import xml.etree.ElementTree as ET
from app.schemas import PaperResult, SearchSource
import logging
import re

logger = logging.getLogger(__name__)

ARXIV_URL = "http://export.arxiv.org/api/query"

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
    "opensearch": "http://a9.com/-/spec/opensearch/1.1/",
}


def _parse_arxiv_id(entry_id: str) -> str:
    """Extract clean arxiv ID from full URL like http://arxiv.org/abs/2301.00001v1"""
    match = re.search(r"arxiv\.org/abs/(.+)", entry_id)
    return match.group(1) if match else entry_id


async def fetch_arxiv(query: str, limit: int = 50) -> list[PaperResult]:
    """
    Fetches papers from arXiv Atom API.
    arXiv has no auth requirement for basic search.
    """
    params = {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": min(limit, 100),
        "sortBy": "relevance",
        "sortOrder": "descending",
    }

    papers: list[PaperResult] = []

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(ARXIV_URL, params=params)
            response.raise_for_status()

        root = ET.fromstring(response.text)

        for entry in root.findall("atom:entry", NS):
            # Title
            title_el = entry.find("atom:title", NS)
            title = title_el.text.strip().replace("\n", " ") if title_el is not None else "Untitled"

            # Abstract
            summary_el = entry.find("atom:summary", NS)
            abstract = summary_el.text.strip().replace("\n", " ") if summary_el is not None else None

            # Authors
            authors = [
                a.find("atom:name", NS).text
                for a in entry.findall("atom:author", NS)
                if a.find("atom:name", NS) is not None
            ]

            # Year from published date (YYYY-MM-DD...)
            published_el = entry.find("atom:published", NS)
            year = None
            if published_el is not None and published_el.text:
                try:
                    year = int(published_el.text[:4])
                except ValueError:
                    pass

            # arXiv ID and URL
            id_el = entry.find("atom:id", NS)
            arxiv_url = id_el.text.strip() if id_el is not None else None
            arxiv_id = _parse_arxiv_id(arxiv_url) if arxiv_url else None

            # DOI (if deposited)
            doi_el = entry.find("arxiv:doi", NS)
            doi = doi_el.text.strip() if doi_el is not None else None

            papers.append(
                PaperResult(
                    title=title,
                    abstract=abstract,
                    authors=authors,
                    year=year,
                    citation_count=None,  # arXiv doesn't expose this
                    doi=doi,
                    url=arxiv_url,
                    source=SearchSource.ARXIV,
                    relevance_score=0.0,
                )
            )

    except httpx.HTTPStatusError as e:
        logger.warning(f"arXiv HTTP error: {e.response.status_code}")
    except ET.ParseError as e:
        logger.warning(f"arXiv XML parse error: {e}")
    except Exception as e:
        logger.warning(f"arXiv fetch failed: {e}")

    return papers