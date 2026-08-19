import {
  CheckCircle2,
  FileText,
  RefreshCw,
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
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:8000/api/knowledge"
      );

      if (!response.ok) {
        throw new Error("Documentele nu au putut fi încărcate.");
      }

      const data: KnowledgeDocument[] =
        await response.json();

      setDocuments(data);
    } catch (err) {
      console.error(err);
      setError(
        "Nu s-a putut realiza conexiunea cu baza de cunoștințe."
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

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "http://localhost:8000/api/knowledge/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.detail || "Documentul nu a putut fi încărcat."
        );
      }

      const created: KnowledgeDocument =
        await response.json();

      setDocuments((current) => [
        created,
        ...current,
      ]);
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Documentul nu a putut fi încărcat.");
      }
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="pageState">
        <RefreshCw className="spin" size={24} />
        <span>Se încarcă baza de cunoștințe...</span>
      </div>
    );
  }

  return (
    <>
      <header className="header">
        <div>
          <p className="eyebrow">RAG</p>

          <h2>Bază de cunoștințe</h2>

          <p className="subtitle">
            Documentele interne ale companiei folosite de MIXORA
            pentru generarea răspunsurilor.
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
            ? "Se încarcă..."
            : "Încarcă document"}
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

      <div className="knowledgeUploadCard">
        <div className="knowledgeUploadIcon">
          <Upload size={28} />
        </div>

        <h3>Construiește baza de cunoștințe a companiei</h3>

        <p>
          Încarcă politici interne, fișiere FAQ, informații despre
          produse și documentație pentru echipa de suport.
        </p>

        <span>Formate acceptate momentan: TXT și MD</span>
      </div>

      <div className="knowledgeHeader">
        <div>
          <p className="eyebrow">DOCUMENTE</p>
          <h3>Fișiere disponibile</h3>
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

            <strong>Nu există documente</strong>

            <span>
              Încarcă primul document al companiei.
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
                <strong>{document.filename}</strong>

                <span>
                  {document.file_type.toUpperCase()}
                </span>
              </div>

              <div className="knowledgeStatus">
                <CheckCircle2 size={15} />
                Pregătit
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default Knowledge;