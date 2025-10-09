# Documento de Arquitetura - Telemetria Pioneira

## 1. Visão Geral

O sistema **Telemetria Pioneira** é uma plataforma para coleta, processamento e visualização de dados de telemetria. A arquitetura foi projetada para ser modular, escalável e resiliente, utilizando um monorepo para gerenciar os diferentes componentes da aplicação.

## 2. Arquitetura de Alto Nível

A aplicação é dividida em três componentes principais:

- **Frontend:** Uma aplicação Next.js responsável pela interface do usuário.
- **Backend:** Uma API Restful em Fastify que serve os dados para o frontend.
- **Workers:** Processos em background que realizam a ingestão de dados da API da MiX Telematics.

![Arquitetura de Alto Nível](https://i.imgur.com/9v4Y4Gk.png)

## 3. Fluxo de Dados

O fluxo de dados do sistema é o seguinte:

1.  **Ingestão de Dados:** Os workers consomem a API da MiX Telematics em intervalos regulares para buscar novos dados de telemetria.
2.  **Processamento e Armazenamento:** Os dados brutos são processados, transformados e armazenados no banco de dados PostgreSQL.
3.  **Exposição dos Dados:** O backend consulta o banco de dados e expõe os dados através de uma API Restful.
4.  **Visualização:** O frontend consome a API do backend e apresenta os dados ao usuário de forma organizada.

## 4. Arquitetura do Backend

O backend é uma aplicação TypeScript com Fastify, estruturada em módulos para uma melhor organização do código. Cada módulo é responsável por uma funcionalidade específica do sistema.

### Módulos Principais

- **`auth`:** Gerencia a autenticação, registro e controle de acesso.
- **`drivers`:** Fornece informações sobre os motoristas.
- **`etl`:** Controla os processos de ingestão de dados.
- **`users`:** Gerencia os usuários do sistema.

## 5. Arquitetura do Banco de Dados

O banco de dados PostgreSQL é a fonte única da verdade para a aplicação. O esquema foi projetado para ser normalizado e eficiente, com tabelas para armazenar informações sobre motoristas, veículos, eventos de telemetria e outros dados relevantes.

### Tabelas Principais

- **`drivers`:** Armazena informações sobre os motoristas.
- **`vehicles`:** Armazena informações sobre os veículos.
- **`telemetry_events`:** Armazena todos os eventos de telemetria coletados.
- **`users`:** Armazena os usuários do sistema.

## 6. Workers de Ingestão de Dados

Os workers são processos Node.js que utilizam a biblioteca BullMQ para gerenciar filas de tarefas. Existem dois tipos de workers:

- **Worker de Sincronização de Dados Mestres:** Responsável por sincronizar dados de motoristas, veículos e tipos de eventos.
- **Worker de Ingestão de Eventos:** Responsável por coletar novos eventos de telemetria em tempo real.

## 7. Decisões de Design

- **Monorepo:** A utilização de um monorepo com `pnpm` e `turbo` simplifica o gerenciamento de dependências e a execução de tarefas em todo o projeto.
- **Containerização com Docker:** O uso de Docker para containerizar a aplicação facilita o deploy e garante a consistência entre os ambientes de desenvolvimento e produção.
- **API Restful com Fastify:** O Fastify foi escolhido por sua alta performance e baixo overhead, ideal para uma API que precisa lidar com um grande volume de requisições.
- **Workers com BullMQ:** O BullMQ oferece uma solução robusta e escalável para o gerenciamento de filas e tarefas em background.