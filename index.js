// index.js
import Fastify from 'fastify';
import Redis from 'ioredis';

const fastify = Fastify({ logger: true });

// A MUDANÇA ESTÁ AQUI: Apontamos para o host 'redis' (nome do container)
const redis = new Redis({
  host: 'redis', // O Docker Compose vai resolver esse nome automaticamente
  port: 6379
});

fastify.decorate('redis', redis);

fastify.post('/checkout', async (request, reply) => {
  const chaveIdempotencia = request.headers['x-idempotency-key'];

  if (!chaveIdempotencia) {
    return reply.code(400).send({ erro: 'Header x-idempotency-key é obrigatório.' });
  }

  const lock = await fastify.redis.set(`transacao:${chaveIdempotencia}`, 'processando', 'EX', 60, 'NX');

  if (!lock) {
    return reply.code(409).send({ erro: 'Requisição duplicada bloqueada na borda pelo Gateway.' });
  }

  await new Promise(resolve => setTimeout(resolve, 2000)); 

  return reply.send({ status: 'Sucesso', mensagem: 'Ingresso comprado e bloqueado para os outros!' });
});

// A MUDANÇA AQUI: No Docker, o Fastify precisa escutar em '0.0.0.0', não apenas em localhost
fastify.listen({ port: 3000, host: '0.0.0.0' });