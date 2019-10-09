const mongoose = require('mongoose');

const tokenSchema = mongoose.Schema({
  token: String,
  userName: String,
});

module.exports = mongoose.model('Token', tokenSchema);
