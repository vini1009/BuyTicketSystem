
class Controller {
    constructor() {
        if (this.constructor === Controller) {
            throw new Error("Classe Abstrata não pode ser instanciada.");
        }
    }

    create({data}){
        throw new Error("Método 'create' deve ser implementado.");
    }

    read({data}){
        throw new Error("Método 'read' deve ser implementado.");
    }

    update({data}){
        throw new Error("Método 'update' deve ser implementado.");
    }

    delete({data}){
        throw new Error("Método 'delete' deve ser implementado.");
    }

    list({data}){
        throw new Error("Método 'list' deve ser implementado.");
    }


}

export default Controller;