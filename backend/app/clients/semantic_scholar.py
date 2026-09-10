# import httpx
# from typing import Optional
# from app.schemas import PaperResult, SearchSource
# import logging

# logger = logging.getLogger(__name__)

# SEMANTIC_SCHOLAR_URL = "https://api.semanticscholar.org/graph/v1/paper/search"

# FIELDS = "title,abstract,authors,year,citationCount,externalIds,url"


# async def fetch_semantic_scholar(
#     query: str,
#     limit: int = 50,
#     api_key: Optional[str] = None,
#     year_from: Optional[int] = None,
#     year_to: Optional[int] = None,
# ) -> list[PaperResult]:
#     """
#     Fetches papers from Semantic Scholar Graph API.
#     Returns a list of PaperResult objects.
#     Free tier: 100 requests/5 min (no key). With key: higher limits.
#     """
#     headers = {}
#     if api_key:
#         headers["x-api-key"] = api_key

#     params = {
#         "query": query,
#         "limit": min(limit, 100),  # S2 max per request
#         "fields": FIELDS,
#     }

#     # Add year filters if provided
#     if year_from is not None:
#         params["publicationDateFrom"] = f"{year_from}-01-01"
#     if year_to is not None:
#         params["publicationDateTo"] = f"{year_to}-12-31"

#     papers: list[PaperResult] = []

#     try:
#         async with httpx.AsyncClient(timeout=15.0) as client:
#             response = await client.get(SEMANTIC_SCHOLAR_URL, params=params, headers=headers)
#             response.raise_for_status()
#             data = response.json()

#         for item in data.get("data", []):
#             # Extract DOI from externalIds
#             external_ids = item.get("externalIds") or {}
#             doi = external_ids.get("DOI")

#             authors = [
#                 a.get("name", "Unknown") for a in (item.get("authors") or [])
#             ]

#             papers.append(
#                 PaperResult(
#                     title=item.get("title") or "Untitled",
#                     abstract=item.get("abstract"),
#                     authors=authors,
#                     year=item.get("year"),
#                     citation_count=item.get("citationCount"),
#                     doi=doi,
#                     url=item.get("url"),
#                     source=SearchSource.SEMANTIC_SCHOLAR,
#                     relevance_score=0.0,  # Scored later in ranker
#                 )
#             )

#     except httpx.HTTPStatusError as e:
#         logger.warning(f"Semantic Scholar HTTP error: {e.response.status_code} — {e.response.text}")
#     except Exception as e:
#         logger.warning(f"Semantic Scholar fetch failed: {e}")

#     return papers


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
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
) -> list[PaperResult]:

    headers = {}

    if api_key:
        headers["x-api-key"] = api_key

    params = {
        "query": query,
        "limit": min(limit, 100),
        "fields": FIELDS,
    }

    if year_from is not None:
        params["publicationDateOrYear"] = f"{year_from}-"

    if year_to is not None:
        params["publicationDateOrYear"] = (
            f"{year_from or 1900}-{year_to}"
        )

    print("\n========== SEMANTIC SCHOLAR DEBUG ==========")
    print("URL:", SEMANTIC_SCHOLAR_URL)
    print("PARAMS:", params)
    print("HAS API KEY:", bool(api_key))

    papers: list[PaperResult] = []

    try:

        async with httpx.AsyncClient(timeout=30.0) as client:

            response = await client.get(
                SEMANTIC_SCHOLAR_URL,
                params=params,
                headers=headers,
            )

            print("STATUS:", response.status_code)
            print("RESPONSE:", response.text[:2000])

            response.raise_for_status()

            data = response.json()

        print("RESULT COUNT:", len(data.get("data", [])))

        for item in data.get("data", []):

            external_ids = item.get("externalIds") or {}

            doi = external_ids.get("DOI")

            authors = [
                a.get("name", "Unknown")
                for a in (item.get("authors") or [])
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
                    relevance_score=0.0,
                )
            )

    except httpx.HTTPStatusError as e:

        print(
            "SEMANTIC SCHOLAR HTTP ERROR:",
            e.response.status_code,
        )

        print(
            "BODY:",
            e.response.text[:2000],
        )

        logger.exception("Semantic Scholar HTTP error")

    except Exception as e:

        print("SEMANTIC SCHOLAR ERROR:", repr(e))

        logger.exception("Semantic Scholar fetch failed")

    print("FINAL PAPERS:", len(papers))
    print("============================================\n")

    return papers