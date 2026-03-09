import { PrismaClient } from "@prisma/client";
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import Controller from "./Controller.js";
import Redis from "ioredis";

const redis = new Redis({host: 'redis', port: 6379 });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 20 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

class TicketController extends Controller {
    
    // Gerar ingressos em lote para um evento
    async create({ data }) {
        const { eventId, amount, pricePrefix } = data;

        try {

            const ticketsData = Array.from({ length: amount }).map((_, index) => ({
                eventId,
                price: pricePrefix,
                seat: `Assento-${index + 1}`,
                status: 'AVAILABLE'
            }));

            const created = await prisma.ticket.createMany({
                data: ticketsData,
                skipDuplicates: true
            });

            await redis.set(`estoque:evento:${eventId}`, amount);

            return created;
        } catch (error) {
            throw error;
        }
    }


    async list({ eventId }) {
        return await prisma.ticket.findMany({
            where: { eventId },
            orderBy: { seat: 'asc' }
        });
    }
}

export default TicketController;