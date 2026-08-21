from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSON
import uuid
from datetime import datetime
import enum
from app.database import Base


class ProjectType(str, enum.Enum):
    PAPER = "paper"
    PROPOSAL = "proposal"


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    project_type = Column(Enum(ProjectType), nullable=False)
    
    query = Column(String(500), nullable=False)
    
    # Store the full content as JSON for flexible structure
    content = Column(JSON, nullable=False)  # Stores paper/proposal object
    
    # Metadata about source papers used
    papers_data = Column(JSON, nullable=True)  # List of papers used
    gaps_data = Column(JSON, nullable=True)    # Gap analysis data
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    is_public = Column(String(50), default="private")  # "private" or "public"
