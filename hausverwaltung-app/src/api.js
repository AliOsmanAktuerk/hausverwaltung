async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API-Fehler ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

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

export const systemApi = {
  getStatus: () => request('GET', '/api/system/status'),
};

export const backupApi = {
  getInfo:  () => request('GET',  '/api/backup'),
  create:   () => request('POST', '/api/backup'),
  downloadUrl: () => '/api/backup/download',
};

export const uploadsApi = {
  upload: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/uploads', { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Upload fehlgeschlagen: ${res.status}`);
    return res.json();
  },
  remove: (filename) => request('DELETE', `/api/uploads/${filename}`),
  url: (filename) => `/api/uploads/${filename}`,
};
