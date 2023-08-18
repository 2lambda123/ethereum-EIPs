---
eip: 7488
title: Ground Zero
author: ProphetXZ (@ProphetXZ)
type: Standards Track (or Core)
status: Draft
created: 2023-06-30
---

## Description

This EIP "Ground Zero" suggests to switch mainnet to permissioned to lower gas prices, transaction costs, and improve privacy. The adjustment requires protcol and governance changes. 

## Abstract

The EIP idea is braking and stopping the IPFS and Swarm store and broadcasting and instead suggests scalling down ethereum ressources, so that the community may be served in a more **sustainable way** in the future. In addition, to mitigate the currently existing problem with increasingly high gas prices, ethereum would benefit from switching to a permissioned mainnet (after successfully deploying a testnet version). This would greatly lower the number of requests and decrease the load for operating nodes. A further improvement would be to remove legacy APIs, so nodes no longer answer unnecessary public API requests. 

## Rationale

Since its humble beginnings, the ethereum project has been open to the public and seen many contributions. The past years, however, have made it clear that such an open ecosystem design leads to a wide array of problems such as ongoing consensus problems, increasingly high transaction costs, cases of fraud, false ownership claims of assets such as the DAO hack and resulting fork (see [EIP-779](./eip-779.md)), illegal contracts and privacy intrusion, data theft, artifical and malicious content, and many more such things. 

Halting the IPFS and Swarm storage process, which enabled and multiplied above problems, as well as historically drained the ethereum ecosystem and infrastructure of important ressources and instead developing use cases for the original community would be a remedy for almost all of these problems.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

Mainnet (ID: 1) MUST be switched to permissioned. In part, this may be achieved by halting IPFS, Swarm, and Whisper, after a successfull testnet version has been deployed. Switching to a permissioned chain will affect existing DApps, but almost none of these have been used in the past by the community anyway. So the impact of this protocol change should be minor. For affecteactive transactions and smart contracts, opcode 0x00 SHOULD be executed. As a necessary and sufficient condition, opcode 0xff for the zero address SHALL be exectued as well.

Potentially, an adjustment to devp2p, EIP-8, would be required as well and Oracle connections should be switched.

## Implementation

Halting the IPFS and Swarm storage process, which enabled and multiplied above problems, as well as historically drained the ethereum ecosystem and infrastructure of important ressources and instead developing use cases for the original community would be a remedy for almost all of these problems.

## Transport

Before halting IPFS and Swarm, packages SHOULD be transfered via p2p to the original owner, including the original data.

## Token

Since for some existing dApps, token holdings would likely be exposed to such a protocol change, it is REQUIRED to decide what happens to affected ERC-721 tokens and ERC-20 coins. A potential solution would be to gather all tokens and decide step-by-step which ones would still be valid, could be transfered and/or sold to benefit the community, and which ones should be burned.

## Security Considerations

Implementing Ground Zero is expected to greatly enhance security and mitigate the problems described above.

Implementation of EIP "Ground Zero" is supported by grants in and out of the ethereum community and is required by the community.

## Copyright

Ethereum Community, Aperon, ProphetXZ
