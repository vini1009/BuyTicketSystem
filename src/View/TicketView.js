export default {
    /**
     * Formata um único ticket
     */
    render(ticket) {
        return {
            id: ticket.id,
            seat: ticket.seat,
            price: ticket.price,
            status: ticket.status,
            eventId: ticket.eventId,
            isAvailable: ticket.status === 'AVAILABLE',
            links: {
                checkout: `/api/checkout`,
                event: `/api/events/${ticket.eventId}`
            }
        };
    },

    /**
     * Formata uma lista de tickets
     */
    renderMany(tickets) {
        if (!tickets || !Array.isArray(tickets)) return [];
        return tickets.map(ticket => this.render(ticket));
    }
};