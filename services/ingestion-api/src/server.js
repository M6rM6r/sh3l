const fastify = require('fastify')({ logger: true });
const { Kafka } = require('kafkajs');

// Strict definition of topology
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const TOPIC_NAME = 'telemetry.engine.events';

const kafka = new Kafka({
  clientId: 'telemetry-ingester',
  brokers: [KAFKA_BROKER],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();

// Enforce invariant payload structures matching CognitiveTelemetryLayer definitions
const payloadSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['ev', 'act', 'ts', 'sysId'],
    properties: {
      ev: { type: 'string' },
      act: { type: 'string' },
      meta: { type: 'object', additionalProperties: true },
      ts: { type: 'number' },
      sysId: { type: 'string' }
    }
  }
};

fastify.post('/api/v1/telemetry/ingest', { schema: { body: payloadSchema } }, async (request, reply) => {
  const events = request.body;
  
  if (events.length === 0) {
    return reply.code(204).send();
  }

  try {
    const messages = events.map(evt => ({
      key: evt.sysId, // Partitions by user/system ID to guarantee ordered topic reads
      value: JSON.stringify(evt)
    }));

    await producer.send({
      topic: TOPIC_NAME,
      messages: messages,
      acks: 1 // Optimize tradeoff between pure durability and maximum throughput
    });

    reply.code(202).send({ status: 'ACK', ingested: events.length });
  } catch (err) {
    request.log.error('Kafka Ingestion Failure:', err);
    // 503 instructs front-end beacon logic on failure context
    reply.code(503).send({ error: 'Data persistence pipeline unavailable' });
  }
});

const start = async () => {
  try {
    await producer.connect();
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`Telemetry Engine Ingestion Pipeline listening strictly on 0.0.0.0:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
