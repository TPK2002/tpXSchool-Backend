const jsonwebtoken = require('jsonwebtoken');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});
const secret = 'ssawd';
readline.question('custom please: ', (custom) => {
  jsonwebtoken.sign({custom: custom}, secret, function(err, token) {
    console.log(token);
  });
});
