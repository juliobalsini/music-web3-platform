const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MusicNFT", function () {
  let MusicNFT;
  let musicNFT;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    MusicNFT = await ethers.getContractFactory("MusicNFT");
    musicNFT = await MusicNFT.deploy();
    await musicNFT.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await musicNFT.owner()).to.equal(owner.address);
    });

    it("Should have the right name and symbol", async function () {
      expect(await musicNFT.name()).to.equal("MusicNFT");
      expect(await musicNFT.symbol()).to.equal("MUSIC");
    });
  });

  describe("Minting", function () {
    it("Should not allow minting by non-approved minter", async function () {
      const metadata = {
        title: "Test Song",
        artist: "Test Artist",
        album: "Test Album",
        genre: "Test Genre",
        duration: 180,
        ipfsHash: "QmTestHash"
      };

      await expect(
        musicNFT.connect(addr1).mintMusicNFT(
          addr1.address,
          "ipfs://test",
          metadata
        )
      ).to.be.revertedWith("Not an approved minter");
    });

    it("Should allow minting by approved minter", async function () {
      const metadata = {
        title: "Test Song",
        artist: "Test Artist",
        album: "Test Album",
        genre: "Test Genre",
        duration: 180,
        ipfsHash: "QmTestHash"
      };

      await musicNFT.setApprovedMinter(addr1.address, true);
      await musicNFT.connect(addr1).mintMusicNFT(
        addr1.address,
        "ipfs://test",
        metadata
      );

      expect(await musicNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await musicNFT.tokenURI(1)).to.equal("ipfs://test");
    });
  });

  describe("Metadata", function () {
    it("Should return correct metadata", async function () {
      const metadata = {
        title: "Test Song",
        artist: "Test Artist",
        album: "Test Album",
        genre: "Test Genre",
        duration: 180,
        ipfsHash: "QmTestHash"
      };

      await musicNFT.setApprovedMinter(owner.address, true);
      await musicNFT.mintMusicNFT(owner.address, "ipfs://test", metadata);

      const returnedMetadata = await musicNFT.getMusicMetadata(1);
      expect(returnedMetadata.title).to.equal(metadata.title);
      expect(returnedMetadata.artist).to.equal(metadata.artist);
      expect(returnedMetadata.album).to.equal(metadata.album);
      expect(returnedMetadata.genre).to.equal(metadata.genre);
      expect(returnedMetadata.duration).to.equal(metadata.duration);
      expect(returnedMetadata.ipfsHash).to.equal(metadata.ipfsHash);
    });
  });
}); 