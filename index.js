const { ethers } = require("hardhat");
const BigNumber = require('bignumber.js');
const {fetch} = require('./spider');
require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const wallet1 = new ethers.Wallet(Private_Key1,provider)
const wallet2 = new ethers.Wallet(Private_Key2,provider)
const wallet3 = new ethers.Wallet(Private_Key3,provider)
// .....wallets

/**
 * withdraw from poolId with status on or off
 * @param {ethers.Wallet} wallet 
 * @param {Number} poolId 
 * @example Withdraw(wallet1, 11111)
 */
async function Withdraw(wallet,poolId) {
    try {
        const tokenIds = await QueryTokenByPoolId(wallet,poolId)
        // console.log(tokenIds)
        const txhash = await _withdraw(wallet,tokenIds)
        console.log(txhash)
    } catch (error) {
        console.log(error.message)
    }
}

/**
 * Gain from poolId with status end
 * @param {ethers.Wallet} wallet 
 * @param {Number[]} poolIds 
 * @example Gain(wallet1, [11111,22222])
 */
async function Gain(wallet,poolIds) {
    try {
        const tokenIds = await Promise.all(poolIds.map(poolid => QueryTokenByPoolId(wallet,poolid)))
        const tokenArray = tokenIds.flatMap(ids => ids)
        // console.log(tokenArray)
        const tx = await _gain(wallet,tokenArray)
        console.log(tx)
    } catch (error) {
        console.log(error.message)
    }
}

/**
 * 一键approve所有地址的 ERC721 tokenId
 */
async function Approve() {
    try {
        const tokenAs = await check(wallet1.address)
        const tokenBs = await check(wallet2.address)
        const tokenCs = await check(wallet3.address)
        console.log(tokenAs)
        console.log(tokenBs)
        console.log(tokenCs)
        let resultA = []
        let resultB = []
        let resultC = []
        if(tokenAs.length !== 0) {
            resultA = await executeApprove(wallet1,tokenAs)
            await sleep(1000)
        }
        if (tokenBs.length !== 0) {
            resultB = await executeApprove(wallet2,tokenBs)
            await sleep(1000)
        }
        if (tokenCs.length !== 0) {
            resultC = await executeApprove(wallet3,tokenCs)
        }
        console.log([...resultA,...resultB,...resultC])
    } catch (error) {
        console.log(error.message)
    }
}

/**
 * 单个池子授权
 * @param {ethers.Wallet} _wallet 钱包实例
 * @param {Number} _poolId 池子ID
 */
async function approve(_wallet,_poolId) {
    const tokens = await QueryTokenByPoolId(_wallet,_poolId)
    const approveResult = await executeApprove(_wallet,tokens)
    console.log('Approval hash',approveResult)

    const withdrawResult = await Promise.all(tokens.map(token => _withdraw(_wallet,token)))
    console.log('Withdrawl hash',withdrawResult)
}

function sleep(ms) {
    return new Promise((res) => setTimeout(res,ms));
}
/**
 * 查询该地址未授权的所有tokenId
 * @param {String} _address EVM地址
 * @returns {Promise<Number[]>}
 */
async function check(_address) {
    const transferFilter = {
        address: '0x4820416cf02094ac6b9c253f64777516713330f4',
        topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            ethers.utils.hexZeroPad(`0x0000000000000000000000000000000000000000`,32),
            ethers.utils.hexZeroPad(`${_address}`,32),
            null
        ],
        fromBlock: 4840000,
        toBlock: 'latest'
      };
    const approveTokenFilter = {
        address: '0x4820416cf02094ac6b9c253f64777516713330f4',
        topics: [
            '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
            ethers.utils.hexZeroPad(`${_address}`,32),
            ethers.utils.hexZeroPad('0x0BCB9ea12d0b02d846fB8bBB8763Ec8Efecb4c79',32),
            null
        ],
        fromBlock: 4840000,
        toBlock: 'latest'
      };
    const gainTokenFilter = {
        address: '0x4820416cf02094ac6b9c253f64777516713330f4',
        topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            ethers.utils.hexZeroPad(`${_address}`,32),
            ethers.utils.hexZeroPad('0x0000000000000000000000000000000000000000',32),
            null
        ],
        fromBlock: 4840000,
        toBlock: 'latest'
    }
    const gainData = await provider.getLogs(gainTokenFilter)
    const transferData = await provider.getLogs(transferFilter)
    const approveData = await provider.getLogs(approveTokenFilter)
    const transfered = transferData.map(log => parseInt(log.topics[3],16))
    const approved = new Set([...approveData.map(log => parseInt(log.topics[3],16))])
    const gained = new Set([...gainData.map(log => parseInt(log.topics[3],16))])
    const NotApprove = transfered.filter(t => !approved.has(t) && !gained.has(t))
    return NotApprove;
}
/**
 * 
 * @param {ethers.Wallet} wallet 钱包实例
 * @param {Number[]} tokens ERC721 tokenId数组
 * @returns {Promise<String[]>} 返回交易哈希
 */
async function executeApprove(wallet,tokens) {
    if(tokens.length !== 0) {
        try {
            const nonce = await provider.getTransactionCount(wallet.address)
            const calldatas = tokens.map(tokenid => '0x095ea7b3'+ethers.utils.defaultAbiCoder.encode(['address','uint256'],['0x0BCB9ea12d0b02d846fB8bBB8763Ec8Efecb4c79',tokenid]).substring(2))
            const transactions = calldatas.map((calldata,index) => ({
                nonce: nonce+index,
                to: '0x4820416Cf02094ac6B9C253f64777516713330f4',
                gasLimit: 1500000,
                value: 0,
                data: calldata
            }))
            const results = await Promise.all(transactions.map(tx => wallet.sendTransaction(tx)))
            return results.map(res => res.hash);
        } catch (error) {
            console.log(error.message)
        }
    }
}

/**
 * 
 * @param {ethers.Wallet} wallet 钱包实例
 * @param {Number[]} tokens 加入池子时的tokenId
 * @returns {Promise<String[]>} tx.hash
 */
async function _withdraw(wallet,tokens) {
    try {
        const nonce = await wallet.getTransactionCount()
        const transactions = []
        for (let index = 0; index < tokens.length; index++) {
            const calldata = '0x0fcc56f7'+ ethers.utils.defaultAbiCoder.encode(['uint256'],[tokens[index]]).substring(2)
            const tx = {
                nonce: nonce+index,
                to: '0x0BCB9ea12d0b02d846fB8bBB8763Ec8Efecb4c79',
                gasLimit: 1500000,
                value: 0,
                data: calldata
            }
            transactions.push(tx)
        }
        const results = await Promise.all(transactions.map(tx => wallet.sendTransaction(tx)))
        return results.map(res => res.hash)
    } catch (error) {
        console.log(error.message)
    }
}

/**
 * 
 * @param {ethers.Wallet} wallet 钱包实例
 * @param {Number[]} tokens tokenIds
 * @returns {Promise<String[]>} tx.hash
 */
async function _gain(wallet,tokens) {
    try {
        const nonce = await wallet.getTransactionCount()
        let hash = []
        for (let index = 0; index < tokens.length; index++) {
            const calldata = '0x022e6df6'+ ethers.utils.defaultAbiCoder.encode(['uint256'],[tokens[index]]).substring(2)
            const tx = {
                nonce: nonce+index,
                to: '0x0BCB9ea12d0b02d846fB8bBB8763Ec8Efecb4c79',
                gasLimit: 1500000,
                value: 0,
                data: calldata
            }
            const res = await wallet.sendTransaction(tx)
            hash.push(res.hash)
        }
        return hash;
    } catch (error) {
        console.log(error.message)
    }
}

/**
 * 根据地址返回指定pool的tokenId
 * @param {ethers.Wallet} _wallet 钱包实例
 * @param {Number} _poolid 池子ID
 * @returns {Promise<Number[]>}
 */
async function QueryTokenByPoolId(_wallet,_poolid) {
    const inPoolFilter = {
        address: '0x0bcb9ea12d0b02d846fb8bbb8763ec8efecb4c79',
        topics: [
            '0xb9fa1caa1e1541788a4b5cd68270e6d375e3a28f4f94017af9351c5955d58fa7',
            null,
            ethers.utils.hexZeroPad(_poolid,32),
            ethers.utils.hexZeroPad(_wallet.address,32)
        ],
        fromBlock: 4840285,
        toBlock: 'latest'
    }
    const forceWithdrawFilter = {
        address: '0x4820416cf02094ac6b9c253f64777516713330f4',
        topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            ethers.utils.hexZeroPad(_wallet.address,32),
            ethers.utils.hexZeroPad(0,32),
            null
        ],
        fromBlock: 4840285,
        toBlock: 'latest'
    }
    const inPoolData= await provider.getLogs(inPoolFilter)
    const forceWithdrawData = await provider.getLogs(forceWithdrawFilter)
    const inPoolResult = inPoolData.map(log => parseInt(log.topics[1],16))
    const forceWithdrawResult = new Set([...forceWithdrawData.map(log => parseInt(log.topics[3],16))])
    return inPoolResult.filter(t => !forceWithdrawResult.has(t))
    // const result = await Promise.all(data.map(log => gain(_wallet,parseInt(log.topics[1],16))))
    // console.log(result)
}

/**
 * 查询代币合约地址
 * @param {String} _symbol 代币名称
 * @returns {String} 返回合约地址
 * @example queryTokenAddrA('btc')
 */
function queryTokenAddr(_symbol) {
    let contractAddr = ''
    if (_symbol.includes('btc')) {
        contractAddr = contractAddr+'0x35f131cF4b53038192117f640e161807dBcB0fdF'
    }
    if (_symbol.includes('eth')) {
        contractAddr = contractAddr+'0x99FCee8A75550a027Fdb674c96F2D7DA31C79fcD'
    }
    if (_symbol.includes('snx')) {
        contractAddr = contractAddr+'0x236f697c518b7AEc0bb227d8B7547b3c27cA29bc'
    }
    if (_symbol.includes('link')) {
        contractAddr = contractAddr+'0xCD85B9a767eF2277E264A4B9A14a2deACAB82FfB'
    }
    if (_symbol.includes('doge')) {
        contractAddr = contractAddr+'0x183209DA02C281709A5BcD40188AaFfA04A7fEfD'
    }
    if (_symbol.includes('bnb')) {
        contractAddr = contractAddr+'0x3f6Df06A3c745591Cad3816bAa087b1E8925035E'
    }
    if (_symbol.includes('okb')) {
        contractAddr = contractAddr+'0x6B39CeA2b80b7A549D6464AeC9cAb806477Fcdb7'
    }
    return contractAddr
}

/**
 * 查询所有钱包在doubler V3中测试币的余额
 */
async function balanceOf() {
    const b1 = await _checkBalance(wallet1)
    const b2 = await _checkBalance(wallet2)
    const b3 = await _checkBalance(wallet3)

    console.log(`${wallet1.address.slice(38,42)}`,b1)
    console.log(`${wallet2.address.slice(38,42)}`,b2)
    console.log(`${wallet3.address.slice(38,42)}`,b3)
}

/**
 * 查询该wallet在doubler V3中所有测试token余额
 * @param {ethers.Wallet} _wallet 钱包实例
 * @returns 
 */
async function _checkBalance(_wallet) {
    try {
        const funcSig = ethers.utils.id('checkBalance(address)').slice(0,10)
        const calldata = ethers.utils.defaultAbiCoder.encode(['address'],[_wallet.address])
        const payload = await provider.call({
            to: '0x309e028180b6e2d2DFdFE98d831f00F798522052',
            data: funcSig+calldata.substring(2)
        })
        // console.log(payload)
        const decodedResult = ethers.utils.defaultAbiCoder.decode(["uint256","uint256","uint256","uint256","uint256","uint256","uint256","uint256","uint256"],payload).slice(2)
        const balanceOf = {
            btc: 0,
            eth: 0,
            snx: 0,
            link: 0,
            doge: 0,
            bnb: 0,
            okb: 0
        }
        const symbol = ['btc','eth','snx','link','doge','bnb','okb']
        for (let index = 0; index < decodedResult.length; index++) {
            balanceOf[symbol[index]] = parseFloat(decodedResult[index]/10 ** 18)
        }
        return balanceOf;
    } catch (error) {
        console.log(error)
    }
}

/**
 * 添加池子 博币本位增加
 * @param {ethers.Wallet} _wallet 
 * @param {Number} _poolId 
 * @param {String} _symbol
 * @example input(wallet1, 28299, 'okb') 
 */
async function input(_wallet,_poolId,_symbol) {
    const contractAddr = queryTokenAddr(_symbol)
    try {
        const params = await fetch(_poolId,contractAddr)
        // console.log(parseInt(params.Layer))
        // console.log(parseInt(_poolId))
        // console.log(BigInt(params.UnitSize*1e18))
        if (!parseFloat(params.UnitSize) > 0.1 && !_symbol.includes('btc')) {
            const calldata = ethers.utils.defaultAbiCoder.encode(['uint256','uint256','uint256','uint256','uint256','uint256'],
            [parseInt(params.Layer),parseInt(_poolId),BigInt(params.UnitSize*1e18),1,BigInt(params.UnitSize*1e18),0])
            
            const tx = {
                to: '0x0BCB9ea12d0b02d846fB8bBB8763Ec8Efecb4c79',
                gasLimit: 1500000,
                value: 0,
                data: `0xbef2e22e${calldata.substring(2)}`
            }
            const result = await _wallet.sendTransaction(tx)
            console.log(result.hash)
        }else console.log('The unitSize is so fucking high!')
    } catch (error) {
        console.log(error.message)
    }
}

/**
 * all in添加池子 倍数 x2
 * @param {ethers.Wallet} _wallet 
 * @param {Number} _poolId 
 * @param {String} _symbol
 * @example AllIn(wallet1, 28299, 'okb') 
 * 在 JavaScript 中，浮点数的表示是有限的，并且在处理非常大的浮点数时可能会遇到精度问题，
 * 例如128.52 * 1e18 导致结果为128520000000000020000，
 * 因此需要bignumber.js工具：new BigNumber(value: 128.52).times(1e18)，结果为128520000000000000000
 */
async function AllIn(_wallet,_poolId,_symbol) {
    const contractAddr = queryTokenAddr(_symbol)
    try {
        const params = await fetch(_poolId,contractAddr)
        const balance = (await _checkBalance(_wallet))[_symbol]
        console.log(`unitSize: ${parseFloat(params.UnitSize)}`,`${_symbol} balance: ${balance}`,`Pool Layer: ${parseInt(params.Layer)}`)
        // console.log(parseInt(_poolId))
        // console.log(BigInt(params.UnitSize*1e18))
        if (parseFloat(params.UnitSize) < balance) {
            console.log(parseFloat(parseInt(balance/parseFloat(params.UnitSize)))*parseFloat(params.UnitSize))
            const amount = new BigNumber(parseFloat(parseInt(balance/parseFloat(params.UnitSize)))*parseFloat(params.UnitSize)).times(1e18)
            // const calldata = ethers.utils.defaultAbiCoder.encode(['uint256','uint256','uint256','uint256','uint256','uint256'],
            // [parseInt(params.Layer),parseInt(_poolId),BigInt(amount),2,BigInt(2*amount),0])
            const calldata1 = `${ethers.utils.hexZeroPad(parseInt(params.Layer),32).substring(2)}`+
                `${ethers.utils.hexZeroPad(parseInt(_poolId),32).substring(2)}`+
                `${ethers.utils.hexZeroPad(`0x${new BigNumber(amount).toString(16)}`,32).substring(2)}`+
                `${ethers.utils.hexZeroPad(2,32).substring(2)}`+
                `${ethers.utils.hexZeroPad(`0x${new BigNumber(2*amount).toString(16)}`,32).substring(2)}`+
                `${ethers.utils.hexZeroPad(0,32).substring(2)}`
            // console.log(amount)
            // console.log(calldata1)
            const tx = {
                to: '0x0BCB9ea12d0b02d846fB8bBB8763Ec8Efecb4c79',
                gasLimit: 1500000,
                value: 0,
                data: `0xbef2e22e${calldata1}`
            }
            const result = await _wallet.sendTransaction(tx)
            console.log(result.hash)
        }else console.log('The unitSize is so fucking high!')
    } catch (error) {
        console.log(error.message)
    }
}

/**
 * End池子
 * @param {ethers.Wallet} _wallet 
 * @param {Number[]} _poolIds 
 */
async function end(_wallet,_poolIds) {
    try {
        const nonce = await _wallet.getTransactionCount()
        const transactions = _poolIds.map((poolid,index) => ({
            nonce: nonce+index,
            to: '0x0BCB9ea12d0b02d846fB8bBB8763Ec8Efecb4c79',
            value: 0,
            gasLimit: 1500000,
            data: '0xc964ee9f'+ethers.utils.defaultAbiCoder.encode(['uint256'],[poolid]).substring(2)
        }))
        const results = await Promise.all(transactions.map(tx => _wallet.sendTransaction(tx)))
        const hash = results.map(re => re.hash)
        console.log(hash)
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    Withdraw,
    Gain,
    Approve,
    approve,
    balanceOf,
    input,
    AllIn,
    end
}

