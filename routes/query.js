const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

const groq = process.env.GROQ_API_KEY ? new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
}) : null;

// ── In-memory dataset cache ──────────────────────────────────────────────────
let datasetCache = null;

async function loadDataset() {
  if (datasetCache) return datasetCache;
  const [customers, products, orders, deliveries, invoices, payments] = await Promise.all([
    Customer.find().lean(),
    Product.find().lean(),
    Order.find().lean(),
    Delivery.find().lean(),
    Invoice.find().lean(),
    Payment.find().lean(),
  ]);
  datasetCache = { customers, products, orders, deliveries, invoices, payments };
  console.log(`[RAG] Loaded dataset — ${customers.length} customers, ${products.length} products, ${orders.length} orders, ${deliveries.length} deliveries, ${invoices.length} invoices, ${payments.length} payments`);
  return datasetCache;
}

// ── Guardrail — truly off-topic topics ───────────────────────────────────────
const OFF_TOPIC_KEYWORDS = [
  "weather", "president", "sports", "joke", "movie", "recipe", "poem",
  "story", "write a", "capital of", "who is", "what country", "history of",
  "football", "cricket", "celebrity", "netflix", "music", "song"
];

function isOffTopic(question) {
  const lower = question.toLowerCase();
  return OFF_TOPIC_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Collect node IDs mentioned in a text string ──────────────────────────────
function extractNodeIds(text, dataset) {
  const ids = new Set();
  const allIds = [
    ...dataset.customers.map(d => d._id),
    ...dataset.products.map(d => d._id),
    ...dataset.orders.map(d => d._id),
    ...dataset.deliveries.map(d => d._id),
    ...dataset.invoices.map(d => d._id),
    ...dataset.payments.map(d => d._id),
  ];
  allIds.forEach(id => { if (text.includes(id)) ids.add(id); });
  return [...ids];
}

// ── Main Query Route ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { question, history = [] } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required' });

  if (isOffTopic(question)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write(JSON.stringify({ type: 'meta', highlightNodes: [] }) + "\n--META--\n");
    res.write("This system is designed to answer questions related to the provided Order-to-Cash dataset only. Please ask about orders, deliveries, invoices, payments, customers, or products.");
    return res.end();
  }

  try {
    if (!groq) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.write(JSON.stringify({ type: 'meta', highlightNodes: [] }) + "\n--META--\n");
      res.write("GROQ API key is missing. Please configure it in the backend .env file.");
      return res.end();
    }

    // Load the entire 46-node dataset into memory (cached after first load)
    const dataset = await loadDataset();

    // Serialize the full dataset as compact JSON for the LLM context
    const datasetContext = `
CUSTOMERS (${dataset.customers.length}):
${JSON.stringify(dataset.customers)}

PRODUCTS (${dataset.products.length}):
${JSON.stringify(dataset.products)}

ORDERS (${dataset.orders.length}):
${JSON.stringify(dataset.orders)}

DELIVERIES (${dataset.deliveries.length}):
${JSON.stringify(dataset.deliveries)}

INVOICES (${dataset.invoices.length}):
${JSON.stringify(dataset.invoices)}

PAYMENTS (${dataset.payments.length}):
${JSON.stringify(dataset.payments)}`;

    const systemPrompt = `You are Dodge AI, an intelligent analyst for a SAP Order-to-Cash (O2C) system.

You have been given the COMPLETE dataset of all documents in the system below. Your job is to answer user questions EXCLUSIVELY using this data. NEVER make up data that is not in the dataset.

DATASET:
${datasetContext}

RELATIONSHIP CHAIN: customers → orders (via customerId) → deliveries (via orderId) → invoices (via deliveryId) → payments (via invoiceId)

INSTRUCTIONS:
1. Answer questions ONLY using the data above. Be direct and precise.
2. For flow tracing (e.g. "trace billing document X"), walk the full chain: Sales Order → Delivery → Invoice → Payment and report each step.
3. For broken flow detection (e.g. "orders without invoices"), scan all items and report which ones are missing downstream documents.
4. For aggregation questions (e.g. "which products have the most billing documents"), count relationships and sort.
5. Always mention specific IDs, amounts, and statuses from the data.
6. If the question cannot be answered from the data, say "I cannot find that information in the current dataset."
7. Keep responses concise and professional. Use bullet points for lists.`;

    const chatMessages = [{ role: 'system', content: systemPrompt }];

    // Include conversation history for memory
    if (history && Array.isArray(history)) {
      chatMessages.push(...history.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })));
    }
    chatMessages.push({ role: 'user', content: question });

    // Stream the response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    let fullAnswer = '';
    const stream = await groq.chat.completions.create({
      messages: chatMessages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 800,
      stream: true,
    });

    // Buffer the full text first for node extraction, then stream chunks
    const chunks = [];
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) { fullAnswer += content; chunks.push(content); }
    }

    // Extract node IDs mentioned in the full answer for graph highlighting
    const highlightNodes = extractNodeIds(fullAnswer, dataset);

    // Write meta (node highlights) first
    res.write(JSON.stringify({ type: 'meta', highlightNodes }) + "\n--META--\n");

    // Stream the answer text word by word for smooth UX
    for (const chunk of chunks) {
      res.write(chunk);
    }
    res.end();

  } catch (error) {
    console.error("Error processing query:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process query' });
    } else {
      res.end();
    }
  }
});

// Invalidate the dataset cache when data changes (e.g. after re-seeding)
router.post('/invalidate-cache', (req, res) => {
  datasetCache = null;
  res.json({ message: 'Dataset cache invalidated.' });
});

module.exports = router;
