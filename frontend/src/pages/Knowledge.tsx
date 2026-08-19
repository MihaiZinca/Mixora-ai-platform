import {
  CheckCircle2,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type KnowledgeDocument = {
  id: number;
  filename: string;
  title: string;
  file_type: string;
  status: string;
  created_at: string;
};

function Knowledge() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:8000/api/knowledge"
      );

      if (!response.ok) {
        throw new Error(
          "Documentele nu au putut fi incarcate."
        );
      }

      const data: KnowledgeDocument[] =
        await response.json();

      setDocuments(data);
    } catch (err) {
      console.error(err);

      setError(
        "Nu s-a putut realiza conexiunea cu serverul MIXORA."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const uploadFile = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccessMessage("");

      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        "http://localhost:8000/api/knowledge/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      let responseData: {
        detail?: string;
      } = {};

      try {
        responseData = await response.json();
      } catch {
        responseData = {};
      }

      if (response.status === 409) {
        setError(
          "Documentul exista deja in baza de cunostinte."
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          responseData.detail ||
            "Documentul nu a putut fi incarcat."
        );
      }

      const created =
        responseData as KnowledgeDocument;

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
        err.message === "Failed to fetch"
      ) {
        setError(
          "Nu s-a putut realiza conexiunea cu serverul MIXORA. Verifica daca backend-ul este pornit."
        );

        return;
      }

      if (err instanceof Error) {
        setError(err.message);

        return;
      }

      setError(
        "A aparut o eroare la incarcarea documentului."
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const deleteDocument = async (
    document: KnowledgeDocument
  ) => {
    const confirmed = window.confirm(
      `Sigur vrei sa stergi documentul "${document.filename}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(document.id);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `http://localhost:8000/api/knowledge/${document.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        let message =
          "Documentul nu a putut fi sters.";

        try {
          const data = await response.json();

          if (data.detail) {
            message = data.detail;
          }
        } catch {
          // Ignoram daca raspunsul nu este JSON.
        }

        throw new Error(message);
      }

      setDocuments((current) =>
        current.filter(
          (item) =>
            item.id !== document.id
        )
      );

      setSuccessMessage(
        `Documentul "${document.filename}" a fost sters cu succes.`
      );
    } catch (err) {
      console.error(err);

      if (
        err instanceof TypeError &&
        err.message === "Failed to fetch"
      ) {
        setError(
          "Nu s-a putut realiza conexiunea cu serverul MIXORA. Verifica daca backend-ul este pornit."
        );

        return;
      }

      if (err instanceof Error) {
        setError(err.message);

        return;
      }

      setError(
        "A aparut o eroare la stergerea documentului."
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
          Formate acceptate: TXT si MD
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
        {documents.length === 0 ? (
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
          documents.map((document) => (
            <div
              className="knowledgeDocument"
              key={document.id}
            >
              <div className="knowledgeFileIcon">
                <FileText size={20} />
              </div>

              <div className="knowledgeFileInfo">
                <strong>
                  {document.filename}
                </strong>

                <span>
                  {document.file_type.toUpperCase()}
                </span>
              </div>

              <div className="knowledgeStatus">
                <CheckCircle2 size={15} />

                {document.status === "indexed"
                  ? "Indexat"
                  : "Pregatit"}
              </div>

              <button
                className="knowledgeDeleteButton"
                onClick={() =>
                  deleteDocument(document)
                }
                disabled={
                  deletingId === document.id
                }
                title="Sterge documentul"
              >
                {deletingId === document.id ? (
                  <RefreshCw
                    className="spin"
                    size={16}
                  />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default Knowledge;