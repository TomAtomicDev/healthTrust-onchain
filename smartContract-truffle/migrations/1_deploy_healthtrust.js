const HealthTrust = artifacts.require("HealthTrust");

module.exports = function (deployer) {
  deployer.deploy(HealthTrust);
};
