import { Card } from './Card'
import { FC, useEffect, useState } from 'react'
import { Movie } from '../models/Movie'
import * as web3 from '@solana/web3.js'

const MOVIE_REVIEW_PROGRAM_ID = '8JhGaW8EwBs7HTTp2GrNcknYYkeFw3EZE3rGHrKYen1W'

export const MovieList: FC = () => {
    const connection = new web3.Connection(web3.clusterApiUrl('devnet'))
    const [movies, setMovies] = useState<Movie[]>([])

    useEffect(() => {
        connection.getProgramAccounts(new web3.PublicKey(MOVIE_REVIEW_PROGRAM_ID))
            .then(async (accounts) => {
                const movies: Movie[] = accounts.reduce((accumulator: Movie[], { pubkey, account }) => {
                    // Try to extract movie item from account data
                    const movie = Movie.deserialize(account.data)

                    // If the account does not have a review, movie will be null
                    if (!movie) {
                        return accumulator
                    }

                    return [...accumulator, movie]
                }, [])
                setMovies(movies)
            })
    }, [])

    return (
        <div>
            {
                movies.map((movie, i) => {
                    return (
                        <Card key={i} movie={movie} />
                    )
                })
            }
        </div>
    )
}