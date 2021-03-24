const A5Bar = artifacts.require("A5Bar");
const A5Token = artifacts.require("A5Token");

module.exports = async (deployer, network, accounts) => {
  const A5TokenInstance = await A5Token.deployed();
  return deployer.deploy(A5Bar,
    A5TokenInstance.address 
  );
};