# solana-npx-client-template

## assignment

- in a single transaction, do:
    - create a new token mint
    - create a metadata account for the token mint
    - create a token account
    - mints tokens


## steps 
```
    npx create-solana-client solana-spl-token-assignment --initialize-keypair
    cd solana-spl-token-assignment
    npm install @metaplex-foundation/js fs
    npm install @metaplex-foundation/mpl-token-metadata
```

### Note: 
- Make sure you have `@solana/spl-token@0.2.0` or it will show error
``` 
    npm uninstall @solana/spl-token 
    npm install @solana/spl-token@0.2.0
``` 

into the terminal 