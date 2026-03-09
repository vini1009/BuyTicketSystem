export default {
    render(transaction) {
        return {
            confirmationCode: transaction.id,
            status: transaction.status,
            email: transaction.customerEmail,
            paidAmount: transaction.amount,
            ticketId: transaction.ticketId,
            date: transaction.createdAt
        };
    }
};