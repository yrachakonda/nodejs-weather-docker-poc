export function buildImageRef(repository: string, tag: string): string {
  return `${repository}:${tag}`;
}

export function buildRegistryImage(repositoryHost: string, imageName: string, tag: string): { repository: string; tag: string } {
  return {
    repository: `${repositoryHost}/${imageName}`,
    tag
  };
}

export function buildKafkaValues(options: {
  registryHost: string;
  namespace?: string;
  kafkaTag?: string;
  uiEnabled?: boolean;
}): Record<string, unknown> {
  const namespace = options.namespace ?? 'observability';
  const kafkaTag = options.kafkaTag ?? '4.0.2';

  return {
    image: buildRegistryImage(options.registryHost, 'kafka', kafkaTag),
    topicInit: {
      enabled: true,
      image: buildRegistryImage(options.registryHost, 'kafka', kafkaTag),
      topics: [
        {
          name: 'weather-sim.logs',
          partitions: 3,
          replicationFactor: 1,
          config: {
            'retention.ms': '259200000',
            'segment.bytes': '1073741824'
          }
        }
      ]
    },
    ui: {
      enabled: options.uiEnabled ?? false,
      image: buildRegistryImage(options.registryHost, 'kafka-ui', 'v1.4.2'),
      bootstrapServers: 'kafka:29092',
      clusterName: `${namespace}-local`
    }
  };
}

export function buildFluentBitValues(options: {
  registryHost: string;
  namespace?: string;
  imageTag?: string;
}): Record<string, unknown> {
  const namespace = options.namespace ?? 'observability';

  return {
    image: buildRegistryImage(options.registryHost, 'fluent-bit', options.imageTag ?? '5.0.0'),
    config: {
      profile: 'kubernetes',
      clusterName: `${namespace}-local`,
      namespaceFilter: {
        enabled: true,
        namespaces: [namespace]
      }
    },
    kafka: {
      brokers: 'kafka:29092',
      topic: 'weather-sim.logs',
      format: 'json',
      requiredAcks: '1'
    }
  };
}

export function buildLogstashValues(options: {
  registryHost: string;
  namespace?: string;
  imageTag?: string;
}): Record<string, unknown> {
  const namespace = options.namespace ?? 'observability';

  return {
    image: buildRegistryImage(options.registryHost, 'logstash', options.imageTag ?? '9.3.2'),
    kafka: {
      bootstrapServers: 'kafka:29092',
      topics: ['weather-sim.logs'],
      groupId: 'weather-sim-logstash',
      codec: 'json',
      autoOffsetReset: 'earliest'
    },
    elasticsearch: {
      hosts: ['http://elasticsearch:9200'],
      index: 'weather-sim-logs-%{+YYYY.MM.dd}'
    },
    observabilityNamespace: namespace,
    persistence: {
      enabled: true,
      size: '5Gi'
    }
  };
}
