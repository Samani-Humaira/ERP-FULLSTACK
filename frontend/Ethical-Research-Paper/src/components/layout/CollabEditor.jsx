import React, { useEffect, useState, useRef } from "react";

export default function CollabEditor({
  projectId,
  content: propContent,
  client,
  user,
  onSave,
  onContentChange,
  presence,
}) {
  const [content, setContent] = useState(
    JSON.stringify(propContent || {}, null, 2),
  );
  const [saveMessage, setSaveMessage] = useState("");
  const sendTimer = useRef(null);
  const changeTimer = useRef(null);

  useEffect(() => {
    setContent(JSON.stringify(propContent || {}, null, 2));
  }, [propContent]);

  const onChange = (e) => {
    setContent(e.target.value);

    // debounce emitting changes to parent
    if (changeTimer.current) clearTimeout(changeTimer.current);
    changeTimer.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(e.target.value);
        if (onContentChange) onContentChange(parsed);
      } catch (err) {
        // ignore parse errors while typing
      }
    }, 300);

    // debounce sending parsed JSON to collaborators
    if (sendTimer.current) clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(e.target.value);
        client?.send({
          type: "delta",
          payload: {
            project_id: projectId,
            sender_id: user.id,
            content: parsed,
          },
        });
      } catch (err) {
        // ignore parse errors while typing
      }
    }, 300);
  };

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(content);
      if (onSave) await onSave(parsed);
      setSaveMessage("✓ Changes saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      setSaveMessage("✗ Invalid JSON — please correct before saving.");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">Collaborative Editor</div>
        <div className="text-xs text-slate-600">
          Active: {presence?.map((p) => p.full_name).join(", ") || "0"}
        </div>
      </div>
      <textarea
        value={content}
        onChange={onChange}
        rows={24}
        className="w-full p-3 bg-white border rounded font-mono text-sm"
      />
      <div className="flex gap-2 items-center">
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          onClick={handleSave}
        >
          Save
        </button>
        {saveMessage && (
          <span
            className={`text-sm font-medium ${
              saveMessage.includes("✓") ? "text-green-600" : "text-red-600"
            }`}
          >
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}
