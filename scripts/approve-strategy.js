require("dotenv/config");
const { ethers } = require("ethers");
const parseArgs = require("minimist");
const { confirm } = require("./common/confirm");
const { txhandler } = require("./common/txhandler");

const PARAMETERS = Object.freeze([
  ["network", ["network", "n"]],
  ["token", ["token", "t"]],
  ["strategy", ["strategy", "s"]],
]);

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    string: ["network", "n", "token", "t", "strategy", "s"],
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

        --token             -t : Token contract address\n

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
  const tokenAddress = parameters.token;
  const strategyAddress = parameters.strategy;

  const TOKEN_ABI = require("@ithil-protocol/deployed/"+network+"/abi/MockTaxedToken.json");
  const STRATEGY_ABI = require("@ithil-protocol/deployed/"+network+"/abi/BaseStrategy.json");

  let provider;
  if (network == "localhost" || network == "hardhat") {
    provider = new ethers.providers.JsonRpcProvider();
  } else {
    const url = `https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`;
    provider = new ethers.providers.JsonRpcProvider(url);
  }
  const signer = new ethers.Wallet(key, provider);

  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
  const strategy = new ethers.Contract(strategyAddress, STRATEGY_ABI, signer);
  const name = await strategy.name();

  if (await confirm(`Are you sure you want to approve strategy ${name} to use your tokens? (y/n)`)) {
    await txhandler(token.approve, strategyAddress, ethers.constants.MaxUint256, { gasLimit: 1000000 });
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
