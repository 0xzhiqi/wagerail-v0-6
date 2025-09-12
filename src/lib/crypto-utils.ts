import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { Base8, mulPointEscalar, subOrder } from '@zk-kit/baby-jubjub'
import { keccak256 } from 'viem'

// Export subOrder for use in other modules
export { subOrder }

/**
 * Format private key for BabyJubJub curve
 * @param privateKey - Raw private key as bigint
 * @returns Formatted private key as bigint
 */
export function formatPrivKeyForBabyJub(privateKey: bigint): bigint {
  // Ensure the private key is within the field size
  return privateKey % subOrder
}

/**
 * Generate private key from signature
 * @param signature - The signature hex string
 * @returns Private key as bigint
 */
export function i0(signature: string): bigint {
  if (typeof signature !== 'string' || signature.length < 132)
    throw new Error('Invalid signature hex string')

  const hash = keccak256(signature as `0x${string}`)
  const cleanSig = hash.startsWith('0x') ? hash.slice(2) : hash
  let bytes = hexToBytes(cleanSig)

  bytes[0] &= 0b11111000
  bytes[31] &= 0b01111111
  bytes[31] |= 0b01000000

  const le = bytes.reverse()
  let sk = BigInt(`0x${bytesToHex(le)}`)

  sk %= subOrder
  if (sk === BigInt(0)) sk = BigInt(1)
  return sk
}
