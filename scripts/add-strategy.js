require("dotenv/config");
const { ethers } = require("ethers");
const parseArgs = require("minimist");
const { confirm } = require("./common/confirm");
const { txhandler } = require("./common/txhandler");
const VAULT_ABI = require("../abi/Vault.json");
const STRATEGY_ABI = require("../abi/BaseStrategy.json");

const PARAMETERS = Object.freeze([
  ["network", ["network", "n"]],
  ["vault", ["vault", "v"]],
  ["strategy", ["strategy", "s"]],
]);

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    string: ["network", "n", "vault", "v", "strategy", "s"],
  });

  const paramsCheck = PARAMETERS.every(parameterTuple => {
    const [_name, [long, short]] = parameterTuple;
    return long in argv || short in argv;
  });

  if (!paramsCheck) {
    console.log(`
      Missing mandatory parameters!\n

      Help:\n

        --network           -n : Destination network URL\n

        --vault             -v : Vault contract address\n

        --strategy          -s : Strategy contract address\n
    `);

    return;
  }

  const parameters = {};

  PARAMETERS.forEach(param => {
    const [name, [long, short]] = param;
    parameters[name] = argv[long] || argv[short];
  });

  const key = process.env.PRIVATE_KEY;
  const network = parameters.network;
  const vaultAddress = parameters.vault;
  const strategyAddress = parameters.strategy;

  let provider;
  if (network == "localhost" || network == "hardhat") {
    provider = new ethers.providers.JsonRpcProvider();
  } else {
    const url = `https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`;
    provider = new ethers.providers.JsonRpcProvider(url);
  }
  const signer = new ethers.Wallet(key, provider);

  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
  const strategy = new ethers.Contract(strategyAddress, STRATEGY_ABI, signer);

  const name = await strategy.name();

  if (await confirm(`Are you sure you want to whitelist strategy ${name} at address ${strategyAddress}? (y/n)`)) {
    await txhandler(vault.addStrategy, strategyAddress);
    console.log("Done");
  } else {
    console.log("Aborted");
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });