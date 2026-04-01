"""
Auto-Generate Research Paper Service
====================================
Complete automated workflow: search → analyze → generate paper
"""

import asyncio
import logging
from collections import Counter
from app.schemas import AutoGenerateRequest, AutoGenerateResponse, PaperRequest
from app.clients import fetch_semantic_scholar, fetch_arxiv, fetch_crossref
from app.services.ranker import rank_papers
from app.services.paper_enricher import enrich_papers
from app.services.paper_filter import filter_papers
from app.services.scibert_extractor import extract_all
from app.services.embedder import embed_papers
from app.services.gap_detector import detect_gaps
from app.services.paper_generator import generate_paper

logger = logging.getLogger(__name__)


async def auto_generate_paper(request: AutoGenerateRequest) -> AutoGenerateResponse:
    """
    Complete automated research paper generation workflow.
    Combines search, gap analysis, and paper generation in one call.
    """
    query = request.query
    top_n = request.top_n
    year_from = request.year_from
    year_to = request.year_to

    logger.info(f"Starting auto-generation for: '{query}' (years: {year_from}-{year_to})")

    # ========== PHASE 1: SEARCH ==========
    logger.info("Step 1: Searching for relevant papers...")
    
    fetch_limit = min(top_n * 4, 100)

    results = await asyncio.gather(
        fetch_semantic_scholar(query, limit=fetch_limit, year_from=year_from, year_to=year_to),
        fetch_arxiv(query, limit=fetch_limit, year_from=year_from, year_to=year_to),
        fetch_crossref(query, limit=fetch_limit, year_from=year_from, year_to=year_to),
        return_exceptions=True,
    )

    source_names = ["Semantic Scholar", "arXiv", "CrossRef"]
    all_papers = []
    fetched_counts = {}

    for source_name, result in zip(source_names, results):
        if isinstance(result, Exception):
            logger.error(f"{source_name} failed: {result}")
            fetched_counts[source_name] = 0
        else:
            count = len(result)
            fetched_counts[source_name] = count
            all_papers.extend(result)

    logger.info(f"Total papers fetched: {len(all_papers)}")

    if len(all_papers) < 5:
        raise ValueError(f"Only found {len(all_papers)} papers. Need at least 5 for meaningful analysis.")

    # Deduplicate + rank
    all_papers = rank_papers(all_papers)
    
    # Enrich missing abstracts
    logger.info("Enriching paper data...")
    all_papers = enrich_papers(all_papers)

    # Filter for quality
    logger.info("Filtering papers for quality...")
    papers = filter_papers(all_papers, top_n=top_n)

    if len(papers) < 5:
        raise ValueError(f"Only {len(papers)} quality papers found. Need at least 5 for meaningful analysis.")

    search_summary = {
        "total_papers_found": len(papers),
        "year_range": f"{year_from}-{year_to}",
        "sources_count": fetched_counts,
        "after_filtering": len(papers)
    }

    # ========== PHASE 2: GAP ANALYSIS ==========
    logger.info("Step 2: Analyzing research gaps...")
    
    paper_dicts = [
        {
            "title": p.title,
            "abstract": p.abstract,
            "year": p.year,
            "authors": p.authors,
            "citation_count": p.citation_count,
            "source": p.source,
        }
        for p in papers
    ]

    # Extract structured info
    extracted_infos = extract_all(paper_dicts)

    if not extracted_infos:
        raise ValueError("No usable abstracts found in papers.")

    # Embed papers
    try:
        embedded_papers = embed_papers(paper_dicts)
    except Exception as e:
        logger.warning(f"Embedding failed: {e}, continuing without embeddings")
        embedded_papers = paper_dicts

    # Detect gaps
    try:
        gaps = detect_gaps(embedded_papers, extracted_infos, paper_dicts)
    except Exception as e:
        logger.warning(f"Gap detection encountered issue: {e}")
        gaps = []

    # Extract themes and limitations
    themes = _extract_themes(extracted_infos)
    limitations = _extract_limitations(extracted_infos, paper_dicts)

    gap_summary = {
        "total_gaps_found": len(gaps),
        "themes_identified": len(themes),
        "limitations_found": len(limitations),
        "top_gap": gaps[0].get('title', 'Emerging research areas') if gaps else "Emerging research areas"
    }

    # ========== PHASE 3: GENERATE PAPER ==========
    logger.info("Step 3: Generating research paper...")
    
    paper_request = PaperRequest(
        query=query,
        papers=papers,
        themes=themes,
        limitations=limitations,
        gaps=gaps if gaps else []
    )

    generated_paper = generate_paper(paper_request)

    logger.info(f"Auto-generation completed: '{generated_paper.title}'")

    return AutoGenerateResponse(
        query=query,
        search_results=search_summary,
        gap_analysis=gap_summary,
        generated_paper=generated_paper
    )


def _extract_themes(extracted_infos) -> list:
    """Extract research themes from extracted information."""
    
    theme_map = {
        "federated learning": "Federated Learning",
        "differential privacy": "Privacy-Preserving Machine Learning",
        "deep learning": "Deep Learning Applications",
        "machine learning": "Machine Learning",
        "transformer": "Transformer-Based Models",
        "bert": "BERT & Language Models",
        "convolutional neural network": "Convolutional Neural Networks",
        "natural language processing": "Natural Language Processing",
        "nlp": "Natural Language Processing",
        "generative adversarial network": "Generative Models",
        "gan": "Generative Models",
        "reinforcement learning": "Reinforcement Learning",
    }

    method_counter = Counter()
    for info in extracted_infos:
        for method in getattr(info, 'methods', []):
            method_counter[method] += 1

    themes = []
    for method, _ in method_counter.most_common(6):
        label = theme_map.get(method.lower(), method.title())
        if label not in themes:
            themes.append(label)

    return themes[:6] if themes else ["Research Theme"]


def _extract_limitations(extracted_infos, paper_dicts) -> list:
    """Extract key limitations from papers."""
    limitations = []
    
    for info, paper in zip(extracted_infos, paper_dicts):
        paper_limitations = getattr(info, 'limitations', [])
        if paper_limitations:
            best = paper_limitations[0].strip() if paper_limitations[0] else ""
            if best and len(best) > 10:
                limitations.append(best)

    return limitations[:6] if limitations else ["Data limitations in research"]