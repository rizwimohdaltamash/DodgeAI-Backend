const express = require('express');
const router = express.Router();

const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

// ── IMPORTANT: /init must be declared BEFORE /:type/:id ──────────────────────
// Initialize a large cluster of data for the initial graph load
router.get('/init', async (req, res) => {
  try {
    const orders = await Order.find().limit(10).lean(); // 10 orders fan out to ~46 connected nodes

    const nodesMap = new Map();
    const edges = [];

    const addNode = (id, type, details) => {
      if (!nodesMap.has(id)) nodesMap.set(id, { _id: id, type, details });
    };

    for (const order of orders) {
      addNode(order._id, 'orders', order);

      if (order.customerId) {
        const customer = await Customer.findById(order.customerId).lean();
        addNode(order.customerId, 'customers', customer || { _id: order.customerId });
        edges.push({ source: order.customerId, target: order._id });
      }

      if (order.productIds && Array.isArray(order.productIds)) {
        for (const pid of order.productIds) {
          const product = await Product.findById(pid).lean();
          addNode(pid, 'products', product || { _id: pid });
          edges.push({ source: order._id, target: pid });
        }
      }

      const deliveries = await Delivery.find({ orderId: order._id }).lean();
      for (const del of deliveries) {
        addNode(del._id, 'deliveries', del);
        edges.push({ source: order._id, target: del._id });

        const invoices = await Invoice.find({ deliveryId: del._id }).lean();
        for (const inv of invoices) {
          addNode(inv._id, 'invoices', inv);
          edges.push({ source: del._id, target: inv._id });

          const payments = await Payment.find({ invoiceId: inv._id }).lean();
          for (const pay of payments) {
            addNode(pay._id, 'payments', pay);
            edges.push({ source: inv._id, target: pay._id });
          }
        }
      }
    }

    res.json({
      nodes: Array.from(nodesMap.values()).map(n => ({
        ...n,
        connectionCount: edges.filter(e => e.source === n._id || e.target === n._id).length
      })),
      edges
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch init cluster' });
  }
});

// ── Dynamic node + relations lookup ──────────────────────────────────────────
router.get('/:type/:id', async (req, res) => {
  const { type, id } = req.params;

  try {
    let node = null;
    let relations = [];

    switch(type) {
      case 'customers':
        node = await Customer.findById(id);
        if (node) relations = await Order.find({ customerId: id });
        break;
      case 'products':
        node = await Product.findById(id);
        if (node) relations = await Order.find({ productIds: id });
        break;
      case 'orders':
        node = await Order.findById(id);
        if (node) {
          const customer = await Customer.findById(node.customerId);
          const products = await Product.find({ _id: { $in: node.productIds } });
          const deliveries = await Delivery.find({ orderId: id });
          relations = [customer, ...products, ...deliveries].filter(Boolean);
        }
        break;
      case 'deliveries':
        node = await Delivery.findById(id);
        if (node) {
          const order = await Order.findById(node.orderId);
          const invoices = await Invoice.find({ deliveryId: id });
          relations = [order, ...invoices].filter(Boolean);
        }
        break;
      case 'invoices':
        node = await Invoice.findById(id);
        if (node) {
          const delivery = await Delivery.findById(node.deliveryId);
          const payments = await Payment.find({ invoiceId: id });
          relations = [delivery, ...payments].filter(Boolean);
        }
        break;
      case 'payments':
        node = await Payment.findById(id);
        if (node) {
          const invoice = await Invoice.findById(node.invoiceId);
          relations = [invoice].filter(Boolean);
        }
        break;
      default:
        return res.status(400).json({ error: 'Invalid type. Allowed: customers, products, orders, deliveries, invoices, payments' });
    }

    if (!node) return res.status(404).json({ error: 'Node not found' });

    res.json({ node, relations });
  } catch (err) {
    console.error(`Error fetching graph for ${type}/${id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
