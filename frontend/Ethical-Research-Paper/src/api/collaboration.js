class CollabClient {
  constructor(projectId, onMessage) {
    this.projectId = projectId;
    this.onMessage = onMessage;
    this.ws = null;
    this.user = null;
  }

  connect(token, user) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // default backend host/port for dev
    const backendHost = window.location.hostname + ':8000';
    const url = `${proto}://${backendHost}/api/v1/ws/projects/${this.projectId}/edit${token ? `?token=${token}` : ''}`;
    this.ws = new WebSocket(url);
    this.user = user || null;

    this.ws.addEventListener('open', () => {
      this.send({ type: 'join', user_id: user.id, full_name: user.full_name, active_section: null });
    });

    this.ws.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (this.onMessage) this.onMessage(data);
      } catch (e) {}
    });

    this.ws.addEventListener('close', () => {});
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  sendDelta(payload) {
    this.send({ type: 'delta', payload });
  }

  updatePresence(user, active_section, cursor) {
    this.send({ type: 'cursor', user_id: user?.id || null, active_section, cursor });
  }

  disconnect(user) {
    this.send({ type: 'leave', user_id: user?.id || this.user?.id });
    if (this.ws) this.ws.close();
  }
}

export default CollabClient;



const API_URL = "http://localhost:8000";


export async function getProjectMessages(
  projectId,
  token
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}/messages`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to load messages"
    );
  }

  return response.json();
}


export async function getProjectComments(
  projectId,
  token
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}/comments`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to load comments"
    );
  }

  return response.json();
}


export async function createComment(
  projectId,
  data,
  token
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}/comments`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to create comment"
    );
  }

  return response.json();
}