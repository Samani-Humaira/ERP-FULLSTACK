import React, { useEffect, useState } from 'react';

export default function VersionHistory({ projectId }) {
  const [versions, setVersions] = useState([]);

  const fetchVersions = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/versions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setVersions(await res.json());
  };

  useEffect(() => { fetchVersions(); }, [projectId]);

  const createVersion = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/versions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchVersions();
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Version History</h4>
        <button onClick={createVersion} className="px-3 py-1 bg-slate-800 text-white rounded text-sm">Create Version</button>
      </div>
      <ul className="mt-2 space-y-2">
        {versions.map(v => (
          <li key={v.id} className="p-2 border rounded bg-white">
            <div className="text-sm font-medium">Version {v.version_number}</div>
            <div className="text-xs text-slate-500">by {v.user_id} • {new Date(v.created_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
