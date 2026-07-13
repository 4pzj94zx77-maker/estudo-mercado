# Estudo Mercado

Calculadora simples de valor indicativo de imóveis para apresentação a clientes.

## Como usar

No macOS, abre `Abrir aplicação.command`. O lançador inicia um servidor apenas no computador e abre a aplicação em `http://127.0.0.1:8765`.

Não abras diretamente `index.html` através de um endereço `file://`. Os navegadores bloqueiam os módulos de leitura de PDF e OCR nesse modo.

## Publicação online

Este projeto é estático. Depois de enviado para o GitHub, pode ser publicado em:

`Settings` -> `Pages` -> `Deploy from a branch` -> `main` -> `/root`

O ficheiro principal é `index.html`.

## Leitura de cadernetas

A aplicação tenta primeiro extrair a camada de texto do PDF. Quando o documento é uma digitalização, utiliza OCR local em português através do Tesseract.js. O PDF e os dados reconhecidos permanecem no navegador e não são enviados para serviços externos.

O OCR pode demorar alguns segundos por página. Todos os campos encontrados devem ser confirmados antes de serem aplicados ao estudo.

Dependências incluídas localmente:

* PDF.js 5.6.205
* Tesseract.js 7.0.0
* Tesseract.js Core 7.0.0
* Dados de idioma português do Tesseract.js 1.0.0
