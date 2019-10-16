
const settings = require('./settings');
const strategy = settings.strategy ? require( settings.strategy ) : require('./sample-strategy');

const init = require('./init');

const addToLog = require('./log-trades');
const refreshMarketplace = require('./refresh-marketplace');


(async () => {

//
//  INIT
//

    const i = await init();
    const page = i.page;
    const browser = i.browser;


//
//  TRADE
//


    let accountBalance = await page.evaluate( async () => {
        let balance = document.getElementById('sel-header-balance').innerText.replace( /\(\s€\s((\d+\s)?\d+\.\d{2})\s\)/, '$1').replace(' ','');
        return parseFloat( balance );
    });
    console.log(`Account Balance: € ${accountBalance.toFixed(2)}`);


    // Backwards compatibility
    if (strategy.invest.cashQuota) {
        console.log(`Cash Quota: € ${strategy.invest.cashQuota.toFixed(2)}`);
        accountBalance = accountBalance - strategy.invest.cashQuota;
    }
    // Backwards compatibility
    let runtimeMax = strategy.invest.totalMax ? strategy.invest.totalMax : strategy.invest.runtimeMax;


    if ( accountBalance < strategy.invest.min ) {

        console.log('Balance is too low.\n')

        await page.waitFor(500) // 1000ms = 1s

        try { 
            await refreshMarketplace( page );
        } catch(e) {
            console.error(e)
        }

        await page.waitFor(500) // 1000ms = 1s
        await browser.close();

    } else {

    //
    //  SECONDARY MARKET
    //

        await page.waitFor(10000);

        let hasBasketItemsAlready = await page.evaluate( () => parseInt( document.querySelector('#basket-total').innerText ) > 0 )
        let isBasketOpen = await page.evaluate( () => document.querySelector('#investor-basket-wrapper.active') ? true : false );

        if ( hasBasketItemsAlready ) {
            if ( !isBasketOpen ) {
                let investorBasket = await page.$('#investor-basket-wrapper');
                await investorBasket.click();
            }

            let hasPurchases = await page.evaluate(() => document.querySelector('#investor-purchases .basket-empty') ? false : true );
            if ( hasPurchases ) {
                let emtyInvestmentsCartButton = await page.$('#empty-investments-cart-button');
                await emtyInvestmentsCartButton.click();
                await page.waitFor(500);
            }

            let hasSales = await page.evaluate(() => document.querySelector('#investor-sales .basket-empty') ? false : true );
            if ( hasSales ) {
                let emptySalesCartButton = await page.$('#empty-sales-cart-button');
                await emptySalesCartButton.click();
                await page.waitFor(500);
            }
        }

        var currentBalance = accountBalance;
        var investTotal = 0.0;

        let loans = [];
        let iteration = 0;
        let maxIterations = strategy.filters.length;


        for await ( let link of strategy.filters ) {

            iteration++;
            let isLastIteration = maxIterations > iteration ? false : true;

            if ( currentBalance < strategy.invest.min || investTotal >= runtimeMax ) break;

            // Set filter and invest
            console.log('');
            console.log('Opening link...');
            console.log(`${link}`);
            console.log('');

            await page.goto( link );
            await page.waitFor(2000);

            try {
                await page.waitForSelector('#filter-results-wrapper.appear');
            } catch(e) {
                let pleaseWait = await page.evaluate( () => document.querySelector('#filter-results-wrapper').innerText == 'Please wait' ? true : false );
                if ( pleaseWait ) console.log('Please wait...')
                if ( pleaseWait ) await page.waitForSelector('#filter-results-wrapper.appear', {
                    timeout: 90000 // Let's wait a little longer than default 30 sec.
                });
            }
            
            if ( runtimeMax && investTotal > runtimeMax ) break;

            // Has results?
            let hasResults = await page.evaluate( () => document.querySelector('table#secondary-market-table') ? true : false );
            console.log(`${hasResults ? '' : 'No results :('} \n`)

            if ( !hasResults && !isLastIteration ) continue;

            // Buy
            let loanEntries = await page.$$('.m-loan-entry');
            let n = 0; // nth-child of table
    
            for await (let loanEntry of loanEntries) {
    
                n++;

                let loan = await page.evaluate( loanEntry => {

                    let termRegex = /((\d{1,2}\s[a-z]\.\s?){1,2})\n\((\d)\)/;
                    let discountRegex = /\(([-|+]?\d*\.\d{1,2}%)\)/;

                    let trimEuroRegex = /€\s(\d{1,3}\.\d{2})/;
                    let trimPercentRegex = /([-|+]?\d*\.\d{1,2})%/;

                    return {
                        id:             loanEntry.querySelector('.m-loan-id').innerText,
                        type:           loanEntry.querySelector('.m-loan-type').innerText,
                        originator:     loanEntry.querySelector('.m-loan-originator').innerText,
                        bapr:           parseFloat( loanEntry.querySelector('[data-m-label="Borrower APR"]').innerText.replace(trimPercentRegex,'$1') ),
                        interest:       parseFloat( loanEntry.querySelector('[data-m-label="Interest Rate"]').innerText.replace(trimPercentRegex,'$1') ),
                        term:           loanEntry.querySelector('[data-m-label="Term"]').innerText.replace(termRegex, '$1'),
                        repayments:     loanEntry.querySelector('[data-m-label="Term"]').innerText.replace(termRegex, '$3'),
                        status:         loanEntry.querySelector('[data-m-label="Status"]').innerText,
                        ytm:            parseFloat( loanEntry.querySelector('[data-m-label="YTM"]').innerText.replace(trimPercentRegex,'$1') ),
                        myInvestment:   loanEntry.querySelector('.my-investment') ? parseFloat( loanEntry.querySelector('.my-investment').dataset.tooltip.replace( /Your investment:\s€\s((\d+\s)?\d+\.\d{2})/, '$1' ) ) : 0.00,
                        value:          parseFloat( loanEntry.querySelector('[data-m-label="Available for Investment"]').innerText.replace(trimEuroRegex,'$1') ),
                        price:          parseFloat( loanEntry.querySelector('[data-m-label="Price / Discount"]').innerText.replace(trimEuroRegex,'$1') ),
                        discount_rel:   parseFloat( loanEntry.querySelector('.m-loan-premium-change').innerText.replace(discountRegex, '$1').replace(trimPercentRegex,'$1') ),
                    }
                }, loanEntry )

                console.log('\nLoan:');
                console.log(loan);
                console.log('');

                let isAlreadyInBasket = await page.evaluate( loanEntry => loanEntry.querySelector('.already-in-basket') ? true : false, loanEntry );
    
                console.log(`Current Balance? ${currentBalance > strategy.invest.min ? '✓ ok' : '✗'} ` );
                if ( strategy.invest.min && currentBalance < strategy.invest.min ) break;

                console.log(`Runtime Maximum? ${investTotal < runtimeMax ? '✓ ok' : '✗'} ` );
                if ( runtimeMax && investTotal > runtimeMax ) break;
                
                console.log(`Investment amount? ${loan.price > strategy.invest.min || loan.myInvestment < strategy.invest.max ? '✓ ok' : '✗'}`)
                if ( loan.price <= strategy.invest.min
                  || loan.myInvestment >= strategy.invest.max
                  || isAlreadyInBasket 
                   ) continue;
    
                let netMax = strategy.invest.max - loan.myInvestment;
                
                let investAmount = loan.price > netMax ? ( netMax > currentBalance ? currentBalance : netMax ) : loan.price > currentBalance ? currentBalance : loan.price;
                investAmount = parseFloat(investAmount);
                investAmount = investAmount.toFixed(2);

                if ( investAmount <= 0 ) continue;

                try {

                    let addToCartWrapper = await page.$(`.m-loan-entry:nth-child(${n}) .add-to-cart-wrapper`);
                    await addToCartWrapper.click();
                    await page.waitFor(500);
        
                    let inputAmountValue = await page.$(`.m-loan-entry:nth-child(${n}) .amount-value`);
                    await inputAmountValue.type(`${investAmount}`);
                    await page.waitFor(500);
        
                    let inputSubmit = await page.$(`.m-loan-entry:nth-child(${n}) .trigger-submit`);
                    await inputSubmit.click();
                    await page.waitFor(500);

                    let amountError = await page.evaluate( () => document.querySelector('#black-error-box') ? true : false );
                    
                    if ( amountError ) {

                        investAmount = investAmount - 0.1;
                        await inputAmountValue.click({ clickCount: 3 })

                        await inputAmountValue.type(`${investAmount}`); // bugfix: '-0.02' as amounts are sometimes not rounded perfectly by mintos which means the invested amount will exceed the loan size (even if it does not)
                        await page.waitFor(500);

                        await inputSubmit.click();
                        await page.waitFor(500);
                    }

                    currentBalance = currentBalance - investAmount;
                    
                    investTotal = parseFloat(investTotal);
                    investAmount = parseFloat(investAmount);

                    investTotal = investTotal + investAmount;
                    investTotal = investTotal.toFixed(2);

                    loan.myInvestment = loan.myInvestment + investAmount;

                    loan.value = investAmount / ( 1 + loan.discount_rel / 100 ); // EUR
                    loan.price = investAmount; // EUR
    
                    loan.discount_abs = (loan.price - loan.value).toFixed(4); // EUR
                    loan.discount_rel = loan.discount_rel; // %
    
                    loans.push( loan );

                    console.log(`\n€ ${investAmount} of loan added to cart.`)
                    console.log('Current investment total: ' + investTotal)
                    
                } catch(error) {

                    console.log(`An error occured. Loan not added to cart.`)
                    continue;

                }

                console.log('');
    
            }
        }

        if (strategy.invest.cashQuota) {
            // Adding back what we have removed in the beginning
            currentBalance = currentBalance + strategy.invest.cashQuota;
        }
        console.log('');
        console.log( `Number of investments: ${loans.length}` )
        console.log( `New Balance: € ${currentBalance.toFixed(2)}\n` )

        if ( investTotal == 0 ) {

            await page.waitFor(500) // 1000ms = 1s
            
            try { 
                await refreshMarketplace( page );
            } catch(e) {
                console.error(e)
            }
            
            await browser.close();
            return;
        }


        // Trigger Review and Approve
        let basketWrapper = await page.$('#investor-basket-wrapper');
        let isBasketWrapperActive = await page.evaluate( () => document.querySelector('#investor-basket-wrapper.active') ? true : false );
        if ( !isBasketWrapperActive ) await basketWrapper.click();
        await page.waitFor(500);
        
        const reviewAndApprovePurchaseButton = await page.$('#investor-purchases .btn-primary')
        // await page.evaluate( () => document.querySelector('#investor-basket-wrapper').classList.add('active'));
        await reviewAndApprovePurchaseButton.click();

        await page.waitForNavigation();
        await page.waitFor(500);
        let currentURL = await page.url();

        // Approve Investment
        const investmentConfirmButton = await page.$('#investment-confirm-button');
        await investmentConfirmButton.click();
        await page.waitForNavigation();

        // Check if navigation failed which indicates that there was an error
        let newURL = await page.url();
        if ( newURL == currentURL ) {

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
                        console.log(e)
                    }
                }
            }

            await waitFor(1000000);

            const newInvestmentConfirmButton = await page.$('#investment-confirm-button');
            await newInvestmentConfirmButton.click();
            await page.waitForNavigation();
        }


    
    //
    //  LOG TRADE
    //

        console.log('Adding new trades to log file...')

        const trades = [];
        for await ( let loan of loans ) {

            let today = new Date();
            let dd = String(today.getDate()).padStart(2, '0');
            let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
            let yyyy = today.getFullYear();

            trades.push({
                date:      `${dd}.${mm}.${yyyy}`,
                id:         loan.id,
                value:      loan.value,
                price:      loan.price,
                profit_abs: loan.discount_abs * -1,
                profit_rel: loan.discount_rel * -1,
            });

        }
        console.log('All trades added.')

        await addToLog( trades );
        await page.waitFor(4000);
        
        try { 
            await refreshMarketplace( page );
        } catch(e) {
            console.error(e)
        }
        await browser.close();

    }
    
})();