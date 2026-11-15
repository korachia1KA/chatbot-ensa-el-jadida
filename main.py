"""API de l'assistant ENSAJ : RAG (Chroma + Ollama), agent LangGraph, transcription Whisper."""
import os
import tempfile
import threading
from typing import List, TypedDict

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from langchain_chroma import Chroma
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import END, StateGraph
from pydantic import BaseModel

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE, "data")
DB_DIR = os.path.join(BASE, "chroma_db")
AVATAR = os.path.join(BASE, "assets", "mon_avatar.glb")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.2")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")

SYSTEM = (
    "Tu es l'assistant virtuel de l'ENSA d'El Jadida (ENSAJ). Réponds en français, "
    "de façon claire, courtoise et concise. Appuie-toi uniquement sur le contexte fourni ; "
    "si l'information n'y figure pas, dis-le simplement et invite à contacter l'administration."
)

app = FastAPI(title="Assistant ENSAJ")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

state = {"llm": None, "db": None, "graph": None, "whisper": None}
lock = threading.Lock()


class ChatIn(BaseModel):
    question: str
    history: List[dict] = []


class AgentState(TypedDict):
    question: str
    history: str
    answer: str
    sources: list


def load_documents():
    texts, metas = [], []
    if not os.path.isdir(DATA_DIR):
        os.makedirs(DATA_DIR)
    for name in sorted(os.listdir(DATA_DIR)):
        path = os.path.join(DATA_DIR, name)
        try:
            if name.endswith(".txt"):
                with open(path, encoding="utf-8") as f:
                    texts.append(f.read())
            elif name.endswith(".csv"):
                texts.append(pd.read_csv(path).to_string(index=False))
            else:
                continue
            metas.append({"source": name})
        except Exception as e:  # fichier illisible : on continue
            print(f"[data] {name} ignoré : {e}")
    return texts, metas


def build_db(embeddings):
    texts, metas = load_documents()
    if not texts:
        return None
    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    chunks = splitter.create_documents(texts, metadatas=metas)
    return Chroma.from_documents(chunks, embeddings, persist_directory=DB_DIR)


def build_graph():
    llm = state["llm"]

    def router(s):
        q = s["question"].lower().strip()
        if len(q) < 25 and any(w in q for w in ("bonjour", "salut", "merci", "ça va", "ca va", "bonsoir", "au revoir")):
            return "chat"
        res = llm.invoke(
            f"Message : {s['question']}\nSi c'est une simple salutation ou un remerciement réponds CHAT, sinon RAG."
        ).content.upper()
        return "chat" if "CHAT" in res and "RAG" not in res else "rag"

    def rag(s):
        docs = state["db"].similarity_search(s["question"], k=4) if state["db"] else []
        ctx = "\n---\n".join(d.page_content for d in docs)
        prompt = (
            f"{SYSTEM}\n\nHistorique :\n{s['history']}\n\nContexte :\n{ctx}\n\n"
            f"Question : {s['question']}\nRéponse :"
        )
        sources = [
            {"source": d.metadata.get("source", "base documentaire"), "excerpt": d.page_content[:260].strip()}
            for d in docs
        ]
        return {"answer": llm.invoke(prompt).content, "sources": sources}

    def chat(s):
        return {"answer": llm.invoke(f"{SYSTEM}\n\nRéponds brièvement à : {s['question']}").content, "sources": []}

    wf = StateGraph(AgentState)
    wf.add_node("rag", rag)
    wf.add_node("chat", chat)
    wf.set_conditional_entry_point(router, {"rag": "rag", "chat": "chat"})
    wf.add_edge("rag", END)
    wf.add_edge("chat", END)
    return wf.compile()


@app.post("/api/init")
def init():
    with lock:
        if state["graph"] is None:
            try:
                embeddings = OllamaEmbeddings(model=EMBED_MODEL)
                state["llm"] = ChatOllama(model=LLM_MODEL, temperature=0)
                if os.path.isdir(DB_DIR) and os.listdir(DB_DIR):
                    state["db"] = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
                else:
                    state["db"] = build_db(embeddings)
                state["graph"] = build_graph()
            except Exception as e:
                raise HTTPException(500, f"Ollama indisponible ou modèle manquant ({LLM_MODEL}, {EMBED_MODEL}) : {e}")
    return {"ready": True, "documents": state["db"] is not None, "model": LLM_MODEL}


@app.post("/api/chat")
def chat(body: ChatIn):
    if state["graph"] is None:
        raise HTTPException(503, "Le moteur n'est pas démarré.")
    hist = "\n".join(f"{m.get('role')}: {m.get('content')}" for m in body.history[-6:])
    try:
        out = state["graph"].invoke({"question": body.question, "history": hist, "answer": "", "sources": []})
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"answer": out["answer"].strip(), "sources": out.get("sources", [])}


@app.post("/api/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    import whisper  # import tardif : démarrage plus rapide

    if state["whisper"] is None:
        state["whisper"] = whisper.load_model(WHISPER_MODEL)
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(await audio.read())
        path = tmp.name
    try:
        text = state["whisper"].transcribe(path, language="fr")["text"].strip()
    except Exception as e:
        raise HTTPException(500, f"Transcription impossible (ffmpeg installé ?) : {e}")
    finally:
        os.remove(path)
    return {"text": text}


@app.post("/api/reindex")
def reindex():
    """Reconstruit la base vectorielle à partir du dossier data/."""
    with lock:
        embeddings = OllamaEmbeddings(model=EMBED_MODEL)
        if state["db"] is not None:
            try:
                state["db"].delete_collection()
            except Exception:
                pass
        state["db"] = build_db(embeddings)
    return {"documents": state["db"] is not None}


@app.get("/api/avatar")
def avatar():
    if not os.path.exists(AVATAR):
        raise HTTPException(404, "Avatar introuvable")
    return FileResponse(AVATAR, media_type="model/gltf-binary")


@app.get("/api/health")
def health():
    return {"ok": True}
