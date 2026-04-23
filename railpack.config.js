// Railpack configuration for CritStrike
// Explicitly tell Railpack this is a Node.js app

module.exports = {
  build: {
    commands: ['npm install']
  },
  start: {
    command: 'node server.js'
  }
};
