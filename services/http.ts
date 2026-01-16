import axios from "axios";

// Base URL
const baseURL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:5000/api/v1";

// Axios instance
const http = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==================== Request Interceptor ====================
http.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==================== Response Interceptor ====================
http.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "Something went wrong";

    if (axios.isAxiosError(error)) {
      message = error.response?.data?.msg || error.message;
    }

    return Promise.reject(new Error(message));
  }
);

export default http;
