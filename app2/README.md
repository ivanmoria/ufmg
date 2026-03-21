# T-MIRIM | Musicoterapia

Sistema de análise rítmica e coleta de dados para musicoterapia.

## Estrutura

```
tmirim-app/
├── index.html              ← Entrada principal (abrir no navegador)
├── formulario.html         ← Formulário standalone (anamnese)
├── dass21.html             ← DASS-21 standalone
├── README.md
├── css/
│   └── app.css             ← Estilos completos
└── js/
    ├── core/
    │   ├── state.js        ← Estado global
    │   ├── utils.js        ← Utilitários e math
    │   ├── nav.js          ← Navegação entre abas
    │   ├── theme.js        ← Tema claro/escuro
    │   └── anon.js         ← Anonimização
    ├── data/
    │   └── loader.js       ← Carregamento CSV/DASS
    └── pages/
        ├── agrupar.js      ← Aba Agrupar
        ├── analisar.js     ← Aba Analisar
        ├── explorar.js     ← Aba Explorar
        ├── visualizar.js   ← Aba Visualizar
        ├── timing.js       ← Aba Erro Temporal
        ├── dass.js         ← Aba DASS-21 (análise)
        ├── report.js       ← Aba Relatório
        ├── participantes.js← Aba Participantes
        ├── forms.js        ← Aba Formulários (TCLE + Anamnese + DASS-21)
        └── ritmic.js       ← Aba Testes Rítmicos [stub]
```

## Como usar

Precisa de um servidor local (CORS):

```bash
# Python
cd tmirim-app && python3 -m http.server 8080
# Acesse: http://localhost:8080

# Node.js
npx serve tmirim-app

# VS Code: instale "Live Server" e clique em "Go Live"
```

## Funcionalidades

- **Sidebar colapsável** — botão ◀ no rodapé recolhe o menu
- **Formulários** — TCLE com assinatura digital + PDF, Anamnese completa, DASS-21 com 4 combinações de áudio
- **Análise rítmica** — processamento de CSVs MIDI, boxplots, séries temporais, correlações
- **DASS-21** — análise e visualização dos dados coletados
- **Participantes** — cards individuais com radar DASS e métricas detalhadas
