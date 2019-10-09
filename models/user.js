const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  userName: String,
  passwordHash: String,
  email: String,
  token: Buffer,
});

module.exports = mongoose.model('User', userSchema);
