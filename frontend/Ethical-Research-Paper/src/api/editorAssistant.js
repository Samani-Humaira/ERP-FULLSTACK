const API_URL = "http://localhost:8000/api/v1";

export async function askEditorAssistant(projectId, payload, token) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}/assistant`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "The editing assistant could not respond.");
  }

  return data;
}