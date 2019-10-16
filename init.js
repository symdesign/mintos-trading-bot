const settings = require('./settings');
const puppeteer = require('puppeteer');
// const puppeteer = require('puppeteer-extra')

const fs = require('fs');
const cookiesPath = `${__dirname}/cookies.txt`;

const args = require('minimist')(process.argv.slice(2));

if (!settings.debug) {
    console = console || {};
    console.log = function(){};
}

async function init() {

    // Set up browser settings
    let launchSettings = {
        args:           [ `--window-size=${ args['window-size']  || '1600,800' }`],
        headless:       args['headless'] || args['headless'] == 'true' ? true : false,
        slowMo:         args['slow-mo'] || 10,
        devtools:       false,
        defaultViewport: null,
        // userDataDir: "./user_data"
    } 
    if (settings.puppeteer.executablePath) {
        launchSettings.executablePath = settings.puppeteer.executablePath;
    }


    // Launch browser
    const browser = await puppeteer.launch( launchSettings );
    const page = await browser.newPage();

    await page.setViewport({ width: settings.puppeteer.width, height: settings.puppeteer.height-120 });
    await page.setRequestInterception( args['disable-fonts'] ? JSON.parse(args['disable-fonts']) : false );
    args['disable-fonts'] && JSON.parse(args['disable-fonts']) && page.on('request', r => r.resourceType() == 'font' ? r.abort() : r.continue() );


    // If the cookies file exists, read the cookies.
    const previousSession = fs.existsSync(cookiesPath)
    console.log('Looking for previous session to bypass authentication...')

    let isPreviousSessionValid;

    if (previousSession) {

        try {

            const content = fs.readFileSync(cookiesPath);
            const cookiesArr = JSON.parse(content);

            if (cookiesArr.length !== 0) {
                for (let cookie of cookiesArr) {
                    await page.setCookie(cookie)
                }
                console.log('Session loaded into the browser.')
            }

            await page.goto('https://www.mintos.com/en/my-investments/');
            await page.waitFor('body');

            isPreviousSessionValid = await page.url() != 'https://www.mintos.com/en/login';

        } catch(e) {

            console.log('The cookies file seems broken.')
            isPreviousSessionValid = false;

        }
    } 
    
    if (!previousSession || !isPreviousSessionValid) {

        console.log('No valid session found. Please disable headless mode and solve the captcha.');

        // Loggin in...
        await page.goto('https://www.mintos.com/en/login');
        await page.waitFor('body');
        await page.waitFor(289);

        await page.waitForSelector('#login-form');
        await page.waitFor(1189);

        const formInputUsername = await page.$('#login-form [name=_username]');
        const formInputPassword = await page.$('#login-form [name=_password]');
        const formButtonSubmit = await page.$('#login-form button');

        await formInputUsername.click();
        await formInputUsername.type(`${settings.username}`);

        await formInputUsername.click();
        await formInputPassword.type(`${settings.password}`);

        await formButtonSubmit.click();

        try {
            await page.waitForNavigation({timeout: 600000});
        } catch(e) {
            console.log('Log-In failed.');
            await browser.close();
            return;
        }

        console.log('Log-In successfull.');

        try {
            // Accept Cookie Agreement so it doesn't hide elements
            let cookieAgreement = await page.$('.cookie-agreement-wrapper .accept');
            await cookieAgreement.click();
        } catch(e) {
            // No Cookie Agreement found
        }


    }

    // Write Cookies
    const cookiesObject = await page.cookies()
    fs.writeFileSync(cookiesPath, JSON.stringify(cookiesObject));
    console.log('\nSession has been saved to ' + cookiesPath + '.');

    // Done
    console.log('');
    return { page: page, browser: browser}
}

module.exports = init;