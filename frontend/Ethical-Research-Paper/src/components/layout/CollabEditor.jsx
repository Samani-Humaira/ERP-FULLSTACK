// import React, { useEffect, useState, useRef } from "react";

// export default function CollabEditor({
//   projectId,
//   content: propContent,
//   client,
//   user,
//   onSave,
//   onContentChange,
//   presence,
// }) {
//   const [content, setContent] = useState(
//     JSON.stringify(propContent || {}, null, 2)
//   );

//   const [commitMessage, setCommitMessage] = useState("");

//   const [saveMessage, setSaveMessage] = useState("");

//   const sendTimer = useRef(null);
//   const changeTimer = useRef(null);

//   useEffect(() => {
//     setContent(JSON.stringify(propContent || {}, null, 2));
//   }, [propContent]);

//   const onChange = (e) => {
//     const value = e.target.value;

//     setContent(value);

//     // Update parent after user stops typing
//     if (changeTimer.current) {
//       clearTimeout(changeTimer.current);
//     }

//     changeTimer.current = setTimeout(() => {
//       try {
//         const parsed = JSON.parse(value);

//         if (onContentChange) {
//           onContentChange(parsed);
//         }
//       } catch (err) {
//         // Ignore invalid JSON while typing
//       }
//     }, 300);

//     // Send collaboration update
//     if (sendTimer.current) {
//       clearTimeout(sendTimer.current);
//     }

//     sendTimer.current = setTimeout(() => {
//       try {
//         const parsed = JSON.parse(value);

//         client?.send({
//           type: "delta",
//           payload: {
//             project_id: projectId,
//             sender_id: user?.id,
//             content: parsed,
//           },
//         });
//       } catch (err) {
//         // Ignore invalid JSON while typing
//       }
//     }, 300);
//   };

//   const handleSave = async () => {
//     try {
//       const parsed = JSON.parse(content);

//       // Default commit message if user leaves it empty
//       const finalCommitMessage =
//         commitMessage.trim() || "Updated project content";

//       if (!onSave) {
//         throw new Error("Save handler is not configured.");
//       }

//       await onSave({
//         content: parsed,
//         commit_message: finalCommitMessage,
//       });

//       setSaveMessage("✓ Changes saved successfully!");

//       // Clear commit message after successful save
//       setCommitMessage("");

//       setTimeout(() => {
//         setSaveMessage("");
//       }, 3000);
//     } catch (err) {
//       console.error("Save failed:", err);

//       setSaveMessage(
//         err.message === "Unexpected end of JSON input"
//           ? "✗ Invalid JSON — please correct it before saving."
//           : `✗ ${err.message || "Failed to save changes."}`
//       );

//       setTimeout(() => {
//         setSaveMessage("");
//       }, 3000);
//     }
//   };

//   return (
//     <div className="space-y-3 w-full">

//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div className="text-sm text-slate-500">
//           Collaborative Editor
//         </div>

//         <div className="text-xs text-slate-600">
//           Active:{" "}
//           {presence?.map((p) => p.full_name).join(", ") || "0"}
//         </div>
//       </div>

//       {/* Editor */}
//       <textarea
//         value={content}
//         onChange={onChange}
//         rows={24}
//         className="w-full p-3 bg-white border rounded font-mono text-sm"
//       />

//       {/* Commit message */}
//       <div>
//         <label className="block text-sm font-medium text-slate-700 mb-1">
//           Commit message
//         </label>

//         <input
//           type="text"
//           value={commitMessage}
//           onChange={(e) => setCommitMessage(e.target.value)}
//           placeholder="Describe what you changed..."
//           className="w-full p-2 border rounded text-sm"
//         />

//         <p className="mt-1 text-xs text-slate-400">
//           Leave empty to use "Updated project content"
//         </p>
//       </div>

//       {/* Save */}
//       <div className="flex gap-2 items-center">
//         <button
//           className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
//           onClick={handleSave}
//         >
//           Save
//         </button>

//         {saveMessage && (
//           <span
//             className={`text-sm font-medium ${
//               saveMessage.includes("✓")
//                 ? "text-green-600"
//                 : "text-red-600"
//             }`}
//           >
//             {saveMessage}
//           </span>
//         )}
//       </div>
//     </div>
//   );
// }


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
    JSON.stringify(propContent || {}, null, 2)
  );

  const [commitMessage, setCommitMessage] = useState("");

  const [saveMessage, setSaveMessage] = useState("");

  const sendTimer = useRef(null);
  const changeTimer = useRef(null);

  useEffect(() => {
    setContent(JSON.stringify(propContent || {}, null, 2));
  }, [propContent]);

  const onChange = (e) => {
    const value = e.target.value;

    setContent(value);

    // Update parent after user stops typing
    if (changeTimer.current) {
      clearTimeout(changeTimer.current);
    }

    changeTimer.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(value);

        if (onContentChange) {
          onContentChange(parsed);
        }
      } catch (err) {
        // Ignore invalid JSON while typing
      }
    }, 300);

    // Send collaboration update
    if (sendTimer.current) {
      clearTimeout(sendTimer.current);
    }

    sendTimer.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(value);

        client?.send({
          type: "delta",
          payload: {
            project_id: projectId,
            sender_id: user?.id,
            content: parsed,
          },
        });
      } catch (err) {
        // Ignore invalid JSON while typing
      }
    }, 300);
  };

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(content);

      // Default commit message if user leaves it empty
      const finalCommitMessage =
        commitMessage.trim() || "Updated project content";

      if (!onSave) {
        throw new Error("Save handler is not configured.");
      }

      await onSave({
        content: parsed,
        commit_message: finalCommitMessage,
      });

      setSaveMessage("✓ Changes saved successfully!");

      // Clear commit message after successful save
      setCommitMessage("");

      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
    } catch (err) {
      console.error("Save failed:", err);

      setSaveMessage(
        err.message === "Unexpected end of JSON input"
          ? "✗ Invalid JSON — please correct it before saving."
          : `✗ ${err.message || "Failed to save changes."}`
      );

      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
    }
  };

  return (
    <div className="space-y-3 w-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Collaborative Editor
        </div>

        <div className="text-xs text-slate-600">
          Active:{" "}
          {presence?.map((p) => p.full_name).join(", ") || "0"}
        </div>
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={onChange}
        rows={24}
        className="w-full p-3 bg-white border rounded font-mono text-sm"
      />

      {/* Commit message */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Commit message
        </label>

        <input
          type="text"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Describe what you changed..."
          className="w-full p-2 border rounded text-sm"
        />

        <p className="mt-1 text-xs text-slate-400">
          Add commit message!!!
        </p>
      </div>

      {/* Save */}
      <div className="flex gap-2 items-center">
        <button
          className={`px-3 py-2 rounded transition ${
            commitMessage.trim()
              ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              : "bg-slate-300 text-slate-500 cursor-not-allowed"
          }`}
          onClick={handleSave}
          disabled={!commitMessage.trim()}
        >
          Save
        </button>

        {saveMessage && (
          <span
            className={`text-sm font-medium ${
              saveMessage.includes("✓")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}
