import os
import logging
import chromadb
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("kccsmartinfox.chroma_store")

# Single shared instances — prevents SQLite lock conflicts when both
# ingestion.py and pipeline.py access the same ChromaDB directory.
try:
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
except Exception as e:
    # No internet / DNS failure reaching huggingface.co — fall back to the
    # already-downloaded local cache instead of crashing the server.
    logger.warning("Hugging Face Hub unreachable (%s) — loading model from local cache only", e)
    os.environ["HF_HUB_OFFLINE"] = "1"
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

chroma_client   = chromadb.PersistentClient(path="./knowledge_base/vectorstore")
collection      = chroma_client.get_or_create_collection("kcc_knowledge")
