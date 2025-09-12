import { Base8, mulPointEscalar, type Point } from '@zk-kit/baby-jubjub'
import {
  formatPrivKeyForBabyJub,
  genRandomBabyJubValue,
  poseidonDecrypt,
  poseidonEncrypt,
} from 'maci-crypto'

// Base point order for baby-jubjub curve
const BASE_POINT_ORDER = BigInt(
  '2736030358979909402780800718157159386076813972158567259200215660948447373041'
)

/**
 * Browser-compatible random bytes generator using Web Crypto API
 */
const getRandomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

/**
 * Convert Uint8Array to hex string
 */
const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  )
}

/**
 * Generates a random nonce
 * @returns A cryptographically secure random number
 */
export const randomNonce = (): bigint => {
  const bytes = getRandomBytes(16)
  // add 1 to make sure it's non-zero
  return BigInt(`0x${bytesToHex(bytes)}`) + BigInt(1)
}

/**
 *
 * @param inputs Input array to encrypt
 * @param publicKey Public key
 * @returns ciphertext - Encrypted message
 * @returns nonce - Nonce used for the poseidon encryption
 * @returns encRandom - Randomness used for the encryption
 * @returns poseidonEncryptionKey - Encryption key (publicKey * encRandom)
 * @returns authKey - Authentication key (Base8 * encRandom)
 */
export const processPoseidonEncryption = (
  inputs: bigint[],
  publicKey: bigint[]
) => {
  const nonce = randomNonce()

  let encRandom = genRandomBabyJubValue()
  if (encRandom >= BASE_POINT_ORDER) {
    encRandom = genRandomBabyJubValue() / BigInt(10)
  }

  const poseidonEncryptionKey = mulPointEscalar(
    publicKey as Point<bigint>,
    encRandom
  )
  const authKey = mulPointEscalar(Base8, encRandom)
  const ciphertext = poseidonEncrypt(inputs, poseidonEncryptionKey, nonce)

  return { ciphertext, nonce, encRandom, poseidonEncryptionKey, authKey }
}

/**
 * Decrypts a message encrypted with Poseidon
 * @param ciphertext Encrypted message
 * @param authKey Authentication key
 * @param nonce Nonce used for the poseidon encryption
 * @param privateKey Private key
 * @param length Length of the original input array
 * @returns Decrypted message as an array
 */
export const processPoseidonDecryption = (
  ciphertext: bigint[],
  authKey: bigint[],
  nonce: bigint,
  privateKey: bigint,
  length: number
) => {
  const sharedKey = mulPointEscalar(
    authKey as Point<bigint>,
    formatPrivKeyForBabyJub(privateKey)
  )

  const decrypted = poseidonDecrypt(ciphertext, sharedKey, nonce, length)

  return decrypted.slice(0, length)
}
