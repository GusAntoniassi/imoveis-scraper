const fs = require('fs');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const Iconv = require('iconv').Iconv;
const iconvFromIsoToUf8 = new Iconv('iso-8859-1', 'utf8');
const moment = require("moment");
const argv = require("yargs");

const args = argv.option('valorinicial', {
    type: 'number',
    description: 'Valor inicial dos apartamentos',
    default: 650
  })
  .option('valorfinal', {
    type: 'number',
    description: 'Valor final dos apartamentos',
    default: 1250
  })
  .option('tipo', {
    choices: ['locacao', 'venda'],
    description: 'Tipo de apartamento sendo filtrado',
    default: "locacao"
  })
  .help()
  .argv;

(async function () {
    try {
        console.log("Capturando total de páginas.. ");
        const totalPages = await getTotalPages();
    
        console.log(`Iniciando WebScrapping dos Links.. (${totalPages} páginas)`);
        console.time("TempoWebScrapping");

        const linksImoveis = [];
        for (let currentPage = 0; currentPage <= totalPages; currentPage++) {
            const htmlListagemDeApartamentos = await getHtmlAtPage(currentPage);
            const linksImoveisScrapped = scrapLinksFromPage(htmlListagemDeApartamentos);
            linksImoveis.push(...linksImoveisScrapped);
        }
        
        console.timeEnd("TempoWebScrapping");

        console.log(`Salvando ${linksImoveis.length} links..`);
        await saveLinksIntoTxtFile(linksImoveis);
    } catch (err) {
        console.log("Falhou!", err);
    }
})();

/**
 * Faz um GET à pagina inicial da sub100 e retorna o total de páginas para consultar
 */
async function getTotalPages() {
    const result = await getHtmlAtPage(0);
    const $ = cheerio.load(result);
    const regex = /Página 1 de (\d*)/gm;
    const paginacaoText = $(".resultados_paginacao_descricao").text();
    const matches = regex.exec(paginacaoText);

    if (!matches)
        return null;

    return parseInt(matches[1]);
}

/**
 * Faz um GET à uma página de numero específico e retorna seu HTML convertido para UTF-8
 * @param {int} pageNumber 
 */
async function getHtmlAtPage(pageNumber) {
    return fetch(buildUrl(pageNumber), {
        method: 'get',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Cookie': 'getestado=PR; getcidade=10; _ga=GA1.3.628985793.1565357746; getnegocio=locacao; __utmz=168738595.1567602226.13.3.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); PHPSESSID=2lqpe7sc8em72q4vkdi9bulq7p; __utma=168738595.628985793.1565357746.1567602226.1574298130.14; __utmc=168738595; gettipo=APARTAMENTOS; getregiao=44; __atuvc=0%7C43%2C0%7C44%2C0%7C45%2C0%7C46%2C6%7C47; __atuvs=5dd5e52e18dcb883005; __utmt=1; __utmb=168738595.32.10.1574298130',
            'Host': 'www.sub100.com.br',
            'Pragma': 'no-cache',
            'Referer': buildUrl(0),
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Mobile Safari/537.36'
        },
    })
    .then(res => res.arrayBuffer())
    .then(arrayBuffer => iconvFromIsoToUf8.convert(Buffer.from(arrayBuffer), 'utf-8').toString())
}

/**
 * Monta a URL da Sub100
 * @param {int} pageNumber 
 */
function buildUrl(pageNumber) {
    return `http://www.sub100.com.br/imoveis/${args.tipo}/apartamentos/10-maringa-pr/de-r$${args.valorinicial}-ate-r$${args.valorfinal}/regiao-44/sub100list-resumo/pag-${pageNumber}/lista-10`;
}

/**
 * Recebe uma string contendo o HTML da página de listagem, e extraí os links de imóvel
 * @param {string} htmlListagemDeApartamentos
 */
function scrapLinksFromPage(htmlListagemDeApartamentos) {
    const imoveisList = [];
    const $ = cheerio.load(htmlListagemDeApartamentos);

    $(".link_botao").each(function () {
        const imovelPath = $(this).attr("href");
        imoveisList.push("http://www.sub100.com.br" + imovelPath);
    });

    return imoveisList;
}

/**
 * Recebe um array com os links, e salva num arquivo .txt separado por quebra de linha
 * @param {array} links 
 */
async function saveLinksIntoTxtFile(links) {
    const currentDateString = moment().format("YYYYMMDD_HHmm");
    const filePath = `./linkImoveisScrapped_sub100_${currentDateString}.txt`;
    
    const writeFile = (fileStream, link) => new Promise((resolve, reject) => {
        fileStream.write(`${link}\n`, err => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        })
    });

    const stream = fs.createWriteStream(filePath);
    const promises = links.map(link => writeFile(stream, link));

    return Promise.all(promises);
}