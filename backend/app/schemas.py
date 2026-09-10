from pydantic import BaseModel, Field
from typing import Optional
from typing import List
from datetime import datetime
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


class SourceStatus(BaseModel):
    success: bool
    count: int = 0
    error: str | None = None

class PipelineSummary(BaseModel):
    fetched_semantic_scholar: int = 0
    fetched_arxiv: int = 0
    fetched_crossref: int = 0

    total_fetched: int = 0

    sources: dict[str, SourceStatus] = {}

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


class PlagiarismRequest(BaseModel):
    source_text: str = Field(..., min_length=30, description="Text to check for potential duplication")
    papers: list[PaperResult] = Field(..., min_length=1, description="Reference papers to compare against")
    threshold: float = Field(
        default=0.25,
        ge=0.0,
        le=1.0,
        description="Similarity threshold above which content is flagged",
    )


class PlagiarismMatch(BaseModel):
    paper_index: int
    title: str
    source: SearchSource
    url: Optional[str] = None
    similarity: float
    snippet: Optional[str] = None


class PlagiarismResponse(BaseModel):
    flagged: bool
    max_similarity: float
    threshold: float
    matches: list[PlagiarismMatch]


# Project Save/Load Schemas

class ProjectSaveRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500, description="Project title")
    description: Optional[str] = Field(None, max_length=2000, description="Project description")
    project_type: str = Field(..., description="Type: 'paper' or 'proposal'")
    query: str = Field(..., description="Original research query")
    content: dict = Field(..., description="Full paper or proposal object")
    papers_data: Optional[list[PaperResult]] = Field(None, description="Source papers used")
    gaps_data: Optional[list[dict]] = Field(None, description="Gap analysis data")


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    project_type: str
    query: str
    created_at: str
    updated_at: str
    is_public: str


class ProjectDetailResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    project_type: str
    query: str
    content: dict
    papers_data: Optional[list[PaperResult]]
    gaps_data: Optional[list[dict]]
    created_at: str
    updated_at: str
    is_public: str


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


# Collaboration Schemas


class MemberRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    REVIEWER = "reviewer"
    VIEWER = "viewer"


class ProjectMember(BaseModel):
    user_id: str
    email: Optional[str]
    full_name: Optional[str]
    role: MemberRole


class CommentCreate(BaseModel):
    project_id: str
    section: Optional[str]
    parent_id: Optional[str]
    content: str


class CommentResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    section: Optional[str]
    parent_id: Optional[str]
    content: str
    created_at: datetime
    resolved: bool = False


class DocumentVersionResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    version_number: int
    content: dict
    created_at: datetime


class PresencePayload(BaseModel):
    project_id: str
    user_id: str
    full_name: Optional[str]
    active_section: Optional[str]


class EditorDelta(BaseModel):
    project_id: str
    user_id: str
    section: Optional[str]
    delta: dict
    cursor: Optional[dict]


class InviteRequest(BaseModel):
    emails: list[str]
    role: MemberRole = MemberRole.EDITOR


class InviteResponse(BaseModel):
    id: str
    project_id: str
    email: str
    role: MemberRole
    token: str
    created_by: str
    created_at: datetime
    accepted: bool = False
    accepted_at: Optional[datetime]
    link: Optional[str] = None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    payload: Optional[dict] = None
    read: bool = False
    created_at: datetime


class NotificationAction(BaseModel):
    action: str  # 'accept' or 'reject'