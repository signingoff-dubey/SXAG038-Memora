# Deployment Guide - Memora

This document explains how to host Memora in the cloud. Because the project consists of a **Python Backend** and a **React Frontend**, you must use two different strategies for deployment.

---

## 🏗 Part 1: Hosting the Frontend (Netlify)

The changes in this repository allow Netlify to automatically build and host your frontend.

1.  **Link Repository**: In Netlify, create a new site from your GitHub repository.
2.  **Configuration**: 
    *   **Base directory**: `/` (Root)
    *   **Build command**: `npm run build`
    *   **Publish directory**: `frontend/dist`
3.  **Environment Variables**:
    *   Go to **Site settings > Environment variables**.
    *   Add `VITE_API_URL` and set it to your hosted backend URL (e.g., `https://memora-backend.railway.app`).

---

## 🐍 Part 2: Hosting the Backend (Railway / Render)

You need a platform that supports **Python** and **persistent disk storage** for your database. We recommend **Railway**.

1.  **New Project**: Create a new project on Railway from your GitHub repo.
2.  **Root Directory**: Set the root to `/backend`.
3.  **Persistence**: 
    *   Railway uses an ephemeral filesystem by default. To preserve your memories, you should mount a volume at `/backend/data`.
    *   Alternatively, most users find that for a personal agent, the `db.sqlite3` and ChromaDB files stored in the container are sufficient as long as deployments are infrequent.
4.  **Ollama Connection**:
    *   If you want the cloud backend to talk to a **Local Ollama**, you must use a tunnel like **Ngrok** and set `OLLAMA_BASE_URL` in the cloud environment to your Ngrok address.
    *   Alternatively, set `OPENAI_API_KEY` to use a cloud provider instead of local Ollama.

---

## 🔄 Part 3: Connecting Everything

Once both are deployed:
1.  Copy your **Railway URL**.
2.  Paste it into the `VITE_API_URL` environment variable on **Netlify**.
3.  Re-deploy the Netlify site.

Your Memora instance is now live!
