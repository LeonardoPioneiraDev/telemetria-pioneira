## **Consumo de Eventos por Organização (Streaming)**

GET /api/events/groups/createdsince/organisation/{orgId}/sincetoken/{sinceToken}/quantity/{quantity}

Este endpoint serve para recuperar eventos para uma organização inteira, criados a partir de um `timestamp` específico (`sinceToken`)[cite: 337]. Ele foi projetado para streaming de dados, onde você busca novos registros de forma incremental.

### **Regras e Mecanismo de Consumo**

- **Limite do `sinceToken`:** O `sinceToken` (timestamp) informado não pode ter mais de **7 dias** de antiguidade[cite: 337].
- **Paginação e Continuação:** A resposta da API indicará se há mais dados disponíveis para serem buscados através da propriedade ou cabeçalho **`HasMoreItems`**[cite: 338]. Para buscar o próximo lote de dados, você deve usar o token fornecido na propriedade ou cabeçalho **`GetSinceToken`** da resposta anterior[cite: 339].
- **Lógica de Chamada:** Sua aplicação deve chamar este método repetidamente (em um loop) enquanto a resposta indicar que `HasMoreItems` é `TRUE`, sempre passando o `GetSinceToken` da última chamada como o `sinceToken` da próxima[cite: 340].
- **Limite de Taxa (Rate Limit):** Quando a resposta retornar com `HasMoreItems` como `FALSE`, significa que todos os dados disponíveis foram recuperados. Neste ponto, sua aplicação **deve esperar um mínimo de 30 segundos** antes de fazer uma nova chamada para verificar se há novos dados[cite: 341].

- **`HasMoreItems`: true ** Quando a resposta retornar com `HasMoreItems` como `TRUE`, significa que há dados disponíveis a ser foram recuperados. Neste ponto, sua aplicação **deve respeitar a regra de não fazer mais de 20 chamadas por minuto** antes de fazer uma nova chamada para recuperar os dados mais recentes.
