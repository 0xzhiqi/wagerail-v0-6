import { groth16 } from 'snarkjs'

export interface CalldataTransferCircuitGroth16 {
  a: [string, string]
  b: [[string, string], [string, string]]
  c: [string, string]
  inputs: string[]
}

export interface TransferCircuit {
  generateProof(input: any): Promise<{ proof: any; publicSignals: any }>
  generateCalldata(proof: {
    proof: any
    publicSignals: any
  }): Promise<CalldataTransferCircuitGroth16>
}

class CircuitManager {
  private circuitCache = new Map<string, TransferCircuit>()
  private isBrowser = typeof window !== 'undefined'

  private getCircuitPaths(circuitName: string) {
    if (this.isBrowser) {
      // In browser, use public URLs
      return {
        wasm: `/circuits/${circuitName}.wasm`,
        zkey: `/circuits/${circuitName}.groth16.zkey`,
        vkey: `/circuits/${circuitName}/verification_key.json`,
      }
    } else {
      // In Node.js environment, use file paths
      const path = require('path')
      const baseDir = path.join(process.cwd(), 'public', 'circuits')
      return {
        wasm: path.join(baseDir, `${circuitName}.wasm`),
        zkey: path.join(baseDir, `${circuitName}.groth16.zkey`),
        vkey: path.join(baseDir, `${circuitName}`, 'verification_key.json'),
      }
    }
  }

  private async checkFileExists(url: string): Promise<boolean> {
    if (this.isBrowser) {
      try {
        const response = await fetch(url, { method: 'HEAD' })
        return response.ok
      } catch {
        return false
      }
    } else {
      const fs = require('fs')
      return fs.existsSync(url)
    }
  }

  async getCircuit(circuitName: string): Promise<TransferCircuit> {
    // Check cache first
    if (this.circuitCache.has(circuitName)) {
      return this.circuitCache.get(circuitName)!
    }

    const paths = this.getCircuitPaths(circuitName)

    // Verify files exist
    const wasmExists = await this.checkFileExists(paths.wasm)
    const zkeyExists = await this.checkFileExists(paths.zkey)

    if (!wasmExists || !zkeyExists) {
      throw new Error(
        `Circuit files not found for ${circuitName}. Expected: ${paths.wasm}, ${paths.zkey}`
      )
    }

    const circuit: TransferCircuit = {
      async generateProof(input: any) {
        try {
          const { proof, publicSignals } = await groth16.fullProve(
            input,
            paths.wasm,
            paths.zkey
          )
          return { proof, publicSignals }
        } catch (error) {
          console.error(`Proof generation failed for ${circuitName}:`, error)
          throw new Error(
            `Failed to generate proof: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      },

      async generateCalldata(proofData: { proof: any; publicSignals: any }) {
        try {
          const calldata = await groth16.exportSolidityCallData(
            proofData.proof,
            proofData.publicSignals
          )

          const argv = calldata.replace(/["[\]\s]/g, '').split(',')

          return {
            a: [argv[0], argv[1]] as [string, string],
            b: [
              [argv[2], argv[3]],
              [argv[4], argv[5]],
            ] as [[string, string], [string, string]],
            c: [argv[6], argv[7]] as [string, string],
            inputs: argv.slice(8),
          }
        } catch (error) {
          console.error(`Calldata generation failed for ${circuitName}:`, error)
          throw new Error(
            `Failed to generate calldata: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      },
    }

    // Cache the circuit
    this.circuitCache.set(circuitName, circuit)
    return circuit
  }

  async verifyProof(
    circuitName: string,
    proof: any,
    publicSignals: any[]
  ): Promise<boolean> {
    const paths = this.getCircuitPaths(circuitName)

    let vKey: any
    if (this.isBrowser) {
      const response = await fetch(paths.vkey)
      if (!response.ok) {
        throw new Error(`Verification key not found for ${circuitName}`)
      }
      vKey = await response.json()
    } else {
      const fs = require('fs')
      if (!fs.existsSync(paths.vkey)) {
        throw new Error(`Verification key not found for ${circuitName}`)
      }
      vKey = JSON.parse(fs.readFileSync(paths.vkey, 'utf8'))
    }

    return await groth16.verify(vKey, publicSignals, proof)
  }

  // Clear cache if needed
  clearCache() {
    this.circuitCache.clear()
  }
}

// Create singleton instance
export const circuitManager = new CircuitManager()

// Mock zkit interface for compatibility
export const zkit = {
  getCircuit: (name: string) => circuitManager.getCircuit(name),
}
