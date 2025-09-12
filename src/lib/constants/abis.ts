export const YIELD_VAULT_ABI = [
  {
    inputs: [],
    name: 'interestRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalBorrows',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cash',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'interestFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export const REGISTRAR_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
    ],
    name: 'isUserRegistered',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
    ],
    name: 'getUserPublicKey',
    outputs: [
      {
        internalType: 'uint256[2]',
        name: 'publicKey',
        type: 'uint256[2]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'uint256[2]',
                name: 'a',
                type: 'uint256[2]',
              },
              {
                internalType: 'uint256[2][2]',
                name: 'b',
                type: 'uint256[2][2]',
              },
              {
                internalType: 'uint256[2]',
                name: 'c',
                type: 'uint256[2]',
              },
            ],
            internalType: 'struct ProofPoints',
            name: 'proofPoints',
            type: 'tuple',
          },
          {
            internalType: 'uint256[5]',
            name: 'publicSignals',
            type: 'uint256[5]',
          },
        ],
        internalType: 'struct RegisterProof',
        name: 'proof',
        type: 'tuple',
      },
    ],
    name: 'register',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const
