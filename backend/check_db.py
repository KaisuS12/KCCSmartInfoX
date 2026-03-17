import chromadb
import sys

client = chromadb.PersistentClient(path="./knowledge_base/vectorstore")
col = client.get_or_create_collection("kcc_knowledge")
count = col.count()
print(f"Total chunks in ChromaDB: {count}")

if count > 0:
    res = col.get(limit=10, include=["documents", "metadatas"])
    for doc, meta in zip(res["documents"], res["metadatas"]):
        print(f"  Source: {meta.get('source')} | {doc[:80]}")
