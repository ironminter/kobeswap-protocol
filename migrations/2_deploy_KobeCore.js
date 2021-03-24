const A5Token = artifacts.require("A5Token");
const MasterChef = artifacts.require("MasterChef");
module.exports = function(deployer,network,accounts) {
  
  deployer.deploy(A5Token).then((A5TokenInstance)=>{
    
    return deployer.deploy(MasterChef,
      A5TokenInstance.address, 
      accounts[0], 
      '100000000000000000000', 
      '10750000', 
      '10850000' 
      ).then(async (MasterChefInstance)=>{
        await A5TokenInstance.transferOwnership(MasterChefInstance.address);
        console.log(await A5TokenInstance.owner());
      });
  });
};
