import { useMemo, useState } from "react";
import { AlertCircle, Check, LoaderCircle, Send, Sparkles } from "lucide-react";
import { askEditorAssistant } from "../../api/editorAssistant";

function collectTextSections(value, path = [], sections = []) {
  if (typeof value === "string") {
    if (path.length) {
      sections.push({ path, label: path.map(String).join(" › ") });
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectTextSections(item, [...path, index], sections),
    );
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      collectTextSections(item, [...path, key], sections),
    );
  }

  return sections.slice(0, 100);
}

function valueAtPath(value, path) {
  return path.reduce((current, key) => current?.[key], value);
}

function renderInlineMarkdown(text, keyPrefix) {
  const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  return text
    .split(tokenPattern)
    .filter(Boolean)
    .map((token, index) => {
      const key = `${keyPrefix}-${index}`;
      if (token.startsWith("**") || token.startsWith("__")) {
        return <strong key={key}>{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith("*") || token.startsWith("_")) {
        return <em key={key}>{token.slice(1, -1)}</em>;
      }
      if (token.startsWith("`")) {
        return (
          <code
            key={key}
            className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em]"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let listType = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: listType, items: listItems });
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line) => {
    const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const quote = line.match(/^\s*>\s?(.*)$/);

    if (!line.trim() || /^\s*[-*_]{3,}\s*$/.test(line)) {
      flushParagraph();
      flushList();
      return;
    }
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: `h${heading[1].length}`, text: heading[2] });
      return;
    }
    if (bullet || numbered) {
      flushParagraph();
      const nextType = bullet ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((bullet || numbered)[1]);
      return;
    }
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: quote[1] });
      return;
    }
    flushList();
    paragraph.push(line.trim());
  });
  flushParagraph();
  flushList();

  return blocks.map((block, index) => {
    const key = `answer-block-${index}`;
    if (block.type === "ul" || block.type === "ol") {
      const List = block.type;
      return (
        <List
          key={key}
          className="my-2 space-y-1.5 pl-5 marker:text-violet-600"
        >
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`} className="pl-1">
              {renderInlineMarkdown(item, `${key}-${itemIndex}`)}
            </li>
          ))}
        </List>
      );
    }
    if (block.type.startsWith("h")) {
      const Heading = block.type;
      return (
        <Heading
          key={key}
          className="mb-1 mt-4 text-sm font-semibold text-slate-900 first:mt-0"
        >
          {renderInlineMarkdown(block.text, key)}
        </Heading>
      );
    }
    if (block.type === "quote") {
      return (
        <blockquote
          key={key}
          className="my-2 border-l-2 border-violet-300 pl-3 text-slate-600"
        >
          {renderInlineMarkdown(block.text, key)}
        </blockquote>
      );
    }
    return (
      <p key={key} className="my-2 leading-6 first:mt-0 last:mb-0">
        {renderInlineMarkdown(block.text, key)}
      </p>
    );
  });
}

export default function EditorAssistant({
  projectId,
  content,
  onApplySuggestion,
}) {
  const [question, setQuestion] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [response, setResponse] = useState(null);
  const [responseTarget, setResponseTarget] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const sections = useMemo(() => collectTextSections(content), [content]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError("");
    setResponse(null);
    setResponseTarget(null);
    setApplied(false);

    try {
      const token = localStorage.getItem("token");
      const selectedPath = targetPath ? JSON.parse(targetPath) : null;
      const result = await askEditorAssistant(
        projectId,
        {
          question: question.trim(),
          content,
          target_path: selectedPath,
        },
        token,
      );
      setResponse(result);
      setResponseTarget(
        selectedPath
          ? {
              path: selectedPath,
              originalText: valueAtPath(content, selectedPath),
            }
          : null,
      );
    } catch (requestError) {
      setError(
        requestError.message || "The editing assistant could not respond.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!response?.suggested_text || !responseTarget) return;
    if (
      valueAtPath(content, responseTarget.path) !== responseTarget.originalText
    ) {
      setError(
        "This section changed after the suggestion was generated. Ask the assistant again to avoid overwriting your newer edits.",
      );
      return;
    }
    try {
      onApplySuggestion(responseTarget.path, response.suggested_text);
      setApplied(true);
    } catch (applyError) {
      setError(applyError.message || "Could not apply the suggestion.");
    }
  };

  return (
    <section className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
          <Sparkles size={19} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">AI editor assistant</h3>
          <p className="mt-1 text-sm text-slate-600">
            Ask for an explanation or request a rewrite. Suggestions are
            reviewed first and never saved automatically.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="assistant-section"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Focus section{" "}
            <span className="font-normal normal-case tracking-normal">
              (optional)
            </span>
          </label>
          <select
            id="assistant-section"
            value={targetPath}
            onChange={(event) => setTargetPath(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          >
            <option value="">Whole paper / general question</option>
            {sections.map((section) => (
              <option
                key={JSON.stringify(section.path)}
                value={JSON.stringify(section.path)}
              >
                {section.label}
              </option>
            ))}
          </select>
        </div>

        <label htmlFor="assistant-question" className="sr-only">
          Ask the assistant
        </label>
        <textarea
          id="assistant-question"
          rows={3}
          maxLength={3000}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. Is this methodology clear? Suggest a more concise version…"
          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            AI feedback may be inaccurate; verify claims and references.
          </span>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-violet-700 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            {loading ? "Thinking…" : "Ask assistant"}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {response && (
        <div
          aria-live="polite"
          className="mt-4 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h4 className="text-sm font-semibold text-slate-900">
            Assistant response
          </h4>
          <div className="mt-2 text-sm text-slate-700">
            {renderMarkdown(response.answer)}
          </div>
          {response.suggested_text && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-sm font-semibold text-slate-900">
                  Suggested replacement
                </h5>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applied}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-50 disabled:cursor-default disabled:opacity-70"
                >
                  <Check size={14} />
                  {applied ? "Applied in editor" : "Apply to editor"}
                </button>
              </div>
              {response.rationale && (
                <p className="mt-1 text-xs text-slate-500">
                  {response.rationale}
                </p>
              )}
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {response.suggested_text}
              </p>
              {applied && (
                <p className="mt-2 text-xs text-emerald-700">
                  Review the editor content, then save it with a commit message.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
