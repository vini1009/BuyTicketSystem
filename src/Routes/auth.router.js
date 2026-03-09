export default async function authRoutes(fastify, options) {
    fastify.post('/login', async (request, reply) => {
        const { email, role } = request.body;

        const token = fastify.jwt.sign({ 
            email: email || 'user@test.com', 
            role: role || 'USER' 
        }, { expiresIn: '2h' });

        return { token };
    });
}