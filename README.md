# 🤖 ENSAJ Chatbot - Système RAG

Un chatbot intelligent utilisant **Retrieval-Augmented Generation (RAG)** pour répondre à vos questions sur l'ENSAJ.

## 📋 Prérequis

- **Python 3.8+**
- **Ollama** (pour les modèles LLM et embeddings)
  - [Télécharger Ollama](https://ollama.ai)
  - Modèles requis : `mistral` et `nomic-embed-text`
- **Microphone** (pour la reconnaissance vocale - optionnel)
- **Haut-parleurs** (pour la synthèse vocale - optionnel)

## 🚀 Installation

### 1. Cloner le projet
```bash
git clone https://github.com/ayasadoq/Ensaj-chatbot.git
cd Ensaj-chatbot
```

### 2. Créer un environnement virtuel Python
```bash
python -m venv ensajenv
```

**Activer l'environnement :**
- **Windows (PowerShell)** :
  ```powershell
  .\ensajenv\Scripts\Activate.ps1
  ```
- **Windows (CMD)** :
  ```cmd
  ensajenv\Scripts\activate.bat
  ```
- **macOS/Linux** :
  ```bash
  source ensajenv/bin/activate
  ```

### 3. Installer les dépendances
```bash
pip install -r requirements.txt
```

## 🔧 Configuration d'Ollama

### 1. Démarrer le service Ollama
```bash
ollama serve
```

### 2. Télécharger les modèles requis (dans un autre terminal)
```bash
# Télécharger le modèle Mistral (pour les réponses)
ollama pull mistral

# Télécharger le modèle nomic-embed-text (pour les embeddings)
ollama pull nomic-embed-text
```

Vérifier que les modèles sont installés :
```bash
ollama list
```

## 📁 Structure des données

Le dossier `data/` contient vos documents :

```
data/
├── clubs.txt          # Informations sur les clubs
├── Contact.csv        # Contacts (format CSV)
├── emploi_*.csv       # Emplois du temps par filière
├── ensaj.txt          # Informations générales ENSAJ
├── filiere.txt        # Informations sur les filières
└── reglement.txt      # Règlements
```

**Formats supportés :**
- `.txt` : Fichiers texte bruts
- `.csv` : Fichiers CSV

## 🎤 Fonctionnalités

- **Chatbot RAG** : Recherche et génération augmentée par récupération
- **Reconnaissance vocale** : Posez vos questions par la voix
- **Synthèse vocale** : Écoutez les réponses du chatbot
- **Recherche sémantique** : Trouve les documents pertinents avec ChromaDB
- **Historique de conversation** : Conserve l'historique de vos interactions
- **Interface intuitive** : Interface Streamlit facile à utiliser

## ▶️ Lancer le chatbot

```bash
streamlit run app.py
```

L'application s'ouvrira dans votre navigateur à `http://localhost:8501`

## 💬 Utilisation

1. **Interface Streamlit** : L'application se charge automatiquement
2. **Initialisation** : Le système charge vos documents et crée la base vectorielle FAISS (première utilisation peut prendre quelques minutes)
3. **Poser une question** : Écrivez votre question dans le champ en bas
4. **Obtenir une réponse** : Le chatbot recherche les documents pertinents et génère une réponse basée sur le contenu

### Exemple de questions
- "Quels sont les clubs disponibles à l'ENSAJ ?"
- "Qui est le responsable de la filière informatique ?"
- "Quels sont les horaires de contact ?"

## 🛠️ Architecture

Le système utilise :

- **Streamlit** : Interface web interactive
- **LangChain** : Framework pour les applications LLM
- **Ollama** : Modèles LLM locaux
- **FAISS** : Base vectorielle pour la recherche sémantique
- **RecursiveCharacterTextSplitter** : Découpage intelligent des documents

## 🔄 Flux du système RAG

1. **Chargement** : Les documents (.txt, .csv) sont chargés
2. **Découpage** : Texte divisé en chunks (600 caractères avec overlap de 80)
3. **Embeddings** : Conversion en vecteurs via `nomic-embed-text`
4. **FAISS** : Indexation vectorielle pour recherche rapide
5. **Requête** : La question est convertie en vecteur
6. **Recherche** : Les 4 chunks les plus pertinents sont trouvés
7. **Génération** : Mistral génère une réponse basée sur le contexte

## 🧹 Gestion

### Effacer l'historique des messages
Cliquez sur le bouton 🗑️ dans la barre latérale

### Réinitialiser le système
Fermez l'application et relancez `streamlit run app.py`

## ⚠️ Dépannage

### "Le système RAG n'est pas prêt"
- Vérifiez qu'Ollama fonctionne (`ollama serve`)
- Vérifiez que les modèles sont installés (`ollama list`)

### "Aucun document chargé"
- Créez le dossier `data/` s'il n'existe pas
- Ajoutez des fichiers `.txt` ou `.csv` dans ce dossier

### Erreur de connexion à Ollama
- Assurez-vous qu'Ollama s'exécute en background
- Port par défaut : `http://localhost:11434`

### Lenteur de l'application
- C'est normal lors de la première initialisation (création de la base FAISS)
- Les requêtes suivantes sont beaucoup plus rapides

## 📝 Licence

MIT

## 👤 Auteur

[abdelghafour korachi](https://github.com/korachia1KA)
