require("dotenv/config");
const { ethers } = require("ethers");
const parseArgs = require("minimist");
const TOKEN = require("../abi/MockTaxedToken.json");

const PARAMETERS = Object.freeze([
  ["network", ["network", "n"]],
  ["token", ["token", "t"]],
  ["destination", ["destination", "d"]],
  ["amount", ["amount", "a"]],
]);

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    string: ["network", "n", "token", "t", "destination", "d", "amount", "a"],
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

        --destination       -d : Destination\n

        --amount            -a : Amount of tokens to mint\n
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
  const to = parameters.to;
  const amount = parameters.amount;

  let provider;
  if (network == "localhost" || network == "hardhat") {
    provider = new ethers.providers.JsonRpcProvider();
  } else {
    const url = `https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`;
    provider = new ethers.providers.JsonRpcProvider(url);
  }
  const signer = new ethers.Wallet(key, provider);

  const token = new ethers.Contract(contract, TOKEN, signer);

  const tokenName = await token.name();
  console.log(`Minting ${amount} ${tokenName} tokens and sending them to address ${to}`);

  await token.mintTo(to, amount, {gasLimit: 1000000});
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
