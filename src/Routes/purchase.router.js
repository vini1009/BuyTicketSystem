import { authenticate } from '../Middlewares/authMiddleware.js';
import { idempotencyHook } from '../Middlewares/idempotencyMiddleware.js';
import PurchaseController from "../Controllers/PurshaseController.js";
import TransactionView from '../View/TransactionView.js';
const purchaseController = new PurchaseController();

const checkoutSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['ticketIds'],
            properties: {
                ticketIds: { 
                    type: 'array', 
                    items: { type: 'string', format: 'uuid' },
                    minItems: 1,
                    maxItems: 10 // O limite máximo por cliente
                }
            }
        }
    }
};

export default async function purchaseRoutes(fastify, options) {
    // Para comprar, precisa de Token E Chave de Idempotência
    fastify.post('/checkout', { preHandler: [authenticate, idempotencyHook] }, async (request, reply) => {
        const transaction = await purchaseController.checkout({
            data: request.body,
            userEmail: request.user.email, // Vem do JWT
            idempotencyKey: request.headers['x-idempotency-key']
        });
        return reply.send(TransactionView.render(transaction));
    });
}