function resolveServerBinding(env = process.env) {
  const parsedPort = Number.parseInt(env.PORT, 10);
  const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 50001;
  const host = env.HOST || '0.0.0.0';

  return { port, host };
}

module.exports = {
  resolveServerBinding
};
