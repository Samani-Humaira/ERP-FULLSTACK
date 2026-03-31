import asyncio
import logging
from fastapi import APIRouter, HTTPException, Query
from app.schemas import SearchRequest, SearchResponse, PipelineSummary
from app.clients import fetch_semantic_scholar, fetch_arxiv, fetch_crossref
from app.services.ranker import rank_papers
from app.services.paper_enricher import enrich_papers, _is_valid_abstract
from app.services.paper_filter import filter_papers

# Add this import at the top of search.py
from app.database import get_db
from app.models.activity import Activity, ActivityType
from sqlalchemy.orm import Session
from fastapi import Depends
from app.auth.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/search", response_model=SearchResponse, summary="Search research papers across all sources")
async def search_papers(request: SearchRequest):
    """
    Full Phase 1 pipeline:

    1. Fan out to Semantic Scholar, arXiv, CrossRef in parallel
    2. Deduplicate + score relevance
    3. Enrich missing abstracts via S2 single-paper + arXiv API
    4. Re-rank after enrichment (more data = better scores)
    5. Quality filter (drop papers without abstract, year, authors)
    6. Return top N clean, abstract-guaranteed papers

    Every paper returned is GUARANTEED to have:
      - title, abstract (≥50 chars), authors, year, source, relevance_score
    """
    query = request.query.strip()
    top_n = request.top_n
    year_from = request.year_from
    year_to = request.year_to
    summary = PipelineSummary()

    #  Step 1: Parallel fetch 
    fetch_limit = min(top_n * 4, 100)  # fetch more to compensate for filter losses
    logger.info(f"[Phase1] Query='{query}' | fetch_limit={fetch_limit} | top_n={top_n} | years={year_from}-{year_to}")

    results = await asyncio.gather(
        fetch_semantic_scholar(query, limit=fetch_limit, year_from=year_from, year_to=year_to),
        fetch_arxiv(query, limit=fetch_limit, year_from=year_from, year_to=year_to),
        fetch_crossref(query, limit=fetch_limit, year_from=year_from, year_to=year_to),
        return_exceptions=True,
    )

    source_names = ["Semantic Scholar", "arXiv", "CrossRef"]
    all_papers = []

    for source_name, result in zip(source_names, results):
        if isinstance(result, Exception):
            logger.error(f"{source_name} failed: {result}")
            count = 0
        else:
            count = len(result)
            all_papers.extend(result)

        if source_name == "Semantic Scholar":
            summary.fetched_semantic_scholar = count
        elif source_name == "arXiv":
            summary.fetched_arxiv = count
        elif source_name == "CrossRef":
            summary.fetched_crossref = count

    summary.total_fetched = len(all_papers)

    if not all_papers:
        raise HTTPException(
            status_code=503,
            detail="All upstream sources failed. Please try again later.",
        )

    #  Step 2: Initial dedup + relevance rank 
    ranked = rank_papers(all_papers, query=query, top_n=len(all_papers))  # rank ALL, not just top_n
    summary.after_deduplication = len(ranked)
    logger.info(f"[Phase1] After dedup: {summary.total_fetched} → {len(ranked)}")

    #  Step 3: Abstract enrichment 
    needs_enrichment = [p for p in ranked if not _is_valid_abstract(p.abstract)]
    summary.enrichment_attempted = len(needs_enrichment)

    enriched = await enrich_papers(ranked)

    # Mark which papers had their abstract filled + count successes
    original_abstracts = {id(p): p.abstract for p in ranked}
    for paper in enriched:
        was_missing = not _is_valid_abstract(original_abstracts.get(id(paper)))
        now_has = _is_valid_abstract(paper.abstract)
        if was_missing and now_has:
            paper.abstract_enriched = True
            summary.enrichment_succeeded += 1

    logger.info(
        f"[Phase1] Enrichment: {summary.enrichment_attempted} attempted, "
        f"{summary.enrichment_succeeded} filled"
    )

    #  Step 4: Re-rank after enrichment (abstracts affect keyword scores) 
    re_ranked = rank_papers(enriched, query=query, top_n=len(enriched))

    #  Step 5: Quality filter 
    filtered = filter_papers(re_ranked)
    summary.after_quality_filter = len(filtered)
    logger.info(f"[Phase1] After filter: {len(re_ranked)} → {len(filtered)}")

    #  Step 6: Final top_n slice 
    final = filtered[:top_n]
    summary.final_returned = len(final)

    if not final:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No quality papers found for '{query}'. "
                "Try broader keywords or different terms."
            ),
        )

    logger.info(f"[Phase1] Done. Returning {len(final)} papers.")

    return SearchResponse(
        query=query,
        papers=final,
        pipeline=summary,
    )


@router.get("/search", response_model=SearchResponse, summary="Search papers (GET for quick testing)")
async def search_papers_get(
    query: str = Query(..., min_length=3, max_length=500),
    top_n: int = Query(default=20, ge=1, le=50),
):
    return await search_papers(SearchRequest(query=query, top_n=top_n))