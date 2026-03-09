export default {
    render(event) {
        return {
            id: event.id,
            name: event.name,
            date: event.date,
            availableSeats: event.totalSeats,
            links: { self: `/api/events/${event.id}` }
        };
    },
    renderMany(events) {
        return events.map(event => this.render(event));
    }
};