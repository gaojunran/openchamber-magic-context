import http from 'node:http';
import { createService } from './server';

const port = Number(process.env.OPENCHAMBER_SERVICE_PORT);
const token = process.env.OPENCHAMBER_SERVICE_TOKEN ?? '';

const start = async (): Promise<http.Server> => {
  const server = createService({ port, token });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
};

void start().catch((error: unknown) => {
  process.stderr.write(`magic-context service failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
