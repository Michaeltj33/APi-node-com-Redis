const express = require('express')
const app = express()

const { createClient } = require('redis')
const client = createClient({
    host: '127.0.0.1',
    port: 6379
})

const getAllProducts = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(["produto 1", "produto 2"])
        }, 10000)
    })
}

app.get('/saved', async (req, res) => {
    await client.del('getAllProducts')
    return res.send({ ok: true })
})

app.get('/', async (req, res) => {
    const productsFromCache = await client.get('getAllProducts')

    //preenche esse campo somente se a cache estiver desatuaizado
    const isProductFromCacheStale = !(await client.get('getAllProducts:validation'))

    //retorna no banco de dados para refazer a query
    if (isProductFromCacheStale) {
        const isRefetching = !!(await client.get('getAllProducts:is-refetching'))
        console.log( {isRefetching} )
        if (!isRefetching) {
            await client.set('getAllProducts:is-refetching', "true", { EX: 20 })
            console.log('cache is stale - refetching...')
            setTimeout(async () => {
                const products = await getAllProducts()
                await client.set("getAllProducts", JSON.stringify(products))
                await client.set('getAllProducts:validation', "true", { EX: 5 })
                await client.del('getAllProducts:is-refetching')
            }, 0)
        }


    }
    if (productsFromCache) {
        return res.send(JSON.parse(productsFromCache))
    }
    const products = await getAllProducts()
    await client.set("getAllProducts", JSON.stringify(products), { EX: 60 })
    res.send(products)
})



const startup = async () => {
    await client.connect()
    app.listen(3000, () => {
        console.log("Servidor rodando")
    })
}
startup()