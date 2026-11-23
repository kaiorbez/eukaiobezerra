# Como usar este pacote no Claude Code

## O que tem aqui

- **PRD.md** — o documento inteiro. É este arquivo que o Claude Code lê.
- **imagens/modelo-de-dados.png** — o diagrama das 5 tabelas.
- **imagens/fases-de-entrega.png** — as 4 fases e os portões de cada uma.
- **imagens/referencia-meu-dinheiro.png** — a tela do Meu Dinheiro Web que serve de referência de layout.

O PRD.md já traz o conteúdo dos dois diagramas em texto, então ele funciona sozinho.
As imagens servem para você conferir e para anexar quando quiser mostrar o layout.

## O jeito mais direto

1. Descompacte a pasta dentro do projeto novo (ou crie a pasta e descompacte lá).
2. Abra o Claude Code nessa pasta.
3. Mande:

```
Leia PRD.md. Vamos construir só a Fase 1.
Antes de escrever código, me devolva o plano de arquivos e o schema SQL para eu aprovar.
```

## Por que fase por fase

O PRD tem 4 fases e cada uma termina com uma verificação objetiva (seção 8).
Pedir o sistema inteiro de uma vez costuma render muito código que não fecha conta.
Peça uma fase, rode os critérios de aceite daquela fase, só então siga.

## As duas regras que não podem ser quebradas

Se o Claude Code propuser qualquer uma destas, recuse:

1. Guardar valor já convertido no banco, ou uma coluna "valor_em_reais" ao lado do valor original.
2. Somar as duas moedas em um total único sem dizer qual taxa foi usada.

A seção 3 do PRD explica o porquê. É de lá que vem todo o resto.
