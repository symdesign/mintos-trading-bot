# mintos

## Installation

Open the terminal and `cd` to the Bot directory and run `npm install` to get all necessary dependencies.

## Configuration

Make a copy `sample-settings.js` and name it `settings.js`. There you enter your Mintos credentials.

## Start

To start the bot open the terminal again and run `node trade.js`.

## Rasbian Requirements
To get the bot working on RaspberryPi you need to install a couple of things before.

```sh
sudo apt-get install gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

```sh
wget http://launchpadlibrarian.net/361669485/chromium-browser_65.0.3325.181-0ubuntu0.14.04.1_armhf.deb; sudo dpkg -i chromium-browser_65.0.3325.181-0ubuntu0.14.04.1_armhf.deb
```

```sh
wget http://launchpadlibrarian.net/361689926/chromium-codecs-ffmpeg_65.0.3325.181-0ubuntu0.16.04.1_armhf.deb; sudo dpkg -i chromium-codecs-ffmpeg_65.0.3325.181-0ubuntu0.16.04.1_armhf.deb
```

Within the `init.js` you also need to specify the executable paht to your Chrome installation.

```js
executablePath: '/usr/bin/chromium-browser', // https://github.com/GoogleChrome/puppeteer/issues/550#issuecomment-339138670
```


## Crontab
On Linux and Mac you can use Crontab to schedule the mintos bot. 
 
Run `crontab -e` to configure it.

```
# At minute 0 and 30.
0,30 * * * * cd ~/mintos/ && /usr/local/bin/node ~/mintos/trade.js --headless

# At minutes 12, 24, 36, and 48.
12,24,36,48 * * * * cd ~/mintos/ && /usr/local/bin/node ~/mintos/refresh-marketplace.js --headless

# At 08:00.
0 8 * * * cd ~/mintos/ && /usr/local/bin/node ~/mintos/log-overview.js --headless

# At minute 15.
15 * * * * kill $(pgrep chromium)
```


## Strategy

Your strategies may change according to present market conditions. Therefore, you can create multiple strategy files and switch them on or off within your settings file.

I recommend basing your strategy on lender groups that run their business stable. Qualitiative Lender Groups can be found at [ExploreP2P](https://explorep2p.com/mintos-lender-ratings/).

Metrics could be...
- Profit greater than 1M 
- Capital greater than 1M 
- Overall Score greater than 30 