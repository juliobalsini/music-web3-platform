// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MusicPlatform is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _songIds;

    enum LicenseType {
        PERSONAL,      // Uso pessoal apenas
        COMMERCIAL,    // Uso comercial
        EXCLUSIVE      // Direitos exclusivos
    }

    struct Song {
        uint256 id;
        string title;
        string artist;
        string musicHash;
        string coverHash;
        address owner;
        address originalArtist;
        uint256 price;
        uint256 royaltyPercentage;
        bool isListed;
        uint256 timestamp;
        LicenseType licenseType;
    }

    struct Sale {
        uint256 songId;
        address buyer;
        address seller;
        uint256 price;
        uint256 royaltyAmount;
        uint256 timestamp;
    }

    mapping(uint256 => Song) private songs;
    mapping(address => uint256[]) private userSongs;
    mapping(uint256 => Sale[]) private songSales;
    mapping(address => uint256) private artistRoyalties;

    event SongUploaded(
        uint256 indexed id,
        string title,
        string artist,
        string musicHash,
        string coverHash,
        address owner,
        address originalArtist,
        uint256 royaltyPercentage,
        LicenseType licenseType
    );
    event SongPurchased(
        uint256 indexed id,
        address buyer,
        address seller,
        uint256 price,
        uint256 royaltyAmount
    );
    event RoyaltiesWithdrawn(address artist, uint256 amount);

    constructor() {
        // Set initial royalty percentage for the platform (5%)
        royaltyPercentage = 500; // 5% in basis points (1% = 100 basis points)
    }

    function uploadSong(
        string memory title,
        string memory artist,
        string memory musicHash,
        string memory coverHash,
        uint256 price,
        uint256 royaltyPercentage,
        LicenseType licenseType
    ) public {
        require(royaltyPercentage <= 1000, "Royalty percentage too high"); // Max 10%
        require(price > 0, "Price must be greater than 0");

        _songIds.increment();
        uint256 newSongId = _songIds.current();

        songs[newSongId] = Song({
            id: newSongId,
            title: title,
            artist: artist,
            musicHash: musicHash,
            coverHash: coverHash,
            owner: msg.sender,
            originalArtist: msg.sender,
            price: price,
            royaltyPercentage: royaltyPercentage,
            isListed: true,
            timestamp: block.timestamp,
            licenseType: licenseType
        });

        userSongs[msg.sender].push(newSongId);
        emit SongUploaded(
            newSongId,
            title,
            artist,
            musicHash,
            coverHash,
            msg.sender,
            msg.sender,
            royaltyPercentage,
            licenseType
        );
    }

    function purchaseSong(uint256 songId) public payable nonReentrant {
        Song storage song = songs[songId];
        require(song.isListed, "Song is not listed");
        require(msg.value >= song.price, "Insufficient payment");
        require(song.owner != msg.sender, "Cannot purchase your own song");

        uint256 royaltyAmount = (msg.value * song.royaltyPercentage) / 10000;
        uint256 sellerAmount = msg.value - royaltyAmount;

        address previousOwner = song.owner;
        song.owner = msg.sender;
        song.isListed = false;

        // Record the sale
        songSales[songId].push(Sale({
            songId: songId,
            buyer: msg.sender,
            seller: previousOwner,
            price: msg.value,
            royaltyAmount: royaltyAmount,
            timestamp: block.timestamp
        }));

        // Add royalties to artist's balance
        artistRoyalties[song.originalArtist] += royaltyAmount;

        // Transfer payment to seller
        (bool success, ) = previousOwner.call{value: sellerAmount}("");
        require(success, "Transfer failed");

        emit SongPurchased(songId, msg.sender, previousOwner, msg.value, royaltyAmount);
    }

    function withdrawRoyalties() public nonReentrant {
        uint256 amount = artistRoyalties[msg.sender];
        require(amount > 0, "No royalties to withdraw");

        artistRoyalties[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit RoyaltiesWithdrawn(msg.sender, amount);
    }

    function getSong(uint256 songId) public view returns (
        uint256 id,
        string memory title,
        string memory artist,
        string memory musicHash,
        string memory coverHash,
        address owner,
        address originalArtist,
        uint256 price,
        uint256 royaltyPercentage,
        bool isListed,
        uint256 timestamp,
        LicenseType licenseType
    ) {
        Song memory song = songs[songId];
        return (
            song.id,
            song.title,
            song.artist,
            song.musicHash,
            song.coverHash,
            song.owner,
            song.originalArtist,
            song.price,
            song.royaltyPercentage,
            song.isListed,
            song.timestamp,
            song.licenseType
        );
    }

    function getSongSales(uint256 songId) public view returns (Sale[] memory) {
        return songSales[songId];
    }

    function getUserSongs(address user) public view returns (uint256[] memory) {
        return userSongs[user];
    }

    function getArtistRoyalties(address artist) public view returns (uint256) {
        return artistRoyalties[artist];
    }

    function totalSongs() public view returns (uint256) {
        return _songIds.current();
    }

    function relistSong(uint256 songId, uint256 newPrice) public {
        require(songs[songId].owner == msg.sender, "Not the owner");
        require(!songs[songId].isListed, "Song is already listed");
        
        songs[songId].isListed = true;
        songs[songId].price = newPrice;
        songs[songId].timestamp = block.timestamp;
    }
} 