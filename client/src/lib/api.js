import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export function setToken(token) {
  if (token) localStorage.setItem('bm_token', token);
  else localStorage.removeItem('bm_token');
}

export function getToken() {
  return localStorage.getItem('bm_token') || '';
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && getToken()) {
      setToken('');
      window.dispatchEvent(new Event('bm:logout'));
    }
    return Promise.reject(err);
  }
);

export const errMsg = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.message || fallback;

export default api;
