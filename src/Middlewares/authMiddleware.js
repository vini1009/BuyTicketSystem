export async function authenticate(request, reply) {
  try {
    await request.jwtVerify(); // Valida o token e coloca os dados em request.user
  } catch (err) {
    reply.code(401).send({ error: 'Não autorizado', message: 'Token inválido ou ausente' });
  }
}

// Middleware para validar se o usuário tem cargo de ADMIN
export async function authorizeAdmin(request, reply) {
  if (request.user.role !== 'ADMIN') {
    reply.code(403).send({ error: 'Proibido', message: 'Apenas administradores podem realizar esta ação' });
  }
}