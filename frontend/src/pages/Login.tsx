import {
  Bot,
  Eye,
  EyeOff,
  LogIn,
  RefreshCw,
} from "lucide-react";

import {
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

type LoginProps = {
  onLogin: () => void;
};

type LoginResponse = {
  access_token: string;
  token_type: string;
  operator_name: string;
};

function Login({
  onLogin,
}: LoginProps) {
  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    const cleanUsername =
      username.trim();

    if (
      !cleanUsername ||
      !password
    ) {
      setError(
        "Completeaza utilizatorul si parola."
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:8000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            username:
              cleanUsername,
            password,
          }),
        }
      );

      if (!response.ok) {
        let message =
          "Autentificarea a esuat.";

        try {
          const data =
            await response.json();

          if (
            typeof data.detail ===
            "string"
          ) {
            message =
              data.detail;
          }
        } catch {
          // Raspuns non-JSON.
        }

        throw new Error(
          message
        );
      }

      const data:
        LoginResponse =
        await response.json();

      localStorage.setItem(
        "mixora_access_token",
        data.access_token
      );

      localStorage.setItem(
        "mixora_operator",
        data.operator_name
      );

      localStorage.setItem(
        "mixora_session",
        "authenticated"
      );

      setPassword("");

      onLogin();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Autentificarea a esuat."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginBrand">
          <div className="logoIcon">
            <Bot size={24} />
          </div>

          <div>
            <h1>
              MIXORA
            </h1>

            <span>
              AI Customer Operations
            </span>
          </div>
        </div>

        <div className="loginHeading">
          <p className="eyebrow">
            OPERATOR ACCESS
          </p>

          <h2>
            Autentificare
          </h2>

          <p>
            Conecteaza-te pentru
            a accesa platforma
            MIXORA.
          </p>
        </div>

        {error && (
          <div className="loginError">
            {error}
          </div>
        )}

        <form
          className="loginForm"
          onSubmit={
            handleSubmit
          }
        >
          <div className="formGroup">
            <label>
              Utilizator
            </label>

            <input
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value
                )
              }
              placeholder="Introdu utilizatorul"
              autoComplete="username"
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className="formGroup">
            <label>
              Parola
            </label>

            <div className="passwordInput">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Introdu parola"
                autoComplete="current-password"
                disabled={loading}
                maxLength={255}
              />

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
                title={
                  showPassword
                    ? "Ascunde parola"
                    : "Afiseaza parola"
                }
              >
                {showPassword ? (
                  <EyeOff
                    size={16}
                  />
                ) : (
                  <Eye
                    size={16}
                  />
                )}
              </button>
            </div>
          </div>

          <button
            className="primaryButton loginButton"
            type="submit"
            disabled={
              loading ||
              !username.trim() ||
              !password
            }
          >
            {loading ? (
              <RefreshCw
                className="spin"
                size={16}
              />
            ) : (
              <LogIn size={16} />
            )}

            {loading
              ? "Se autentifica..."
              : "Autentificare"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;