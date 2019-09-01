const fs = require('fs');
const readlines = require('n-readlines');
const $ = require('cheerio');
const fetch = require('node-fetch');
const Iconv = require('iconv').Iconv;
const iconv = new Iconv('iso-8859-1', 'utf8');

if (process.argv.length < 3) {
    console.log('Utilização: node ' + process.argv[1] + ' <lista-de-links.txt>');
    process.exit(1);
}

const filename = process.argv[2];

const csvFile = fs.createWriteStream('./imoveis.csv');
csvFile.write('Edifício,Endereço,Bairro,Tamanho,Quartos,Valor,Condomínio,Total,IPTU,Mobiliada,Garagem,Distância Mandic,Link' + "\n");

const liner = new readlines(filename);

(async function() {
    let line;
    while (line = liner.next()) {
        const url = line.toString();

        if (!url) {
            return;
        }

        console.log(`Extraindo informações do link [${url}]...`);

        let html;
        try {
            html = await getHtml(url);
        } catch (e) {
            console.error('Erro ao obter o HTML da página', e);
        }

        const info = getFileInfo(html, url);

        if (!info) {
            console.error('Erro ao pegar as informações do arquivo!');
            return;
        }

        try {
            await writeToCsv(info);
        } catch (e) {
            console.error('Erro ao gravar no CSV', e);
        }
    }

    csvFile.close();
})();

async function getHtml(url) {
    return fetch(url, {
        method: 'get',
        headers: { 
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
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

function getFileInfo(html, url) {
    const info = {
        edificio: '???',
        endereco: '???',
        bairro: '???',
        tamanho: '???',
        quartos: '???',
        valor: '???',
        condominio: '???',
        total: '',
        iptu: '',
        mobiliada: '???',
        garagem: '???',
        distanciaMandic: '',
        link: url,
        observacoes: ''
    };

    info.valor = $('.ficha_dadosprincipais_titulo .texto_cinza16', html).text().replace('R$ ', '');

    const condominioIptu = $('.ficha_dadosprincipais_titulo .texto_cinza11', html).text();
    const matchIptu = condominioIptu.match(/IPTU: R\$ ([0-9,]+)/);

    if (matchIptu) {
        info.iptu = matchIptu[1].trim();    
    }

    const matchCondominio = condominioIptu.match(/condom.nio: R\$ ([0-9,]+)/);
    if (matchCondominio) {
        info.condominio = matchCondominio[1].trim();
    }

    info.edificio = $('.ficha_dadosprincipais_informacoes_maior', html).eq(0).find('span').text().trim();
    info.endereco = $('.ficha_dadosprincipais_informacoes_maior', html).eq(1).find('span').text().trim();
    info.bairro = $('.ficha_dadosprincipais_informacoes_medio', html).eq(0).find('span').text().trim();

    const fichaComodos = $('.ficha_comodos', html).text();
    const matchDormitorios = fichaComodos.match(/(\d+) dormit.rio/);
    if (matchDormitorios) {
        info.quartos = matchDormitorios[1];
    }

    info.observacoes = $('.ficha_detalhes', html).eq(0).text();

    const informacoesComplementares = $('.ficha_detalhes', html).eq(1).text();
    const matchGaragem = informacoesComplementares.match(/Garagen\(s\) (coberta|descoberta)\(s\): (.*)/);
    if (matchGaragem) {
        info.garagem = matchGaragem[1] + `(${matchGaragem[2]})`;
    }

    info.mobiliada = '???';

    return info;
}

async function writeToCsv(info) {
    console.log('Gravando arquivo CSV');

    return new Promise((resolve, reject) => {
        csvFile.write(
            `${info.edificio}\t${info.endereco}\t${info.bairro}\t${info.tamanho}\t${info.quartos}\t${info.valor}\t${info.condominio}\t${info.total}\t${info.iptu}\t${info.mobiliada}\t${info.garagem}\t${info.distanciaMandic}\t${info.link}\n`, 
            function (err) {
                if (err) {
                    reject(err);
                }

                resolve();
            }
        );
    });
}