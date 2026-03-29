import pdfplumber
import uuid
import os
from docx import Document as DocxDocument
from rag.chroma_store import embedding_model, collection


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list:
    words  = text.split()
    chunks = []
    step   = chunk_size - overlap
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk.strip())
    return chunks


def ingest_pdf(filepath: str, filename: str) -> int:
    text = ""
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

    if not text.strip():
        return 0

    return _add_chunks(text, filename)


def ingest_docx(filepath: str, filename: str) -> int:
    doc = DocxDocument(filepath)
    text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    if not text.strip():
        return 0
    return _add_chunks(text, filename)


def ingest_txt(filepath: str, filename: str) -> int:
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
    if not text.strip():
        return 0
    return _add_chunks(text, filename)


def ingest_text(content: str, source: str = "manual") -> int:
    if not content.strip():
        return 0
    return _add_chunks(content, source)


def _add_chunks(text: str, source: str) -> int:
    chunks     = chunk_text(text)
    embeddings = embedding_model.encode(chunks).tolist()
    ids        = [str(uuid.uuid4()) for _ in chunks]
    metadatas  = [{"source": source, "chunk": i} for i in range(len(chunks))]

    collection.add(
        embeddings=embeddings,
        documents=chunks,
        ids=ids,
        metadatas=metadatas,
    )
    return len(chunks)


def delete_document(filename: str):
    results = collection.get(where={"source": filename})
    if results["ids"]:
        collection.delete(ids=results["ids"])
