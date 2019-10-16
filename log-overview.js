const init = require('./init');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function log_nar( page ) {

    await page.goto('https://www.mintos.com/en/overview/')

    const csvWriter = createCsvWriter({
        path: 'overview.csv',
        header: [
            {id: 'date', title: 'Date (dd.mm.yyyy)'},

            {id: 'availableFunds', title: 'Available Funds (EUR)'},
            {id: 'investedFunds', title: 'Invested Funds (EUR)'},
            {id: 'totalBallance', title: 'Total Balance (EUR)'},
            
            {id: 'nar', title: 'Net Annual Return (%)'},
            {id: 'interest', title: 'Interest (EUR)'},
            {id: 'latePaymentFees', title: 'Late Payment Fees (EUR)'},
            {id: 'badDebt', title: 'Bad Debt (EUR)'},
            {id: 'premiums', title: 'Premiums (EUR)'},
            {id: 'serviceFees', title: 'Service Fees (EUR)'},
            {id: 'campaignRewards', title: 'Campaign Rewards (EUR)'},
            {id: 'totalProfit', title: 'Total Profit (EUR)'},
            
            {id: 'numberOfInvestments', title: 'Number of Investments'},
            {id: 'current', title: 'Current'},
            {id: 'gracePeriod', title: 'Grace Period'},
            {id: 'daysLate_1_15', title: '1-15 Days late'},
            {id: 'daysLate_16_30', title: '16-30 Days late'},
            {id: 'daysLate_31_60', title: '31-60 Days late'},
            {id: 'daysLate_60_up', title: '60+ Days late'},
            {id: 'defaulted', title: 'Default'},
        ],
        append: true,
        fieldDelimiter: ';'
    });


    const data = await page.evaluate( () => {

        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        let yyyy = today.getFullYear();

        let euro = /€\s((\d+\s)?\d+\.\d{2})/
        let percentage = /((\d+\s)?\d+\.\d{2})%/

        let firstBox = document.querySelector('#mintos-boxes .overview-box:nth-child(1)');
        let secondBox = document.querySelector('#mintos-boxes .overview-box:nth-child(2)');
        let thirdBox = document.querySelector('#mintos-boxes .overview-box:nth-child(3)');

        return {
            date:                  dd + '.' + mm + '.' + yyyy,

            availableFunds:        firstBox.querySelector('.data tr:nth-child(1) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            investedFunds:         firstBox.querySelector('.data tr:nth-child(2) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            totalBallance:         firstBox.querySelector('.data tr:nth-child(3) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
  
            nar:                   secondBox.querySelector('.header .value').innerText.replace( percentage, '$1'),
            interest:              secondBox.querySelector('.data tr:nth-child(1) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            latePaymentFees:       secondBox.querySelector('.data tr:nth-child(2) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            badDebt:               secondBox.querySelector('.data tr:nth-child(3) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            premiums:              secondBox.querySelector('.data tr:nth-child(4) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            serviceFees:           secondBox.querySelector('.data tr:nth-child(5) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            campaignRewards:       secondBox.querySelector('.data tr:nth-child(6) td:last-child').innerText.replace( euro, '$1').replace('\n','').replace('+ Earn more',''),
            totalProfit:           secondBox.querySelector('.data tr:nth-child(7) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
    
            numberOfInvestments:   thirdBox.querySelector('.header .value').innerText,
            current:               thirdBox.querySelector('.data tr:nth-child(1) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            gracePeriod:           thirdBox.querySelector('.data tr:nth-child(2) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            daysLate_1_15:         thirdBox.querySelector('.data tr:nth-child(3) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            daysLate_16_30:        thirdBox.querySelector('.data tr:nth-child(4) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            daysLate_31_60:        thirdBox.querySelector('.data tr:nth-child(5) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            daysLate_60_up:        thirdBox.querySelector('.data tr:nth-child(6) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
            defaulted:             thirdBox.querySelector('.data tr:nth-child(7) td:last-child').innerText.replace( euro, '$1').replace(' ',''),
        }
    });

    csvWriter.writeRecords([data]);

}


// If js file called directly
if (require.main === module) {
    (async () => {
        const i = await init();
        const page = i.page;
        const browser = i.browser;

        await log_nar( page );
        await browser.close();
    })()
}


module.exports = log_nar;