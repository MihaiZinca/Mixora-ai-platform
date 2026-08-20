import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
} from "react-router-dom";

import App from "./App";
import "./index.css";

const originalFetch =
  window.fetch.bind(window);

window.fetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {}
) => {
  const token =
    localStorage.getItem(
      "mixora_access_token"
    );

  const headers = new Headers(
    init.headers
  );

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  const response =
    await originalFetch(
      input,
      {
        ...init,
        headers,
      }
    );

  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

  const isLoginRequest =
    url.includes(
      "/api/auth/login"
    );

  if (
    response.status === 401 &&
    !isLoginRequest
  ) {
    localStorage.removeItem(
      "mixora_access_token"
    );

    localStorage.removeItem(
      "mixora_operator"
    );

    localStorage.removeItem(
      "mixora_session"
    );

    if (
      window.location.pathname !==
      "/login"
    ) {
      window.location.href =
        "/login";
    }
  }

  return response;
};

ReactDOM.createRoot(
  document.getElementById(
    "root"
  )!
).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);