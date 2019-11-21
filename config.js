const dotenv = require("dotenv");

dotenv.config();

module.exports = {
    googleMapsToken: process.env.GOOGLE_MAPS_API_DIRECTIONS_TOKEN,
    dadosCalcularDistancia: process.env.ENDERECO_OU_LATLONG_CALCULAR_DISTANCIA,
    modoPercorrerTrajeto: process.emit.MODO_PERCORRER_TRAJETO
};