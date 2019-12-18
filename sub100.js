const readlines = require('n-readlines');
const $ = require('cheerio');
const path = require('path');
const fetch = require('node-fetch');
const Iconv = require('iconv').Iconv;
const iconv = new Iconv('iso-8859-1', 'utf8');
const { googleMapsToken, dadosCalcularDistancia } = require("./config");
const { error, warn, success, messageWithColor, Colors } = require("./lib/console-colorhelper");
const apiGoogleMaps = require("./lib/api-google-maps");
const CsvWriter = require("./lib/csv-writer");

if (process.argv.length < 3) {
    console.log('Utilização: node ' + process.argv[1] + ' <lista-de-links.txt>');
    process.exit(1);
}

if (dadosCalcularDistancia && !googleMapsToken) {
    console.warn(warn("Dados para calculo de distância foi informado, mas o Token para consulta à API da Google está vazio. A distância não será calculada!"));
}

const serviceCsv = new CsvWriter({
    fileName: path.join(__dirname, "imoveis_sub100.csv"),
    columnDelimiter: "|",
    lineDelimiter: "\n",
    columns: [
        {header: "Edifício", name: "edificio", default: ''},
        {header: "Andar", name: "andar", default: ''},
        {header: "Endereço", name: "endereco", default: ''},
        {header: "Bairro", name: "bairro", default: ''},
        {header: "Tamanho", name: "tamanho", default: ''},
        {header: "Quartos", name: "quartos", default: ''},
        {header: "Sacada", name: "sacada", default: ''},
        {header: "Aluguel", name: "aluguel", default: ''},
        {header: "Condomínio", name: "condominio", default: ''},
        {header: "Total", name: "total", default: ''},
        {header: "IPTU", name: "iptu", default: ''},
        {header: "Mobiliada", name: "mobiliada", default: ''},  // Não é preenchido automaticamente, melhor descobrir pelas fotos
        {header: "Garagem", name: "garagem", default: ''},
        {header: "Distância do trabalho", name: "distanciaOrigem", default: ''},
        {header: "Tempo Trajeto", name: "tempoTrajeto", default: ''},
        {header: "Link", name: "link", default: ''}
    ]
});

const filename = process.argv[2];
const liner = new readlines(filename);

/**
 * Método principal, declarado como função assíncrona
 * pra poder usar os awaits
 */
(async function() {
    console.time(messageWithColor("Tempo total", Colors.BgGreen, Colors.FgBlack));

    let lineNumber = 0;
    let line;
    while (line = liner.next()) {
        try {
            lineNumber++;

            console.time(success("Tempo gasto"));

            console.log(success(`Iniciando consulta (${lineNumber})`));

            const url = line.toString();

            if (!url) {
                break;
            }
            
            console.log(`Buscando informações do link [${url}]`);
            const html = await getHtml(url);

            console.log(`Extraindo informações da página...`);
            const info = await getInfo(html, url);

            if (!info) {
                break;
            }

            console.log(`Gravando resultado em CSV...`);

            await serviceCsv.write(info);

            console.timeEnd(success("Tempo gasto"));
            
            console.log("\n" + "-".repeat(100) + "\n");
        } catch (e) {
            console.error(error('Falhou: '), e);
            return;
        }
    }

    serviceCsv.close();
    
    console.timeEnd(messageWithColor("Tempo total", Colors.BgGreen, Colors.FgBlack));
})();

/**
 * Faz uma requisição GET a uma determinada URL
 * e retorna seu conteúdo (HTML)
 */
async function getHtml(url) {
    return fetch(url, {
        method: 'get',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng;q=0.8,application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Cookie': 'getestado=PR;',
            'Host': 'www.sub100.com.br',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36',
        },
    })
    .then(res => res.arrayBuffer())
    .then(arrayBuffer => iconv.convert(Buffer.from(arrayBuffer), 'utf-8').toString())
}

/**
 * Extrai as informações do HTML utilizando o Cheerio
 */
async function getInfo(html, url) {
    const info = {};

    info.link = url;

    // Valor do aluguel
    info.aluguel = $('.ficha_dadosprincipais_titulo .texto_cinza16', html).text().replace('R$ ', '');

    // Valor do condomínio e do IPTU
    const condominioIptu = $('.ficha_dadosprincipais_titulo .texto_cinza11', html).text();
    const matchIptu = condominioIptu.match(/IPTU: R\$ ([0-9,]+)/);

    if (matchIptu) {
        info.iptu = matchIptu[1].trim();
    }

    const matchCondominio = condominioIptu.match(/condom.nio: R\$ ([0-9,]+)/);
    if (matchCondominio) {
        info.condominio = matchCondominio[1].trim();
    }

    // Informações sobre o edifício e localização
    info.edificio = $('.ficha_dadosprincipais_informacoes_maior', html).eq(0).find('span').text().trim();
    info.andar = $('.ficha_dadosprincipais_informacoes_menor', html).eq(1).find('span').text().trim();
    info.endereco = $('.ficha_dadosprincipais_informacoes_maior', html).eq(1).find('span').text().trim();
    info.bairro = $('.ficha_dadosprincipais_informacoes_medio', html).eq(0).find('span').text().trim();
    // info.cidade = $('.ficha_dadosprincipais_informacoes_medio', html).eq(1).find('span').text().trim();
    
    // Tamanho da área privativa / útil
    const descricaoGeral = $('.ficha_dadosprincipais', html).text();
    const matchTamanho = descricaoGeral.match(/.rea (?:privativa|.til): (.*?) m²/);
    if (matchTamanho) {
        info.tamanho = matchTamanho[1] + 'm²';
    }

    // Número de quartos
    const fichaComodos = $('.ficha_comodos', html).text();
    const matchDormitorios = fichaComodos.match(/(\d+) dormit.rio/);
    if (matchDormitorios) {
        info.quartos = matchDormitorios[1];
    }

    // Preenche o campo observações com tudo o que estiver na área de detalhes
    // info.observacoes = $('.ficha_detalhes', html).eq(0).text();

    // Garagem, coberta ou descoberta
    const informacoesComplementares = $('.ficha_detalhes', html).eq(1).text();
    const matchGaragem = informacoesComplementares.match(/Garagen\(s\) (coberta|descoberta)\(s\): (.*)/);
    if (matchGaragem) {
        const textoGaragem = matchGaragem[1];
        info.garagem = `${textoGaragem.charAt(0).toUpperCase()}${textoGaragem.slice(1)} (${matchGaragem[2]})`;
    }

    // Retorna que o apartamento possuí Sacada, caso a palavra exista na descrição do imóvel (abordagem ingênua, mas obtem resultados ok)
    info.sacada = $('#estrutura_conteudo', html).text().indexOf("sacada") > -1 ? "Sim" : "Não";

    if (dadosCalcularDistancia && googleMapsToken && info.endereco) {
        const dadosTrajeto = await apiGoogleMaps.getDadosTrajetoMaisCurto(info);
        if (dadosTrajeto) {
            info.distanciaOrigem = dadosTrajeto.distance.text;
            info.tempoTrajeto = dadosTrajeto.duration.text;
        }
    }

    const total = parseFloat(info.aluguel) + (parseFloat(info.condominio) || 0.0);

    info.total = total || '';

    return info;
}
