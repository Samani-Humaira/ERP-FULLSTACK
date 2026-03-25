from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class SearchSource(str, Enum):
    SEMANTIC_SCHOLAR = "semantic_scholar"
    ARXIV = "arxiv"
    CROSSREF = "crossref"


class PaperResult(BaseModel):
    title: str
    abstract: Optional[str] = None
    authors: list[str] = []
    year: Optional[int] = None
    citation_count: Optional[int] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    source: SearchSource
    relevance_score: float = Field(default=0.0, description="Composite relevance score (0.0 – 1.0)")
    abstract_enriched: bool = Field(default=False, description="True if abstract was filled during enrichment")


class PipelineSummary(BaseModel):
    """Breakdown of what happened at each stage — useful for debugging and transparency."""
    fetched_semantic_scholar: int = 0
    fetched_arxiv: int = 0
    fetched_crossref: int = 0
    total_fetched: int = 0
    after_deduplication: int = 0
    enrichment_attempted: int = 0
    enrichment_succeeded: int = 0
    after_quality_filter: int = 0
    final_returned: int = 0


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500, description="Research topic or keywords")
    top_n: int = Field(default=20, ge=1, le=50, description="Number of top papers to return")


class SearchResponse(BaseModel):
    query: str
    papers: list[PaperResult]
    pipeline: PipelineSummary