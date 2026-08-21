import React, { useState } from 'react';

export default function CommentPanel({ projectId, comments = [], onAddComment, client, user }) {
  const [text, setText] = useState('');

  const addComment = async () => {
    if (!text.trim()) return;
    if (onAddComment) {
      await onAddComment({ project_id: projectId, content: text });
      setText('');
    } else {
      // fallback: POST directly and send via client
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ project_id: projectId, content: text }),
      });
      if (res.ok) {
        const created = await res.json();
        client?.send({ type: 'comment_created', payload: created });
        setText('');
      }
    }
  };

  return (
    <div className="mt-4">
      <h4 className="font-semibold">Comments</h4>
      <div className="space-y-2 mt-2">
        {comments.map(c => (
          <div key={c.id} className="p-2 border rounded bg-slate-50">
            <div className="text-sm text-slate-700">{c.content}</div>
            <div className="text-xs text-slate-500">by {c.user_id} • {new Date(c.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={text} onChange={e=>setText(e.target.value)} className="flex-1 p-2 border rounded" placeholder="Add a comment" />
        <button onClick={addComment} className="px-3 py-2 bg-slate-800 text-white rounded">Add</button>
      </div>
    </div>
  );
}
