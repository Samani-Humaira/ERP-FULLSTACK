"""
Sentence-BERT Embedder
======================
Converts paper abstracts into dense vector embeddings using Sentence-BERT.
These embeddings are used by the gap detector to:
  - Find clusters of similar papers (explored areas)
  - Find sparse regions (potential gaps)
  - Compute similarity between any two papers

Model used: 'all-MiniLM-L6-v2'
  - Fast, lightweight (80MB)
  - 384-dimensional embeddings
  - Strong semantic similarity performance
  - Downloads automatically on first use via sentence-transformers

The embedder is a singleton — model loads once and stays in memory.
"""

import logging
import numpy as np
from functools import lru_cache
from dataclasses import dataclass

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384


# ─── Singleton model loader 

@lru_cache(maxsize=1)
def _get_model():
    """
    Load Sentence-BERT model once and cache it.
    First call downloads the model (~80MB), subsequent calls are instant.
    """
    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading Sentence-BERT model: {EMBEDDING_MODEL}")
        model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Sentence-BERT model loaded successfully")
        return model
    except ImportError:
        raise ImportError(
            "sentence-transformers not installed. Run: pip install sentence-transformers"
        )


# ─── Data structure 

@dataclass
class EmbeddedPaper:
    title: str
    abstract: str
    embedding: np.ndarray          # shape: (384,)
    paper_index: int               # original index in input list

    def to_dict_without_embedding(self) -> dict:
        return {
            "title": self.title,
            "abstract": self.abstract,
            "paper_index": self.paper_index,
        }


# ─── Embedding logic 

def _build_embedding_text(title: str, abstract: str) -> str:
    """
    Combine title and abstract for embedding.
    Title is repeated to give it more weight in the vector space.
    """
    return f"{title}. {title}. {abstract}"


def embed_papers(papers: list[dict]) -> list[EmbeddedPaper]:
    """
    Embed a list of papers using Sentence-BERT.

    Each paper dict must have 'title' and 'abstract' keys.
    Returns a list of EmbeddedPaper objects with numpy embeddings.

    Batch processing is used for efficiency — all papers embedded in one call.
    """
    if not papers:
        return []

    model = _get_model()

    # Build text inputs
    texts = []
    valid_papers = []

    for i, paper in enumerate(papers):
        title = paper.get("title", "")
        abstract = paper.get("abstract", "")

        if not abstract or len(abstract.strip()) < 50:
            logger.debug(f"Skipping paper {i} — no/short abstract: '{title[:50]}'")
            continue

        texts.append(_build_embedding_text(title, abstract))
        valid_papers.append((i, paper))

    if not texts:
        logger.warning("No valid papers to embed")
        return []

    logger.info(f"Embedding {len(texts)} papers with Sentence-BERT...")

    # Batch embed — much faster than one-by-one
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,   # L2 normalise → cosine similarity = dot product
    )

    logger.info(f"Embedding complete. Shape: {embeddings.shape}")

    results = []
    for idx, ((original_idx, paper), embedding) in enumerate(zip(valid_papers, embeddings)):
        results.append(
            EmbeddedPaper(
                title=paper.get("title", ""),
                abstract=paper.get("abstract", ""),
                embedding=embedding,
                paper_index=original_idx,
            )
        )

    return results


def embed_query(query: str) -> np.ndarray:
    """
    Embed a single query string.
    Used to find papers most similar to the user's research query.
    Returns a normalised 384-dim numpy array.
    """
    model = _get_model()
    embedding = model.encode(
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return embedding[0]


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Cosine similarity between two normalised embeddings.
    Since embeddings are L2-normalised, this is just the dot product.
    Returns a float in [-1, 1], higher = more similar.
    """
    return float(np.dot(a, b))