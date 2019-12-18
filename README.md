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

### Capturar Links da Região de Maringá

#### Utilização

```
node lib/capturarLinksMaringa.js --valorinicial 650 --valorfinal 1250 --tipo locacao
```

Utilize `node scripts/capturarLinksMaringa.js --help` para ver todas opções.


## Calcular Distância do Imóvel
Para que na planilha seja preenchido a distância do imóvel de determinado ponto de referência, é necessário ter um Token da API [Directions do Google Maps](https://developers.google.com/maps/documentation/directions/start?csw=1#get-a-key).

Após ter o Token em mãos, crie um arquivo `.env` na raíz do projeto ao molde do arquivo `.env.dist` e configure as variáveis de acordo.

## Configuração do Ambiente

O projeto utiliza a biblioteca `iconv` para fazer conversão de caracteres. A instalação dessa biblioteca, utiliza internamente o `node-gyp`, que por sua vez, depende do `Python` e de ferramentas de build do `C++`.

Caso algum erro relacionado às ferramentas acima ocorra, siga o tutorial de instalação do `node-gyp` de acordo com o **SO** utilizado: https://github.com/nodejs/node-gyp