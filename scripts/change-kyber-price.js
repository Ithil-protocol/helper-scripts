require("dotenv/config");
const { ethers } = require("ethers");
const parseArgs = require("minimist");
const { confirm } = require("./common/confirm");
const { txhandler } = require("./common/txhandler");
const KYBER_ABI = require("@ithil-protocol/deployed/abi/MockKyberNetworkProxy.json");
const TOKEN_ABI = require("@ithil-protocol/deployed/abi/MockTaxedToken.json");

const PARAMETERS = Object.freeze([
  ["network", ["network", "n"]],
  ["kyber", ["kyber", "k"]],
  ["token", ["token", "t"]],
  ["rate", ["rate", "r"]],
]);

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    string: [
      "network",
      "n",
      "kyber",
      "k",
      "token",
      "t",
      "rate",
      "r",
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

        --kyber             -k : Kyber contract address\n

        --token             -t : Token contract address\n

        --rate              -r : Price rate to 1 USD\n
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
  const kyberAddress = parameters.kyber;
  const token = parameters.token;
  const rate = parameters.rate;

  let provider;
  if (network == "localhost" || network == "hardhat") {
    provider = new ethers.providers.JsonRpcProvider();
  } else {
    const url = `https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`;
    provider = new ethers.providers.JsonRpcProvider(url);
  }
  const signer = new ethers.Wallet(key, provider);

  const kyber = new ethers.Contract(kyberAddress, KYBER_ABI, signer);
  const tokenContract = new ethers.Contract(token, TOKEN_ABI, signer);

  const tokenName = await tokenContract.name();

  if (await confirm(`Are you sure you want to change Kyber swap ratio for the token ${tokenName} to ${rate} USD? (y/n)`)) {
    await txhandler(kyber.setRate, token, rate * 10 ** 10, { gasLimit: 1000000 });
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
