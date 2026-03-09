

# BuyTicketSystem: Arquitetura Distribuída para Venda de Ingressos em Alta Concorrência

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Fastify](https://img.shields.io/badge/fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)

Este projeto foi desenvolvido com dedicação por Vini1009. Trata-se de uma API RESTful de alta performance projetada para resolver o problema clássico de *Race Conditions* (Condições de Corrida) e *Overbooking* em plataformas de venda de ingressos durante picos de tráfego.

## 1. Resumo Arquitetural

O sistema propõe uma arquitetura baseada no padrão **Fail-Fast**, utilizando processamento em memória para barrar requisições concorrentes antes que elas alcancem o banco de dados relacional. A aplicação suporta compras individuais e em lote (carrinho de compras), garantindo a integridade transacional (ACID) e a prevenção de cobranças duplicadas através de chaves de idempotência.

### Stack Tecnológica

* **Ambiente de Execução:** Node.js
* **Framework HTTP:** Fastify (Alta performance e validação de borda via JSON Schema)
* **Banco de Dados Relacional:** PostgreSQL 15
* **Banco de Dados em Memória:** Redis (Atomic Locks e Controle de Estoque)
* **ORM:** Prisma ORM (com `adapter-pg` para otimização de connection pool)
* **Infraestrutura:** Docker & Docker Compose
* **Segurança:** JSON Web Tokens (JWT) Stateless

---

## 2. Decisões de Engenharia e Design Patterns

A construção deste sistema foi pautada em padrões consolidados da engenharia de software para garantir resiliência e escalabilidade.

### 2.1. Controle de Concorrência (Multi-Lock Atômico)

Em cenários de venda de ingressos, múltiplas requisições (VUS - *Virtual Users*) tentam acessar o mesmo recurso simultaneamente. O sistema implementa o bloqueio iterativo (*Iterative Locking*) utilizando o comando `SET NX EX` do Redis. Se um lote de ingressos for requisitado, o sistema tenta travar todos os IDs na memória RAM. Caso apenas um ingresso do lote esteja indisponível, a operação sofre um *Graceful Rollback* imediato, liberando os demais recursos sem sobrecarregar o PostgreSQL.

### 2.2. Otimização de I/O e Inventário (Write-Through)

Para evitar o bloqueio do banco de dados com comandos `COUNT` frequentes durante picos de acesso, o inventário atua com o padrão *Write-Through*:

1. A geração de ingressos utiliza `createMany` (Bulk Insert) no Postgres e inicializa uma chave atômica no Redis.
2. A confirmação de compra dispara um comando atômico `DECRBY` no Redis.
3. Consultas de estoque leem o dado diretamente da memória (Complexidade O(1)), garantindo proteção contra *Stale Data*.

### 2.3. Transações de Banco de Dados (ACID)

As operações de alteração de status do ingresso e criação da transação financeira são encapsuladas em uma transação do Prisma (`$transaction`). Isso garante a regra do "Tudo ou Nada", evitando anomalias de dados em caso de falha de rede ou queda do serviço.

### 2.4. Design Patterns Aplicados

* **Controllers:** Isolamento da lógica de negócio.
* **Middlewares:** Interceptação isolada para Autenticação, Tratamento Global de Erros e Validação de Idempotência.
* **View / DTO (Data Transfer Object):** Camada de apresentação que filtra dados sensíveis e formata as respostas JSON, economizando largura de banda da rede.

---

## 3. Estrutura do Projeto

A organização de pastas reflete a separação de responsabilidades (SoC - *Separation of Concerns*):

```text
src/
├── Controllers/       # Lógica de negócio e orquestração de banco/cache
├── Middlewares/       # Camadas de interceptação (Auth, Error, Idempotency)
├── Prisma/            # Modelagem de dados e Migrations (schema.prisma)
├── Routes/            # Definição de endpoints e Schemas de validação de borda
├── View/              # Formatadores de saída (EventView, TicketView, TransactionView)
├── tests/             # Suíte de auditoria E2E e Stress Test
└── routes.js          # Agregador central de rotas
app.js                 # Ponto de entrada e configuração do servidor Fastify

```

---

## 4. Como Executar o Projeto

O ambiente é 100% conteinerizado. Siga os passos abaixo para inicializar a infraestrutura.

### 4.1. Inicialização

Na raiz do projeto, execute o comando para baixar as imagens e subir os containers (API, PostgreSQL e Redis):

```bash
docker-compose up -d --build

```

### 4.2. Migrações do Banco de Dados

Com os containers em execução, aplique as migrações para construir o schema do PostgreSQL:

```bash
docker-compose exec api npx prisma migrate dev

```

A API estará acessível em `http://localhost:3000` ou `http://127.0.0.1`.

---

## 5. Auditoria e Telemetria (Stress Test)

O projeto conta com uma suíte de testes E2E construída do zero, sem dependência de ferramentas externas como JMeter, comprovando o domínio sobre concorrência no ecossistema Node.js.

O módulo de auditoria executa as seguintes fases operacionais:

1. Handshake de Segurança (JWT).
2. Persistência e CRUD de Eventos.
3. *Cache Warm-up* e Inserção em Lote de Inventário.
4. **Race Condition Stress:** Disparo de `N` requisições estritamente simultâneas tentando comprar o mesmo lote de ingressos.
5. **Auditoria Matemática:** Validação do sincronismo do decréscimo atômico no Redis versus registros gravados no PostgreSQL.

Para executar o relatório de auditoria e visualizar as métricas de SRE (Latência, Vazão, P95, P99), execute:

```bash
npm run test

```

## 6. Endpoints Principais

| Método | Endpoint | Descrição | Acesso |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Autenticação e geração de JWT | Público |
| `GET` | `/api/events` | Listagem de eventos com estoque em cache | Autenticado |
| `POST` | `/api/events` | Criação de novos eventos | Admin |
| `POST` | `/api/tickets/bulk` | Geração de lotes de ingressos | Admin |
| `POST` | `/api/checkout` | Compra de ingressos (1 a 10 unidades) | Autenticado |

## Licença

Este projeto está licenciado sob a **PolyForm Noncommercial License 1.0.0**. 
Você é livre para estudar, modificar e distribuir o código para fins não comerciais (educação, pesquisa e uso pessoal). O uso do código para fins lucrativos ou em ambientes corporativos comerciais é estritamente proibido sem autorização prévia.

---

Created with 💙 by Vini1009.