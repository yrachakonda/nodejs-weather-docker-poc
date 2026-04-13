import { describe, expect, it } from 'vitest';
import { buildFluentBitValues, buildImageRef, buildKafkaValues, buildLogstashValues } from '../support/values';

describe('observability chart value helpers', () => {
  it('builds registry-backed image references', () => {
    expect(buildImageRef('localhost:5000/kafka', '4.0.2')).toBe('localhost:5000/kafka:4.0.2');
  });

  it('builds Kafka values with local registry images and disabled UI by default', () => {
    const values = buildKafkaValues({ registryHost: 'localhost:5000' });

    expect(values).toMatchObject({
      image: {
        repository: 'localhost:5000/kafka',
        tag: '4.0.2'
      },
      topicInit: {
        enabled: true,
        topics: [
          {
            name: 'weather-sim.logs'
          }
        ]
      },
      ui: {
        enabled: false,
        clusterName: 'observability-local',
        bootstrapServers: 'kafka:29092'
      }
    });
  });

  it('builds Fluent Bit values with namespace scoping', () => {
    const values = buildFluentBitValues({ registryHost: 'localhost:5000', namespace: 'observability' });

    expect(values).toMatchObject({
      image: {
        repository: 'localhost:5000/fluent-bit',
        tag: '5.0.0'
      },
      config: {
        profile: 'kubernetes',
        clusterName: 'observability-local',
        namespaceFilter: {
          enabled: true,
          namespaces: ['observability']
        }
      }
    });
  });

  it('builds Logstash values with persisted queue defaults', () => {
    const values = buildLogstashValues({ registryHost: 'localhost:5000' });

    expect(values).toMatchObject({
      image: {
        repository: 'localhost:5000/logstash',
        tag: '9.3.2'
      },
      kafka: {
        bootstrapServers: 'kafka:29092',
        topics: ['weather-sim.logs'],
        groupId: 'weather-sim-logstash'
      },
      elasticsearch: {
        hosts: ['http://elasticsearch:9200']
      },
      observabilityNamespace: 'observability',
      persistence: {
        enabled: true,
        size: '5Gi'
      }
    });
  });
});
