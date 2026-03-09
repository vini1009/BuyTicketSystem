// server.js
const Fastify = require('fastify');

// O logger: true já traz uma performance de log excelente pro terminal
const fastify = Fastify({ logger: true });

// 1. DECORATOR: Injetando "ferramentas" no seu Fastify. 
// Isso evita que você tenha que importar arquivos em toda pasta.
fastify.decorate('minhaFerramenta', 'Ferramenta de Segurança Ativada');

// 2. HOOK (O Guarda de Fronteira): Intercepta TODAS as requisições
fastify.addHook('preHandler', async (request, reply) => {
  // Num Gateway, é aqui que você checa tokens, IPs ou Headers
  const token = request.headers['x-meu-token'];

  if (!token) {
    // Barra a requisição instantaneamente. O código abaixo não executa.
    return reply.code(401).send({ erro: 'Acesso bloqueado pelo Gateway: Token ausente.' });
  }
  
  // Se tiver token, ele simplesmente deixa a requisição seguir o fluxo normal.
});

// 3. A ROTA: Só chega aqui se passar pelos Hooks
fastify.get('/status', async (request, reply) => {
  // Acessando a ferramenta que injetamos lá em cima
  return { 
    status: 'Gateway Operacional', 
    ferramenta: fastify.minhaFerramenta 
  };
});

// Inicialização
fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});