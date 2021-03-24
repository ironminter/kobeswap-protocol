const A5Maker = artifacts.require("A5Maker");
const UniswapV2Factory = artifacts.require("UniswapV2Factory");
const A5Bar = artifacts.require("A5Bar");
const A5Token = artifacts.require("A5Token");
const WETH9 = artifacts.require("WETH9");

const weth = {
  mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  ropsten: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
  rinkeby: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
  goerli: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
  kovan: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
  ganache: ''
}
module.exports = async (deployer, network, accounts) => {
  const UniswapV2FactoryInstance = await UniswapV2Factory.deployed();
  const A5BarInstance = await A5Bar.deployed();
  const A5TokenInstance = await A5Token.deployed();
  if(network == 'ganache'){
    const WETH9Instance = await deployer.deploy(WETH9);
    weth.ganache = WETH9Instance.address;
  }
  return deployer.deploy(A5Maker,
    UniswapV2FactoryInstance.address,
    A5BarInstance.address,
    A5TokenInstance.address,
    weth[network],
  ).then(async (A5MakerInstance)=>{
    await UniswapV2FactoryInstance.setFeeTo(A5MakerInstance.address);
    console.log(await UniswapV2FactoryInstance.feeTo());
  });
};