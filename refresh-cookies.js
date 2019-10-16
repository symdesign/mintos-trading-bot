// HELPERS
const fs = require('fs');
const init = require('./init');

// GENERAL SETTINGS
const settings = require('./settings');

// If js file called directly
if (require.main === module) {
    (async () => {

        console.log('Refreshing Cookies by calling init.js ...')
        const i = await init();

        const page = i.page;
        const browser = i.browser;

        await page.waitFor(2000);
        await browser.close();
        
    })()
}
