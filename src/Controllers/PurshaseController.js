import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


const redis = new Redis({ host: 'redis', port: 6379 });

class PurchaseController {

    // async checkout({ data, userEmail, idempotencyKey }) {
    //     const { ticketId } = data;

    //     const lockKey = `reservation:ticket:${ticketId}`;
    //     const locked = await redis.set(lockKey, userEmail, "NX", "EX", 600);

    //     if (!locked) {
    //         // Se falhou o lock, significa que alguém já reservou ou comprou nos últimos 10min
    //         throw new Error("Este ingresso já está reservado ou em processo de pagamento.");
    //     }

    //     try {
    //         return await prisma.$transaction(async (tx) => {

    //             const ticket = await tx.ticket.findUnique({
    //                 where: { id: ticketId }
    //             });

    //             if (!ticket) throw new Error("Ingresso não encontrado.");

    //             if (ticket.status !== 'AVAILABLE') {
    //                 throw new Error("Ingresso não está mais disponível para venda.");
    //             }

    //             const transaction = await tx.transaction.create({
    //                 data: {
    //                     idempotencyKey,
    //                     customerEmail: userEmail,
    //                     amount: ticket.price,
    //                     status: "APPROVED",
    //                     ticketId: ticket.id
    //                 }
    //             });

    //             await tx.ticket.update({
    //                 where: { id: ticketId },
    //                 data: { status: 'SOLD' }
    //             });

    //             await redis.del(lockKey);
    //             await redis.decr(`estoque:evento:${ticket.eventId}`);

    //             return transaction;
    //         }, {
    //             timeout: 10000 
    //         });

    //     } catch (error) {

    //         await redis.del(lockKey);
    //         throw error;
    //     }
    // }

    async checkout({ data, userEmail, idempotencyKey }) {
        const { ticketIds } = data;

        const lockedKeys = [];
        let eventIdToDecrement = null;

        try {
            for (const ticketId of ticketIds) {
                const lockKey = `reservation:ticket:${ticketId}`;
                const locked = await redis.set(lockKey, userEmail, "NX", "EX", 600);

                if (!locked) {
                    throw new Error(`O ingresso ${ticketId} já foi reservado por outra pessoa neste exato momento.`);
                }
                lockedKeys.push(lockKey);
            }

            return await prisma.$transaction(async (tx) => {

                const tickets = await tx.ticket.findMany({
                    where: { id: { in: ticketIds } }
                });

                if (tickets.length !== ticketIds.length) {
                    throw new Error("Alguns ingressos informados não existem no banco de dados.");
                }

                const unavailable = tickets.filter(t => t.status !== 'AVAILABLE');
                if (unavailable.length > 0) {
                    throw new Error("Um ou mais ingressos selecionados já foram vendidos.");
                }

                eventIdToDecrement = tickets[0].eventId;

                await tx.ticket.updateMany({
                    where: { id: { in: ticketIds } },
                    data: { status: 'SOLD' }
                });

                const transactionsData = tickets.map((ticket, index) => ({
                    idempotencyKey: `${idempotencyKey}-item-${index}`,
                    customerEmail: userEmail,
                    amount: ticket.price,
                    status: "APPROVED",
                    ticketId: ticket.id
                }));

                await tx.transaction.createMany({
                    data: transactionsData
                });

                await redis.decrby(`estoque:evento:${eventIdToDecrement}`, ticketIds.length);

                return {
                    message: `Compra de ${ticketIds.length} ingresso(s) processada com sucesso!`,
                    tickets: ticketIds
                };
            }, { timeout: 15000 });

        } catch (error) {
            throw error;
        } finally {
            if (lockedKeys.length > 0) {
                await redis.del(...lockedKeys);
            }
        }
    }
}

export default PurchaseController;