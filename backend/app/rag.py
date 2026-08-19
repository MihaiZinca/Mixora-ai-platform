from fastembed import TextEmbedding
from qdrant_client import QdrantClient, models

from app.config import settings


COLLECTION_NAME = "mixora_knowledge"

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


client = QdrantClient(
    url=settings.qdrant_url,
)


embedding_model = TextEmbedding(
    model_name=EMBEDDING_MODEL,
)


def ensure_collection():
    collections = client.get_collections().collections

    collection_names = {
        collection.name
        for collection in collections
    }

    if COLLECTION_NAME in collection_names:
        return

    test_vector = list(
        embedding_model.embed(
            ["test"]
        )
    )[0]

    vector_size = len(test_vector)

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(
            size=vector_size,
            distance=models.Distance.COSINE,
        ),
    )


def chunk_text(
    text: str,
    chunk_size: int = 700,
    overlap: int = 100,
) -> list[str]:
    clean_text = text.strip()

    if not clean_text:
        return []

    chunks = []

    start = 0

    while start < len(clean_text):
        end = start + chunk_size

        chunk = clean_text[start:end]

        chunks.append(
            chunk.strip()
        )

        start += chunk_size - overlap

    return [
        chunk
        for chunk in chunks
        if chunk
    ]


def index_document(
    document_id: int,
    filename: str,
    title: str,
    content: str,
):
    ensure_collection()

    chunks = chunk_text(
        content
    )

    if not chunks:
        return

    vectors = list(
        embedding_model.embed(
            chunks
        )
    )

    points = []

    for index, (
        chunk,
        vector,
    ) in enumerate(
        zip(
            chunks,
            vectors,
        )
    ):
        point_id = (
            document_id * 100000
            + index
        )

        points.append(
            models.PointStruct(
                id=point_id,
                vector=vector.tolist(),
                payload={
                    "document_id": document_id,
                    "filename": filename,
                    "title": title,
                    "chunk_index": index,
                    "text": chunk,
                },
            )
        )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
        wait=True,
    )


def delete_document_vectors(
    document_id: int,
):
    ensure_collection()

    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(
                            value=document_id
                        ),
                    )
                ]
            )
        ),
        wait=True,
    )


def search_knowledge(
    query: str,
    limit: int = 3,
) -> list[dict]:
    ensure_collection()

    query_vector = list(
        embedding_model.embed(
            [query]
        )
    )[0]

    result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector.tolist(),
        limit=limit,
        with_payload=True,
    )

    hits = []

    for point in result.points:
        payload = point.payload or {}

        hits.append(
            {
                "score": point.score,
                "document_id": payload.get(
                    "document_id"
                ),
                "filename": payload.get(
                    "filename"
                ),
                "title": payload.get(
                    "title"
                ),
                "text": payload.get(
                    "text"
                ),
            }
        )

    return hits