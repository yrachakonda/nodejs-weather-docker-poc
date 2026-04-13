FROM node:22-alpine

WORKDIR /app

RUN mkdir -p \
  /usr/share/elasticsearch/config \
  /usr/share/elasticsearch/data \
  /usr/share/kibana/config \
  /usr/share/kibana/data \
  /usr/share/logstash/config \
  /usr/share/logstash/pipeline \
  /usr/share/logstash/data \
  /opt/kafka \
  /var/lib/kafka/data \
  /fluent-bit/etc

COPY server.mjs /app/server.mjs

ARG APP_ROLE=observability
ARG APP_VERSION=kind-test
ARG PORT=8080

ENV APP_ROLE=${APP_ROLE}
ENV APP_VERSION=${APP_VERSION}
ENV PORT=${PORT}

EXPOSE ${PORT}

CMD ["node", "/app/server.mjs"]
