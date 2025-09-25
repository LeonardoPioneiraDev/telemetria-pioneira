### **Documento Mestre de Arquitetura e Implementação**

#### 1. Visão Geral da Arquitetura

O sistema é construído sobre três pilares principais:

- **Processos de Ingestão de Dados (ETL):** Workers em background (usando **BullMQ** e **Redis**) que são os únicos responsáveis por consumir a API da MiX Telematics.
- **Banco de Dados (PostgreSQL):** Nossa fonte única de verdade. Armazena todos os dados de telemetria e de apoio, já tratados e organizados.
- **Backend (API Restful):** A camada de serviço (**Fastify** e **TypeScript**) que atende às requisições do nosso frontend, consultando **apenas o nosso banco de dados local**, garantindo performance e disponibilidade.

#### 2. Estratégia de Ingestão de Dados (ETL)

Adotamos uma arquitetura com dois tipos de workers para máxima eficiência:

- **Worker de Sincronização de Dados de Apoio (Baixa Frequência):**
  - **Responsabilidade:** Manter as tabelas `drivers`, `vehicles` e `event_types` atualizadas.
  - **Execução:** Roda uma vez por dia (agendado via `node-cron`).
  - **Lógica:** Busca a lista completa de cada recurso na API da MiX e realiza uma operação de "upsert" (atualiza se já existe, insere se for novo) em nosso banco.

- **Worker de Ingestão de Eventos (Alta Frequência):**
  - **Responsabilidade:** Capturar todos os novos eventos de telemetria e salvar na tabela `telemetry_events`. É o coração do sistema.
  - **Execução:** Roda a cada minuto (agendado via `node-cron`).
  - **Lógica:**
    1.  Usa o endpoint `.../events/groups/createdsince/...`.
    2.  Gerencia o `sincetoken`, salvando o progresso a cada página processada na tabela `etl_control` para garantir resiliência.
    3.  Respeita o limite de 20 requisições/minuto da API adicionando uma pausa estratégica (`delay`) entre as chamadas de paginação quando `HasMoreItems` for verdadeiro.
    4.  Filtra eventos duplicados (cujo `external_id` já existe no banco) antes de tentar a inserção, tornando o processo resiliente a falhas e reinicializações.

#### 3. Estrutura do Banco de Dados

As seguintes tabelas foram definidas (e implementadas como Entidades do TypeORM):

- `drivers`, `vehicles`, `event_types`: Tabelas de apoio para armazenar os dados de motoristas, veículos e o catálogo de eventos.
- `telemetry_events`: Tabela principal e desacoplada. Armazena cada evento de telemetria. **Não possui chaves estrangeiras diretas**, mas sim as colunas `driver_external_id`, `vehicle_external_id`, etc., para garantir que **100% dos eventos sejam salvos**, independentemente do estado das tabelas de apoio.
- `api_credentials`: Tabela de controle para armazenar o `access_token` e `refresh_token` da API da MiX.
- `etl_control`: Tabela de controle para gerenciar o estado dos nossos workers (o `last_successful_sincetoken`).

#### 4. Consumo da API Externa (MiX Telematics)

- **Autenticação:** Implementamos o "Refresh Token Flow". Nossa aplicação faz o login com senha apenas uma vez. Depois, usa o `refresh_token` para obter novos `access_tokens` automaticamente sempre que necessário, de forma segura e eficiente.
- **Tratamento de Números Grandes (BigInt):** Usamos a biblioteca `json-bigint` para fazer o parse das respostas da API, garantindo que os IDs de 64 bits sejam convertidos para `string` em nosso código, preservando 100% da sua precisão ao salvar no banco.

#### 5. Plano da API para o Frontend

- **Endpoint de Busca (Implementado):** `GET /api/drivers?search=...`
  - **Função:** Permite que o frontend busque motoristas por nome.
  - **Lógica:** Consulta a tabela `drivers` do nosso banco de dados local. É protegido e requer autenticação.

- **Próximos Endpoints (A Implementar):**
  - `GET /api/drivers/{driverId}/infractions`: A rota principal que buscará no nosso banco todos os eventos de um motorista que definirmos como "infrações", retornando os dados formatados para o formulário.
