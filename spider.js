const puppeteer = require('puppeteer');
/**
 * 
 * @param {Number} _poolId 池子ID
 * @param {String} _contractAddr 代币合约地址
 * @returns 返回该池子最小单位 Unit Size 和 池子层数 Layer
 */
async function fetch(_poolId,_contractAddr) {
    try {
        const browser = await puppeteer.launch({
            args: [
            '--no-sandbox',
            '--headless',
            '--disable-gpu',
            '--window-size=1920x1080',],
            headless: true,
            executablePath: 'C:\\chromium\\chrome.exe'
          });
          const page = await browser.newPage();
          await page.goto(`https://testnet.doubler.pro/#/input?poolId=${_poolId}&token=${_contractAddr}&decimals=18`);
          await sleep(2000)
          await page.waitForSelector(`#root > div:nth-child(1) > div > div.css-1tunqca.e12y5u7s1 > div > div.css-lhb05x.e1cxm9sf0 > div > div.left > div.dataDetail > div:nth-child(1) > div.value`)
          const unitSize = await page.$eval('#root > div:nth-child(1) > div > div.css-1tunqca.e12y5u7s1 > div > div.css-lhb05x.e1cxm9sf0 > div > div.left > div.dataDetail > div:nth-child(1) > div.value', element => element.textContent);
          await sleep(500)
          await page.waitForSelector('#root > div:nth-child(1) > div > div.css-1tunqca.e12y5u7s1 > div > div.css-lhb05x.e1cxm9sf0 > div > div.left > div.ico > div > div.layer > span');
          const layer = await page.$eval('#root > div:nth-child(1) > div > div.css-1tunqca.e12y5u7s1 > div > div.css-lhb05x.e1cxm9sf0 > div > div.left > div.ico > div > div.layer > span', element => element.textContent);
        //   console.log(unitSize)
        //   console.log(layer.substring(1))
        await browser.close();
        return {UnitSize: unitSize,Layer: layer.substring(1)}
    } catch (error) {
        console.log(error.message)
    }
}

function sleep(ms) {
    return new Promise((res) => setTimeout(res,ms))
}

module.exports = {
    fetch,
}