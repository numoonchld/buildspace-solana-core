// We're adding these
import * as Web3 from '@solana/web3.js';
import * as fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

/* ON-CHAIN PROGRAM 
PROGRAM_ID is the address of the ping program itself. 
PROGRAM_DATA_PUBLIC_KEY is the address of an account that stores the data for the program. 
Remember - executable code and stateful data are stored separately on Solana!
*/
const PROGRAM_ID = new Web3.PublicKey("ChT1B39WKLS8qUrkLvFDXMhEJ4F1XZzwUNHUt4AU9aVa")
const PROGRAM_DATA_PUBLIC_KEY = new Web3.PublicKey("Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod")


/* CREATE SIGNER */
async function initializeKeypair(connection: Web3.Connection): Promise<Web3.Keypair> {
    if (!process.env.PRIVATE_KEY) {
        console.log('Generating new keypair... 🗝️');
        const signer = Web3.Keypair.generate();

        console.log('Creating .env file');
        fs.writeFileSync('.env', `PRIVATE_KEY=[${signer.secretKey.toString()}]`);

        return signer;
    }

    const secret = JSON.parse(process.env.PRIVATE_KEY ?? '') as number[];
    const secretKey = Uint8Array.from(secret);
    const keypairFromSecret = Web3.Keypair.fromSecretKey(secretKey);

    // When creating it from the secret key
    await airdropSolIfNeeded(keypairFromSecret, connection);

    // When generating a keypair
    // await airdropSolIfNeeded(signer, connection);

    return keypairFromSecret;
}


/* AIRDROP IF KEYPAIR IS BROKE */
async function airdropSolIfNeeded(
    signer: Web3.Keypair,
    connection: Web3.Connection
) {
    const balance = await connection.getBalance(signer.publicKey);
    console.log('Current balance is', balance / Web3.LAMPORTS_PER_SOL, 'SOL');

    // 1 SOL should be enough for almost anything you wanna do
    if (balance / Web3.LAMPORTS_PER_SOL < 1) {
        // You can only get up to 2 SOL per request 
        console.log('Airdropping 1 SOL');
        const airdropSignature = await connection.requestAirdrop(
            signer.publicKey,
            Web3.LAMPORTS_PER_SOL
        );

        const latestBlockhash = await connection.getLatestBlockhash();

        await connection.confirmTransaction({
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            signature: airdropSignature,
        });

        const newBalance = await connection.getBalance(signer.publicKey);
        console.log('New balance is', newBalance / Web3.LAMPORTS_PER_SOL, 'SOL');
    }
}

/* SEND SOL */
async function sendSol(connection: Web3.Connection, amount: number, to: Web3.PublicKey, sender: Web3.Keypair) {
    const transaction = new Web3.Transaction()

    const sendSolInstruction = Web3.SystemProgram.transfer(
        {
            fromPubkey: sender.publicKey,
            toPubkey: to,
            lamports: amount,
        }
    )

    transaction.add(sendSolInstruction)

    const sig = await Web3.sendAndConfirmTransaction(connection, transaction, [sender])
    console.log(`You can view your transaction on the Solana Explorer at:\nhttps://explorer.solana.com/tx/${sig}?cluster=devnet`);
}



/* MAIN FUNCTION */
async function main() {
    const connection = new Web3.Connection(Web3.clusterApiUrl('devnet'))
    const payer = await initializeKeypair(connection)
    await connection.requestAirdrop(payer.publicKey, Web3.LAMPORTS_PER_SOL * 1)
    await sendSol(connection, 0.1 * Web3.LAMPORTS_PER_SOL, Web3.Keypair.generate().publicKey, payer)
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
