import axios from 'axios';

export const http = axios.create({
  baseURL: '',
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  return config;
});

http.interceptors.response.use(
  (resp) => resp,
  (error) => {
    return Promise.reject(error);
  },
);

export default http;
