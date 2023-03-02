/* REFERENCE CODE */
// https://github.com/Unboxed-Software/solana-token-metadata/blob/challenge/src/index.ts

import { initializeKeypair } from "./initializeKeypair"
import {
  Connection,
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
  SystemProgram,
} from "@solana/web3.js"
import {
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  Account,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  getAccount,
  createMintToInstruction,
} from "@solana/spl-token"
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
} from "@metaplex-foundation/js"
import {
  DataV2,
  createCreateMetadataAccountV2Instruction,
} from "@metaplex-foundation/mpl-token-metadata"
import * as fs from "fs"

const tokenName = "RisingSunCoin"
const description = "Wake-up early to earn these coins!"
const symbol = "RSC"
const decimals = 2
const amount = 1

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"))
  const user = await initializeKeypair(connection)

  console.log("PublicKey:", user.publicKey.toBase58())

  /* - create a new token mint */
  // rent for token mint
  const lamports = await getMinimumBalanceForRentExemptMint(connection)

  // keypair for new token mint
  const mintKeypair = Keypair.generate()

  // get associated token account address for use
  const tokenATA = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    user.publicKey
  )

  /* - create a metadata account for the token mint */
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(user))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      })
    )

  // file to buffer
  const buffer = fs.readFileSync("src/assets/rscLogo.png")

  // buffer to metaplex file
  const file = toMetaplexFile(buffer, "rscLogo.png")

  // upload image and get image uri
  const imageUri = await metaplex.storage().upload(file)
  console.log("image uri:", imageUri)

  // upload metadata and get metadata uri (off chain metadata)
  const { uri } = await metaplex
    .nfts()
    .uploadMetadata({
      name: tokenName,
      description: description,
      image: imageUri,
    })


  console.log("metadata uri:", uri)

  // onchain metadata format
  const tokenMetadata = {
    name: tokenName,
    symbol: symbol,
    uri: uri,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  } as DataV2

  // get metadata PDA for token mint
  // const metadataPDA = await findMetadataPda(mintKeypair.publicKey)
  const metadataPDA = metaplex.nfts().pdas().metadata({ mint: mintKeypair.publicKey })

  // transaction to create metadata account
  const transaction = new Transaction().add(
    // create new account
    SystemProgram.createAccount({
      fromPubkey: user.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    // create new token mint
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      user.publicKey,
      user.publicKey,
      TOKEN_PROGRAM_ID
    ),
    // create metadata account
    createCreateMetadataAccountV2Instruction(
      {
        metadata: metadataPDA,
        mint: mintKeypair.publicKey,
        mintAuthority: user.publicKey,
        payer: user.publicKey,
        updateAuthority: user.publicKey,
      },
      {
        createMetadataAccountArgsV2: {
          data: tokenMetadata,
          isMutable: true,
        },
      }
    )
  )

  /* - create a token account */

  // instruction to create ATA (associated token account address)
  const createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
    user.publicKey, // payer
    tokenATA, // token address
    user.publicKey, // token owner
    mintKeypair.publicKey // token mint
  )

  let tokenAccount: Account
  try {
    // check if token account already exists
    tokenAccount = await getAccount(
      connection, // connection
      tokenATA // token address
    )
  } catch (error: unknown) {
    if (
      error instanceof TokenAccountNotFoundError ||
      error instanceof TokenInvalidAccountOwnerError
    ) {
      try {
        // add instruction to create token account if one does not exist
        transaction.add(createTokenAccountInstruction)
      } catch (error: unknown) {
        throw error
      }
    } else {
      throw error
    }
  }

  /* - mints tokens */

  transaction.add(
    // mint tokens to token account
    createMintToInstruction(
      mintKeypair.publicKey,
      tokenATA,
      user.publicKey,
      amount * Math.pow(10, decimals)
    )
  )

  // send transaction
  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [user, mintKeypair]
  )

  console.log(
    `Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

main()
  .then(() => {
    console.log("Finished successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
