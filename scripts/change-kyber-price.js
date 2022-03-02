require("dotenv/config");
const { ethers } = require("hardhat");
const parseArgs = require("minimist");
const KYBER = require("../abi/MockKyberNetworkProxy.json");
const TOKEN = require("../abi/MockTaxedToken.json");

const PARAMETERS = Object.freeze([
  ["network", ["network", "n"]],
  ["contract", ["contract", "c"]],
  ["token0", ["token0", "t0"]],
  ["token1", ["token1", "t1"]],
  ["rate_numerator", ["rate_numerator", "rn"]],
  ["rate_denominator", ["rate_denominator", "rd"]],
]);

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    string: [
      "network",
      "n",
      "contract",
      "c",
      "token0",
      "t0",
      "token1",
      "t1",
      "rate_numerator",
      "rn",
      "rate_denominator",
      "rd",
    ],
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

        --contract          -c : Kyber contract address\n

        --token0            -t0 : Source token contract address\n

        --token1            -t1 : Destination token contract address\n

        --rate_numerator    -rn : Price rate numerator\n

        --rate_denominator  -rd : Price rate denominator\n
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
  const contract = parameters.contract;
  const token0 = parameters.token0;
  const token1 = parameters.token1;
  const rate_numerator = parameters.rate_numerator;
  const rate_denominator = parameters.rate_denominator;

  let provider;
  if (network == "localhost" || network == "hardhat") {
    provider = new ethers.providers.JsonRpcProvider();
  } else {
    const url = `https://${network}.infura.io/v3/${process.env.INFURA_KEY}`;
    provider = new ethers.providers.JsonRpcProvider(url);
  }
  const signer = new ethers.Wallet(key, provider);

  const kyber = new ethers.Contract(contract, KYBER, signer);
  const token0Contract = new ethers.Contract(token0, TOKEN, signer);
  const token1Contract = new ethers.Contract(token1, TOKEN, signer);

  const token0Name = await token0Contract.name();
  const token1Name = await token1Contract.name();

  console.log(
    `Changing Kyber swap ratio of the pair ${token0Name} - ${token1Name} to ${rate_numerator}/${rate_denominator}`,
  );

  await kyber.setRate(token0, token1, { numerator: rate_numerator, denominator: rate_denominator });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
