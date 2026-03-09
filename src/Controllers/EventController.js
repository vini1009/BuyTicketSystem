import Controller from "./Controller.js";
import { PrismaClient } from "@prisma/client";

import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);

const prismaClientInstance = new PrismaClient({ adapter });

class EventController extends Controller {

    async create({ data }) {
        try {
            const newEvent = await prismaClientInstance.event.create({
                data: {
                    name: data.name,
                    date: new Date(data.date),
                    totalSeats: parseInt(data.totalSeats, 10)
                }
            });

            return newEvent;

        } catch (error) {
            throw error;
        }
    }

    async read({ data }) {

        try {

            const event = await prismaClientInstance.event.findUnique({
                where: { id: data.id }
            });

            if (!event) return null;

            const cachedStock = await redis.get(`estoque:evento:${event.id}`);
            event.availableSeats = cachedStock !== null ? parseInt(cachedStock, 10) : event.totalSeats;

            return {
                ...event,
                ticketsAvaiable: cachedStock ? parseInt(cachedStock, 10) : 0
            };

        } catch (error) {
            throw error;
        }

    }

    async update({ data }) {
        try {
            const { id, ...updateFields } = data;
            const dataToUpdate = {};

            if (updateFields.name) dataToUpdate.name = updateFields.name;
            if (updateFields.date) dataToUpdate.date = new Date(updateFields.date);
            if (updateFields.totalSeats) dataToUpdate.totalSeats = parseInt(updateFields.totalSeats, 10);

            const updatedEvent = await prismaClientInstance.event.update({
                where: { id: id },
                data: dataToUpdate
            });

            return updatedEvent;
        } catch (error) {
            throw error;
        }
    }

    async delete({ data }) {
        try {
            const deletedEvent = await prismaClientInstance.event.delete({
                where: { id: data.id }
            });
            return deletedEvent;
        } catch (error) {
            throw error;
        }
    }

    async list({ data }) {
        try {

            const filters = {};

            if (data?.name) {
                filters.name = { contains: data.name, mode: 'insensitive' };
            }

            const page = parseInt(data?.page) || 1;
            const pageSize = parseInt(data?.pageSize) || 10;

            const events = await prismaClientInstance.event.findMany({
                where: filters,
                take: pageSize,
                skip: (page - 1) * pageSize,
                orderBy: { date: 'asc' }
            });

            return events;
        } catch (error) {
            throw error;
        }
    }

}

export default EventController;