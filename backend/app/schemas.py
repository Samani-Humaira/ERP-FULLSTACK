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
    year_from: Optional[int] = Field(default=None, ge=1900, le=2030, description="Filter papers from this year onwards")
    year_to: Optional[int] = Field(default=None, ge=1900, le=2030, description="Filter papers up to this year")


class SearchResponse(BaseModel):
    query: str
    papers: list[PaperResult]
    pipeline: PipelineSummary


# Proposal Generation Schemas

class ProposalRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500, description="Research topic")
    papers: list[PaperResult] = Field(..., min_length=3, description="Papers from search results")
    themes: list[str] = Field(..., description="Research themes from gap analysis")
    limitations: list[str] = Field(..., description="Key limitations from gap analysis")
    gaps: list[dict] = Field(..., description="Identified gaps with priority and description")


class ProposalResponse(BaseModel):
    title: str
    background: str
    problem_statement: str
    objectives: list[str]
    methodology: list[str]
    expected_contributions: list[str]
    timeline: str
    resources: list[str]


# Full Research Paper Generation Schemas

class PaperRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500, description="Research topic")
    papers: list[PaperResult] = Field(..., min_length=3, description="Papers from search results")
    themes: list[str] = Field(..., description="Research themes from gap analysis")
    limitations: list[str] = Field(..., description="Key limitations from gap analysis")
    gaps: list[dict] = Field(..., description="Identified gaps with priority and description")


class PaperSection(BaseModel):
    title: str
    content: str


class PaperResponse(BaseModel):
    title: str
    abstract: str
    sections: list[PaperSection]


# Auto-Generate Research Paper Schemas

class AutoGenerateRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500, description="Research topic")
    top_n: int = Field(default=20, ge=5, le=50, description="Number of papers to analyze")
    year_from: Optional[int] = Field(default=2020, ge=1900, le=2030, description="Filter papers from this year onwards")
    year_to: Optional[int] = Field(default=None, ge=1900, le=2030, description="Filter papers up to this year")


class AutoGenerateResponse(BaseModel):
    query: str
    search_results: dict  # Summary of search
    gap_analysis: dict    # Summary of gap analysis
    generated_paper: PaperResponse