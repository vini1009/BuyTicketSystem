import eventRoutes from "./Routes/event.router.js";
import ticketRoutes from "./Routes/ticket.router.js";
import purchaseRoutes from "./Routes/purchase.router.js";
import authRoutes from "./Routes/auth.router.js";

async function appRoutes(fastify, options) {
    // Registro dos plugins de rota
    await fastify.register(authRoutes, { prefix: '/api' });
    await fastify.register(eventRoutes, { prefix: '/api' }); 
    await fastify.register(ticketRoutes, { prefix: '/api' });
    await fastify.register(purchaseRoutes, { prefix: '/api' });

    // Rota de Health
    fastify.get('/api/health', async (request, reply) => {
        return { status: 'OK', message: 'API is running!' };
    });
}

export default appRoutes;