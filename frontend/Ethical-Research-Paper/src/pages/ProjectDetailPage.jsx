import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardPen,
  FileCode,
  FileText,
  RefreshCcw,
} from "lucide-react";

import Card, { CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { PageTransition, FadeIn } from "../components/ui/animations";
import CollabEditor from "../components/layout/CollabEditor";
import CommentPanel from "../components/layout/CommentPanel";
import VersionHistory from "../components/layout/VersionHistory";
import TeamPanel from "../components/layout/TeamPanel";
import { buildAcademicLatex } from "../utils/academicLatex";
import { downloadProjectPdf } from "../utils/projectPdf";

const API_BASE = "http://localhost:8000/api/v1";

const getDocument = (content) => {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return {};
  }
  if (Array.isArray(content.sections)) return content;
  if (content.content && typeof content.content === "object") {
    return content.content;
  }
  return content;
};

const formatHeading = (key = "") =>
  String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const toText = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
  }
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join("; ");
  if (typeof value === "object") {
    return toText(
      value.content ?? value.text ?? value.value ?? Object.values(value),
    );
  }
  return "";
};

function renderContentValue(value, keyPrefix = "content") {
  if (value == null || value === "") {
    return <p className="mt-2 text-slate-500">No content available.</p>;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return (
      <p className="mt-2 whitespace-pre-line leading-7 text-slate-700">
        {String(value)}
      </p>
    );
  }
  if (Array.isArray(value)) {
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
        {value.map((item, index) => (
          <li key={`${keyPrefix}-${index}`}>
            {typeof item === "object"
              ? renderContentValue(item, `${keyPrefix}-${index}`)
              : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="mt-3 space-y-3">
        {Object.entries(value).map(([key, item]) => (
          <div key={`${keyPrefix}-${key}`}>
            <h4 className="font-medium text-slate-800">{formatHeading(key)}</h4>
            {renderContentValue(item, `${keyPrefix}-${key}`)}
          </div>
        ))}
      </div>
    );
  }
  return <p className="mt-2 text-slate-500">Unsupported content format.</p>;
}

function renderProjectContent(content, query = "") {
  if (!content)
    return <p className="mt-2 text-slate-500">No content available.</p>;
  if (typeof content !== "object" || Array.isArray(content)) {
    return renderContentValue(content);
  }
  const document = getDocument(content);
  const sections = Array.isArray(document.sections) ? document.sections : [];
  const isPaper = sections.length > 0 || document.abstract;
  if (isPaper) {
    return (
      <article className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white px-6 py-8 sm:px-10">
        {document.title && (
          <h2 className="mb-7 text-center text-2xl font-bold text-slate-900">
            {document.title}
          </h2>
        )}
        {document.abstract && (
          <section className="mb-7 border-b border-slate-200 pb-5">
            <h3 className="mb-2 text-center text-lg font-semibold">Abstract</h3>
            {renderContentValue(document.abstract, "abstract")}
          </section>
        )}
        <div className="space-y-7">
          {sections.map((section, index) => (
            <section key={`${section.title || "section"}-${index}`}>
              {section.title && (
                <h3 className="mb-2 border-b border-slate-200 pb-2 text-lg font-bold uppercase tracking-wide">
                  {section.title}
                </h3>
              )}
              {renderContentValue(section.content, `section-${index}`)}
            </section>
          ))}
        </div>
      </article>
    );
  }
  return (
    <div className="mt-3 space-y-5">
      {Object.entries(content).map(([key, value]) => (
        <section key={key}>
          <h4 className="font-semibold text-slate-800">{formatHeading(key)}</h4>
          {renderContentValue(value, key)}
        </section>
      ))}
      {query && !Object.keys(content).length && (
        <p className="text-slate-500">Research topic: {query}</p>
      )}
    </div>
  );
}

const makeCitationText = (paper, index) => {
  if (typeof paper === "string" || typeof paper === "number")
    return String(paper);
  if (!paper) return `Reference ${index + 1}`;
  const authors = Array.isArray(paper.authors)
    ? paper.authors.join(", ")
    : paper.authors || "Unknown authors";
  const year = paper.year ? ` (${paper.year})` : "";
  const title = paper.title || paper.name || `Paper ${index + 1}`;
  const source = paper.source || paper.journal || paper.url || "";
  return `${authors}${year}. ${title}${source ? `. ${source}` : ""}`;
};

const downloadTextFile = (filename, content, mimeType) => {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export default function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const clientRef = useRef(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingInviteToken, setPendingInviteToken] = useState("");
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [generatedSummarySource, setGeneratedSummarySource] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [editingContent, setEditingContent] = useState(null);
  const [members, setMembers] = useState([]);
  const [comments, setComments] = useState([]);
  const [presence, setPresence] = useState([]);
  const [newVersion, setNewVersion] = useState(null);

  const currentUser = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let client;
    const loadProject = async () => {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated. Please log in first.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/projects/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(data.detail || "Failed to load project details.");
        if (cancelled) return;
        setProject(data);

        const inviteToken = new URLSearchParams(window.location.search).get(
          "invite_token",
        );
        if (inviteToken) {
          try {
            const accepted = await fetch(
              `${API_BASE}/projects/${id}/invite/accept`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ token: inviteToken }),
              },
            );
            if (accepted.ok) {
              const result = await accepted.json();
              if (!cancelled && result.member)
                setMembers((existing) => [...existing, result.member]);
            } else if (!cancelled) {
              setPendingInviteToken(inviteToken);
            }
          } catch {
            if (!cancelled) setPendingInviteToken(inviteToken);
          }
        }

        const [memberResponse, commentResponse] = await Promise.all([
          fetch(`${API_BASE}/projects/${id}/members`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/projects/${id}/comments`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!cancelled && memberResponse.ok)
          setMembers(await memberResponse.json());
        if (!cancelled && commentResponse.ok)
          setComments(await commentResponse.json());

        const user = currentUser();
        const CollaborationClient = (await import("../api/collaboration"))
          .default;
        if (cancelled) return;
        client = new CollaborationClient(id, (message) => {
          if (message.type === "delta") {
            const payload = message.payload || {};
            if (payload.sender_id !== user.id && payload.content) {
              setProject((previous) =>
                previous ? { ...previous, content: payload.content } : previous,
              );
              setEditingContent(null);
            }
          } else if (message.type === "presence") {
            setPresence(message.presence || []);
          } else if (message.type === "comment_created" && message.payload) {
            setComments((existing) =>
              existing.some((comment) => comment.id === message.payload.id)
                ? existing
                : [...existing, message.payload],
            );
          } else if (message.type === "member_added" && message.payload) {
            setMembers((existing) =>
              existing.some(
                (member) => member.user_id === message.payload.user_id,
              )
                ? existing
                : [...existing, message.payload],
            );
          } else if (message.type === "access_revoked") {
            setError("Your access to this project has been revoked.");
          }
        });
        clientRef.current = client;
        client.connect(token, user);
      } catch (loadError) {
        if (!cancelled)
          setError(loadError.message || "Failed to load project details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadProject();
    return () => {
      cancelled = true;
      client?.disconnect(currentUser());
      if (clientRef.current === client) clientRef.current = null;
    };
  }, [id, currentUser]);

  const content = editingContent || project?.content || {};
  const document = getDocument(content);
  const summarizeProject = () => {
    if (!project) return "";
    const abstract = toText(document.abstract || content.abstract);
    if (abstract) return abstract;
    const fields = [
      ["Background", document.background || content.background],
      [
        "Research problem",
        document.problem_statement || content.problem_statement,
      ],
      ["Objectives", document.objectives || content.objectives],
      ["Methodology", document.methodology || content.methodology],
      [
        "Expected contributions",
        document.expected_contributions || content.expected_contributions,
      ],
    ];
    const details = fields
      .map(([label, value]) => {
        const text = toText(value);
        return text ? `${label}: ${text}` : "";
      })
      .filter(Boolean);
    if (Array.isArray(document.sections)) {
      document.sections
        .filter((section) =>
          /introduction|conclusion|finding|discussion/i.test(
            section?.title || "",
          ),
        )
        .forEach((section) => {
          const text = toText(section.content);
          if (text) details.push(`${section.title}: ${text}`);
        });
    }
    const overview = `${document.title || project.title || "This research project"} is a ${project.project_type || "research"} project focused on ${project.query || project.title || "a research topic"}.`;
    if (!details.length) {
      const paperCount = project.papers_data?.length || 0;
      const gapCount = Array.isArray(project.gaps_data)
        ? project.gaps_data.length
        : project.gaps_data
          ? 1
          : 0;
      return `${overview} It includes ${paperCount} source paper(s)${gapCount ? ` and identifies ${gapCount} research gap(s)` : ""}.`;
    }
    const summary = [overview, ...details].join(" ");
    return summary.length > 1200
      ? `${summary.slice(0, 1200).replace(/\s+\S*$/, "")}…`
      : summary;
  };

  const generateProjectSummary = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setSummaryError("Please log in to generate a project summary.");
      return;
    }
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const response = await fetch(
        `${API_BASE}/projects/${id}/summary/generate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          result.detail ||
            `Summary generation failed (HTTP ${response.status}).`,
        );
      if (typeof result.summary !== "string" || !result.summary.trim())
        throw new Error(
          "The summary service returned an empty result. Please try again.",
        );
      setGeneratedSummary(result.summary.trim());
      setGeneratedSummarySource(result.source || "ai");
    } catch (generationError) {
      setSummaryError(
        generationError.message ||
          "Could not generate a summary. Please try again.",
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const createProposalActivity = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_BASE}/activities/proposal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.detail || "Failed to create proposal activity.");
      }
      return await response.json();
    } catch (activityError) {
      console.error("Proposal activity error:", activityError);
      return null;
    }
  };

  const buildLaTeX = () => {
    const paperSections = Array.isArray(document.sections)
      ? document.sections
      : [];
    return buildAcademicLatex({
      title: document.title || project?.title || "Research Project",
      authors:
        document.authors ||
        project?.authors ||
        project?.author ||
        "Research Team",
      query: project?.query || "N/A",
      fields: project?.themes || document.themes || [],
      abstract: generatedSummary || document.abstract || summarizeProject(),
      sections: paperSections,
      gaps: project?.gaps_data || [],
      references: project?.papers_data || [],
    });
  };

  const exportLaTeX = () => {
    if (!project) return;
    const name = String(project.title || "research-project")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    downloadTextFile(
      `${name}.tex`,
      buildLaTeX(),
      "application/x-latex;charset=utf-8",
    );
  };

  const exportPDF = () => {
    if (!project) return;
    const sections = Array.isArray(document.sections)
      ? document.sections
      : Object.entries(document)
          .filter(
            ([key]) =>
              ![
                "title",
                "abstract",
                "authors",
                "sections",
                "content",
                "themes",
              ].includes(key),
          )
          .map(([title, value]) => ({
            title: formatHeading(title),
            content: value,
          }));
    const references = Array.isArray(project.papers_data)
      ? project.papers_data
      : [];
    if (references.length) {
      sections.push({
        title: "References",
        content: references.map(makeCitationText).join("\n"),
      });
    }
    downloadProjectPdf({
      title: document.title || project.title || "Research Project",
      authors:
        document.authors ||
        project.authors ||
        project.author ||
        "Research Team",
      abstract:
        generatedSummary ||
        document.abstract ||
        content.abstract ||
        summarizeProject(),
      sections,
      filename: project.title || document.title || "research-project",
    });
  };

  const handleSave = async ({ content: nextContent, commit_message }) => {
    const token = localStorage.getItem("token");
    const commitMessage = String(commit_message || "").trim();
    if (!commitMessage)
      throw new Error("Please enter a commit message before saving.");
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: nextContent,
        commit_message: commitMessage,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.detail || "Failed to save project.");
    if (result.project)
      setProject((previous) =>
        previous
          ? {
              ...previous,
              content: result.project.content,
              updated_at: result.project.updated_at,
            }
          : previous,
      );
    setEditingContent(null);
    if (result.version) setNewVersion(result.version);
    return result;
  };

  const addComment = async (payload) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/projects/${id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.detail || "Failed to add comment.");
    setComments((existing) =>
      existing.some((comment) => comment.id === result.id)
        ? existing
        : [...existing, result],
    );
    clientRef.current?.send({ type: "comment_created", payload: result });
    return result;
  };

  const addMember = async (payload) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/projects/${id}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.detail || "Failed to add project member.");
    setMembers((existing) =>
      existing.some((member) => member.user_id === result.user_id)
        ? existing
        : [...existing, result],
    );
    clientRef.current?.send({ type: "member_added", payload: result });
    return result;
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-5xl py-8">
          <LoadingSpinner text="Loading project details..." />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl space-y-6">
        <FadeIn>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Project Details</h1>
              <p className="mt-1 text-slate-500">
                Review your saved paper or proposal project.
              </p>
              {pendingInviteToken && (
                <div className="mt-3 rounded border-l-4 border-yellow-400 bg-yellow-50 p-3 text-sm">
                  You were invited to this project. Please{" "}
                  <a
                    className="text-blue-600 underline"
                    href={`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                  >
                    log in
                  </a>{" "}
                  or{" "}
                  <a
                    className="text-blue-600 underline"
                    href={`/auth/signup?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                  >
                    create an account
                  </a>{" "}
                  to accept the invite.
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                icon={RefreshCcw}
                disabled={!project?.query || !project?.papers_data?.length}
                onClick={async () => {
                  await createProposalActivity();
                  navigate("/gap-analysis", {
                    state: {
                      query: project?.query,
                      papers: project?.papers_data,
                    },
                  });
                }}
              >
                Regenerate Gap Analysis
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={FileText}
                disabled={!project}
                onClick={generateProjectSummary}
              >
                {summaryLoading ? "Generating…" : "Generate Summary"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={FileCode}
                disabled={!project?.query || !project?.papers_data?.length}
                onClick={() =>
                  navigate("/gap-analysis", {
                    state: {
                      query: project?.query,
                      papers: project?.papers_data,
                    },
                  })
                }
              >
                Generate Research Paper
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={ClipboardPen}
                disabled={!project?.query || !project?.papers_data?.length}
                onClick={() =>
                  navigate("/gap-analysis", {
                    state: {
                      query: project?.query,
                      papers: project?.papers_data,
                    },
                  })
                }
              >
                Generate Research Proposal
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={FileCode}
                disabled={!project}
                onClick={exportLaTeX}
              >
                Export LaTeX
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={FileText}
                disabled={!project}
                onClick={exportPDF}
              >
                Export PDF
              </Button>
              <Button size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </FadeIn>

        {error && (
          <FadeIn>
            <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          </FadeIn>
        )}

        {project && (
          <FadeIn>
            <Card>
              <CardBody className="space-y-6">
                <section>
                  <h2 className="text-xl font-semibold">{project.title}</h2>
                  {project.description && (
                    <p className="mt-1 text-slate-600">{project.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                    {project.project_type && (
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {project.project_type}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      Query: {project.query || "N/A"}
                    </span>
                    {project.created_at && (
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Created {new Date(project.created_at).toLocaleString()}
                      </span>
                    )}
                    {presence.length > 0 && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                        {presence.length} collaborator(s) online
                      </span>
                    )}
                  </div>
                </section>

                {summaryError && (
                  <p
                    role="alert"
                    className="rounded bg-red-50 p-3 text-sm text-red-700"
                  >
                    {summaryError}
                  </p>
                )}
                {(generatedSummary ||
                  document.abstract ||
                  content.abstract) && (
                  <section className="rounded-lg bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">
                        {generatedSummary
                          ? "Generated Summary"
                          : "Summary / Abstract"}
                      </h3>
                      {generatedSummarySource && (
                        <span className="text-xs text-slate-500">
                          Source: {generatedSummarySource}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
                      {generatedSummary ||
                        toText(document.abstract || content.abstract)}
                    </p>
                  </section>
                )}

                <section>
                  <h3 className="mb-3 font-semibold">
                    {Array.isArray(document.sections)
                      ? "Paper draft"
                      : "Content"}
                  </h3>
                  {renderProjectContent(content, project.query)}
                  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="space-y-5">
                      <CollabEditor
                        projectId={id}
                        content={project.content}
                        onContentChange={setEditingContent}
                        client={clientRef.current}
                        user={currentUser()}
                        onSave={handleSave}
                        presence={presence}
                      />
                      <CommentPanel
                        projectId={id}
                        comments={comments}
                        client={clientRef.current}
                        user={currentUser()}
                        onAddComment={addComment}
                      />
                    </div>
                    <div className="space-y-5">
                      <TeamPanel
                        projectId={id}
                        members={members}
                        ownerId={project.owner_id}
                        client={clientRef.current}
                        user={currentUser()}
                        onAddMember={addMember}
                        onRemoveMember={(userId) =>
                          setMembers((existing) =>
                            existing.filter(
                              (member) => member.user_id !== userId,
                            ),
                          )
                        }
                      />
                      <VersionHistory projectId={id} newVersion={newVersion} />
                    </div>
                  </div>
                </section>

                {project.papers_data?.length > 0 && (
                  <section>
                    <h3 className="font-semibold">Saved Papers</h3>
                    <div className="mt-3 space-y-3">
                      {project.papers_data.map((paper, index) => (
                        <Card
                          key={`${paper?.id || paper?.title || "paper"}-${index}`}
                          className="border-slate-200 bg-slate-50"
                        >
                          <CardBody>{renderProjectContent(paper)}</CardBody>
                        </Card>
                      ))}
                    </div>
                    <h3 className="mt-5 font-semibold">Bibliography</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                      {project.papers_data.map((paper, index) => (
                        <li key={`citation-${index}`}>
                          {makeCitationText(paper, index)}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {project.gaps_data && (
                  <section>
                    <h3 className="font-semibold">Gap Analysis</h3>
                    {renderProjectContent(project.gaps_data)}
                  </section>
                )}
              </CardBody>
            </Card>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  );
}
