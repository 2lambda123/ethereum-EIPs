---
eip: TBD
title: EC arithmetics and pairings with runtime definitions
author: Alex Vlasov (@shamatar)
discussions-to: TBD
type: Standards Track
category: Core
status: Draft
created: 2019-04-22
requires: 1109
---

# Simple summary

This proposal is an extension and formalization of EIP1829 with an inclusion of pairings. EIP1109 is required due to possibly very low cost of point addition operation compared to the STATICCALL opcode.

## Abstract

This EIP proposes the following actions to bring cryptographic functionality desired for privacy and scaling solutions:

- Implement the following operations over elliptic curves in the Weierstrass form with curve parameters such as base field, A, B coefficients defined in runtime:
    - Point addition
    - Multiplication of a single point over a scalar
    - Multiexponentiation
- Implement pairing operation over elliptic curves from the following "families" with parameters such as base field, extension tower structure, coefficients defined in runtime:
    - BLS12
    - BN
    - MNT4/6
- Implement pairing operation over elliptic curves found by Cocks-Pinch method. Limit k <= 8.  

## Motivation

- Proposal to implement base elliptic curve arithmetics is covered by EIP1829 and will allow to implement various privacy-presenving protocols with a reasonable gas costs per operation.
- Pairings:
    - Extend set of curve that are available to allow Ethereum users to choose their security parameters and required functionality.
    - Due to large variety of curves implementation of this EIP should cover as broad area as possible to allow Ethereum users to experiment with their choices and constructions without waiting for new forks.
- Gas costs - this EIP is designed to also specify parameters and approach to gas cost evaluation before-hand. This is a strict requirement for any precompile to allow Ethereum nodes to efficiently reject transactions and operations as early as possible.

## Specification
This specification will not yet provide concrete numbers for every operation, but will first intoduce interfaces and gas calculation approaches.

In every call to the precompile the first byte specifies an operation that should be performed:
- `0x01`: Point addition
- `0x02`: Single point multiplication
- `0x03`: Multiexponentiation
- `0x04`: Pairing

For parameter encoding there is no dense bit packing. All the parameters (sizes, scalars, field elements, etc.) are Big Endian (BE) encoded unsigned integers.

Points are always encoded in affine coordinates as `(x, y)`. Extension field elements are always encoded as `(c0, c1, c2, ...)` where the element itself is interpreted as `c0 + c1 * u + c2 * u^2 + ...`. 

During the execution all the parameters that should be interpreted as "points" are first checked that those are "on curve", otherwise error is thrown.

Maximum proposed field bitsize is 1023 bits.

### Binary interface for non-pairing operations

Every operation of such kind should specify curve parameters right after the "operation" byte:
- 1 byte that encodes byte size of the modulus for a base field. Will be refered as "field element length".
- BE encoded modulus. Field modulo this parameter is refered as the "base field".
- BE encoded parameter `A` for a curve in the Weierstrass form. May be zero but still must take the whole field element length. Must be less than modulus, no reduction should be performed by the precompile.
- BE encoded parameter `B` for a curve in the Weierstrass form. May be zero but still must take the whole field element length. Must be less than modulus, no reduction should be performed by the precompile.
- 1 byte that encodes byte size of the main group on the curve (over which arithmetics should happen). Will be refered as "scalar element length".
- BE encoded size of the main group. Will be refered as "scalar field size".

While "scalar field size" is not used anywhere in principar operations (point additions, multiplications, multiexponentiations) do not depend on it, this parameter is required to calculate a gas cost for this operation (that's not true for point addition, but interface should be kept universal). E.g. for a naive "double and add" point multiplication approach the worst case scenario is when "add" operation is performed as many times a possible, it can be estimated as if the scalar had the same bit length as a size of the main group, but consisted of only `1` in it's bit decomposition.

#### Point addition

After the curve parameters from above two points must be specified to perform an addition. Output is a point in affine coordinates.

#### Point addition

After the curve parameters from above one point and one scalar must be specified to perform a multiplication. Output is a point in affine coordinates. Scalar must be less than the size of the group, otherwise error is thrown.

#### Multiexponentiation

After the curve parameters from above a list of `N` pairs `(point, scalar)` must be specified to perform a multiexponentiation. Output is a point in affine coordinates. Scalars must be less than the size of the group, otherwise error is thrown. For efficiency reasons this operations should use Peppinger algorithm with huge performance benefits.

#### Gas calculation for non-pairing operations

For all the operations above arithmetics is performed in a field specified by modulus. Number of operations for point addition is known beforehand, so the bitlength (or byte length, more likely) of the modulus clearly must be one of the parameters. Second parameter is length of the bit (or byte) length of the scalar field. Third parameter is number of `(point,scalar)` pairs for multiexponentiation.

Let's denote field element bytelength as `fe_length`,
scalar length as `scalar_length` and number of points as `N`. Concrete coefficients that are to be determined will be labeled as `C_*`. Notation `quatratic` is to indicate a function that is quadratic over it's parameter.

Quadratic dependency over field element byte length is due to multiplication.

Proposed formulas:
- Point addition: `C_0*quadratic(fe_length)`
- Point multiplication: `C_1 * quadratic(fe_length) * scalar_length`
- Multiexponentiation: `C_2 * N * quadratic(fe_length) * scalar_length`

Multiexponentiation formula is different due to use of the specialized algorithm.

### Binary interface for pairing operations

Pairing operations have other parameters required to estimate gas costs, so common part of the interface is different from non-pairing operations

- 1 byte that encodes byte size of the modulus for a base field. Will be refered as "field element length".
- BE encoded modulus. Field modulo this parameter is refered as the "base field".
- BE encoded parameter `A` for a curve in the Weierstrass form. May be zero but still must take the whole field element length. Must be less than modulus, no reduction should be performed by the precompile.
- BE encoded parameter `B` for a curve in the Weierstrass form. May be zero but still must take the whole field element length. Must be less than modulus, no reduction should be performed by the precompile.
- 1 byte that encodes curve "family"
    - `0x01` BLS12
    - `0x02` BN
    - `0x03` MNT4
    - `0x04` MNT6
    - `0x05` Cocks-Pinch

Parameters for a pairing are encoded as a list of `N` pairs `(p1, p2)` with `p1` being point from `G1` (curve over base field) in affine coordinates, and `p2` being point from `G2` (over the extension).

Pairing operation consists of two major contributors:
- Miller loop. This part does depend from the number of pairs `N` and has number of steps that is specific for every curve family. For example, BLS12 family is generated by a single scalar `x` (standard notation) that determines number of steps in this loop. Any such parameters must be provided in the binary interface for gas costs estimation.
- Final exponentiation. This part does not depend from the number of pairs. Length of the loop for this operation is different for different families and can either be calculated in from other parameters or specified in the interface. In any case, gas costs can be estimated upfront.

Below there will be proposed interface for BLS12 family of curves with other interfaces being built in a similar manner.

#### BLS12 family pairing operation interface

- 1 byte, length of the `x` parameter.
- BE encoding of parameter `x` (unsigned).
- 1 byte, sign of parameter `x`. `0x00` is `+`, `0x01` is `-`.
- 1 byte, specifies type of the pairing. Either `0x01` or `0x02`. This type depends of the curve and does not affect the gas cost.
- structure of the extension tower:
    - non-residue for Fp2 extension in BE encoding. This is just a single element in the base field and must be less than modulus.
    - non-residue for Fp6 extension (that is "3 over 2"). This is an element in Fp2 and encoded using the rules from the begining of this EIP.
- Encoding of the "A" parameter in Fp2 for the curve over the extension (Fp2).
- Encoding of the "B" parameter in Fp2 for the curve over the extension (Fp2).

For BLS12 family `x` parameter is enough for gas costs estimation. It's Hamming weight and bit length determines complexity of the Miller loop. Final exponentiation depends of the base field size.

Proposed gas cost formula: `C_0 * quadratic(fe_length) + N * C_1 * fe_length * Hamming_and_bit_length(x)`

#### Pairing operation interface for other families

Complexity for BN family is also determined by the single scalar parameter, so interface will be similar to BLS12. For MNT4/6 and Cocks-Pinch curves there would be required to specify number of steps in the Miller loop explicitly in the interface.

### Possible simplifications

Due to high complexity of the proposed operations in the aspects of implementation, debuging and evaluation of the factors for gas costs it may be appropriate to either limit the set of curves at the moment of acceptance to some list and then extend it. Another approach (if it's technically possible) would be to have the "whilelist" contract that can be updated without consensus changes (w/o fork).

In the case of limited set of curve the following set is proposed as a minimal:
- BN254 curve from the current version of Ethereum
- BN curve from DIZK with 2^32 roots of unity
- BLS12-381 
- BLS12-377 from ZEXE with large number of roots of unity
- MNT4/6 cycle from the original [paper](https://eprint.iacr.org/2014/595.pdf). It's not too secure, but may give some freedom for experiments.
- Set of CP generated curves that would allow embedding of BLS12-377 and may be some BN curve that would have large power of two divisor for both base field and scalar field moduluses (example of CP curve for BLS12-377 can be found in ZEXE). 

## Rationale

Only the largest design decisions will be covered:
- While there is no arithmetics over the scalar field (which is modulo size of the main group) of the curve, it's required for gas estimation purposes.
- One may separate interfaces for additions, multiplications and multiexponentiations and estimate gas costs differently for every operation, but it would bring confusion for users and will make it harder to use a precompile from the smart-contract.
- Multiexponentiation is a separate operation due to large cost saving
- There are no point decompressions due to impossibility to get universal gas estimation of square root operation. For a limited number of "good" cases prices would be too different, so specifying the "worst case" is expensive and inefficient, while introduction of another level if complexity into already complicated gas costs formula is not worth is.

## Test Cases
Test cases are the part of the implementation with a link below.

## Implementation
There is an ongoing implementation effort [here](https://github.com/matter-labs/eip1829). Right now:
- Non-pairing operations are implemented and tested.
- BLS12 family is completed and tested for BLS12-381 curve. 
- Cocks-Pinch method curve is tested for k=6 curve from ZEXE.

## Preliminary benchmarks

cp6 in benchmarks is a Cocks-Pinch method curve that embeds BLS12-377. Machine: Core i7, 2.9 GHz.

Multiexponentiation benchmarks take 100 pairs `(generator, random scalar)` as input. Due to the same "base" it may be not too representative benchmark and will be updated.

```
test pairings::bls12::tests::bench_bls12_381_pairing    ... bench:   2,348,317 ns/iter (+/- 605,340)
test pairings::cp::tests::bench_cp6_pairing             ... bench:  86,328,825 ns/iter (+/- 11,802,073)
test tests::bench_addition_bn254                        ... bench:         388 ns/iter (+/- 73)
test tests::bench_doubling_bn254                        ... bench:         187 ns/iter (+/- 4)
test tests::bench_field_inverse                         ... bench:       2,478 ns/iter (+/- 167)
test tests::bench_field_mont_inverse                    ... bench:       2,356 ns/iter (+/- 51)
test tests::bench_multiplication_bn254                  ... bench:      81,744 ns/iter (+/- 6,984)
test tests::bench_multiplication_bn254_into_affine      ... bench:      81,925 ns/iter (+/- 3,323)
test tests::bench_multiplication_bn254_into_affine_wnaf ... bench:      74,716 ns/iter (+/- 4,076)
test tests::bench_naive_multiexp_bn254                  ... bench:  10,659,911 ns/iter (+/- 559,790)
test tests::bench_peppinger_bn254                       ... bench:   2,678,743 ns/iter (+/- 148,914)
test tests::bench_wnaf_multiexp_bn254                   ... bench:   9,161,281 ns/iter (+/- 456,137)
```

## Copyright
Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).