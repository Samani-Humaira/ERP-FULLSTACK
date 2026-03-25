from pydantic import BaseModel, Field
from enum import Enum
from app.schemas import PaperResult


class GapType(str, Enum):
    UNEXPLORED_AREA = "unexplored_area"
    LIMITATION      = "limitation"
    DATASET         = "dataset"
    RECENCY         = "recency"


class GapPriority(str, Enum):
    HIGH   = "High"
    MEDIUM = "Medium"
    LOW    = "Low"


#  Frontend-ready structures 

class ResearchTheme(BaseModel):
    label: str


class ExtractedLimitation(BaseModel):
    text: str
    source: str


class IdentifiedGap(BaseModel):
    title: str
    description: str
    priority: GapPriority
    gap_type: GapType
    confidence: float = Field(..., ge=0.0, le=1.0)
    evidence: list[str] = []


class PaperExtraction(BaseModel):
    title: str
    methods: list[str] = []
    datasets: list[str] = []
    limitations: list[str] = []
    findings: list[str] = []


class GapAnalysisSummary(BaseModel):
    total_papers_analysed: int
    total_gaps_found: int
    unexplored_area_gaps: int
    limitation_gaps: int
    dataset_gaps: int
    recency_gaps: int


#  Request / Response 

class GapAnalysisRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)
    papers: list[PaperResult] = Field(
        ...,
        min_length=3,
        description="Pass the papers array returned by /search directly here"
    )


class GapAnalysisResponse(BaseModel):
    query: str

    # Maps directly to the 3 UI sections
    themes: list[ResearchTheme]
    limitations: list[ExtractedLimitation]
    gaps: list[IdentifiedGap]

    # Extra detail for paper extraction panel
    paper_extractions: list[PaperExtraction]
    gap_summary: GapAnalysisSummary

    # Full paper list — use later when you need more detail
    papers_used: list[PaperResult]