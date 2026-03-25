const BASE = 'http://localhost:8000/api/v1';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function logActivity(type, title) {
  try {
    await fetch(
      `${BASE}/dashboard/activity?type=${encodeURIComponent(type)}&title=${encodeURIComponent(title)}`,
      {
        method: 'POST',
        headers: authHeaders(),
      }
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

export async function getDashboard() {
  const res = await fetch(`${BASE}/dashboard`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}