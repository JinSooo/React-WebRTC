const Koa = require('koa')
const { Server } = require('socket.io')
const http = require('http')
const app = new Koa()

const server = http.createServer(app.callback())
const io = new Server(server, {
	cors: {
		origin: '*', // 允许跨域
		methods: ['GET', 'POST'], // 允许的请求方式
		allowedHeaders: '*', // 允许的请求头
		credentials: true, // 允许携带cookie
	},
	allowEIO3: true, // 是否启用与Socket.IO v2客户端的兼容性
	transport: ['websocket'], // 仅允许websocket,["polling", "websocket"]
})

server.listen(8080, () => {
	log('server is running ', 'http://127.0.0.1:8080/')
})

const log = (...msgs) => console.log('🚀', ...msgs)

io.on('connection', socket => {
	log('discount')

	socket.on('disconnect', () => log('discount'))

	socket.on('offer', async (offer, callback) => {
		socket.emit('offer', offer)
		callback({
			status: 'ok',
		})
	})

	socket.on('answer', async (answer, callback) => {
		socket.emit('answer', answer)
		callback({
			status: 'ok',
		})
	})
})
