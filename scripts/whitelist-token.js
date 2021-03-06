require("dotenv/config");
const { ethers, utils } = require("ethers");
const parseArgs = require("minimist");
const { confirm } = require("./common/confirm");
const { txhandler } = require("./common/txhandler");

const PARAMETERS = Object.freeze([
  ["network", ["network", "n"]],
  ["token", ["token", "t"]],
]);

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    string: ["network", "n", "vault", "v", "token", "t"],
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

  const VAULT_ABI = require("@ithil-protocol/deployed/"+network+"/abi/Vault.json");
  const TOKEN_ABI = require("@ithil-protocol/deployed/"+network+"/abi/MockToken.json");
  const { addresses } = require("@ithil-protocol/deployed/"+network+"/deployments/addresses.json");

  let provider;
  if (network == "localhost" || network == "hardhat") {
    provider = new ethers.providers.JsonRpcProvider();
  } else {
    const url = `https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`;
    provider = new ethers.providers.JsonRpcProvider(url);
  }
  const signer = new ethers.Wallet(key, provider);

  const vault = new ethers.Contract(addresses.Vault, VAULT_ABI, signer);
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
  const name = await token.name();

  if (await confirm(`Are you sure you want to whitelist token ${name} (address ${tokenAddress})? (y/n)`)) {
    await txhandler(vault.whitelistToken, tokenAddress, 10, 15, 1, { gasLimit: 3000000 });
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
