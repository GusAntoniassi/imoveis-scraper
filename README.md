# Catalogue Alugueis

Coleção de scripts simples para extrair informações sobre alugueis de sites e organizar as informações em um CSV.

Sites suportados até o momento:
- Sub100

## Sub100
#### Pré requisitos:
Crie um arquivo de texto na raíz do projeto com todos os links dos imóveis, um em cada linha.

#### Utilização
```
node sub100.js <nome do arquivo txt>
```
### Capturar Links da Região de Maringá (por padrão irá filtrar imóvies entre R$600 e R$1500)

#### Utilização
```
node lib/capturarLinksMaringa.js
```

## Calcular Distância do Imóvel
Para que na planilha seja preenchido a distância do imóvel de determinado ponto de referência, é necessário ter um Token da API [Directions do Google Maps](https://developers.google.com/maps/documentation/directions/start?csw=1#get-a-key).

Após ter o Token em mãos, crie um arquivo `.env` na raíz do projeto ao molde do arquivo `.env.dist` e configure as variáveis de acordo.
