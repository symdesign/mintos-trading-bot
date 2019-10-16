// HELPERS
const fs = require('fs');
const csvReader = require('csv-reader');
const roundTo = require('round-to');

const init = require('./init');

// GENERAL SETTINGS
const settings = require('./settings');


// STRATEGY SETTINGS
const strategy = settings.strategy ? require( settings.strategy ) : require('./sample-strategy');
const profitMargins = strategy.profitMargins;


// MAIN FUNCTION
async function refreshMarketplace( page ) {

    const myInvestmentsAll = 'https://www.mintos.com/en/my-investments/current-investments/?currency=978&sort_field=purchased_at&sort_order=DESC&max_results=300';
    const myInvestmentsNotOnSale = 'https://www.mintos.com/en/my-investments/current-investments/?currency=978&listed_for_sale_status=2&sort_field=purchased_at&sort_order=ASC&max_results=300&page=1';
    
    let marketplaceReleases = 0;

    await page.goto( myInvestmentsAll )
    await page.waitFor(5000);

    let pageCount = await page.evaluate( () => parseInt( document.querySelector('.page-position').innerText.replace(/of\s(\d)/, '$1') ) );

    // Making pageCount 'for of' iterable
    let tablePages = new Array(pageCount);

    console.log('\nTaking all loans from sale...')

    // Iterating through pages
    for await ( let i of tablePages.keys() ) {

        pageCount > 1 && console.log(`\nPage ${i+1} of ${pageCount}: `)

        // Wait for investments table ...
        await page.waitFor(5000);
        await page.waitForSelector('#investor-investments-table');
        
        
        let isRemovable = await page.evaluate( () => document.querySelector('th .trigger-remove-all-sales') !== null ? true : false );
        
        // If loans are removable then remove all from Sale
        if ( isRemovable ) {

            try {
                let removeAllSalesButton = await page.$('th .trigger-remove-all-sales');
                await removeAllSalesButton.click();
                console.log('Waiting for removal from market...')
                await page.waitFor(10000);
            } catch(e) {
                console.log('\'.trigger-remove-all-sales\' not found.')
                let timestamp = new Date.toString();
                await page.screenshot({path: `${__dirname}/${timestamp}_missing_trigger-remove-all-sales.png`});
            }
            
        } else {
            console.log('No loans to remove.')
        }

        // Go to next page if there is one
        let nextPageButton = await page.$('.pager-button-next');
        if ( i+1 < tablePages.length )  await nextPageButton.click();
    }

    for await ( let [statusName, profitMargin] of Object.entries( profitMargins ) ) {

        await page.goto( myInvestmentsAll + '&statuses[]=' + profitMargin.id )
        await page.waitFor(5000);

        console.log('\nProcessing loans of status ' + statusName + '...');

        try {
            // Wait for investments table ...
            await page.waitForSelector('#investor-investments-table',{timeout:60000});
        } catch (e) {
            let hasInvestorInvestmentsTable = await page.evaluate( () => document.querySelector('#investor-investments-table') ? true : false )
            console.log('hasInvestorInvestmentsTable ' + hasInvestorInvestmentsTable);
            console.log(e)

            let timestamp = new Date.toString();
            await page.screenshot({path: `${__dirname}/${timestamp}_missing_investor-investments-table.png`});
        }

        // Waiting for investment table...
       pageCount = await page.evaluate( () => parseInt( document.querySelector('.page-position').innerText.replace(/of\s(\d)/, '$1') ) );

       // Making pageCount 'for of' iterable
       tablePages = new Array(pageCount);
   
       if (tablePages.length == 0) {
           console.log(`No loans of this status.`);
           continue;
       }


        console.log(`\nPutting loans on sale...`);

        for await ( let i of tablePages.keys() ) {

            pageCount > 1 ? console.log(`Iteration ${i+1} of ${pageCount} ...`) : '';

            // Only a maximum of 300 loans can be put on sale at once by mintos. 
            // Therefore, after placing all loans of page on sale the bot has to return
            // to the sales page again.
            await page.goto( myInvestmentsNotOnSale + '&statuses[]=' + profitMargin.id );

            try {
                await page.waitFor('body');
            } catch(e) {
                onsole.log('Waiting for body failed. Reloading page...')
                await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
            }
            
            await page.waitFor(5000);


            try {
                // Wait for investments table ...
                await page.waitForSelector('#investor-investments-table',{timeout:60000});
            } catch (e) {
                let hasInvestorInvestmentsTable = await page.evaluate( () => document.querySelector('#investor-investments-table') ? true : false )
                console.log('hasInvestorInvestmentsTable ' + hasInvestorInvestmentsTable);
                console.log(e);

                let timestamp = new Date.toString();
                await page.screenshot({path: `${__dirname}/${timestamp}_missing_investor-investments-table.png`});
            }

            try {
                // Wait for loading to disappear
                await page.waitForSelector('.loan-projects-wrapper.appear');
            } catch (e) {
                // Not sure what to do...
                let didLoanProjectsWrapperAppear = await page.evaluate( () => document.querySelector('.loan-projects-wrapper.appear') ? true : false )
                console.log('didLoanProjectsWrapperAppear ' + didLoanProjectsWrapperAppear);
                console.log(e);

                let timestamp = new Date.toString();
                await page.screenshot({path: `${__dirname}/${timestamp}_missing_loan-projects-wrapper-appear.png`});
            }


            // Sell all loans
            let sellAllButton = await page.$('.m-loan-actions .trigger-sell-all');
            await sellAllButton.click();

            // Wait for processing ...
            await page.waitFor(5000);

            // Submit cart
            let basketTotal = await page.evaluate( () => parseInt(document.querySelector('#basket-total').innerText) );
            marketplaceReleases += basketTotal;

            if ( basketTotal != 0 ) {

                // Open basket
                let basketButton = await page.$('#header-investment-notifications');

                /// Check if basket is open
                let basketHidden = await page.evaluate( () => document.querySelector('#investor-basket.appear') == null )
                if ( basketHidden ) {
                    await basketButton.click();
                    await page.waitFor(1000);
                    // console.log('Clicked on basketButton.');
                }


                // Trigger Review and Approve
                let reviewAndApproveSaleButton = await page.$('#investor-basket-wrapper #investor-sales .btn-primary');
                try {
                    await reviewAndApproveSaleButton.click();
                    await page.waitFor(1000);
                    // console.log('Clicked on reviewAndApproveSaleButton.');
                } catch(e) {
                    await basketButton.click();
                    await page.waitFor(1000);
                    // console.log('Clicked on basketButton. (Promise rejection)');

                    await reviewAndApproveSaleButton.click();
                    await page.waitFor(1000);
                    // console.log('Clicked on reviewAndApproveSaleButton.');
                }



                // Adding global discount for those loans where I don't know the buyDiscount
                let buyDiscountWhenUnavailable = 0;

                try {
                    await page.waitFor('body');
                } catch(e) {
                    onsole.log('Waiting for body failed. Reloading page...')
                    await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
                }
                await page.waitForSelector('#filter-results-wrapper', { timeout: 15000 });
                
                const discountAllInput = await page.$('#premium-discount-all');
                await discountAllInput.type(`${ buyDiscountWhenUnavailable + profitMargin.value }`);

                const discountAllButton = await page.$('#premium-discount-all-button');
                await discountAllButton.click();

                await page.waitFor(2000);



                // Add individual discounts
                if ( profitMargin ) {
                    // Look for CSV file defined in settings.logs.trades 
                    if ( settings.logs.trades ) {

                        console.log('\nAdding individual discounts...')
                        try {
                            await page.waitFor('body');
                        } catch(e) {
                            console.log('Waiting for body failed. Reloading page...')
                            await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
                        }

                        async function getLog(){

                            return new Promise(resolve => {
                                let records = [];
                                try {
                                    if ( fs.existsSync( `${__dirname}/${settings.logs.trades}` ) ) {
                                        // file exists
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
                                        .on('end', (data) => { 
                                            console.log('Loan records fetched from log file.');
                                            resolve( records );
                                        })
                                    }
                                } catch(err) {
                                    // file doesn't exist
                                    console.log('No loan records available.');
                                    resolve()
                                }
                        
                            })
                        }


                        let records = await getLog();

 
                        /*
                        // Doesn't work as mintos seems to do some JS based validation which leads to NaN
                        await page.evaluate( (params) => {

                            // let {records, profitMargin, buyDiscountWhenUnavailable} = params;
                            // ...
                            // Destructuring is a little too new and will throw an error:
                            // Error: Evaluation failed: TypeError: Cannot read property 'findIndex' of undefined

                            let records = params.a;
                            let profitMargin = parseFloat( params.b.value );
                            let buyDiscountWhenUnavailable = parseFloat( params.c );

                            let loanEntries = document.querySelectorAll('.m-loan-entry');

                            for (let loanEntry of loanEntries) {

                                let loanId = loanEntry.querySelector('.m-loan-id').innerText;
                                let index = records.findIndex(records => records[1] == loanId);
    
                                let profitPercantage = parseFloat( 0 );
                                let buyDiscount = parseFloat( 0 );
                                let individualDiscount = parseFloat( 0 );

                                if ( index > -1 ) {

                                    console.log('profitMargin ' + typeof profitMargin);

                                    profitPercantage = parseFloat( records[index][5] );
                                    console.log('profitPercantage ' + typeof profitPercantage);

                                    buyDiscount = parseFloat( profitPercantage );
                                    console.log('buyDiscount ' + typeof buyDiscount);

                                    individualDiscount = (profitMargin - buyDiscount);
                                    console.log('individualDiscount ' + typeof individualDiscount);

                                    individualDiscount = individualDiscount.toFixed(1); // returns a string not a number
                                    individualDiscount = parseFloat(individualDiscount);
    
                                    if (buyDiscount != buyDiscountWhenUnavailable) {

                                        let discountInput = loanEntry.querySelector('.premium-discount-input');
                                        discountInput.value = `${individualDiscount}`;

                                        console.log('individualDiscount ' + typeof individualDiscount)
            
                                    }
                                }
                            }

                        },{a: records, b: profitMargin.value, c: buyDiscountWhenUnavailable})

                        await page.waitFor(60000);
                        */


                        // Iterate through table rows
                        let loanEntries = await page.$$('.m-loan-entry');
                        let n = 0;

                        for await (let loanEntry of loanEntries) {
                            n++;

                            if ( n == 1 ) console.log('Iteration started.')

                            let loanId = await page.evaluate( loanEntry => loanEntry.querySelector('.m-loan-id').innerText, loanEntry )
                            let index = records.findIndex(records => records[1] == loanId);

                            let profitPercantage;
                            let buyDiscount;
                            let individualDiscount;

                            console.log(`\n${loanId}: `);

                            if ( index > -1 ) {

                                // Loan is found in log file 

                                profitPercantage = records[index][5];
                                buyDiscount = profitPercantage * -1;
                                
                                individualDiscount = buyDiscount + profitMargin.value;
                                individualDiscount = roundTo(individualDiscount, 1);

                                if (buyDiscount != buyDiscountWhenUnavailable) {
                                    let removeInvestmentButton = await page.$(`.m-loan-entry:nth-child(${n}) .remove-investment`);
                                    let discountInput = await page.$(`.m-loan-entry:nth-child(${n}) .premium-discount-input`);
        
                                    await discountInput.click({ clickCount: 3 })
                                    await discountInput.type(`${individualDiscount}`)
                                    await page.keyboard.press('Enter');
                                    await page.waitFor(500)
                                }

                                console.log(`${buyDiscount >= 0 ? '+' : ''}${buyDiscount.toFixed(1)} ▶︎ ${individualDiscount >= 0 ? '+' : ''}${individualDiscount.toFixed(1)}%`)

                            } else {

                                console.log(` n/a ▶︎ ${profitMargin.value >= 0 ? '+' : ''}${profitMargin.value.toFixed(1)}%`)

                            }

                        }
                        console.log('\nEnd of iteration.')
                    }
                }

                let currentURL = await page.url();
                let sellButton = await page.$('#review-call-to-action #investment-confirm-button');
                await sellButton.click();
                console.log('\nSubmitting...')

                await page.waitForNavigation({timeout:60000});
                await page.waitFor(1000);
                
                let newURL = await page.url();
                if ( newURL == currentURL || newURL != 'https://www.mintos.com/en/market/sale-thank-you/' ) {
        
                    let loanEntries = await page.$$('.m-loan-entry');
                    let n = 0; // nth-child of table
            
                    for await (let loanEntry of loanEntries) {
                        n++;
                        let hasError = await page.evaluate( loanEntry => loanEntry.querySelector('.error-message') ? true : false, loanEntry );
                        if ( hasError ) {
                            try {
                                let removeInvestmentButton = await page.$(`.m-loan-entry:nth-child(${n}) .remove-investment`);
                                await removeInvestmentButton.click();
                                await page.waitFor(200);
                            } catch(e) {
                                // console.log(e)
                            }
                        }
                    }
        
                    await page.waitFor(10000);

                    let newSellButton = await page.$('#review-call-to-action #investment-confirm-button');

                    try {
                        await newSellButton.click();
                        await page.waitForNavigation();
                        console.log('Done.\n')
                    } catch(e) {
                        console.log('Failed.\n')
                    }
                    
                }

            }

        }
    }

    console.log( `\nNumber of marketplace releases: ${marketplaceReleases}\n` );
    await page.waitFor(3000);

}


// If js file called directly
if (require.main === module) {
    (async () => {
        const i = await init();
        const page = i.page;
        const browser = i.browser;

        try { 
            await refreshMarketplace( page );
        } catch(e) {
            console.error(e)
        }

        await browser.close();
    })()
}


module.exports = refreshMarketplace;