const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dodgeai')
.then(() => console.log('Connected to MongoDB'))
.catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

async function seedFixedData() {
  try {
    console.log('Wiping existing massive dataset...');
    await Customer.deleteMany();
    await Product.deleteMany();
    await Order.deleteMany();
    await Delivery.deleteMany();
    await Invoice.deleteMany();
    await Payment.deleteMany();

    console.log('Seeding curated lightweight company demo dataset (Exactly 46 connected nodes)...');

    const customers = [
      { _id: "C100", name: "Acme Corp", region: "North America", segment: "Enterprise" },
      { _id: "C200", name: "Global Tech", region: "Europe", segment: "SMB" },
      { _id: "C300", name: "Nexus Industries", region: "Asia", segment: "Enterprise" }
    ];

    const products = [
      { _id: "P10", name: "Server Rack A", category: "Hardware", unitPrice: 5000 },
      { _id: "P20", name: "Cloud Switch X", category: "Hardware", unitPrice: 1200 },
      { _id: "P30", name: "Enterprise License", category: "Software", unitPrice: 900 }
    ];

    const orders = [];
    const deliveries = [];
    const invoices = [];
    const payments = [];

    // Generate 10 distinct, perfectly mapped O2C flows
    for (let i = 1; i <= 10; i++) {
       const oId = `ORD-500${i}`;
       const cId = customers[i % 3]._id;
       const pIds = [products[i % 3]._id, products[(i+1) % 3]._id];
       
       orders.push({ _id: oId, customerId: cId, productIds: pIds, status: "Completed", amount: 6200 + (i*100) });
       
       const dId = `DEL-600${i}`;
       deliveries.push({ _id: dId, orderId: oId, status: "Delivered", warehouse: "NJ-Alpha" });

       const invId = `INV-700${i}`;
       invoices.push({ _id: invId, deliveryId: dId, amount: 6200 + (i*100), status: "Billed" });

       const payId = `PAY-800${i}`;
       payments.push({ _id: payId, invoiceId: invId, amount: 6200 + (i*100), method: "Wire Transfer" });
    }

    // Insert all
    await Customer.insertMany(customers);
    await Product.insertMany(products);
    await Order.insertMany(orders);
    await Delivery.insertMany(deliveries);
    await Invoice.insertMany(invoices);
    await Payment.insertMany(payments);

    console.log('Perfectly seeded exactly 46 interconnected nodes!');
    process.exit(0);
  } catch(err) {
    console.error(err);
    process.exit(1);
  }
}

seedFixedData();
