class Seeder {
	constructor() {
		if (new.target === Seeder) {
			throw new Error('Seeder é uma classe abstrata e não pode ser instanciada diretamente.');
		}
	}

	async run() {
		throw new Error("O método 'run' deve ser implementado pela classe filha.");
	}
}

export default Seeder;