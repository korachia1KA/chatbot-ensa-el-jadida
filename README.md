# Assistant virtuel ENSA El Jadida

Application web (React + FastAPI) : chatbot RAG avec avatar 3D, appel vidéo vocal et sources citées.

## Structure
```
.
├── main.py              # API FastAPI (RAG Chroma + Ollama, agent LangGraph, Whisper)
├── requirements.txt     # Dépendances Python
├── data/                # Vos documents .txt et .csv
├── assets/
│   └── mon_avatar.glb   # Avatar 3D
├── tools/
│   └── generate_finetune_data.py
├── frontend/            # Interface React (Vite)
├── setup.bat / start.bat / start.sh
└── README.md
```

## Prérequis
- Python 3.10 ou 3.11
- Node.js 18 ou plus récent
- ffmpeg (requis par Whisper) : `winget install ffmpeg`
- Ollama avec les modèles :
  ```bash
  ollama pull llama3.2
  ollama pull nomic-embed-text
  ```
  Pour utiliser un autre modèle (par exemple `mistral`), définissez la variable d'environnement `LLM_MODEL`.

## Installation

### 1. Cloner le projet
```bash
git clone https://github.com/korachia1KA/chatbot-ensa-el-jadida.git
cd chatbot-ensa-el-jadida
```

### 2. Backend (à la racine du projet)
```bash
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip wheel
python -m pip install "setuptools<81"
python -m pip install --no-build-isolation -r requirements.txt
```
Utilisez toujours `python -m pip` et non `pip` : certaines politiques de sécurité Windows (Device Guard) bloquent `pip.exe` dans le dossier du projet.

### 3. Frontend
```bash
cd frontend
npm install
cd ..
```

### 4. Documents
Placez vos fichiers `.txt` et `.csv` (clubs, filières, règlement, contacts, emplois du temps) dans `data/`.

## Lancement

Gardez Ollama actif en arrière-plan. S'il tourne déjà, ne lancez pas `ollama serve` une seconde fois.

**Terminal 1 : backend**
```bash
.venv\Scripts\activate
python -m uvicorn main:app --port 8000
```

**Terminal 2 : frontend**
```bash
cd frontend
npm run dev
```

Ouvrez ensuite http://localhost:5173

## Utilisation
- **Conversation** : écrivez ou cliquez sur le micro. Les sources utilisées s'affichent à droite.
- **Appel vidéo** : avatar en portrait. Appuyez sur « Parler », puis sur « Envoyer ma question ».
- **Réindexer les documents** : à cliquer après chaque modification du dossier `data/`.
- **Lecture vocale** : activable ou désactivable dans la barre latérale.

## Fonctionnement du RAG
1. Les documents de `data/` sont chargés (.txt et .csv).
2. Ils sont découpés en morceaux de 800 caractères (chevauchement de 100).
3. `nomic-embed-text` les convertit en vecteurs, stockés dans ChromaDB (dossier `chroma_db/`, créé automatiquement).
4. Un routeur LangGraph distingue les salutations des vraies questions.
5. Pour une question, les 4 extraits les plus proches sont récupérés.
6. Le modèle génère la réponse à partir de ces extraits, et ils sont affichés comme sources.

## Génération de données de fine-tuning (optionnel)
```bash
python tools/generate_finetune_data.py
```
À lancer depuis la racine du projet. Le script lit `data/` et écrit `dataset_ensaj.json`.

## Dépannage

**`pip.exe` bloqué par Device Guard**
Utilisez `python -m pip ...` et `python -m uvicorn ...`.

**`Form data requires "python-multipart"`**
Le venv n'est pas activé ou les dépendances ne sont pas installées dans le venv. Vérifiez la présence de `(.venv)` dans l'invite, puis :
```bash
python -m pip install -r requirements.txt
```

**`No module named 'pkg_resources'`**
```bash
python -m pip install "setuptools<81" wheel
python -m pip install --no-build-isolation -r requirements.txt
```

**« Moteur indisponible » dans l'interface**
Ollama n'est pas lancé ou un modèle manque. Vérifiez avec `ollama list`.

**Avatar introuvable (erreur 404)**
Vérifiez que le fichier est bien `assets/mon_avatar.glb`.

**Micro sans effet ou transcription impossible**
Autorisez le micro dans le navigateur et vérifiez que ffmpeg est installé (rouvrez le terminal après installation).

**Sources absentes dans les réponses**
Un ancien dossier `chroma_db` n'enregistre pas les noms de fichiers. Supprimez-le ou cliquez sur « Réindexer les documents ».

**`shap requires numpy>=2`**
Simple avertissement : `shap` est un autre paquet de votre PC, sans lien avec ce projet.

## Auteur
Abdelghafour Korachi, ENSA El Jadida
GitHub : [@korachia1KA](https://github.com/korachia1KA)

## Licence
MIT