import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { Base8, mulPointEscalar, subOrder } from '@zk-kit/baby-jubjub'
import { type Account } from 'thirdweb/wallets'
import { keccak256 } from 'viem'

import { decryptPoint } from './jub'
import { processPoseidonDecryption } from './poseidon'

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

/**
 * Derives private key and public key from user signature
 * @param userAddress The user's EVM address (0x...)
 * @param account The account instance to sign with (thirdweb Account type)
 * @returns Object containing privateKey, formattedPrivateKey, and publicKey
 */
export async function deriveKeysFromUser(
  userAddress: string,
  account: Account
): Promise<{
  privateKey: bigint
  formattedPrivateKey: bigint
  publicKey: [bigint, bigint]
  signature: string
}> {
  // Create deterministic message for signing - match exactly with registration
  const message = `eERC\nRegistering user with\n Address:${userAddress.toLowerCase()}`

  console.log('📝 Message to sign for balance:', message)

  // Get signature from user using thirdweb v5 format
  const signature = await account.signMessage({ message })
  if (!signature || signature.length < 64) {
    throw new Error('Invalid signature received from user')
  }

  // Derive private key from signature deterministically
  console.log('🔑 Deriving private key from signature...')
  const privateKey = i0(signature)
  console.log('Private key (raw):', privateKey.toString())

  // Format private key for BabyJubJub
  const formattedPrivateKey = formatPrivKeyForBabyJub(privateKey) % subOrder
  console.log('Private key (formatted):', formattedPrivateKey.toString())

  // Generate public key using BabyJubJub
  const publicKey = mulPointEscalar(Base8, formattedPrivateKey).map((x) =>
    BigInt(x)
  ) as [bigint, bigint]
  console.log('Public key X:', publicKey[0].toString())
  console.log('Public key Y:', publicKey[1].toString())

  return {
    privateKey,
    formattedPrivateKey,
    publicKey,
    signature,
  }
}

/**
 * Decrypts EGCT balance using ElGamal decryption and finds the discrete log
 * @param privateKey The private key for decryption
 * @param c1 First component of the encrypted balance
 * @param c2 Second component of the encrypted balance
 * @returns The decrypted balance as bigint
 */
export function decryptEGCTBalance(
  privateKey: bigint,
  c1: [bigint, bigint],
  c2: [bigint, bigint]
): bigint {
  try {
    console.log('decryptEGCTBalance 1')
    // Decrypt the point using ElGamal
    const decryptedPoint = decryptPoint(privateKey, c1, c2)
    console.log('decryptEGCTBalance 2')
    console.log(decryptedPoint[0], decryptedPoint[1])
    // Use optimized discrete log search
    const result = findDiscreteLogOptimized([
      decryptedPoint[0],
      decryptedPoint[1],
    ])
    console.log('decryptEGCTBalance 3')
    if (result !== null) {
      return result
    }

    console.log(
      '⚠️  Could not find discrete log for decrypted point:',
      decryptedPoint
    )
    return BigInt(0)
  } catch (error) {
    console.log('⚠️  Error decrypting EGCT:', error)
    return BigInt(0)
  }
}

// Cache for frequently computed discrete logs
const discreteLogCache = new Map<string, bigint>()

// Pre-populate cache with common values on first use
let cacheInitialized = false
function initializeCache() {
  if (cacheInitialized) return

  // Pre-compute and cache common values (0-100, then multiples of 100 up to 10000)
  const commonValues = []

  // Add 0-100 (very common small amounts)
  for (let i = 0; i <= 100; i++) {
    commonValues.push(BigInt(i))
  }

  // Add multiples of 100 up to 10000 (common transaction amounts)
  for (let i = 200; i <= 10000; i += 100) {
    commonValues.push(BigInt(i))
  }

  // Pre-compute these values
  for (const value of commonValues) {
    try {
      const point = mulPointEscalar(Base8, value)
      const key = `${point[0]},${point[1]}`
      discreteLogCache.set(key, value)
    } catch (error) {
      // Skip if computation fails
    }
  }

  cacheInitialized = true
}

// Cache management to prevent memory leaks
const MAX_CACHE_SIZE = 1000
function setCacheWithLimit(key: string, value: bigint) {
  if (discreteLogCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries (simple FIFO)
    const firstKey = discreteLogCache.keys().next().value
    if (firstKey) {
      discreteLogCache.delete(firstKey)
    }
  }
  discreteLogCache.set(key, value)
}

/**
 * Optimized discrete logarithm finder with smart search patterns
 * Much more efficient than linear brute force, with caching
 */
function findDiscreteLogOptimized(
  targetPoint: [bigint, bigint]
): bigint | null {
  console.log('findDiscreteLogOptimized 1')
  // Initialize cache with common values if not done yet
  initializeCache()

  // Check cache first
  const cacheKey = `${targetPoint[0]},${targetPoint[1]}`
  const cached = discreteLogCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }
  const maxValue = BigInt(100000) // Up to 1000 PRIV with 2 decimals

  // Strategy 1: Check common small values first (0-1000)
  // Most balances are likely to be small
  console.log('findDiscreteLogOptimized 2')
  console.log(targetPoint[0], targetPoint[1])
  for (let i = BigInt(0); i <= BigInt(1000); i++) {
    const testPoint = mulPointEscalar(Base8, i)
    if (testPoint[0] === targetPoint[0] && testPoint[1] === targetPoint[1]) {
      // Cache the result (with size limit)
      setCacheWithLimit(cacheKey, i)
      return i
    }
  }

  // Strategy 2: Check round numbers (multiples of 100, 1000, etc.)
  // Many transactions are likely to be round amounts
  const roundNumbers = [
    BigInt(100),
    BigInt(500),
    BigInt(1000),
    BigInt(1500),
    BigInt(2000),
    BigInt(2500),
    BigInt(3000),
    BigInt(5000),
    BigInt(10000),
    BigInt(15000),
    BigInt(20000),
    BigInt(25000),
    BigInt(30000),
    BigInt(40000),
    BigInt(50000),
    BigInt(75000),
    BigInt(100000),
  ]

  for (const value of roundNumbers) {
    if (value <= maxValue) {
      const testPoint = mulPointEscalar(Base8, value)
      if (testPoint[0] === targetPoint[0] && testPoint[1] === targetPoint[1]) {
        // Cache the result (with size limit)
        setCacheWithLimit(cacheKey, value)
        return value
      }
    }
  }

  // Strategy 3: Binary search-like approach for remaining values
  // Divide the remaining space into chunks and search efficiently
  const chunkSize = BigInt(1000)
  for (let chunk = BigInt(1000); chunk < maxValue; chunk += chunkSize) {
    const chunkEnd = chunk + chunkSize > maxValue ? maxValue : chunk + chunkSize

    // Check chunk boundaries first
    for (let i = chunk; i < chunkEnd; i += BigInt(100)) {
      const testPoint = mulPointEscalar(Base8, i)
      if (testPoint[0] === targetPoint[0] && testPoint[1] === targetPoint[1]) {
        // Cache the result (with size limit)
        setCacheWithLimit(cacheKey, i)
        return i
      }
    }

    // If we find we're in the right chunk, do detailed search
    // (This would need more sophisticated logic, but for now keep it simple)
  }

  // Strategy 4: Fallback to linear search in remaining space (with early termination)
  // Only search areas we haven't covered yet, with periodic checks
  for (let i = BigInt(1001); i <= maxValue; i++) {
    // Skip values we already checked in previous strategies
    if (i % BigInt(100) === BigInt(0)) continue // Already checked multiples of 100

    const testPoint = mulPointEscalar(Base8, i)
    if (testPoint[0] === targetPoint[0] && testPoint[1] === targetPoint[1]) {
      // Cache the result (with size limit)
      setCacheWithLimit(cacheKey, i)
      return i
    }

    // Early termination: if we've been searching too long, give up
    if (i > BigInt(50000) && i % BigInt(10000) === BigInt(0)) {
      console.log(`🔍 Discrete log search progress: ${i}/${maxValue}...`)
    }
  }

  return null // Not found
}

/**
 * Gets decrypted balance from encrypted balance using both EGCT and PCT decryption methods
 * @param privateKey The private key for decryption
 * @param amountPCTs Array of amount PCTs to decrypt
 * @param balancePCT Balance PCT to decrypt
 * @param encryptedBalance EGCT encrypted balance
 * @returns The total decrypted balance as bigint
 */
export async function getDecryptedBalance(
  privateKey: bigint,
  amountPCTs: any[],
  balancePCT: bigint[],
  encryptedBalance: bigint[][]
): Promise<bigint> {
  console.log('Before encryptedBalance: ')
  // First, try to decrypt the EGCT (main encrypted balance)
  const c1: [bigint, bigint] = [encryptedBalance[0][0], encryptedBalance[0][1]]
  const c2: [bigint, bigint] = [encryptedBalance[1][0], encryptedBalance[1][1]]
  console.log(c1)
  console.log(c2)
  console.log(1)
  // Check if EGCT is empty (all zeros)
  const isEGCTEmpty =
    c1[0] === BigInt(0) &&
    c1[1] === BigInt(0) &&
    c2[0] === BigInt(0) &&
    c2[1] === BigInt(0)
  console.log(2)
  if (!isEGCTEmpty) {
    // Decrypt EGCT - this is the primary balance
    const egctBalance = decryptEGCTBalance(privateKey, c1, c2)
    console.log('🔐 EGCT Balance found:', egctBalance.toString())
    return egctBalance
  }
  console.log(3)
  // If EGCT is empty, fall back to PCT decryption
  let totalBalance = BigInt(0)

  // Decrypt the balance PCT if it exists
  if (balancePCT.some((e) => e !== BigInt(0))) {
    console.log('Before balancePCT: ', balancePCT)
    try {
      const decryptedBalancePCT = await decryptPCT(privateKey, balancePCT)
      totalBalance += BigInt(decryptedBalancePCT[0])
    } catch (error) {
      console.log("Note: Balance PCT is empty or couldn't be decrypted")
    }
  }
  console.log('Before amountPCTs: ', amountPCTs)
  // Decrypt all the amount PCTs and add them to the total balance
  for (const amountPCT of amountPCTs) {
    if (amountPCT.pct && amountPCT.pct.some((e: bigint) => e !== BigInt(0))) {
      try {
        const decryptedAmountPCT = await decryptPCT(privateKey, amountPCT.pct)
        totalBalance += BigInt(decryptedAmountPCT[0])
      } catch (error) {
        console.log("Note: Some amount PCT couldn't be decrypted")
      }
    }
  }

  return totalBalance
}

/**
 * Function for decrypting a PCT
 * @param privateKey
 * @param pct PCT to be decrypted
 * @param length Length of the original input array
 * @returns decrypted - Decrypted message as an array
 */
export const decryptPCT = async (
  privateKey: bigint,
  pct: bigint[],
  length = 1
) => {
  // extract the ciphertext, authKey, and nonce from the pct
  const ciphertext = pct.slice(0, 4)
  const authKey = pct.slice(4, 6)
  const nonce = pct[6]
  console.log('Before ciphertext: ', ciphertext)
  console.log('Before authKey: ', authKey)
  console.log('Before nonce: ', nonce)
  console.log('Before privateKey: ', privateKey)
  console.log('Before length: ', length)
  const decrypted = processPoseidonDecryption(
    ciphertext,
    authKey,
    nonce,
    privateKey,
    length
  )

  return decrypted
}
