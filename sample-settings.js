

module.exports = {

    username: '',
    password: '',

    puppeteer: { // puppeteer settings
        slowMo: 50,
        width: 1600,
        height: 800,
        fonts: false,
        // executablePath: '/usr/bin/chromium-browser' // https://github.com/GoogleChrome/puppeteer/issues/550#issuecomment-339138670
        // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // https://stackoverflow.com/a/54787850
    },

    logs: {
        overview: './overview.csv',
        trades: './trades.csv'
    },

    strategy: './sample-strategy'

}
