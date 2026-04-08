# ☁️ Cloud Sync Guide: Local Models in the Cloud

When you deploy Memora to **Netlify** (Frontend) and a provider like **Railway** (Backend), the cloud servers cannot "see" your home computer's `localhost:11434` where Ollama runs. 

To bridge this gap, you must create a **tunnel** that gives your local machine a public URL.

---

## 🏗️ Step 1: Install a Tunnel (Ngrok)

1.  **Download Ngrok**: Go to [ngrok.com](https://ngrok.com/) and create a free account.
2.  **Authenticate**: Run the command provided in your dashboard:
    ```bash
    ngrok config add-authtoken YOUR_TOKEN_HERE
    ```
3.  **Start Tunnel**: Run this command to expose your local Ollama port:
    ```bash
    ngrok http 11434 --host-header="localhost:11434"
    ```
    > [!IMPORTANT]
    > Keep this terminal window open! It will give you a "Forwarding" URL (e.g., `https://a1b2-c3d4.ngrok-free.app`).

---

## 🔧 Step 2: Configure Your Cloud Backend

Now that your local machine has a public URL, you need to tell your cloud backend (e.g., Railway) to use it.

1.  In your **Railway Dashboard** (or Render/Fly.io), go to your project **Settings/Variables**.
2.  Update `OLLAMA_BASE_URL` to the **Forwarding URL** provided by Ngrok.
    - **Example**: `https://a1b2-c3d4.ngrok-free.app`
3.  **Redeploy** your backend.

---

## 🌐 Step 3: Configure Ollama for CORS

By default, Ollama blocks requests from unknown origins. You need to allow your Netlify domain.

1.  **On Windows**:
    - Right-click "This PC" → Properties → Advanced System Settings → Environment Variables.
    - Add a **New** User Variable:
      - Variable name: `OLLAMA_ORIGINS`
      - Variable value: `https://your-site.netlify.app`
    - Restart the Ollama application completely (Quit from tray and reopen).

---

## ✅ Step 4: Verify in Memora

1.  Go to your Netlify site.
2.  Open **Settings** → **Connectivity**.
3.  Click **"Check Connection"**.
4.  If successful, Memora will now use your local GPU for all cloud-hosted conversations!

---

## 🛠️ Troubleshooting

- **403 Forbidden**: Ensure `OLLAMA_ORIGINS` is set correctly and includes the protocol (`https://`).
- **Connection Refused**: Your Ngrok tunnel might have stopped, or the URL has changed (Free Ngrok URLs change every time you restart them).
- **Latency**: Since requests are traveling from the cloud to your home and back, responses may be slightly slower than running everything locally.
