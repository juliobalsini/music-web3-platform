const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy MusicNFT contract
  const MusicNFT = await hre.ethers.getContractFactory("MusicNFT");
  const musicNFT = await MusicNFT.deploy();
  await musicNFT.deployed();
  console.log("MusicNFT deployed to:", musicNFT.address);

  // Deploy Marketplace contract
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(musicNFT.address);
  await marketplace.deployed();
  console.log("Marketplace deployed to:", marketplace.address);

  // Save contract addresses to .env file
  const fs = require("fs");
  const envPath = ".env";
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  
  envContent = envContent.replace(
    /REACT_APP_MUSIC_NFT_CONTRACT=.*/,
    `REACT_APP_MUSIC_NFT_CONTRACT=${musicNFT.address}`
  );
  envContent = envContent.replace(
    /REACT_APP_MARKETPLACE_CONTRACT=.*/,
    `REACT_APP_MARKETPLACE_CONTRACT=${marketplace.address}`
  );
  
  fs.writeFileSync(envPath, envContent);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 