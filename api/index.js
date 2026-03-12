module.exports = async (req, res) => {
  const server = require("../dist/vercel.cjs");
  const handler = server.default || server;
  return handler(req, res);
};
