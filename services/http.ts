import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const baseURL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:5001/api/v1";

const http = axios.create({
  baseURL,
  // Yahan se static Content-Type hata diya hai taake Axios khud detect kare
  timeout: 15000,
});

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Auth Token logic
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    /* IMPORTANT FIX: 
       Agar data FormData hai (jaisa bulk upload mein hota hai), 
       toh manual 'application/json' header ko delete kar dena chahiye 
       taake browser sahi 'boundary' set kar sakay.
    */
    if (config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers["Content-Type"];
      }
    } else if (!config.headers["Content-Type"]) {
      // Baki sab normal requests ke liye JSON default rakhein
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Keep the original AxiosError (so `err.response` / status stay
    // available) and put a human-readable message on `err.message`.
    error.message = messageFromAxiosError(error);
    return Promise.reject(error);
  }
);

// Server's own message if it sent one, otherwise a message that says what
// actually went wrong (offline, timeout, server crash...).
function messageFromAxiosError(error: AxiosError): string {
  const data = error.response?.data as any;
  const serverMsg =
    typeof data === "string" ? data : data?.msg || data?.message || data?.error;
  if (serverMsg && typeof serverMsg === "string") return serverMsg;

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return "The server took too long to respond. Please try again.";
  }
  if (!error.response) {
    return "Cannot reach the server. Check your internet connection and try again.";
  }

  switch (error.response.status) {
    case 400: return "The request was invalid. Please check the details and try again.";
    case 401: return "Your session has expired. Please log in again.";
    case 403: return "You do not have permission to perform this action.";
    case 404: return "The requested item was not found.";
    case 409: return "This record already exists.";
    case 413: return "The file is too large to upload.";
    default:
      return error.response.status >= 500
        ? "Something went wrong on the server. Please try again later."
        : "Something went wrong. Please try again.";
  }
}

/**
 * Message to show for any caught error. Errors from `http` already carry
 * the server's message; `fallback` is only used when there is none.
 */
export const getErrorMessage = (err: unknown, fallback = "Something went wrong. Please try again."): string =>
  (err instanceof Error && err.message) ? err.message : fallback;

export default http;