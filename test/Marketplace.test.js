const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  let MusicNFT;
  let Marketplace;
  let musicNFT;
  let marketplace;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy MusicNFT
    MusicNFT = await ethers.getContractFactory("MusicNFT");
    musicNFT = await MusicNFT.deploy();
    await musicNFT.deployed();

    // Deploy Marketplace
    Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(musicNFT.address);
    await marketplace.deployed();

    // Set up test data
    await musicNFT.setApprovedMinter(owner.address, true);
    const metadata = {
      title: "Test Song",
      artist: "Test Artist",
      album: "Test Album",
      genre: "Test Genre",
      duration: 180,
      ipfsHash: "QmTestHash"
    };
    await musicNFT.mintMusicNFT(owner.address, "ipfs://test", metadata);
  });

  describe("Deployment", function () {
    it("Should set the right MusicNFT address", async function () {
      expect(await marketplace.musicNFT()).to.equal(musicNFT.address);
    });

    it("Should set the right platform fee", async function () {
      expect(await marketplace.platformFee()).to.equal(250); // 2.5%
    });
  });

  describe("Listing", function () {
    it("Should allow owner to list NFT", async function () {
      await musicNFT.approve(marketplace.address, 1);
      await marketplace.listNFT(1, ethers.utils.parseEther("1.0"));

      const listing = await marketplace.getListing(1);
      expect(listing.price).to.equal(ethers.utils.parseEther("1.0"));
      expect(listing.seller).to.equal(owner.address);
      expect(listing.active).to.be.true;
    });

    it("Should not allow non-owner to list NFT", async function () {
      await expect(
        marketplace.connect(addr1).listNFT(1, ethers.utils.parseEther("1.0"))
      ).to.be.revertedWith("Not the owner");
    });
  });

  describe("Buying", function () {
    beforeEach(async function () {
      await musicNFT.approve(marketplace.address, 1);
      await marketplace.listNFT(1, ethers.utils.parseEther("1.0"));
    });

    it("Should allow buying listed NFT", async function () {
      await marketplace.connect(addr1).buyNFT(1, {
        value: ethers.utils.parseEther("1.0")
      });

      expect(await musicNFT.ownerOf(1)).to.equal(addr1.address);
      const listing = await marketplace.getListing(1);
      expect(listing.active).to.be.false;
    });

    it("Should not allow buying with insufficient payment", async function () {
      await expect(
        marketplace.connect(addr1).buyNFT(1, {
          value: ethers.utils.parseEther("0.5")
        })
      ).to.be.revertedWith("Insufficient payment");
    });
  });

  describe("Cancelling", function () {
    beforeEach(async function () {
      await musicNFT.approve(marketplace.address, 1);
      await marketplace.listNFT(1, ethers.utils.parseEther("1.0"));
    });

    it("Should allow seller to cancel listing", async function () {
      await marketplace.cancelListing(1);
      const listing = await marketplace.getListing(1);
      expect(listing.active).to.be.false;
    });

    it("Should not allow non-seller to cancel listing", async function () {
      await expect(
        marketplace.connect(addr1).cancelListing(1)
      ).to.be.revertedWith("Not the seller");
    });
  });

  describe("Platform Fee", function () {
    it("Should allow owner to update platform fee", async function () {
      await marketplace.setPlatformFee(500); // 5%
      expect(await marketplace.platformFee()).to.equal(500);
    });

    it("Should not allow non-owner to update platform fee", async function () {
      await expect(
        marketplace.connect(addr1).setPlatformFee(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow setting fee above maximum", async function () {
      await expect(
        marketplace.setPlatformFee(2000) // 20%
      ).to.be.revertedWith("Fee too high");
    });
  });
}); 