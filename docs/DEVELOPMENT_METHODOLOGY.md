# Metodologia: Ciclo de Desenvolvimento de Versão (CDV)

Este documento descreve o ciclo de desenvolvimento adotado pelo projeto, focado em entregas incrementais, versionadas e com alta qualidade de código, seguindo os princípios SOLID. O processo utiliza exclusivamente a documentação em Markdown e o versionamento com Git.

Este ciclo é repetido para cada nova versão do software (ex: v0.1.0, v0.2.0, v1.0.0).

---

## Fase 1: Planejamento e Desenho (Documentação)

Nenhuma implementação começa sem um plano claro e aprovado.

1.  **Criação do Plano de Versão:** Para cada nova versão, um "Plano de Versão" será criado pelo agente em um novo arquivo. O padrão do nome do arquivo é `docs/versions/vX.X.X.md` (ex: `v0.1.0.md`).

2.  **Conteúdo do Plano de Versão:** Este documento é a fonte da verdade para a versão e deve conter:
    *   **Objetivos:** Uma descrição clara do que se espera alcançar com esta versão (ex: "Implementar autenticação de usuário", "Corrigir bugs de sincronização").
    *   **Escopo Detalhado:** Uma lista de novas funcionalidades (`feat`), correções (`fix`) e refatorações (`refactor`) planejadas.
    *   **Análise de Arquitetura e SOLID:** Uma seção dedicada a explicar como as mudanças propostas irão aderir ou melhorar os princípios SOLID.
        *   **Exemplo:** "A nova classe `GoogleAuthService` seguirá o **Princípio da Responsabilidade Única (SRP)**, cuidando exclusivamente da lógica de autenticação OAuth 2.0 e da renovação de tokens, separando-a das outras lógicas de negócio."

3.  **Aprovação do Usuário:** O agente apresentará o plano para sua revisão e aprovação explícita antes de iniciar o desenvolvimento.

## Fase 2: Implementação (Git)

Com o plano aprovado, o desenvolvimento começa de forma estruturada.

1.  **Criação da Branch de Release:** O agente criará uma nova branch no Git a partir da `main`, seguindo o padrão `release/vX.X.X` (ex: `release/v0.1.0`). Todo o trabalho para a versão será concentrado nesta branch.

2.  **Desenvolvimento Guiado pelo Plano:** O agente implementará as tarefas exatamente como descrito no Plano de Versão, garantindo que o código reflita o desenho arquitetural proposto.

3.  **Commits Padronizados:** Todos os commits devem seguir o padrão **[Conventional Commits](https://www.conventionalcommits.org/)**.

4.  **Rastreabilidade:** O Plano de Versão pode ser atualizado para refletir o progresso, com links para commits ou Pull Requests específicos, se necessário.

## Fase 3: Revisão (Git e Documentação)

A revisão é uma etapa formal para garantir a qualidade antes da integração.

1.  **Abertura do Pull Request (PR):** Ao final do desenvolvimento, o agente abrirá um Pull Request da branch de release (`release/vX.X.X`) para a `main`.

2.  **Descrição Detalhada do PR:** A descrição do PR será preenchida com:
    *   Um sumário das alterações realizadas.
    *   Um link para o respectivo Plano de Versão em `docs/versions/`.
    *   Um resumo de como os princípios SOLID foram aplicados na prática.

3.  **Revisão do Usuário:** Você revisa as alterações propostas no PR. O agente deve estar preparado para explicar as decisões de implementação e realizar os ajustes solicitados.

## Fase 4: Lançamento (Git)

Após a aprovação final, a versão é oficialmente lançada.

1.  **Merge:** O Pull Request é mesclado na branch `main`.

2.  **Criação da Tag de Versão:** O agente criará uma tag imutável no Git para marcar o ponto exato da versão. O comando utilizado será `git tag -a vX.X.X -m "Release vX.X.X"`.

3.  **Atualização do Changelog:** O agente atualizará o arquivo `CHANGELOG.md` na raiz do projeto, adicionando uma nova seção para a versão recém-lançada e resumindo as principais mudanças (features, fixes, etc.).
