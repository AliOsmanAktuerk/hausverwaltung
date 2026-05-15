function getToken() {
  return localStorage.getItem('auth_token');
}

async function request(method, url, body) {
  const token = getToken();
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.reload();
    throw new Error('Sitzung abgelaufen');
  }
  if (!res.ok) throw new Error(`API-Fehler ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

export const authApi = {
  login:          (username, password) => request('POST', '/api/auth/login', { username, password }),
  verify:         () => request('GET', '/api/auth/verify'),
  changePassword: (currentPassword, newPassword) => request('PUT', '/api/auth/password', { currentPassword, newPassword }),
  getUsers:       () => request('GET', '/api/auth/users'),
  createUser:     (username, password) => request('POST', '/api/auth/users', { username, password }),
  deleteUser:     (id) => request('DELETE', `/api/auth/users/${id}`),
};

export const personsApi = {
  getAll: () => request('GET', '/api/persons'),
  create: (data) => request('POST', '/api/persons', data),
  update: (id, data) => request('PUT', `/api/persons/${id}`, data),
  remove: (id) => request('DELETE', `/api/persons/${id}`),
};

export const productsApi = {
  getAll: () => request('GET', '/api/products'),
  create: (data) => request('POST', '/api/products', data),
  update: (id, data) => request('PUT', `/api/products/${id}`, data),
  remove: (id) => request('DELETE', `/api/products/${id}`),
};

export const expensesApi = {
  getAll: () => request('GET', '/api/expenses'),
  create: (data) => request('POST', '/api/expenses', data),
  update: (id, data) => request('PUT', `/api/expenses/${id}`, data),
  remove: (id) => request('DELETE', `/api/expenses/${id}`),
};

export const hoursApi = {
  getAll: () => request('GET', '/api/hours'),
  create: (data) => request('POST', '/api/hours', data),
  update: (id, data) => request('PUT', `/api/hours/${id}`, data),
  remove: (id) => request('DELETE', `/api/hours/${id}`),
};

export const systemApi = {
  getStatus: () => request('GET', '/api/system/status'),
};

export const backupApi = {
  getInfo:     () => request('GET',  '/api/backup'),
  create:      () => request('POST', '/api/backup'),
  downloadUrl: () => '/api/backup/download',
};

export const integrityApi = {
  verify: () => request('GET', '/api/integrity/verify'),
};

export const uploadsApi = {
  upload: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch('/api/uploads', { method: 'POST', body: form, headers });
    if (res.status === 401) { localStorage.removeItem('auth_token'); window.location.reload(); }
    if (!res.ok) throw new Error(`Upload fehlgeschlagen: ${res.status}`);
    return res.json();
  },
  remove: (filename) => request('DELETE', `/api/uploads/${filename}`),
  url: (filename) => `/api/uploads/${filename}`,
};
