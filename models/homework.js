const mongoose = require('mongoose');

const homeworkSchema = mongoose.Schema({
  subject: String,
  details: String,
  title: String,
  done: false,
  createdAt: Date,
  doneAt: Date,
  owner: mongoose.Schema.ObjectId,
});

module.exports = mongoose.model('Homework', homeworkSchema);
