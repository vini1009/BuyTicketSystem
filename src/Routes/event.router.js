
import EventController from "../Controllers/EventController.js";
import EventView from "../View/EventView.js";

// Esquema de validação de Borda - Fastify Schema Validation

const eventController = new EventController();

const createEventSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['name', 'date', 'totalSeats'],
            properties: {
                name: { type: 'string', minLength: 3, maxLength: 100 }, // Nome do evento entre 3 e 100 caracteres
                date: { type: 'string', format: 'date-time' }, // Garante que a string é uma data ISO válida
                totalSeats: { type: 'integer', minimum: 1 } // Impede assentos negativos ou zero
            },
            additionalProperties: false
        }
    }
};

const readEventSchema = {
    schema: {
        params: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' } // ID do evento a ser lido
            }
        }
    }
};

const updateEventSchema = {
    schema: {
        params: {
            type: 'object',
            properties: { id: { type: 'string', format: 'uuid' } }
        },
        body: {
            type: 'object',
            properties: {
                name: { type: 'string', minLength: 3 },
                date: { type: 'string', format: 'date-time' },
                totalSeats: { type: 'integer', minimum: 1 }
            }
        }
    }
};
const deleteEventSchema = {
    schema: {
        params: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' } // ID do evento a ser deletado   
            }
        }
    }
};

const listEventSchema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                name: { type: 'string', minLength: 3, maxLength: 100 }, // Filtro opcional por nome
                page: { type: 'integer', minimum: 1 }, // Página para paginação
                pageSize: { type: 'integer', minimum: 1, maximum: 100 } // Tamanho da página para paginação
            },
            additionalProperties: false
        }
    }
};

async function eventRoutes(fastify, options) {

    // Rota de Criação (POST /events)
    fastify.post('/events', createEventSchema, async (request, reply) => {
        const newEvent = await eventController.create({ data: request.body });
        return reply.code(201).send(EventView.render(newEvent));
    });

    // Rota de Leitura (GET /events/:id)
    fastify.get('/events/:id', readEventSchema, async (request, reply) => {
        const event = await eventController.read({ data: { id: request.params.id } });
        if (!event) {
            return reply.code(404).send({ error: 'Evento não encontrado' });
        }
        return reply.send(EventView.render(event));
    });

    // Rota de Atualização (PUT /events/:id)
    fastify.put('/events/:id', updateEventSchema, async (request, reply) => {
        const updatedEvent = await eventController.update({ data: { id: request.params.id, ...request.body } });
        if (!updatedEvent) {
            return reply.code(404).send({ error: 'Evento não encontrado' });
        }
        return reply.send(EventView.render(updatedEvent));
    });

    // Rota de Deleção (DELETE /events/:id)
    fastify.delete('/events/:id', deleteEventSchema, async (request, reply) => {
        const deletedEvent = await eventController.delete({ data: { id: request.params.id } });
        if (!deletedEvent) {
            return reply.code(404).send({ error: 'Evento não encontrado' });
        }
        return reply.send({ message: 'Evento deletado com sucesso' });
    });

    // Rota de Listagem (GET /events)
    fastify.get('/events', listEventSchema, async (request, reply) => {
        const events = await eventController.list({ data: request.query });
        return reply.send(EventView.renderMany(events));
    });

    // Health Check da rota de eventos
    fastify.head('/events/health/check', async (request, reply) => {
        return reply.send({ status: 'OK', statusCode: 200, message: 'Events route is healthy!' });
    });

}

export default eventRoutes;
