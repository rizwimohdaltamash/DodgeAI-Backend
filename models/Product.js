const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true }
}, { _id: false, strict: false });

module.exports = mongoose.model('Product', productSchema);
