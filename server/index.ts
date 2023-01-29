const server = require('fastify')({ logger: true })

server.register(require('@fastify/cors'), {})

server.get('/test', async (request, reply) => {
	return { statusCode: 200, message: 'it worked!', data: 'data' }
})

const start = async () => {
	try {
		await server.listen({ port: 8000 })
	} catch (err) {
		server.log.error(err)
		process.exit(1)
	}
}
start()
