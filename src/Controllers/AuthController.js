class AuthController {
    async login(fastify, data) {
        const { email, role } = data; // role: 'USER' ou 'ADMIN'

        const token = fastify.jwt.sign({
            email,
            role: role || 'USER'
        }, { expiresIn: '1h' });

        return { token };
    }
}
export default AuthController;