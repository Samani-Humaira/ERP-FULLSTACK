import { useState } from "react";

export default function CommentPanel({
  projectId,
  comments = [],
  onAddComment,
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addComment = async () => {
    const content = text.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      if (onAddComment) {
        await onAddComment({
          project_id: projectId,
          section: null,
          parent_id: null,
          content,
        });
        setText("");
      } else {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `http://localhost:8000/api/v1/projects/${projectId}/comments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              project_id: projectId,
              section: null,
              parent_id: null,
              content,
            }),
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.detail || `Could not add comment (HTTP ${res.status}).`,
          );
        }
        setText("");
      }
    } catch (submitError) {
      setError(
        submitError.message || "Could not add comment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4">
      <h4 className="font-semibold">Comments</h4>
      <div className="mt-2 max-h-96 space-y-2 overflow-y-auto">
        {comments.length === 0 && (
          <p className="rounded border border-dashed p-3 text-sm text-slate-500">
            No comments yet. Start the discussion.
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="p-2 border rounded bg-slate-50">
            <div className="whitespace-pre-wrap break-words text-sm text-slate-700">
              {c.content}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              by {c.user_name || c.user_email || c.user_id}
              {c.user_name && c.user_email ? ` (${c.user_email})` : ""}
              {c.created_at
                ? ` • ${new Date(c.created_at).toLocaleString()}`
                : ""}
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          addComment();
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="min-w-0 flex-1 rounded border p-2"
          placeholder="Add a comment"
          aria-label="Add a comment"
          maxLength={5000}
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="rounded bg-slate-800 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </form>
    </div>
  );
}
