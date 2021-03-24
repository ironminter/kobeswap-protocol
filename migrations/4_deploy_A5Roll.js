const UniswapV2Router02 = artifacts.require("UniswapV2Router02");
const A5Roll = artifacts.require("A5Roll");

const OldRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

module.exports = async (deployer, network, accounts) => {
  const UniswapV2Router02Instance = await UniswapV2Router02.deployed();
  return deployer.deploy(A5Roll,
    OldRouterAddress,
    UniswapV2Router02Instance.address
  );
};