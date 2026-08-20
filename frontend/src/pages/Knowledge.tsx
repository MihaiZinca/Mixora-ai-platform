import {
  CheckCircle2,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
} from "react";

type KnowledgeDocument = {
  id: number;
  filename: string;
  title: string;
  file_type: string;
  status: string;
  created_at: string;
};

async function getApiErrorMessage(
  response: Response,
  fallback: string
) {
  try {
    const data = await response.json();

    if (
      typeof data?.detail === "string"
    ) {
      return data.detail;
    }
  } catch {
    // Raspuns non-JSON.
  }

  return fallback;
}

function Knowledge() {
  const [documents, setDocuments] =
    useState<KnowledgeDocument[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const loadDocuments = async (
    silent = false
  ) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        "http://localhost:8000/api/knowledge"
      );

      if (!response.ok) {
        const message =
          await getApiErrorMessage(
            response,
            "Documentele nu au putut fi incarcate."
          );

        throw new Error(message);
      }

      const data:
        KnowledgeDocument[] =
        await response.json();

      setDocuments(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Nu s-a putut realiza conexiunea cu serverul MIXORA."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const uploadFile = async (
    event:
      ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedExtensions = [
      ".txt",
      ".md",
    ];

    const filename =
      file.name.toLowerCase();

    const validExtension =
      allowedExtensions.some(
        (extension) =>
          filename.endsWith(
            extension
          )
      );

    if (!validExtension) {
      setError(
        "Sunt acceptate doar fisiere TXT si MD."
      );

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    const maxFileSize =
      1 * 1024 * 1024;

    if (file.size > maxFileSize) {
      setError(
        "Fisierul este prea mare. Dimensiunea maxima permisa este 1 MB."
      );

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    if (file.size === 0) {
      setError(
        "Fisierul selectat este gol."
      );

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccessMessage("");

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response = await fetch(
        "http://localhost:8000/api/knowledge/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const message =
          await getApiErrorMessage(
            response,
            "Documentul nu a putut fi incarcat."
          );

        throw new Error(message);
      }

      const created:
        KnowledgeDocument =
        await response.json();

      setDocuments((current) => [
        created,
        ...current,
      ]);

      setSuccessMessage(
        `Documentul "${created.filename}" a fost incarcat si indexat cu succes.`
      );
    } catch (err) {
      console.error(err);

      if (
        err instanceof TypeError &&
        err.message ===
          "Failed to fetch"
      ) {
        setError(
          "Nu s-a putut realiza conexiunea cu serverul MIXORA. Verifica daca backend-ul este pornit."
        );

        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "A aparut o eroare la incarcarea documentului."
      );
    } finally {
      setUploading(false);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }
  };

  const deleteDocument = async (
    document:
      KnowledgeDocument
  ) => {
    const confirmed =
      window.confirm(
        `Sigur vrei sa stergi documentul "${document.filename}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        document.id
      );

      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `http://localhost:8000/api/knowledge/${document.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const message =
          await getApiErrorMessage(
            response,
            "Documentul nu a putut fi sters."
          );

        throw new Error(message);
      }

      setDocuments(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              document.id
          )
      );

      setSuccessMessage(
        `Documentul "${document.filename}" a fost sters cu succes.`
      );
    } catch (err) {
      console.error(err);

      if (
        err instanceof TypeError &&
        err.message ===
          "Failed to fetch"
      ) {
        setError(
          "Nu s-a putut realiza conexiunea cu serverul MIXORA. Verifica daca backend-ul este pornit."
        );

        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "A aparut o eroare la stergerea documentului."
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="pageState">
        <RefreshCw
          className="spin"
          size={24}
        />

        <span>
          Se incarca baza de cunostinte...
        </span>
      </div>
    );
  }

  return (
    <>
      <header className="header">
        <div>
          <p className="eyebrow">
            RAG
          </p>

          <h2>
            Knowledge Base
          </h2>

          <p className="subtitle">
            Documentele interne folosite de MIXORA
            pentru generarea raspunsurilor.
          </p>
        </div>

        <div className="headerActions">
          <button
            className="secondaryButton"
            onClick={() =>
              loadDocuments(true)
            }
            disabled={
              refreshing ||
              uploading
            }
          >
            <RefreshCw
              className={
                refreshing
                  ? "spin"
                  : ""
              }
              size={16}
            />

            {refreshing
              ? "Se reincarca..."
              : "Reincarca"}
          </button>

          <button
            className="primaryButton"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={uploading}
          >
            {uploading ? (
              <RefreshCw
                className="spin"
                size={16}
              />
            ) : (
              <Upload size={16} />
            )}

            {uploading
              ? "Se incarca..."
              : "Incarca document"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md"
          onChange={uploadFile}
          hidden
        />
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

      <div className="knowledgeUploadCard">
        <div className="knowledgeUploadIcon">
          <Upload size={28} />
        </div>

        <h3>
          Construieste baza de cunostinte a companiei
        </h3>

        <p>
          Incarca politici interne, FAQ-uri,
          informatii despre produse si documentatie
          folosita de echipa de suport.
        </p>

        <span>
          Formate acceptate: TXT si MD · Maximum 1 MB
        </span>
      </div>

      <div className="knowledgeHeader">
        <div>
          <p className="eyebrow">
            DOCUMENTE
          </p>

          <h3>
            Fisiere indexate
          </h3>
        </div>

        <span>
          {documents.length}{" "}
          {documents.length === 1
            ? "document"
            : "documente"}
        </span>
      </div>

      <div className="knowledgeDocuments">
        {documents.length ===
        0 ? (
          <div className="emptyKnowledge">
            <FileText size={30} />

            <strong>
              Nu exista documente
            </strong>

            <span>
              Incarca primul document al companiei.
            </span>
          </div>
        ) : (
          documents.map(
            (document) => (
              <div
                className="knowledgeDocument"
                key={document.id}
              >
                <div className="knowledgeFileIcon">
                  <FileText
                    size={20}
                  />
                </div>

                <div className="knowledgeFileInfo">
                  <strong>
                    {document.filename}
                  </strong>

                  <span>
                    {document.file_type.toUpperCase()}
                  </span>
                </div>

                <div
                  className={`knowledgeStatus ${
                    document.status ===
                    "indexed"
                      ? ""
                      : "knowledgeStatusPending"
                  }`}
                >
                  <CheckCircle2
                    size={15}
                  />

                  {document.status ===
                  "indexed"
                    ? "Indexat"
                    : document.status ===
                      "error"
                    ? "Eroare"
                    : "Pregatit"}
                </div>

                <button
                  className="knowledgeDeleteButton"
                  onClick={() =>
                    deleteDocument(
                      document
                    )
                  }
                  disabled={
                    deletingId ===
                    document.id
                  }
                  title="Sterge documentul"
                >
                  {deletingId ===
                  document.id ? (
                    <RefreshCw
                      className="spin"
                      size={16}
                    />
                  ) : (
                    <Trash2
                      size={16}
                    />
                  )}
                </button>
              </div>
            )
          )
        )}
      </div>
    </>
  );
}

export default Knowledge;