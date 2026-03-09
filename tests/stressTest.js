import axios from 'axios';
import { performance } from 'perf_hooks';

// ============================================================================
// [ CONFIGURACOES GERAIS DA SUITE DE TESTES E2E ]
// ============================================================================
const CONFIG = {
    API_URL: process.env.API_URL || 'http://127.0.0.1:3000/api',
    CONCURRENCY: {
        TOTAL_CLIENTS: parseInt(process.env.TOTAL_CLIENTS) || 10, // Quantidade de sessoes simultaneas
    },
    PAYLOADS: {
        ADMIN_EMAIL: 'auditoria_master@sistema.com',
        ADMIN_ROLE: 'ADMIN',
        EVENT_CAPACITY: 50,
        TICKETS_TO_GENERATE: 10,   // Estoque inicial no banco
        TICKETS_TO_BUY: 3,         // Tamanho do "carrinho" (1 a 10 ingressos)
        TICKET_PRICE: 150.00
    }
};

// ============================================================================
// [ PALETA ANSI - CLI (Nativo) ]
// ============================================================================
const CLI = {
    reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
    green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m",
    cyan: "\x1b[36m", blue: "\x1b[34m", magenta: "\x1b[35m"
};

class QA_SystemTestSuite {
    constructor(config) {
        this.config = config;
        this.headers = {};
        this.state = { targetTicketIds: [] }; // Agora suporta multiplos IDs
        this.metrics = { times: [], successCount: 0, failCount: 0, errors: {} };
    }

    // --- Formatadores de Saida ---
    printHeader(title) {
        console.log(`\n${CLI.cyan}${CLI.bold}================================================================================${CLI.reset}`);
        console.log(`${CLI.cyan}${CLI.bold} [ FASE ] ${title.toUpperCase()} ${CLI.reset}`);
        console.log(`${CLI.cyan}${CLI.bold}================================================================================${CLI.reset}`);
    }

    // --- Intercepter HTTP Central (O Coracao da Auditoria) ---
    async dispatch({ method, endpoint, payload = null, customHeaders = null, silent = false }) {
        const url = `${this.config.API_URL}${endpoint}`;
        const reqHeaders = customHeaders || this.headers;
        
        if (!silent) {
            console.log(`\n${CLI.magenta}${CLI.bold}[ HTTP REQ ]${CLI.reset} ${CLI.bold}${method}${CLI.reset} ${url}`);
            if (payload) {
                console.log(`${CLI.dim}[ PAYLOAD ENVIADO ]\n${JSON.stringify(payload, null, 2)}${CLI.reset}`);
            }
        }

        const startTimestamp = performance.now();
        
        try {
            const response = await axios({ method, url, data: payload, headers: reqHeaders });
            const latency = (performance.now() - startTimestamp).toFixed(2);
            
            if (!silent) {
                console.log(`${CLI.green}[ HTTP RES ]${CLI.reset} Status: ${response.status} ${response.statusText} | Latencia: ${latency}ms`);
                console.log(`${CLI.dim}[ CORPO DA RESPOSTA ]\n${JSON.stringify(response.data, null, 2)}${CLI.reset}`);
            }
            return { data: response.data, status: response.status, latency };
        } catch (error) {
            const latency = (performance.now() - startTimestamp).toFixed(2);
            const status = error.response?.status || 500;
            const statusText = error.response?.statusText || 'Internal Error';
            const responseData = error.response?.data || error.message;

            if (!silent) {
                console.log(`${CLI.red}[ HTTP ERR ]${CLI.reset} Status: ${status} ${statusText} | Latencia: ${latency}ms`);
                console.log(`${CLI.red}[ CORPO DO ERRO ]\n${JSON.stringify(responseData, null, 2)}${CLI.reset}`);
            }
            throw { status, data: responseData, latency, message: error.message };
        }
    }

    // --- Orquestrador Principal ---
    async execute() {
        try {
            console.log(`${CLI.bold}BUY TICKET SYSTEM - RELATORIO DE AUDITORIA E TELEMETRIA E2E${CLI.reset}`);
            console.log(`${CLI.dim}Iniciando varredura na infraestrutura...${CLI.reset}\n`);

            await this.moduleAuthentication();
            await this.moduleEventManagement();
            await this.moduleInventoryAndCache();
            await this.moduleConcurrencyStress();
            await this.modulePostSaleAudit();

            this.generateFinalReport();

        } catch (error) {
            console.log(`\n${CLI.red}${CLI.bold}[ INTERRUPCAO CRITICA ] A SUITE DE TESTES DETECTOU UMA FALHA FATAL.${CLI.reset}\n`);
            console.error(error.stack || error);
        }
    }

    // ========================================================================
    // [ MODULO 1 ] SEGURANCA E AUTENTICACAO
    // ========================================================================
    async moduleAuthentication() {
        this.printHeader('Security & Identity Handshake');
        
        const payload = { email: this.config.PAYLOADS.ADMIN_EMAIL, role: this.config.PAYLOADS.ADMIN_ROLE };
        const res = await this.dispatch({ method: 'POST', endpoint: '/login', payload });
        
        this.headers = { Authorization: `Bearer ${res.data.token}` };
        console.log(`${CLI.blue}[ SYSTEM ] Headers de autorizacao JWT configurados globalmente.${CLI.reset}`);
    }

    // ========================================================================
    // [ MODULO 2 ] CRUD E PERSISTENCIA
    // ========================================================================
    async moduleEventManagement() {
        this.printHeader('Core Database Operations & Views');
        
        // CREATE
        const createPayload = {
            name: `Load Test Summit - ${Date.now()}`,
            date: new Date(Date.now() + 86400000).toISOString(),
            totalSeats: this.config.PAYLOADS.EVENT_CAPACITY
        };
        const createRes = await this.dispatch({ method: 'POST', endpoint: '/events', payload: createPayload });
        this.state.eventId = createRes.data.id;

        // READ
        await this.dispatch({ method: 'GET', endpoint: '/events' });
    }

    // ========================================================================
    // [ MODULO 3 ] INVENTARIO E CACHE (REDIS)
    // ========================================================================
    async moduleInventoryAndCache() {
        this.printHeader('Inventory & Multi-Ticket Warm-up');
        
        // Gera o lote de ingressos
        const bulkPayload = { 
            eventId: this.state.eventId, 
            amount: this.config.PAYLOADS.TICKETS_TO_GENERATE, 
            pricePrefix: this.config.PAYLOADS.TICKET_PRICE 
        };
        await this.dispatch({ method: 'POST', endpoint: '/tickets/bulk', payload: bulkPayload });

        // Recupera a lista de ingressos gerados
        const ticketsRes = await this.dispatch({ method: 'GET', endpoint: `/tickets/event/${this.state.eventId}` });
        
        // Extrai uma quantidade X de ingressos para formar o "carrinho"
        const ingressosDisponiveis = ticketsRes.data;
        if (ingressosDisponiveis.length < this.config.PAYLOADS.TICKETS_TO_BUY) {
            throw new Error('Ingressos gerados insuficientes para o teste de lote.');
        }

        this.state.targetTicketIds = ingressosDisponiveis
            .slice(0, this.config.PAYLOADS.TICKETS_TO_BUY)
            .map(t => t.id);
        
        console.log(`\n${CLI.blue}[ SYSTEM ] Lote Alvo Selecionado (${this.state.targetTicketIds.length} ingressos):${CLI.reset}`);
        console.log(CLI.dim + JSON.stringify(this.state.targetTicketIds, null, 2) + CLI.reset);

        // Captura o estoque inicial (Redis)
        const eventRes = await this.dispatch({ method: 'GET', endpoint: `/events/${this.state.eventId}` });
        this.state.estoqueInicial = eventRes.data.ticketsAvailable;
    }

    // ========================================================================
    // [ MODULO 4 ] RACE CONDITION (MULTI-LOCK STRESS TEST)
    // ========================================================================
    async moduleConcurrencyStress() {
        this.printHeader(`Multi-Lock Race Condition (${this.config.CONCURRENCY.TOTAL_CLIENTS} VUS)`);
        console.log(`${CLI.dim}Disparando lote paralelo. Todos os VUS tentarao comprar exatamente os mesmos ${this.config.PAYLOADS.TICKETS_TO_BUY} ingressos simultaneamente...${CLI.reset}\n`);
        
        const testStartTime = performance.now();
        const startTimestamp = Date.now();
        
        // Payload agora envia um Array (ticketIds)
        const payload = { ticketIds: this.state.targetTicketIds };

        const requests = Array.from({ length: this.config.CONCURRENCY.TOTAL_CLIENTS }).map(async (_, index) => {
            const clienteId = `VUS-${index.toString().padStart(2, '0')}`;
            const idempotencyKey = `stress-${startTimestamp}-${index}`;
            const reqHeaders = { ...this.headers, 'x-idempotency-key': idempotencyKey };

            try {
                // Modo silent para nao poluir o log concorrente
                const res = await this.dispatch({ method: 'POST', endpoint: '/checkout', payload, customHeaders: reqHeaders, silent: true });
                
                this.metrics.times.push(parseFloat(res.latency));
                this.metrics.successCount++;
                this.state.winnerResponse = res.data;
                
                return { Cliente: clienteId, Status: res.status, Latencia: `${res.latency}ms`, Resultado: 'COMPRA EM LOTE EFETIVADA' };
            } catch (err) {
                this.metrics.times.push(parseFloat(err.latency));
                this.metrics.failCount++;
                
                const msg = err.data?.message || err.message;
                this.metrics.errors[msg] = (this.metrics.errors[msg] || 0) + 1;

                if (!this.state.sampleError) this.state.sampleError = err.data;

                return { Cliente: clienteId, Status: err.status, Latencia: `${err.latency}ms`, Resultado: 'BLOQUEIO MULTI-LOCK' };
            }
        });

        this.resultsTable = await Promise.all(requests);
        this.metrics.totalDuration = performance.now() - testStartTime;
    }

    // ========================================================================
    // [ MODULO 5 ] AUDITORIA POS-VENDA
    // ========================================================================
    async modulePostSaleAudit() {
        this.printHeader('Post-Sale Audit (Atomic Decrement Validation)');
        
        const eventRes = await this.dispatch({ method: 'GET', endpoint: `/events/${this.state.eventId}` });
        this.state.estoqueFinal = eventRes.data.ticketsAvailable;
        
        // Se 1 compra foi processada com 3 ingressos, o estoque deve cair 3 unidades.
        const ingressosConsumidos = this.metrics.successCount * this.config.PAYLOADS.TICKETS_TO_BUY;
        const calculoEsperado = this.state.estoqueInicial - ingressosConsumidos;

        console.log(`\n${CLI.blue}[ AUDITORIA MATEMATICA E CACHE ]${CLI.reset}`);
        console.log(`- Estoque Pre-Corrida     : ${this.state.estoqueInicial}`);
        console.log(`- Lotes Aprovados         : ${this.metrics.successCount}`);
        console.log(`- Volume Total Consumido  : ${ingressosConsumidos} unidades`);
        console.log(`- Estoque Pos-Corrida     : ${this.state.estoqueFinal}`);
        console.log(`- Saldo Teorico Esperado  : ${calculoEsperado}`);

        if (this.state.estoqueFinal === calculoEsperado) {
            console.log(`\n${CLI.green}${CLI.bold}[ STATUS ] Sincronizacao validada. O comando DECRBY atuou perfeitamente na camada Redis.${CLI.reset}`);
        } else {
            console.log(`\n${CLI.red}${CLI.bold}[ ALERTA ] Divergencia no calculo de decrescimo em lote.${CLI.reset}`);
        }
    }

    // ========================================================================
    // [ RELATORIO FINAL E PERCENTIS ]
    // ========================================================================
    calculatePercentile(times, percentile) {
        if (times.length === 0) return 0;
        const sorted = [...times].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index].toFixed(2);
    }

    generateFinalReport() {
        const avgTime = (this.metrics.times.reduce((a, b) => a + b, 0) / this.metrics.times.length).toFixed(2);
        const throughput = (this.config.CONCURRENCY.TOTAL_CLIENTS / (this.metrics.totalDuration / 1000)).toFixed(2);
        const p95 = this.calculatePercentile(this.metrics.times, 95);
        const p99 = this.calculatePercentile(this.metrics.times, 99);

        this.printHeader('System Architectural Report (Executive Summary)');
        
        console.log(`${CLI.bold}1. LOG DE ACESSOS CONCORRENTES (MULTI-LOCK)${CLI.reset}`);
        console.table(this.resultsTable);

        console.log(`\n${CLI.bold}2. TELEMETRIA AVANCADA (SRE METRICS)${CLI.reset}`);
        console.log(`- Tempo Total de Execucao : ${this.metrics.totalDuration.toFixed(2)} ms`);
        console.log(`- Capacidade de Vazao     : ${throughput} req/seg`);
        console.log(`- Latencia Media          : ${avgTime} ms`);
        console.log(`- Latencia P95            : ${p95} ms (95% das req. estao abaixo deste limite)`);
        console.log(`- Latencia P99            : ${p99} ms (99% das req. estao abaixo deste limite)`);

        console.log(`\n${CLI.bold}3. INSPECAO DE PAYLOADS (RACE CONDITION RESOLUTION)${CLI.reset}`);
        console.log(`${CLI.green}[ EXTRATO DO VENCEDOR (DB TRANSACTION OK) ]${CLI.reset}`);
        console.log(CLI.dim + JSON.stringify(this.state.winnerResponse, null, 2) + CLI.reset);
        
        console.log(`\n${CLI.red}[ EXTRATO PADRAO DOS BLOQUEADOS (REDIS MULTI-LOCK REJECT) ]${CLI.reset}`);
        console.log(CLI.dim + JSON.stringify(this.state.sampleError, null, 2) + CLI.reset);

        console.log('\n================================================================================');
        if (this.metrics.successCount === 1) {
            console.log(`${CLI.green}${CLI.bold} [ APROVADO ] ARQUITETURA MULTI-LOCK VALIDADA. ZERO OVERBOOK EM LOTE. ${CLI.reset}`);
        } else {
            console.log(`${CLI.red}${CLI.bold} [ REPROVADO ] VAZAMENTO DE CONCORRENCIA. REVISE O LACO DO REDIS NO CONTROLLER. ${CLI.reset}`);
        }
        console.log('================================================================================\n');
    }
}

// Inicializacao do Motor de Testes
const QA = new QA_SystemTestSuite(CONFIG);
QA.execute();