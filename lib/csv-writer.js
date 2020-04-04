const { warn } = require("./console-colorhelper");
const fs = require('fs');

class CsvWriter {
    /**
     * @param {Object} config - Configuração do helper de csv 
     * @param {string} config.columnDelimiter - Delimitador das colunas no arquivo CSV
     * @param {string} config.lineDelimiter - Delimitador das linhas no arquivo CSV
     * @param {string} config.fileName - Nome do arquivo final
     * @param {Object[]} config.columns - Colunas que o arquivo CSV terá
     * @param {string} config.columns[].name - Identificador da coluna
     * @param {string} config.columns[].header - Cabeçalho da coluna
     * @param {string} config.columns[].default - Valor default da coluna
    */
    constructor({columns, columnDelimiter, lineDelimiter, fileName}) {
        this._columnDelimiter = columnDelimiter;
        this._lineDelimiter = lineDelimiter;
        this._fileName = fileName;
        this._columns = columns;
        this._defaults = this.obterValoresDefault();
    }

    /**
     * Cria o arquivo CSV
     */
    open() {
        this._csvFile = fs.createWriteStream(this._fileName);
    }

    /**
     * Retorna o cabeçalho com base nos arquivos de config
     * @return {Object}
     */
    obterHeader() {
        const header = this._columns.reduce((final, it) => {
            final[it.name] = it.header;
            return final;
        }, {});

        return header;
    }
    
    /**
     * Retorna um objeto com os valores default para cada coluna
     * 
     * @return {Object}
     */
    obterValoresDefault() {
        const valoresDefault = this._columns.reduce((final, it) => {
            final[it.name] = it.default;
            return final;
        }, {});

        return valoresDefault;
    }

    /**
     * Recebe um objeto e retorna uma string no formato CSV, de acordo com as config
     * 
     * @param {object} data 
     * @return {string}
     */
    generateCsvLineFromObject(data) {
        const orderedData = [];

        for (let [key, value] of Object.entries(data)) {
            const columnIndex = this._columns.findIndex(it => it.name === key);
            
            if (columnIndex === -1) {
                console.warn(warn(`A chave '${key}' do objeto sendo convertido para CSV, não existe nas configurações de coluna, portanto, não será gravado.`));
                continue;
            }

            orderedData[columnIndex] = value;
        }

        return orderedData.join(this._columnDelimiter);
    }

    /**
     * Método interno que efetivamente converte o objeto para o formato CSV e grava no arquivo
     * 
     * @param {string} data
     * @return {Promise}
     */
    async _writeAsCsv(data) {
        const csvLine = this.generateCsvLineFromObject(data) + this._lineDelimiter;

        return new Promise((resolve, reject) => {
            this._csvFile.write(csvLine, err => err ? reject(err) : resolve());
        });
    }

    /**
     * Grava o objeto fornecido no arquivo cSV
     * Caso o arquivo ainda não tenha sido iniciado, cria-o com o cabeçalho já inserido
     * 
     * @param {object} data
     * @return {Promise}
     */
    async write(data) {
        if (!this._csvFile) {
            this.open();
            await this._writeAsCsv(this.obterHeader());
        }
        
        const dataComValoresDefault = {...this._defaults, ...data};

        return await this._writeAsCsv(dataComValoresDefault);
    }

    close() {
        if (this._csvFile) {
            this._csvFile.close();
        }
    }
}

module.exports = CsvWriter;