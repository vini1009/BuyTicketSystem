// redis-teste.js
const Redis = require('ioredis');

// Conecta ao Redis rodando no Docker (localhost, porta 6379)
const redis = new Redis(); 

async function testarRedis() {
  console.log('Conectado ao Redis!');

  // --- CONCEITO 1: TTL (O Segredo da Sala de Espera/Reserva) ---
  // Salva a chave 'ingresso:A42', valor 'reservado', 'EX' (Expira em), 10 segundos.
  // Após 10 segundos, o Redis DELETA essa chave sozinho. Você não precisa fazer nada.
  await redis.set('ingresso:A42', 'reservado', 'EX', 10);
  console.log('Ingresso reservado por 10 segundos!');

  // --- CONCEITO 2: O Lock Atômico (Evitando Race Conditions) ---
  // O parâmetro 'NX' significa "Not eXists" (Só salve se não existir).
  // Se 5000 requisições tentarem rodar isso no mesmo milissegundo,
  // APENAS UMA vai receber 'OK'. As outras 4999 vão receber 'null'.
  const lock = await redis.set('lock:pagamento:123', 'em_processamento', 'EX', 5, 'NX');
  
  if (lock === 'OK') {
    console.log('Lock adquirido! Pode cobrar o cartão.');
  } else {
    console.log('Erro: Já existe um processamento para este ID.');
  }

  // --- CONCEITO 3: Rate Limiting Matemático ---
  // O INCR soma +1 numa chave. É extremamente rápido.
  const acessos = await redis.incr('ip:192.168.0.1');
  console.log(`Este IP já fez ${acessos} requisições.`);
  
  process.exit(0);
}

testarRedis();