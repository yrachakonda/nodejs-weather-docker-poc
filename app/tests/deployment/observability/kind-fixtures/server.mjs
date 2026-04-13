import http from 'node:http';

const port = Number.parseInt(process.env.PORT ?? '8080', 10);
const role = process.env.APP_ROLE ?? 'observability';
const version = process.env.APP_VERSION ?? 'kind-test';

function parseList(value) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

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

  if (req.method === 'GET' && pathName === '/healthz') {
    sendJson(res, 200, { status: 'healthy', role, version });
    return;
  }

  if (role === 'elasticsearch') {
    if (req.method === 'GET' && (pathName === '/' || pathName === '/_cluster/health')) {
      sendJson(res, 200, {
        cluster_name: process.env.CLUSTER_NAME ?? 'weather-sim-observability',
        node_name: process.env.NODE_NAME ?? 'observability-es-0',
        status: 'green',
        version
      });
      return;
    }
  }

  if (role === 'kibana') {
    if (req.method === 'GET' && pathName === '/api/status') {
      sendJson(res, 200, {
        name: 'kibana',
        status: {
          overall: {
            state: 'green'
          }
        },
        elasticsearchHosts: parseList(process.env.ELASTICSEARCH_HOSTS),
        publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://kibana:5601',
        version
      });
      return;
    }

    if (req.method === 'GET' && (pathName === '/' || pathName === '/index.html')) {
      sendHtml(
        res,
        200,
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>kibana</title>
  </head>
  <body>
    <main>
      <h1>kibana</h1>
      <p>version:${version}</p>
    </main>
  </body>
</html>`
      );
      return;
    }
  }

  if (role === 'fluent-bit') {
    if (req.method === 'GET' && (pathName === '/' || pathName === '/api/v1/health')) {
      sendJson(res, 200, {
        status: 'ok',
        appNamespace: process.env.APP_NAMESPACE ?? 'weather-sim',
        clusterName: process.env.CLUSTER_NAME ?? 'weather-sim-observability',
        topic: process.env.KAFKA_TOPIC ?? 'weather-sim.logs',
        bootstrapServers: process.env.KAFKA_BOOTSTRAP_SERVERS ?? 'kafka:29092',
        version
      });
      return;
    }
  }

  if (role === 'logstash') {
    if (req.method === 'GET' && (pathName === '/' || pathName === '/_node/stats')) {
      sendJson(res, 200, {
        name: 'logstash',
        status: 'green',
        pipelines: {
          main: {
            status: 'running'
          }
        },
        topic: process.env.KAFKA_TOPIC ?? 'weather-sim.logs',
        bootstrapServers: process.env.KAFKA_BOOTSTRAP_SERVERS ?? 'kafka:29092',
        elasticsearchHosts: parseList(process.env.ELASTICSEARCH_HOSTS),
        version
      });
      return;
    }
  }

  if (role === 'kafka-ui') {
    if (req.method === 'GET' && (pathName === '/' || pathName === '/actuator/health')) {
      sendJson(res, 200, {
        status: 'UP',
        clusterName: process.env.KAFKA_CLUSTERS_0_NAME ?? 'weather-sim-observability',
        bootstrapServers: process.env.KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS ?? 'kafka:29092',
        version
      });
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
  console.log(`observability fixture ${role} listening on ${port} (${version})`);
});

function shutdown(signal) {
  server.close(() => {
    console.log(`observability fixture ${role} stopped after ${signal}`);
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
