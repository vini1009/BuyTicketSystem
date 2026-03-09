import TicketController from "../Controllers/ticketController.js";
import TicketView from "../View/TicketView.js";

const ticketController = new TicketController();

const createTicketsSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['eventId', 'amount', 'pricePrefix'],
            properties: {
                eventId: { type: 'string', format: 'uuid' },
                amount: { type: 'integer', minimum: 1, maximum: 1000 }, // Limite de segurança
                pricePrefix: { type: 'number', minimum: 0 }
            }
        }
    }
};

export default async function ticketRoutes(fastify, options) {
    
    // POST /tickets/bulk -> Gera o estoque
    fastify.post('/tickets/bulk', { schema: createTicketsSchema }, async (request, reply) => {
        const result = await ticketController.create({ data: request.body });
        return reply.code(201).send(TicketView.renderMany(result));
    });

    // GET /tickets/event/:eventId -> Lista o que tem disponível
    fastify.get('/tickets/event/:eventId', async (request, reply) => {
        const tickets = await ticketController.list({ 
            eventId: request.params.eventId 
        });
        return reply.send(TicketView.renderMany(tickets));
    });
}