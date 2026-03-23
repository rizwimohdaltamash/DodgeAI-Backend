const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  deliveryId: { type: String, ref: 'Delivery', required: true }
}, { _id: false, strict: false });

module.exports = mongoose.model('Invoice', invoiceSchema);
