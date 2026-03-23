const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  invoiceId: { type: String, ref: 'Invoice', required: true }
}, { _id: false, strict: false });

module.exports = mongoose.model('Payment', paymentSchema);
