import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import appRoutes from "./src/routes.js";
import { globalErrorHandler } from "./src/Middlewares/errorMiddleware.js"; // Importe o seu middleware de erro

const fastify = Fastify({ 
    logger: true,
    connectionTimeout: 10000 
});

await fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'backupkey'
});


fastify.setErrorHandler(globalErrorHandler);

await fastify.register(appRoutes);

const start = async () => {
  try {
    // 0.0.0.0 para liberar porta Win/Docker
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Servidor rodando em http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();