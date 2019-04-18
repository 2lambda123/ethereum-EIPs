---
eip: <to be assigned>
title: Non-fungible Data Token
author: Johann Barbie <@johannbarbie>, Ben Bollen <ben@ost.com>, pinkiebell <@pinkiebell>
discussions-to: https://ethereum-magicians.org/t/erc-non-fungible-data-token/3139
status: Draft
type: Standards Track
category: ERC
created: 2019-04-18
requires: ERC721
---

## Simple Summary

Some NFT use-cases require to have dynamic data associated with a non-fungible token that can change during its live-time. Examples for dynamic data:
- cryptokitties that can change color
- intellectual property tokens that encode rights holders
- tokens that store data to transport them across chains

The existing meta-data standard does not suffice as data can only be set at minting time and not modified later.

## Abstract

Non-fungible tokens (NFTs) are extended with the ability to store dynamic data. A 32 bytes data field is added and a read function allows to access it. The write function allows to update it, if the caller is the owner of the token. An event is emitted every time the data updates and the previous and new value is emitted in it.

## Motivation

The proposal is made to standardize on tokens with dynamic data. Interactions with bridges for side-chains like xDAI or Plasma chains will profit from the ability to use such tokens. Protocols that build on data tokens like [distributed breeding](https://ethresear.ch/t/a-distributed-breeding-function/5264) will be enabled.

## Specification

An extension of ERC721 interface with the following functions and events is suggested:

```
pragma solidity ^0.5.2;

contract IDataToken {
  
  event DataUpdated(uint256 indexed tokenId, bytes32 oldData, bytes32 newData);

  function readData(uint256 _tokenId) public view returns (bytes32);

  function writeData(uint256 _tokenId, bytes32 _newData) public;

}
```

## Rationale

The suggested data field in the NFT is used either for storing data directly, like a counter or address. If more data is required the implementer should fall back to authenticated data structures, like merkle- or patricia-trees.

The proposal for this ERC stems from the [distributed breeding proposal](https://ethresear.ch/t/a-distributed-breeding-function/5264) to allow better integration of NFTs accross sidechains. [ost.com](https://ost.com/), [Skale](https://skalelabs.com/), [POA](https://poa.network/), and [LeapDAO](https://leapdao.org/) have been part of the discussion.

## Backwards Compatibility

🤷‍♂️ No related proposals are known to the author, hence no backwards compatability to consider.

## Test Cases

Simple happy test:

```
const DataToken = artifacts.require('./DataToken.sol');

contract('DataToken', (accounts) => {
  const firstTokenId = 100;
  const empty = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const data = '0x0101010101010101010101010101010101010101010101010101010101010101';
  let dataToken;

  beforeEach(async () => {
    dataToken = await DataToken.new();
    await dataToken.mint(accounts[0], firstTokenId);
  });

  it('should allow to write and read', async () => {
    let rsp = await dataToken.readData(firstTokenId);
    assert.equal(rsp, empty);
    await dataToken.writeData(firstTokenId, data);
    rsp = await dataToken.readData(firstTokenId);
    assert.equal(rsp, data);
  });

});
```


## Implementation

An example implementation of the interface in solidity would look like this:

```
pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import "./IDataToken.sol";

contract DataToken is IDataToken, ERC721 {

  mapping(uint256 => bytes32) data;

  /**
   * @dev Reads the data of a specified token.
   * @param _tokenId The token to read the data off.
   * @return A bytes32 representing the current data stored in the token.
   */
  function readData(uint256 _tokenId) public view returns (bytes32) {
    require(_exists(_tokenId));
    return data[_tokenId];
  }

  /**
   * @dev Updates the data of a specified token.
   * @param _tokenId The token to write data to.
   * @param _newData The data to be written to the token.
   */
  function writeData(uint256 _tokenId, bytes32 _newData) public {
    require(msg.sender == ownerOf(_tokenId));
    emit DataUpdated(_tokenId, data[_tokenId], _newData);
    data[_tokenId] = _newData;
  }

}
```

## Copyright
Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
