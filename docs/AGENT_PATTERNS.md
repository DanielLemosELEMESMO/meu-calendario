# Padrões de Operação para Agentes de IA

Este documento define um conjunto de diretrizes e padrões que o agente de IA deve seguir durante o desenvolvimento deste projeto. O objetivo é garantir clareza, consistência, rastreabilidade e alta qualidade nas implementações.

## 1. Documentação Primeiro (Docs-First)

- **Diretriz:** Nenhuma implementação de nova feature ou refatoração complexa deve começar sem antes haver uma documentação (arquivo `.md`) que a descreva.
- **Processo:**
    1.  Discutir a necessidade com o usuário.
    2.  Criar ou atualizar um documento em Markdown detalhando o plano (arquitetura, impacto, passos da implementação).
    3.  Aguardar a aprovação explícita do usuário sobre a documentação.
    4.  Iniciar a implementação somente após a aprovação.

## 2. Gestão de Tarefas com TODOs

- **Diretriz:** Qualquer tarefa que necessite de mais de um passo lógico deve ser gerenciada através de uma lista de TODOs.
- **Processo:**
    1.  No início de uma tarefa complexa, criar uma lista detalhada de subtarefas.
    2.  Manter a lista atualizada em tempo real, marcando o status (`pending`, `in_progress`, `completed`, `cancelled`) de cada item a cada passo.

## 3. Padrão de Commits e Mudanças

- **Diretriz:** Todas as mudanças no código-fonte devem ser descritas usando um formato inspirado no **[Conventional Commits](https://www.conventionalcommits.org/)**.
- **Processo:** Ao usar ferramentas para modificar ou criar arquivos, a descrição da ação deve ser prefixada com um dos seguintes tipos:
    - `feat:` (uma nova funcionalidade)
    - `fix:` (uma correção de bug)
    - `docs:` (mudanças na documentação)
    - `style:` (formatação, ponto e vírgula, etc; sem mudança de lógica)
    - `refactor:` (refatoração de código, sem alterar a funcionalidade externa)
    - `test:` (adicionar ou corrigir testes)
    - `chore:` (atualização de tarefas de build, configs, etc; não relacionado a código)

## 4. Consistência com o Projeto

- **Diretriz:** O agente deve priorizar a consistência sobre suas próprias preferências.
- **Processo:**
    1.  Antes de adicionar ou modificar código, o agente deve ler os arquivos adjacentes e a configuração do projeto (`.eslintrc`, `prettier.config.js`, etc.).
    2.  O novo código deve seguir estritamente o estilo, as convenções de nomenclatura e os padrões arquiteturais já presentes no projeto.

## 5. Cultura de Testes

- **Diretriz:** Código novo deve ser testável e, sempre que possível, acompanhado por testes.
- **Processo:**
    - `feat:`: A implementação de uma nova feature deve incluir a criação de testes que validem seu comportamento.
    - `fix:`: Uma correção de bug deve, idealmente, ser acompanhada de um teste de regressão que falharia sem a correção e passa com ela.

## 6. Ciclo de Desenvolvimento de Versão (CDV)

O projeto segue um ciclo de desenvolvimento rigoroso para cada nova versão, focado em planejamento, qualidade (SOLID) e rastreabilidade.

A metodologia completa está detalhada no documento [**DEVELOPMENT_METHODOLOGY.md**](./DEVELOPMENT_METHODOLOGY.md). É obrigatório seguir as fases de Planejamento, Implementação, Revisão e Lançamento descritas nele para todas as entregas de novas versões.
