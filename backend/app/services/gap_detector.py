"""
Gap Detector
============
Uses FAISS + clustering to identify research gaps from embedded papers.

Gap detection strategy:
  1. Cluster papers by semantic similarity (KMeans on embeddings)
  2. Thin clusters (few papers) = unexplored areas = potential gaps
  3. Analyse limitations across ALL papers → repeated limitations = confirmed gaps
  4. Find missing method+dataset combinations across the corpus
  5. Check recency — topics with no recent papers = recency gaps

Each gap is returned with:
  - gap_type    : type of gap (unexplored_area / limitation / dataset / recency)
  - title       : short human-readable gap title
  - description : detailed explanation
  - evidence    : list of paper titles that support this gap finding
  - confidence  : float 0.0–1.0
"""

import numpy as np
import logging
from dataclasses import dataclass, field
from collections import Counter

from app.services.embedder import EmbeddedPaper
from app.services.scibert_extractor import ExtractedInfo

logger = logging.getLogger(__name__)

CURRENT_YEAR = 2026
RECENCY_THRESHOLD = 3           # years — topics with no papers in last N years = recency gap
MIN_CLUSTER_SIZE_FOR_GAP = 2    # clusters with fewer papers than this = potential gap
LIMITATION_FREQUENCY_THRESHOLD = 2  # limitation mentioned in N+ papers = confirmed gap


#  Data structures 

@dataclass
class ResearchGap:
    gap_type: str           # "unexplored_area" | "limitation" | "dataset" | "recency"
    title: str
    description: str
    evidence: list[str] = field(default_factory=list)    # paper titles as evidence
    confidence: float = 0.0

    def to_dict(self) -> dict:
        return {
            "gap_type": self.gap_type,
            "title": self.title,
            "description": self.description,
            "evidence": self.evidence,
            "confidence": round(self.confidence, 3),
        }


#  FAISS clustering 

def _cluster_papers(embedded_papers: list[EmbeddedPaper], n_clusters: int) -> list[int]:
    """
    Cluster paper embeddings using KMeans.
    Returns a list of cluster labels (one per paper).
    """
    try:
        import faiss

        embeddings = np.array([p.embedding for p in embedded_papers], dtype=np.float32)
        n = len(embeddings)
        dim = embeddings.shape[1]

        # Adjust clusters if fewer papers than requested
        actual_clusters = min(n_clusters, n // 2, n)
        if actual_clusters < 2:
            return [0] * n

        # FAISS KMeans
        kmeans = faiss.Kmeans(
            d=dim,
            k=actual_clusters,
            niter=20,
            seed=42,
            verbose=False,
        )
        kmeans.train(embeddings)

        _, labels = kmeans.index.search(embeddings, 1)
        return labels.flatten().tolist()

    except ImportError:
        # Fallback to sklearn if faiss not available
        logger.warning("FAISS not available, falling back to sklearn KMeans")
        from sklearn.cluster import KMeans
        embeddings = np.array([p.embedding for p in embedded_papers])
        actual_clusters = min(n_clusters, len(embeddings) // 2, len(embeddings))
        if actual_clusters < 2:
            return [0] * len(embeddings)
        km = KMeans(n_clusters=actual_clusters, random_state=42, n_init=10)
        return km.fit_predict(embeddings).tolist()


def _optimal_cluster_count(n_papers: int) -> int:
    """
    Determine a sensible number of clusters based on paper count.
    Rule of thumb: sqrt(n/2), capped between 3 and 10.
    """
    import math
    return max(3, min(10, int(math.sqrt(n_papers / 2))))


#  Gap type detectors

def _detect_cluster_gaps(
    embedded_papers: list[EmbeddedPaper],
    extracted_infos: list[ExtractedInfo],
    labels: list[int],
) -> list[ResearchGap]:
    """
    Thin clusters = areas with few papers = unexplored = potential gaps.
    """
    gaps = []
    cluster_map: dict[int, list[int]] = {}

    for idx, label in enumerate(labels):
        cluster_map.setdefault(label, []).append(idx)

    total_papers = len(embedded_papers)

    for cluster_id, paper_indices in cluster_map.items():
        cluster_size = len(paper_indices)

        if cluster_size <= MIN_CLUSTER_SIZE_FOR_GAP:
            # Get methods and titles from this thin cluster
            cluster_papers = [embedded_papers[i] for i in paper_indices]
            cluster_methods = []

            for i in paper_indices:
                if i < len(extracted_infos):
                    cluster_methods.extend(extracted_infos[i].methods)

            top_methods = [m for m, _ in Counter(cluster_methods).most_common(3)]
            method_str = ", ".join(top_methods) if top_methods else "this specific area"

            titles = [p.title for p in cluster_papers]

            # Confidence: thinner cluster relative to total = higher confidence it's a gap
            confidence = round(1.0 - (cluster_size / max(total_papers * 0.3, 1)), 2)
            confidence = max(0.4, min(0.9, confidence))

            gaps.append(ResearchGap(
                gap_type="unexplored_area",
                title=f"Underexplored area: {method_str}",
                description=(
                    f"Only {cluster_size} paper(s) found in this research cluster "
                    f"focusing on {method_str}. This suggests limited exploration "
                    f"compared to other areas in the corpus ({total_papers} total papers). "
                    f"This could represent an opportunity for original contribution."
                ),
                evidence=titles,
                confidence=confidence,
            ))

    return gaps


def _detect_limitation_gaps(extracted_infos: list[ExtractedInfo]) -> list[ResearchGap]:
    """
    Limitations mentioned repeatedly across multiple papers = confirmed gap.
    Nobody has solved it yet despite multiple papers identifying it.
    """
    gaps = []

    # Key limitation themes to look for
    limitation_themes = {
        "scalability": ["scalab", "large-scale", "scale", "computational cost", "expensive"],
        "generalization": ["generaliz", "domain", "transfer", "out-of-distribution", "overfitting"],
        "data scarcity": ["limited data", "small dataset", "insufficient data", "lack of data", "few samples"],
        "interpretability": ["interpret", "explain", "black box", "transparency", "understand"],
        "real-world applicability": ["real-world", "practical", "deployment", "production", "clinical"],
        "privacy concerns": ["privacy", "sensitive data", "confidential", "secure"],
        "computational efficiency": ["computationally", "efficiency", "resource", "memory", "latency"],
    }

    for theme, keywords in limitation_themes.items():
        matching_papers = []

        for info in extracted_infos:
            all_limitation_text = " ".join(info.limitations).lower()
            if any(kw in all_limitation_text for kw in keywords):
                matching_papers.append(info.paper_title)

        if len(matching_papers) >= LIMITATION_FREQUENCY_THRESHOLD:
            confidence = min(0.95, 0.5 + (len(matching_papers) / len(extracted_infos)) * 0.5)

            gaps.append(ResearchGap(
                gap_type="limitation",
                title=f"Recurring unsolved limitation: {theme}",
                description=(
                    f"{len(matching_papers)} paper(s) in the corpus identify '{theme}' "
                    f"as a limitation or challenge, but none fully resolve it. "
                    f"Addressing this could be a strong research contribution."
                ),
                evidence=matching_papers[:5],
                confidence=round(confidence, 3),
            ))

    return gaps


def _detect_dataset_gaps(extracted_infos: list[ExtractedInfo]) -> list[ResearchGap]:
    """
    Identify method + dataset combinations that appear frequently separately
    but are never combined — a dataset gap.
    """
    gaps = []

    # Collect all methods and datasets across corpus
    all_methods = Counter()
    all_datasets = Counter()
    method_dataset_pairs = set()

    for info in extracted_infos:
        for method in info.methods:
            all_methods[method] += 1
        for dataset in info.datasets:
            all_datasets[dataset] += 1
        # Record which methods were used WITH which datasets in each paper
        for method in info.methods:
            for dataset in info.datasets:
                method_dataset_pairs.add((method, dataset))

    # Top methods and datasets
    top_methods = [m for m, _ in all_methods.most_common(5)]
    top_datasets = [d for d, _ in all_datasets.most_common(5)]

    # Find combinations that are missing
    for method in top_methods:
        for dataset in top_datasets:
            if (method, dataset) not in method_dataset_pairs:
                # This combination was never seen together
                method_count = all_methods[method]
                dataset_count = all_datasets[dataset]

                if method_count >= 2 and dataset_count >= 2:
                    confidence = round(
                        min(0.85, (method_count + dataset_count) / (len(extracted_infos) * 2)),
                        3
                    )

                    gaps.append(ResearchGap(
                        gap_type="dataset",
                        title=f"Untested combination: {method} on {dataset}",
                        description=(
                            f"'{method}' appears in {method_count} paper(s) and "
                            f"'{dataset}' appears in {dataset_count} paper(s), "
                            f"but no paper in the corpus applies {method} to {dataset}. "
                            f"This unexplored combination could yield a novel contribution."
                        ),
                        evidence=[],
                        confidence=confidence,
                    ))

    # Return top 3 dataset gaps by confidence
    dataset_gaps = sorted(gaps, key=lambda g: g.confidence, reverse=True)
    return dataset_gaps[:3]


def _detect_recency_gaps(
    extracted_infos: list[ExtractedInfo],
    papers: list[dict],
) -> list[ResearchGap]:
    """
    Topics covered only by old papers = recency gap.
    The field may have moved on or the topic needs revisiting with modern methods.
    """
    gaps = []

    # Group methods by the year of papers that use them
    method_years: dict[str, list[int]] = {}

    for info, paper in zip(extracted_infos, papers):
        year = paper.get("year")
        if not year:
            continue
        for method in info.methods:
            method_years.setdefault(method, []).append(year)

    for method, years in method_years.items():
        if not years:
            continue
        most_recent = max(years)
        age = CURRENT_YEAR - most_recent

        if age >= RECENCY_THRESHOLD and len(years) >= 2:
            confidence = min(0.8, 0.4 + (age / 10) * 0.4)

            gaps.append(ResearchGap(
                gap_type="recency",
                title=f"Outdated research: {method} not studied recently",
                description=(
                    f"'{method}' was studied in {len(years)} paper(s) but the most recent "
                    f"was in {most_recent} ({age} years ago). "
                    f"Revisiting this topic with modern techniques could be valuable."
                ),
                evidence=[],
                confidence=round(confidence, 3),
            ))

    # Return top 3 recency gaps
    recency_gaps = sorted(gaps, key=lambda g: g.confidence, reverse=True)
    return recency_gaps[:3]


# ─── Main public function ─────────────────────────────────────────────────────

def detect_gaps(
    embedded_papers: list[EmbeddedPaper],
    extracted_infos: list[ExtractedInfo],
    papers: list[dict],
) -> list[ResearchGap]:
    """
    Run all 4 gap detectors and return a unified sorted list of gaps.

    Args:
        embedded_papers : output from embedder.embed_papers()
        extracted_infos : output from scibert_extractor.extract_all()
        papers          : original paper dicts (need 'year' for recency gaps)

    Returns:
        List of ResearchGap objects sorted by confidence (highest first).
    """
    if not embedded_papers or not extracted_infos:
        logger.warning("Gap detection called with empty input")
        return []

    all_gaps: list[ResearchGap] = []

    # 1. Cluster-based gaps (unexplored areas)
    n_clusters = _optimal_cluster_count(len(embedded_papers))
    labels = _cluster_papers(embedded_papers, n_clusters)
    cluster_gaps = _detect_cluster_gaps(embedded_papers, extracted_infos, labels)
    all_gaps.extend(cluster_gaps)
    logger.info(f"Cluster gaps: {len(cluster_gaps)}")

    # 2. Limitation-based gaps
    limitation_gaps = _detect_limitation_gaps(extracted_infos)
    all_gaps.extend(limitation_gaps)
    logger.info(f"Limitation gaps: {len(limitation_gaps)}")

    # 3. Dataset combination gaps
    dataset_gaps = _detect_dataset_gaps(extracted_infos)
    all_gaps.extend(dataset_gaps)
    logger.info(f"Dataset gaps: {len(dataset_gaps)}")

    # 4. Recency gaps
    recency_gaps = _detect_recency_gaps(extracted_infos, papers)
    all_gaps.extend(recency_gaps)
    logger.info(f"Recency gaps: {len(recency_gaps)}")

    # Sort by confidence descending
    all_gaps.sort(key=lambda g: g.confidence, reverse=True)

    logger.info(f"Total gaps detected: {len(all_gaps)}")
    return all_gaps