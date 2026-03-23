const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  orderId: { type: String, ref: 'Order', required: true }
}, { _id: false, strict: false });

module.exports = mongoose.model('Delivery', deliverySchema);
