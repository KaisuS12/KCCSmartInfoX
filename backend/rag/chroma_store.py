import chromadb
from sentence_transformers import SentenceTransformer

# Single shared instances — prevents SQLite lock conflicts when both
# ingestion.py and pipeline.py access the same ChromaDB directory.
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
chroma_client   = chromadb.PersistentClient(path="./knowledge_base/vectorstore")
collection      = chroma_client.get_or_create_collection("kcc_knowledge")
