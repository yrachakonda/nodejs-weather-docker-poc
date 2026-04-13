import http from 'node:http';

const port = Number.parseInt(process.env.PORT ?? '8080', 10);
const role = process.env.APP_ROLE ?? 'api';
const version = process.env.APP_VERSION ?? 'kind-test';

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(body));
}

function sendHtml(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/html; charset=utf-8'
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const pathName = url.pathname;

  if (role === 'api') {
    if (req.method === 'GET' && pathName === '/api/v1/system/live') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (req.method === 'GET' && pathName === '/api/v1/system/ready') {
      sendJson(res, 200, { status: 'ready' });
      return;
    }

    if (req.method === 'GET' && pathName === '/api/v1/system/health') {
      sendJson(res, 200, { status: 'healthy' });
      return;
    }

    if (req.method === 'GET' && pathName === '/api/v1/system/version') {
      sendJson(res, 200, { version });
      return;
    }

    if (req.method === 'GET' && pathName === '/') {
      sendJson(res, 200, {
        role,
        version
      });
      return;
    }
  } else {
    if (req.method === 'GET' && (pathName === '/' || pathName === '/index.html')) {
      sendHtml(
        res,
        200,
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>weather-sim</title>
  </head>
  <body>
    <main>
      <h1>weather-sim</h1>
      <p data-role="web">version:${version}</p>
    </main>
  </body>
</html>`
      );
      return;
    }

    if (req.method === 'GET' && pathName === '/healthz') {
      sendJson(res, 200, { status: 'ready', role, version });
      return;
    }
  }

  sendJson(res, 404, {
    error: 'not-found',
    role,
    version,
    path: pathName
  });
});

server.listen(port, '0.0.0.0', () => {
  // The log line gives port-forwarded tests a simple readiness marker if needed.
  console.log(`weather-sim ${role} listening on ${port} (${version})`);
});

function shutdown(signal) {
  server.close(() => {
    console.log(`weather-sim ${role} stopped after ${signal}`);
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
