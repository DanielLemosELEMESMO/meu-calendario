# Documento de Experiência do Usuário (UX)

Este documento descreve a experiência de usuário e os princípios de design para o aplicativo MeuCalendario, com base no feedback do usuário.

## 1. Filosofia Principal: Foco no Agora

O design da aplicação deve ser centrado em ajudar o usuário a entender o que ele deveria estar fazendo **agora**, o que ele deixou para trás, e o que vem a seguir. A interface deve ser limpa, sutil e evitar ruído visual desnecessário, revelando informações e ações de forma contextual.

## 2. Hierarquia de Visualizações

1.  **Visualização Primária: "Foco" (Ontem, Hoje, Amanhã)**
    - Esta é a tela principal e o coração da experiência.
    - Será composta por 3 colunas lado a lado.

2.  **Visualização Secundária: Semana**
    - Uma visão de 7 dias padrão.

3.  **Visualização Terciária: Mês**
    - Uma visão mensal padrão, com a possibilidade futura de filtros (ex: filtrar por calendário específico).

## 3. A Visualização "Foco" em Detalhes

### Layout
- **Três Colunas:** "Ontem", "Hoje", "Amanhã".
- Cada coluna exibe os eventos do respectivo dia em um layout de agenda (blocos de tempo).

### Foco no Momento Atual
- **Scroll Automático:** Ao carregar a tela, a visualização deve rolar automaticamente para que o indicador de hora atual (uma linha ou "ampulheta") fique posicionado entre o meio e a parte superior da tela, garantindo visibilidade imediata do compromisso atual.
- **Animação de Destaque Inicial:** No primeiro carregamento, o evento que está ocorrendo no momento deve ter uma breve animação (ex: um "pulso" de cor ou um brilho na borda) para atrair a atenção do usuário. Após a animação, o evento volta ao seu estado visual normal.

### Ciclo de Vida e Interação do Evento

#### Estado de Conclusão
- Um evento pode ser marcado como "concluído". Esta é uma propriedade central da experiência.
- **Indicador Visual de Conclusão:**
    - **Se concluído:** Um ícone de checkmark (`✓`) sutil é exibido ao lado do título do evento.
    - **Se pendente:** Nenhum ícone é exibido.
- **Mecânica para Marcar como Concluído:**
    1.  O usuário passa o mouse sobre um bloco de evento.
    2.  Ao fazer o hover, um controle de checkbox (`[ ]`) aparece dentro do bloco.
    3.  O usuário clica no checkbox para marcar o evento como concluído. O checkbox então se torna permanentemente um checkmark estático (`✓`).

#### Densidade da Informação
- **Visão Geral:** Por padrão, cada bloco de evento no calendário exibe apenas o **título** do evento.
- **Detalhes:** A **descrição** completa e outras informações do evento só são exibidas em duas situações:
    1.  Quando o usuário interage com o bloco (clique ou talvez hover por um tempo maior).
    -   Para o evento que está ocorrendo no momento (o evento "em foco").

## 4. Fluxo de Criação de Eventos

- **Gatilho:** O usuário pode clicar e arrastar em um espaço de tempo vazio em qualquer visualização de agenda (Foco, Semana, Dia).
- **Ação:** Esta ação não abre um pequeno pop-up. Em vez disso, ela transiciona o usuário para uma **tela de edição dedicada** (ou um modal grande) onde ele pode preencher o título, descrição e outros detalhes do evento de forma confortável.
```
