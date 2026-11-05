// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MusicNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct MusicMetadata {
        string title;
        string artist;
        string album;
        string genre;
        uint256 duration;
        string ipfsHash;
    }

    mapping(uint256 => MusicMetadata) private _musicMetadata;
    mapping(address => bool) private _approvedMinters;

    event MusicMinted(
        uint256 indexed tokenId,
        address indexed minter,
        string title,
        string artist
    );

    constructor() ERC721("MusicNFT", "MUSIC") Ownable(msg.sender) {}

    modifier onlyApprovedMinter() {
        require(_approvedMinters[msg.sender], "Not an approved minter");
        _;
    }

    function setApprovedMinter(address minter, bool approved) external onlyOwner {
        _approvedMinters[minter] = approved;
    }

    function mintMusicNFT(
        address to,
        string memory tokenURI,
        MusicMetadata memory metadata
    ) external onlyApprovedMinter returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        _musicMetadata[newTokenId] = metadata;

        emit MusicMinted(newTokenId, to, metadata.title, metadata.artist);
        return newTokenId;
    }

    function getMusicMetadata(uint256 tokenId)
        external
        view
        returns (MusicMetadata memory)
    {
        require(_exists(tokenId), "Token does not exist");
        return _musicMetadata[tokenId];
    }

    function isApprovedMinter(address account) external view returns (bool) {
        return _approvedMinters[account];
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
} 