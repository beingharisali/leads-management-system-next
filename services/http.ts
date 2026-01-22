import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:5000/api/v1";

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
    let message = "Something went wrong";
    if (error.response?.data) {
      // Backend aksar 'message' ya 'msg' key bhejta hai, dono handle kar liye
      const data = error.response.data as any;
      message = data.message || data.msg || error.message || message;
    }
    return Promise.reject(new Error(message));
  }
);

export default http;