const { URL, URLSearchParams } = require('url');
const fetch = require('node-fetch');
const { googleMapsToken, dadosCalcularDistancia, modoPercorrerTrajeto } = require("./../config");
const { error } = require("./console-colorhelper");

const montarDestinationGooglePelaInfo = info => {
    // Ex: "Av. Advogado Horácio Raccanello Filho, 5135 - Zona 7, Maringá - PR, 87030-040"
    let destination = info.endereco;
    
    if (info.bairro) {
        destination += ` - ${info.bairro}`;
    }

    if (info.cidade) {
        destination += `, ${info.cidade}`;
    }
    
    return destination;
}

async function getDadosTrajetoMaisCurto(info) {
    const queryStringParameters = new URLSearchParams({
        origin: dadosCalcularDistancia,
        destination: montarDestinationGooglePelaInfo(info),
        key: googleMapsToken,
        mode: modoPercorrerTrajeto || 'walking',
        language: "pt-BR",
        units: "metric",
        region: "br"
    });

    const urlDirectionsApi = new URL(`https://maps.googleapis.com/maps/api/directions/json`);
    urlDirectionsApi.search = queryStringParameters.toString();

    return fetch(urlDirectionsApi)
        .then(res => res.json())
        .then(response => {
            if (response.status !== "OK") {
                console.error(error("Erro ao consultar dados no Google Maps: "), response.status, response.error_message || '');
                return null;
            }

            // Routes: Trajetos alternativos
            // Legs: Partes da Rota para quando há múltiplas paradas. Quando é apenas uma parada, sempre vem com apenas um registro
            const rotaMaisCurta = response.routes.reduce((anterior, atual) => {
                if (!anterior || anterior.legs[0].distance.value < atual.legs[0].distance.value) {
                    return atual;
                }
                return anterior;
            }, null);

            return rotaMaisCurta.legs[0];
        });
}

module.exports = { getDadosTrajetoMaisCurto }
