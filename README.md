# DodgeAI — Graph LLM for SAP Order-to-Cash

<p align="left">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white" />
  <img src="https://img.shields.io/badge/LLaMA_3.3-0467DF?style=for-the-badge&logo=meta&logoColor=white" />
</p>

---

## 📖 About

**DodgeAI** is an intelligent, graph-powered analytics interface for SAP Order-to-Cash (O2C) processes. It combines an interactive visual graph canvas with a conversational AI agent that is **grounded exclusively in your live dataset** — no hallucinations, no general knowledge.

Users can visually explore the full supply chain web (Customers → Orders → Deliveries → Invoices → Payments) and simultaneously interrogate it in plain English. The AI traces multi-hop relationships, detects broken flows, and highlights the relevant nodes directly on the map.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)           │
│                                                      │
│   ┌─────────────────────┐   ┌──────────────────────┐ │
│   │  Graph Canvas       │   │  Chat Sidebar        │ │
│   │  (React Flow)       │   │  (Streaming AI Chat) │ │
│   │  - 46 SAP nodes     │   │  - Natural language  │ │
│   │  - Organic layout   │   │  - Node highlighting │ │
│   │  - Click to expand  │   │  - Conversation memory││
│   └──────────┬──────────┘   └──────────┬───────────┘ │
└──────────────┼──────────────────────────┼────────────┘
               │  REST API                │ Streaming
               ▼                          ▼
┌──────────────────────────────────────────────────────┐
│                BACKEND (Node.js + Express)           │
│                                                      │
│   GET  /graph/init    → Bulk 46-node load            │
│   GET  /graph/:type/:id → Node + relations           │
│   POST /query         → RAG-powered LLM query        │
│                                                      │
│   ┌──────────────────────────────────────────────┐   │
│   │  RAG Engine                                  │   │
│   │  1. Load all 46 nodes into memory (cached)   │   │
│   │  2. Pass full dataset as LLM context         │   │
│   │  3. Stream grounded answer to frontend       │   │
│   │  4. Extract node IDs → highlight graph       │   │
│   └──────────────────┬───────────────────────────┘   │
└─────────────────────┼────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
        ▼                            ▼
┌────────────── ┐           ┌────────────────────┐
│  MongoDB Atlas│           │  Groq Cloud API    │
│  dodgeai_sap  │           │  LLaMA 3.3 70B     │
│  6 collections│           │  Versatile         │
└────────────── ┘           └────────────────────┘
```

### Collections (46 Nodes Total)

| Collection | Count | Key Fields |
|---|---|---|
| `customers` | 3 | `_id`, `name`, `region`, `segment` |
| `products` | 3 | `_id`, `name`, `category`, `unitPrice` |
| `orders` | 10 | `_id`, `customerId`, `productIds`, `status`, `amount` |
| `deliveries` | 10 | `_id`, `orderId`, `status`, `warehouse` |
| `invoices` | 10 | `_id`, `deliveryId`, `amount`, `status` |
| `payments` | 10 | `_id`, `invoiceId`, `amount`, `method` |

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- Groq API Key (free at [console.groq.com](https://console.groq.com))

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd DodgeAI

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/dodgeai_sap
PORT=5000
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 3. Seed the Database

```bash
cd backend
node scripts/seedData.js
```

This inserts exactly **46 interconnected SAP O2C nodes** into MongoDB.

### 4. Run the Application

Open **two terminals**:

```bash
# Terminal 1 — Backend
cd backend
node index.js
# → Connected to MongoDB
# → Server running on port 5000

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:5173
```

---

## 💬 Example Queries

| Type | Query |
|---|---|
| Flow Tracing | *"Trace the full flow of order ORD-5003"* |
| Lookup | *"Which customer placed order ORD-5007?"* |
| Aggregation | *"Which products appear in the most orders?"* |
| Financial | *"What is the invoice amount for INV-7005?"* |
| Broken Flow | *"Are there any orders with no invoice?"* |
| Status | *"What is the warehouse for delivery DEL-6002?"* |

> **Guardrails:** Questions about weather, sports, general knowledge, or creative writing are automatically rejected with: *"This system is designed to answer questions related to the provided dataset only."*

---

## 🗂️ Project Structure

```
DodgeAI/
├── backend/
│   ├── models/          # Mongoose schemas (Customer, Order, Delivery, Invoice, Payment, Product)
│   ├── routes/
│   │   ├── graph.js     # Graph node + relation API + /init bulk loader
│   │   └── query.js     # RAG-powered LLM query engine
│   ├── scripts/
│   │   └── seedData.js  # Seeds exactly 46 nodes into MongoDB
│   ├── .env             # Environment variables (gitignored)
│   └── index.js         # Express server entry point
│
└── frontend/
    ├── src/
    │   ├── assets/          # logo.png, hero.png
    │   ├── components/
    │   │   ├── GraphComponent.jsx   # React Flow canvas + node expansion
    │   │   └── ChatComponent.jsx    # Streaming chat sidebar
    │   ├── App.jsx          # Layout, Minimize / Hide Overlay controls
    │   └── index.css        # Tailwind CSS v3 directives
    ├── tailwind.config.js
    ├── postcss.config.js
    └── vite.config.js
```

---

## 🔒 Guardrails & Evaluation Criteria

| Criterion | Implementation |
|---|---|
| Natural language queries | LLM receives raw user text — no special syntax needed |
| Grounded answers | Full 46-node dataset injected into LLM context (RAG) |
| Full flow tracing | LLM walks Customer → Order → Delivery → Invoice → Payment chain |
| Broken flow detection | LLM scans all documents and identifies missing downstream links |
| Off-topic rejection | Keyword filter + LLM instruction refuses unrelated prompts |
| Conversation memory | Last 8 messages sent as context on every request |
| Visual node highlighting | Node IDs extracted from AI answer and pulsed on the graph |
