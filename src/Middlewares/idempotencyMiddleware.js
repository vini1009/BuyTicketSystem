export async function idempotencyHook(request, reply) {
  // Verificamos apenas métodos que criam dados (POST/PUT)
  if (request.method === 'POST' || request.method === 'PUT') {
    const key = request.headers['x-idempotency-key'];
    
    if (!key) {
      return reply.code(400).send({ 
        error: 'Security Error', 
        message: 'O cabeçalho x-idempotency-key é obrigatório para esta operação.' 
      });
    }
  }
}