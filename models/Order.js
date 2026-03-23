const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  customerId: { type: String, ref: 'Customer', required: true },
  productIds: [{ type: String, ref: 'Product' }]
}, { _id: false, strict: false });

module.exports = mongoose.model('Order', orderSchema);
