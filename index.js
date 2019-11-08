const express = require('express');
const bparser = require('body-parser');
// const path = require('path'); // Maybe implement a proper html site for / response
const cron = require('cron');


// DB Preparation and Imports
console.log('Preparing and Connecting to Database!');

const mongoose = require('mongoose');
const User = require('./models/user');
const Homework = require('./models/homework');
const Token = require('./models/token');

// Adjusts the Port on which the server listens
const listenPort = 5555;
const productName = 'tpXSchool API';
const version = '0.21 alpha';

mongoose.connect('mongodb://tpxschooldb/tpxschool', {
  useNewUrlParser: true,
  useFindAndModify: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB!');
});

// Security Stuff and Imports
console.log('Initalizing Backend Encryption.');

const cryptoRandomString = require('crypto-random-string');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function generateSecret() {
  return cryptoRandomString({length: secretLength});
}
function removeAllTokens() {
  Token.deleteMany({}, () => {
    console.log('Successfully removed all Stored Tokens!');
  });
}

const secretLength = 10;
let secret = null;

function revertSecurity() {
  // Generates Secret andd removes all stored Token!
  secret = generateSecret();
  removeAllTokens();
  console.log('Reverted Security Successfully');
}

// This Cronjob reverts security once every month
const revertSecurityJob = cron.job('0 0 0 * *', () => {
  revertSecurity();
});
revertSecurityJob.start();

// Revert Security on API Launch
revertSecurity();

// The main Application Part
const app = express();

// Middleware to parse JSON Request Bodys
app.use(
    bparser.urlencoded({
      extended: false,
    })
);
app.use(bparser.json());

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.listen(listenPort, function() {
  console.log('[INFO] Hey we are listening! [INFO]');
});

app.get('/', function(req, res) {
  res.send({
    state: 'succeeded',
    info: productName,
    version: version,
  });
});


// This is the part, that handles Authentication
app.post('/user/register', function(req, res) {
  // Check for all the necessary data
  console.log('Got request for new user creation.');
  const body = req.body;
  if (body !== null) {
    if (body.userName && body.password && body.email) {
      createNewUser(body.userName, body.password, body.email, res);
    } else {
      res.send({state: 'failed', reason: 'Not enough data was supplied!', code: 1});
    }
  } else {
    res.send({state: 'failed', reason: 'No data was received!', code: 2});
  }
});

app.post('/user/logIn', function(req, res) {
  // Check for all the necessary data
  const body = req.body;
  if (body !== null) {
    if (body.userName && body.password) {
      logIn(body.userName, body.password, res);
    } else {
      res.send({state: 'failed', reason: 'Not enough data was supplied!', code: 1});
    }
  } else {
    res.send({state: 'failed', reason: 'No data was received!', code: 2});
  }
});

app.post('/user/logOut', function(req, res) {
  // Check for all the necessary data
  const body = req.body;
  if (body.token) {
    logOut(body.token, res);
    return;
  }
  res.send({state: 'failed', reason: 'No data was received!', code: 2});
});

app.post('/token/verify', function(req, res) {
  if (req.body.token === null) {
    res.send({
      state: 'failed',
      reason: 'No token specified!', code: 10,
    });
    return;
  }
  verifyToken(req.body.token, (err, user) => {
    if (err !== null) {
      res.send({
        state: 'succeeded',
        data: {
          isValid: false,
        },
      });
      return;
    }
    if (user === null) {
      res.send({
        state: 'failed',
        reason: 'An unknown error ocurred!', code: 0,
      });
      return;
    }
    User.findById(user._id, (err, user) => {
      if (err !== null) {
        res.send();
      }
    });
    res.send({
      state: 'succeeded',
      data: {
        isValid: true,
        userName: user.userName,
      },
    });
  });
});

// This thing handles the main API Functions#

app.post('/homework/get', function(req, res) {
  if (req.body.token === null) {
    res.send({state: 'failed', reason: 'No Token was supplied', code: 10});
    return;
  }
  verifyToken(req.body.token, (err, user) => {
    if (err !== null) {
      res.send({
        state: 'failed',
        reason: err,
        code: 11
      });
      return;
    }
    if (user === null) {
      res.send({
        state: 'failed',
        reason: 'An unknown Error ocurred!',
        code: 0
      });
      return;
    }
    Homework.find({owner: user._id}, (err, homeworkArray) => {
      console.log(`User with ID: ${user._id} requested his Homework!`);
      res.send({state: 'succeeded', data: homeworkArray});
    });
  });
});

app.post('/homework/add', (req, res) => {
  if (req.body.token === null) {
    res.send({state: 'failed', reason: 'No Token was supplied', code: 10});
    return;
  }
  verifyToken(req.body.token, (err, user) => {
    if (err !== null) {
      res.send({
        state: 'failed',
        reason: err,
        code: 99,
      });
      return;
    }
    if (user === null) {
      res.send({
        state: 'failed',
        reason: 'An unknown Error ocurred!',
        code: 0,
      });
      return;
    }
    if (req.body.data.title !== null && req.body.data.subject !== null) {
      new Homework({
        subject: req.body.data.subject,
        details: req.body.data.details,
        title: req.body.data.title,
        done: false,
        createdAt: new Date(),
        owner: user._id,
      }).save( (err, doc) => {
        if (err) {
          res.send({state: 'failed', reason: 'Could not save to DB', code: 20});
          return;
        }
        res.send({state: 'succeeded', data: doc});
      });
    } else {
      res.send({
        state: 'failed',
        reason: 'Not enough data was supplied',
        code: 1,
      });
    }
  });
});

app.post('/homework/setDone', (req, res) => {
  if (req.body.token === null) {
    res.send({state: 'failed', reason: 'No Token was supplied', code: 10});
    return;
  }
  verifyToken(req.body.token, (err, user) => {
    if (err !== null) {
      res.send({
        state: 'failed',
        reason: err,
        code: 11,
      });
      return;
    }
    if (user === null) {
      res.send({
        state: 'failed',
        reason: 'An unknown Error ocurred!',
        code: 0,
      });
      return;
    }
    if (req.body.id === null) {
      res.send({
        state: 'failed',
        reason: 'No Homework Id was supplied',
        code: 1,
      });
      return;
    }
    Homework.findById(req.body.id, (err, homework) => {
      // Default findById Error Handlers
      if (err) {
        res.send({
          state: 'failed',
          reason: err,
          code: 99,
        });
        return;
      }
      if (homework === null) {
        res.send({
          state: 'failed',
          reason: 'No Homework for that ID found!',
          code: 30,
        });
        return;
      }

      // Checking whether the permissions are valid
      if (!homework.owner.equals(user._id)) {
        res.send({
          state: 'failed',
          reason: 'You are not the owner of this document! Incident will be logged',
          code: 21,
        });
        console.log(`The user with id: ${user._id} tried to access others data!`);
        return;
      }

      // Checking whether the homework is already done
      if (homework.done) {
        res.send({
          state: 'failed',
          reason: 'The Object is already set Done!',
          code: 31,
        });
        return;
      }

      // Updating the newly retrieved Homework Object
      homework.done = true;
      homework.doneAt = Date();
      Homework.findByIdAndUpdate(req.body.id, homework, {new: true}, (err, newHomework) => {
        // Checking whether Update was done correctly
        if (newHomework.done && newHomework.doneAt !== null) {
          res.send({
            state: 'succeeded',
          });
          return;
        } else {
          res.send({
            state: 'failed',
            reason: 'An unknown Error occurred!',
            code: 0,
          });
        }
      });
    });
  });
});

app.post('/homework/delete', (req, res) => {
  if (req.body.token === null) {
    res.send({state: 'failed', reason: 'No Token was supplied', code: 10});
    return;
  }
  verifyToken(req.body.token, (err, user) => {
    if (err !== null) {
      res.send({
        state: 'failed',
        reason: err,
        code: 11,
      });
      return;
    }
    if (user === null) {
      res.send({
        state: 'failed',
        reason: 'An unknown Error ocurred!',
        code: 0,
      });
      return;
    }
    if (req.body.id === null) {
      res.send({
        state: 'failed',
        reason: 'No Homework Id was supplied',
        code: 1,
      });
      return;
    }
    Homework.findById(req.body.id, (err, homework) => {
      // Default findById Error Handlers
      if (err) {
        res.send({
          state: 'failed',
          reason: err,
          code: 99,
        });
        return;
      }
      if (homework === null) {
        res.send({
          state: 'failed',
          reason: 'No Homework for that ID found!',
          code: 30,
        });
        return;
      }

      // Checking whether the permissions are valid
      if (!homework.owner.equals(user._id)) {
        res.send({
          state: 'failed',
          reason: 'You are not the owner of this document! Incident will be logged',
          code: 21,
        });
        console.log(`The user with id: ${userId} tried to access others data!`);
        return;
      }

      Homework.findByIdAndDelete(req.body.id, (err, deletedHomework) => {
        if (err) {
          res.send({
            state: 'failed',
            reason: err,
            code: 99,
          });
          return;
        }
        res.send({
          state: 'succeeded',
        });
      });
    });
  });
});

//
// Auth and Token Management Functions
//

function createNewUser(userName, password, email, res) {
  User.findOne(
      {
        userName: userName,
      },
      function(err, obj) {
        if (err) {
        // Check for Error
          res.send({state: 'failed', reason: err, code: 99});
          console.err(err);
          return;
        }
        // Check for existing User
        if (obj !== null) {
          res.send({state: 'failed', reason: 'User already exists!', code: 12});
          console.log('User already exists in DB');
          return;
        }
        bcrypt.hash(password, 10, function(err, hash) {
          if (err) {
            console.log('Shit, couldn\'t hash the password!');
            res.send({state: 'failed', reason: 'The password hasing process failed!', code: 13});
            return;
          }
          const user = new User({
            userName: userName,
            passwordHash: hash,
            email: email,
          });
          console.log('Successfully hashed the password!');
          user.save(function(err, user) {
            if (err) {
              console.log('Something went wrong, when trying to save the user to db!');
              res.send({state: 'failed', reason: 'Couldn\'t save user to db!', code: 20});
              return;
            }
            console.log('Successfully saved the user to DB!');
            res.send({state: 'succeeded'});
          });
        });
      }
  );
}

// Token time to live
const ttl = 172800;

function logIn(userName, password, res) {
  User.findOne(
      {
        userName: userName,
      },
      function(err, obj) {
        if (err) {
          res.send({state: 'failed', reason: err, code: 99});
          console.err(err);
        }

        if (obj) {
          if (bcrypt.compareSync(password, obj.passwordHash)) {
            console.log('User: ' + userName + ' logged in!');

            // Creating token based on userName and before created Secret!
            jwt.sign({userName: userName}, secret, {expiresIn: `${ttl}s`}, function(err, token) {
              if (err) {
                console.log(err);
                res.send({state: 'failed', reason: err, code: 14});
                return;
              }
              res.send({state: 'succeeded', data: {token: token, ttl: ttl, createdAt: new Date()}});
              saveToken(token, userName, function(err) {});
            });
            return;
          } else {
            console.log(
                'User: ' + userName + ' tried to login with wrong password!'
            );
          }
        }
        res.send({state: 'failed', reason: 'Wrong Username or Password', code: 15});
      }
  );
}

function logOut(token, res) {
  Token.findOneAndDelete({token: token}, (err, token) => {
    if (err) {
      res.send({
        state: 'failed',
        reason: err,
        code: 99,
      });
      return;
    }
    if (token === null) {
      res.send({
        state: 'failed',
        reason: 'Token is not existing!',
        code: 16,
      });
    }
    res.send({
      state: 'succeeded',
    });
  });
}

function saveToken(token, userName, callback) {
  Token.findOne({token: token}, function(err, obj) {
    if (err) {
      callback(err);
      return;
    }
    if (obj !== null) {
      console.log('Newly created Token already in DB!');
      callback('Token exists, severe Error!');
    }

    const tokenObject = new Token({
      token: token,
      userName: userName,
    });

    tokenObject.save(function(err, token) {
      if (err) {
        callback(err);
        return;
      }
      callback();
    });
  });
}

function verifyToken(token, callback) {
  Token.findOne({token: token}, (err, tokenObject) => {
    if (err) {
      callback(err, null);
      return;
    }
    if (tokenObject === null) {
      callback('No matching token found!', null);
      return;
    }
    jwt.verify(token, secret, {}, (err, decoded) => {
      if (err) {
        callback(err, null);
        return;
      }
      if (decoded === null) {
        callback('Decoding token failed', null);
        return;
      }
      User.findOne({userName: decoded.userName}, (err, user) => {
        if (err) {
          callback(err, null);
          return;
        }
        if (user === null) {
          console.log(`User: ${decoded.userName} belonging to Token not found`);
          callback('User belonging to token not found!', null);
          return;
        }
        callback(null, user);
      });
    });
  });
}
