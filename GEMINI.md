# Biblios - Sistema de Gestão de Biblioteca Pessoal

Este projeto é um indexador e rastreador de biblioteca pessoal (Biblios), projetado para catalogar livros, visualizar estatísticas de leitura e explorar uma coleção através de um mapa interativo.

## 🚀 Visão Geral e Arquitetura

O **Biblios** é uma aplicação React moderna focada em uma experiência de usuário rica e estética "Glassmorphic". O diferencial arquitetural é o seu sistema de persistência "backend-less" que utiliza um plugin customizado do Vite para sincronizar dados diretamente com o sistema de arquivos local.

### Tecnologias Principais
- **Frontend**: React 19, Vite 8.
- **Estilização**: Bootstrap 5 (com temas customizados) e Lucide-React para ícones.
- **Gráficos**: Recharts para o dashboard de análise.
- **Dados**: JSON (`src/data/data.json`) e CSV (`data.csv`) como fontes de verdade.

## 🛠️ Comandos e Execução

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento com o plugin de sincronização ativo. |
| `npm run build` | Compila o projeto para produção. |
| `npm run lint` | Executa o ESLint para verificar a qualidade do código. |
| `npm run test` | Executa a suíte de testes unitários com Vitest. |
| `npm run preview` | Visualiza o build de produção localmente. |

> **Nota**: O servidor de desenvolvimento expõe APIs em `/api/books` e `/api/books/sync` através do plugin `localDatabasePlugin` definido em `vite.config.js`. Este plugin também realiza uma sincronização automática do `data.csv` para o `data.json` no startup.

## 📂 Estrutura de Diretórios

- `src/components/`: Contém os módulos da interface (Dashboard, Tabela, Mapa, Relatórios).
- `src/utils/`: Utilitários compartilhados e lógica de negócio testável.
    - `dataUtils.js`: Contém o parser de CSV, lógica de auto-reparo e mapeamento geográfico baseado no UN Geoscheme.
- `src/data/`: Diretório central de dados e ferramentas de manutenção.
    - `data.json`: A base de dados principal (agora inclui a coluna `region`).
- `data.csv`: Exportação/Sincronização em formato CSV (agora inclui a coluna `Region`).
- `un-geoscheme-subregions-countries.json`: Fonte de dados para o mapeamento automático de regiões geográficas.

## 💡 Convenções e Práticas de Desenvolvimento

1. **Sincronização de Dados**: Todas as alterações feitas na interface são refletidas tanto no `localStorage` do navegador quanto nos arquivos locais (`data.json` e `data.csv`).
2. **Geografia Automatizada**: O sistema utiliza o UN Geoscheme para determinar automaticamente a **Região** e o **Continente** com base no país do livro. Esta lógica está em `getGeoInfo` dentro de `src/utils/dataUtils.js`.
3. **Reparo de Dados**: O sistema possui uma lógica de auto-reparo (`repairBooksList`) que enriquece livros existentes com dados de região e corrige inconsistências históricas.
3. **Testes**: Utilizamos **Vitest** para testes unitários. Novos utilitários ou lógicas de transformação de dados devem ser acompanhados de arquivos `.spec.js`.
4. **Estética Glassmorphic**: O design utiliza transparências, desfoque de fundo (backdrop-filter) e bordas suaves, seguindo um estilo visual moderno e polido.
4. **Filtros e Busca**: A filtragem é centralizada e compartilhada entre as visualizações de tabela, mapa e relatórios.

## 🐍 Ferramentas de Manutenção (Python)

Localizadas em `src/data/`, estas ferramentas são essenciais para a saúde da base de dados:
- `enrich_data.py`: Mapeia países para idiomas e adiciona metadados.
- `download_metadata.py`: Integração com APIs externas (ex: OpenLibrary) para buscar capas e descrições.
- `merge_calibre.py`: Facilita a integração com bibliotecas do software Calibre.

---
*Este arquivo GEMINI.md serve como contexto instrucional para o agente AI e deve ser atualizado sempre que houver mudanças significativas na arquitetura ou fluxos de trabalho do projeto.*
