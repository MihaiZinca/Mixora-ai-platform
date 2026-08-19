import {
  Bot,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

type SystemStatus = {
  api: string;
  database: string;
  qdrant: string;
};

type ResponseMode = "draft" | "auto";

type ResponseModeResponse = {
  mode: ResponseMode;
};

function Settings() {
  const [status, setStatus] =
    useState<SystemStatus | null>(null);

  const [responseMode, setResponseMode] =
    useState<ResponseMode>("draft");

  const [loading, setLoading] =
    useState(true);

  const [savingMode, setSavingMode] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        statusResponse,
        modeResponse,
      ] = await Promise.all([
        fetch(
          "http://localhost:8000/api/system/status"
        ),
        fetch(
          "http://localhost:8000/api/settings/response-mode"
        ),
      ]);

      if (!statusResponse.ok) {
        throw new Error(
          "Starea sistemului nu a putut fi incarcata."
        );
      }

      if (!modeResponse.ok) {
        throw new Error(
          "Setarile AI nu au putut fi incarcate."
        );
      }

      const statusData: SystemStatus =
        await statusResponse.json();

      const modeData: ResponseModeResponse =
        await modeResponse.json();

      setStatus(statusData);
      setResponseMode(modeData.mode);
    } catch (err) {
      console.error(err);

      setError(
        "Nu s-a putut realiza conexiunea cu serviciile MIXORA."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateResponseMode = async (
    mode: ResponseMode
  ) => {
    try {
      setSavingMode(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        "http://localhost:8000/api/settings/response-mode",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Modul de raspuns nu a putut fi salvat."
        );
      }

      const data: ResponseModeResponse =
        await response.json();

      setResponseMode(data.mode);

      setSuccessMessage(
        data.mode === "draft"
          ? "Modul Draft a fost activat."
          : "Modul Auto Reply a fost activat."
      );
    } catch (err) {
      console.error(err);

      setError(
        "Modul de raspuns nu a putut fi salvat."
      );
    } finally {
      setSavingMode(false);
    }
  };

  const isOnline = (
    value?: string
  ) => {
    return value === "online";
  };

  return (
    <>
      <header className="header">
        <div>
          <p className="eyebrow">
            CONFIGURARE
          </p>

          <h2>
            Settings
          </h2>

          <p className="subtitle">
            Configureaza comportamentul si serviciile platformei MIXORA.
          </p>
        </div>

        <button
          className="secondaryButton"
          onClick={loadSettings}
          disabled={loading}
        >
          <RefreshCw
            className={
              loading ? "spin" : ""
            }
            size={16}
          />

          Reincarca
        </button>
      </header>

      {error && (
        <div className="knowledgeError">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="knowledgeSuccess">
          {successMessage}
        </div>
      )}

      <div className="settingsGrid">
        <section className="settingsPanel">
          <div className="settingsPanelHeader">
            <div className="settingsPanelIcon">
              <Server size={20} />
            </div>

            <div>
              <p className="eyebrow">
                SYSTEM STATUS
              </p>

              <h3>
                Servicii locale
              </h3>
            </div>
          </div>

          <div className="settingsServiceRow">
            <div>
              <Server size={17} />

              <div>
                <strong>
                  FastAPI
                </strong>

                <span>
                  Backend MIXORA
                </span>
              </div>
            </div>

            <span
              className={
                isOnline(status?.api)
                  ? "serviceOnline"
                  : "serviceOffline"
              }
            >
              {isOnline(status?.api)
                ? "Online"
                : "Offline"}
            </span>
          </div>

          <div className="settingsServiceRow">
            <div>
              <Database size={17} />

              <div>
                <strong>
                  PostgreSQL
                </strong>

                <span>
                  Baza de date principala
                </span>
              </div>
            </div>

            <span
              className={
                isOnline(status?.database)
                  ? "serviceOnline"
                  : "serviceOffline"
              }
            >
              {isOnline(status?.database)
                ? "Online"
                : "Offline"}
            </span>
          </div>

          <div className="settingsServiceRow">
            <div>
              <Bot size={17} />

              <div>
                <strong>
                  Qdrant
                </strong>

                <span>
                  Baza vectoriala pentru RAG
                </span>
              </div>
            </div>

            <span
              className={
                isOnline(status?.qdrant)
                  ? "serviceOnline"
                  : "serviceOffline"
              }
            >
              {isOnline(status?.qdrant)
                ? "Online"
                : "Offline"}
            </span>
          </div>
        </section>

        <section className="settingsPanel">
          <div className="settingsPanelHeader">
            <div className="settingsPanelIcon">
              <Settings2 size={20} />
            </div>

            <div>
              <p className="eyebrow">
                AI RESPONSE MODE
              </p>

              <h3>
                Mod raspuns AI
              </h3>
            </div>
          </div>

          <div className="responseModeOptions">
            <button
              className={`responseModeCard ${
                responseMode === "draft"
                  ? "active"
                  : ""
              }`}
              disabled={savingMode}
              onClick={() =>
                updateResponseMode(
                  "draft"
                )
              }
            >
              <div className="responseModeTop">
                <div>
                  <strong>
                    Draft
                  </strong>

                  <span>
                    Recomandat
                  </span>
                </div>

                {responseMode ===
                  "draft" && (
                  <CheckCircle2
                    size={18}
                  />
                )}
              </div>

              <p>
                MIXORA genereaza raspunsul,
                iar operatorul il verifica
                inainte de trimitere.
              </p>
            </button>

            <button
              className={`responseModeCard ${
                responseMode === "auto"
                  ? "active"
                  : ""
              }`}
              disabled={savingMode}
              onClick={() =>
                updateResponseMode(
                  "auto"
                )
              }
            >
              <div className="responseModeTop">
                <div>
                  <strong>
                    Auto Reply
                  </strong>

                  <span>
                    Automat
                  </span>
                </div>

                {responseMode ===
                  "auto" && (
                  <CheckCircle2
                    size={18}
                  />
                )}
              </div>

              <p>
                MIXORA poate raspunde automat
                atunci cand regulile de siguranta
                permit acest lucru.
              </p>
            </button>
          </div>

          <div className="settingsNotice">
            <ShieldCheck size={18} />

            <div>
              <strong>
                Mod curent
              </strong>

              <span>
                {responseMode === "draft"
                  ? "Raspunsurile sunt verificate manual inainte de trimitere."
                  : "Auto Reply este activat in configuratie."}
              </span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default Settings;