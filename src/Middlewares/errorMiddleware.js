export function globalErrorHandler(error, request, reply) {
    request.log.error(error);

    // Erros de Validação
    if (error.validation) {
        return reply.code(400).send({
            status: 'fail',
            message: 'Erro de validação nos dados enviados.',
            details: error.validation
        });
    }

    // Erros do Prisma
    if (error.code === 'P2002') {
        return reply.code(409).send({ 
            status: 'error', 
            message: 'Conflito: Chave de idempotência ou dado já existente.' 
        });
    }

    if (error.code === 'P2025') {
        return reply.code(404).send({ status: 'error', message: 'Registro não encontrado no banco.' });
    }

    // Erro genérico
    reply.code(error.statusCode || 500).send({
        status: 'error',
        message: error.message || 'Erro interno no servidor.'
    });
}