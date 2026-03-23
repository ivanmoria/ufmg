# T-MIRIM | Ivan Moriá Borges.

Sistema de análise rítmica e coleta de dados para musicoterapia desenvolvido como projeto de doutorado em Música na UFMG. 2026.

## Estrutura

```
app/
├── index.html              ← Entrada principal (abrir no navegador)
├── formulario.html         ← Formulário standalone (anamnese)
├── dass21.html             ← DASS-21 standalone
├── README.md
├── src.json                ← Prévia de dados
├── src.json.gz             ← Prévia de dados (compactado)
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

Online pelo navegador, com um sistema de uso gratuito por um período limitado.


## Funcionalidades

- **Formulários** — TCLE com assinatura digital + PDF, Anamnese completa, DASS-21 com 4 combinações de áudio
- **Análise rítmica** — processamento de CSVs MIDI, boxplots, séries temporais, correlações
- **DASS-21** — análise e visualização dos dados coletados
- **Participantes** — cards individuais com radar DASS e métricas detalhadas
