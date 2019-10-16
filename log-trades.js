
const settings = require('./settings');
const init = require('./init');

const fs = require('fs');
const csvReader = require('csv-reader');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;


async function addToLog( loans, append = true ) {
    const csvWriter = createCsvWriter({

        path: settings.logs.trades,
        header: [
            {id: 'date', title: 'Date (dd.mm.yyyy)'},
            {id: 'id', title: 'ID'},
            {id: 'value', title: 'Value (EUR)'},
            {id: 'price', title: 'Price (EUR)'},
            {id: 'profit_abs', title: 'Profit (EUR)'},
            {id: 'profit_rel', title: 'Profit (%)'},
        ],
        append: append,
        fieldDelimiter: ';'

    });

    await csvWriter.writeRecords( loans );
}

async function updateLog( page ) {

    // Look for CSV file defined in settings.logs.trades 
    if ( !settings.logs.trades ) return;
    let records = await getLog(); 

    // Get my active investments from Mintos
    let loanIds = [];
    await page.goto('https://www.mintos.com/en/my-investments/current-investments/?currency=978&sort_field=purchased_at&sort_order=DESC&max_results=300');
    console.log('Fetching active investments ...')

    // Waiting for investment table...
    await page.waitFor('body');
    await page.waitForSelector('#investor-investments-table');
    const pageCount = await page.evaluate( () => parseInt( document.querySelector('.page-position').innerText.replace(/of\s(\d)/, '$1') ) );
    
    // Making pageCount 'for of' iterable
    let tablePages = new Array(pageCount);

    // Iterating through pages
    for await ( let i of tablePages.keys() ) {

        await page.goto('https://www.mintos.com/en/my-investments/current-investments/?max_results=300&page='+(i+1));
        await page.waitFor('body');

        // Wait for investments table ...
        await page.waitForSelector('#investor-investments-table');

        // Iterate through table rows
        let loanEntries = await page.$$('.m-loan-entry');
        for await (let loanEntry of loanEntries) {

            let loanId = await page.evaluate( loanEntry => loanEntry.querySelector('.m-loan-id').innerText, loanEntry )
            loanIds.push( loanId );

        }
    }


    console.log('Result:');

    const loans = [];
    for await ( let record of records ) {

        if ( loanIds.includes( record[1] ) ) {

            console.log( record );

            loans.push({
                date:       record[0],
                id:         record[1],
                value:      record[2],
                price:      record[3],
                profit_abs: record[4],
                profit_rel: record[5],
            })

        }

    }

    addToLog( loans, false ); // append = false

}

async function getLog(){

    return new Promise(resolve => {
        let records = [];
        try {
            if ( fs.existsSync( `${__dirname}/${settings.logs.trades}` ) ) {

                // file exists
                console.log(`Reading logs from '${__dirname}/${settings.logs.trades}'.`)

                fs
                .createReadStream( `${__dirname}/${settings.logs.trades}`, 'utf8' )
                .pipe(
                    csvReader({ 
                        delimiter: ';',
                        multiline: false,
                        parseNumbers: true, 
                        parseBooleans: true, 
                        trim: true, 
                        skipHeader: true,
                        skipEmptyLines: true,
                    })
                )
                .on('data', (row) => { records.push(row) })
                .on('end', (data) => { resolve( records ) } )
            }
        } catch(err) {
            // file doesn't exist
            console.log(`File '${__dirname}/${settings.logs.trades}' not found.`)
            resolve()
        }

    })
}


// If js file called directly
if (require.main === module) {
    (async () => {
        const i = await init();
        const page = i.page;
        const browser = i.browser;

        await updateLog( page );
        await browser.close();
    })()
}

module.exports = addToLog;