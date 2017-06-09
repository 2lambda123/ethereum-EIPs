### Preamble

    EIP: <to be assigned>
    Title: Blockhash refactoring
    Author: Vitalik Buterin
    Type: Standard Track
    Category: Core
    Status: Draft
    Created: 2017-02-10

### Summary

Stores blockhashes in the state, reducing the protocol complexity and the need for client implementation complexity in order to process the BLOCKHASH opcode. Also extends the range of how far back blockhash checking can go, with the side effect of creating direct links between blocks with very distant block numbers, facilitating much more efficient initial light client syncing.

### Parameters

* `METROPOLIS_FORK_BLKNUM`: TBD
* `SUPER_USER`: 2**160 - 2
* `BLOCKHASH_CONTRACT_ADDR`: 0xf0 (ie. 240)
* `BLOCKHASH_CONTRACT_CODE`: see below

### Specification

If `block.number == METROPOLIS_FORK_BLKNUM`, then when processing the block, before processing any transactions set the code of BLOCKHASH_CONTRACT_ADDR to BLOCKHASH_CONTRACT_CODE.

If `block.number >= METROPOLIS_FORK_BLKNUM`, then when processing a block, before processing any transactions execute a call with the parameters:

* `SENDER`: SUPER_USER
* `GAS`: 1000000
* `TO`: BLOCKHASH_CONTRACT_ADDR
* `VALUE`: 0
* `DATA`: <32 bytes corresponding to the block's prevhash>

If `block.number >= METROPOLIS_FORK_BLKNUM + 256`, then the BLOCKHASH opcode instead returns the result of executing a call (NOT a transaction) with the parameters:

* `SENDER`: <account from which the opcode was called>
* `GAS`: 1000000
* `TO`: BLOCKHASH_CONTRACT_ADDR
* `VALUE`: 0
* `DATA`: 32 byte zero-byte-leftpadded integer representing the stack argument with which the opcode was called

Also, for blocks where `block.number >= METROPOLIS_FORK_BLKNUM`, the gas cost is increased from 20 to 800 to reflect the higher costs of processing the algorithm in the contract code.


### Contract model

The contract, when called by the SYSTEM account, records provided block hashes
selectively on different levels. The levels differs by intervals (frequency)
at what the block hashes are stored.

Let `n` be the current block number.
Let `p = n - 1` be the previous block number.
Let `h` be the block hash of the previous `p` block.
Let `B` be the base -- the number of records kept on every level.

The levels are numbered with `k`, starting from 0.
A given level `k` of stored block hashes has the _interval_ of `B**k` blocks.

The level update formula is:

```python
if p % B**k == 0:
    # FIXME: We might need to move the index by 1.
    index = (p / B**k) % B
    storage[k][index] = storage[k - 1][0]
```

where
- `storage[k]` is contract storage dedicated to level `k`,
- `storage[-1][0]` is `h`.


### Implementation parameters

- `B` is `256`,
- `k` is max 2 (3 levels in total).


### BLOCKHASH_CONTRACT_CODE

BLOCKHASH_CONTRACT_CODE is set to:

```
0x73fffffffffffffffffffffffffffffffffffffffe33141561006a5760014303600035610100820755610100810715156100455760003561010061010083050761010001555b6201000081071515610064576000356101006201000083050761020001555b5061013e565b4360003512151561008457600060405260206040f361013d565b61010060003543031315156100a857610100600035075460605260206060f361013c565b6101006000350715156100c55762010000600035430313156100c8565b60005b156100ea576101006101006000350507610100015460805260206080f361013b565b620100006000350715156101095763010000006000354303131561010c565b60005b1561012f57610100620100006000350507610200015460a052602060a0f361013a565b600060c052602060c0f35b5b5b5b5b
```

The Serpent source code is:

```python
# Setting the block hash
if msg.sender == 2**160 - 2:
    prev_block_number = block.number - 1
    # Level 2
    if prev_block_number % 65536 == 0:
        # Use storage fields 512..767 to store the hashes of 256
        # blocks with block.number % 65536 == 0.
        index = (prev_block_number / 65536 - 1) % 256
        # Move to be replaced record of index 0 from level 1 to level 2.
        ~sstore(512 + index, ~sload(256))

    # Level 1
    if prev_block_number % 256 == 0:
        # Use storage fields 256..511 to store the hashes of 256
        # blocks with block.number % 256 == 0.
        index = (prev_block_number / 256 - 1) % 256
        # Move to be replaced record of index 0 from level 0 to level 1.
        ~sstore(256 + index, ~sload(0))

    # Level 0
    # Use storage fields 0..255 to store the hashes of the last 256
    # blocks.
    index = prev_block_number % 256
    # Save the provided hash of the previous block.
    ~sstore(index, ~calldataload(0))

# Getting the block hash
else:
    number = ~calldataload(0)
    if block.number > number and number >= 0:
        distance = block.number - number
        if distance <= 256:
            return(~sload(number % 256))
        if number % 256 == 0:
            if distance <= 65792:
                return(~sload(256 + (number / 256) % 256))
            if (not (number % 65536) and distance <= 16843008):
                return(~sload(512 + (number / 65536) % 256))
    return(0)
```

### Rationale

This removes the need for implementations to have an explicit way to look into historical block hashes, simplifying the protocol definition and removing a large component of the "implied state" (information that is technically state but is not part of the state tree) and thereby making the protocol more "pure". Additionally, it allows blocks to directly point to blocks far behind them, which enables extremely efficient and secure light client protocols.
