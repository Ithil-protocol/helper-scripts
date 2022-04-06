require("dotenv/config");
const { ethers } = require("ethers");
const parseArgs = require("minimist");
const { confirm } = require("./common/confirm");
const { txhandler } = require("./common/txhandler");
const STRATEGY_ABI = require("@ithil-protocol/deployed/abi/BaseStrategy.json");
const LIQUIDATOR_ABI = require("@ithil-protocol/deployed/abi/Liquidator.json");

const PARAMETERS = Object.freeze([
  ["network", ["network", "n"]],
  ["positionid", ["positionid", "pid"]],
  ["strategy", ["strategy", "s"]],
  ["liquidator", ["liquidator", "l"]],
]);

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    string: ["network", "n", "positionid", "pid", "strategy", "s", "liquidator", "l"],
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

        --positionid        -pid : The ID of the position to liquidate\n

        --strategy          -s : Strategy contract address\n

        --liquidator        -l : Liquidator contract address\n
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
  const pid = parameters.pid;
  const strategyAddress = parameters.strategy;
  const liquidatorAddress = parameters.liquidator;

  let provider;
  if (network == "localhost" || network == "hardhat") {
    provider = new ethers.providers.JsonRpcProvider();
  } else {
    const url = `https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`;
    provider = new ethers.providers.JsonRpcProvider(url);
  }
  const signer = new ethers.Wallet(key, provider);

  const strategy = new ethers.Contract(strategyAddress, STRATEGY_ABI, signer);
  const liquidator = new ethers.Contract(liquidatorAddress, LIQUIDATOR_ABI, signer);
  
  const name = await strategy.name();

  if (await confirm(`Are you sure you want to liquidate the position #${pid} on the strategy ${name}? (y/n)`)) {
    await txhandler(liquidator.liquidateSingle, strategyAddress, pid, { gasLimit: 1000000 });
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
