import { CSSProperties, useEffect, useRef, useState } from 'react'
import { Input, Button, Row, Col, Space, Divider, message } from 'antd'
import { Socket, io } from 'socket.io-client'
import { v4 as uuid } from 'uuid'

const log = (...msgs: any[]) => console.log('🚀', ...msgs)

// Socket
let socket: Socket
// WebRTC
const peer = new RTCPeerConnection()

const videoStyle: CSSProperties = {
	background: '#eee',
}

export default function WebRTCSocket() {
	const localVideo = useRef<HTMLVideoElement>(null)
	const remoteVideo = useRef<HTMLVideoElement>(null)
	// 创建本地/远程 SDP 描述, 用于描述本地/远程的媒体流
	const [offerSdp, setOfferSdp] = useState<string>('')
	const [answerSdp, setAnswerSdp] = useState<string>('')
	// 信息
	const [info, setInfo] = useState({
		userId: uuid(),
		roomId: '',
	})

	// 1. 初始化本地流和远程流
	const initMedia = async () => {
		// 采集本地视频流
		const localStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
		localVideo.current!.srcObject = localStream

		// 将本地视频流添加到RTCPeerConnection
		localStream.getTracks().forEach(track => {
			peer.addTrack(track, localStream)
		})

		// 监听远程流
		peer.ontrack = event => {
			remoteVideo.current!.srcObject = event.streams[0]
		}
	}

	// 2. 创建本地offer并传给对端
	const createOffer = async () => {
		// 创建本地的 SDP 描述
		const offer = await peer.createOffer()
		await peer.setLocalDescription(offer)

		/**
		 * 用来监听 ICE 服务器返回的候选地址，当 ICE 服务器返回一个新的候选地址时，
		 * 就会触发该事件，这里我们需要将这个候选地址发送给远端，这样远端才能够和我们建立连接
		 */
		peer.onicecandidate = event => {
			if (event.candidate) setOfferSdp(JSON.stringify(peer.localDescription))
		}
	}

	// 3. 创建 answer 并设置到本地描述中，然后通过信令服务器发送 answer 给对端
	const createAnswer = async () => {
		// 对端的offer
		const offer = JSON.parse(offerSdp)

		peer.onicecandidate = event => {
			if (event.candidate) setAnswerSdp(JSON.stringify(peer.localDescription))
		}

		// 对端的设为远程
		await peer.setRemoteDescription(offer)
		// 这里的answer是本端的offer和对端answer
		const answer = await peer.createAnswer()
		await peer.setLocalDescription(answer)
	}

	// 4. 将answer添加过滤(应答)
	const addAnswer = async () => {
		const answer = JSON.parse(answerSdp)
		if (!peer.currentRemoteDescription) {
			peer.setRemoteDescription(answer)
		}
	}

	const handleChange = (type: string, val: string) => {
		if (type === 'offer') setOfferSdp(val)
		if (type === 'answer') setAnswerSdp(val)
	}

	const initSocket = () => {
		socket = io('http://127.0.0.1:8080', {
			query: info,
		})

		// 连接成功时触发
		socket.on('connect', () => {
			handleConnect()
		})

		// 断开连接时触发
		socket.on('disconnect', reason => {
			if (reason === 'io server disconnect') {
				// 断线是由服务器发起的，重新连接。
				socket.connect()
			}
			message.warning('您已断开连接')
		})
		// 服务端发送报错信息
		socket.on('error', data => {
			message.error(data)
		})
		// 当有用户加入房间时触发
		socket.on('welcome', data => {
			message.success(data.userId === info.userId ? '🦄成功加入房间' : `🦄${data.userId}加入房间`)
		})
		// 当有用户离开房间时触发
		socket.on('leave', data => {
			message.warning(data.userId === info.userId ? '🦄成功离开房间' : `🦄${data.userId}离开房间`)
		})
		// 当有用户发送消息时触发
		socket.on('message', data => {})
		// 创建offer,发送给远端
		socket.on('createOffer', data => {
			// 如果已经创建过，直接发送
			if (offerSdp) {
				socket.emit('offer', {
					userId: info.userId,
					roomId: info.roomId,
					sdp: offerSdp,
				})
				return
			}
			createOffer() // 创建 offer
		})
		// 收到offer,创建answer
		socket.on('offer', data => {
			createAnswer(data.sdp)
		})
		// 收到answer,设置远端sdp
		socket.on('answer', data => {
			addAnswer(data.sdp)
		})
	}

	useEffect(() => {
		// initSocket()
		initMedia()
	}, [])

	return (
		<div>
			<Row justify="space-around">
				<Col span={10}>
					<video ref={localVideo} autoPlay playsInline muted style={videoStyle} width={640} height={320}></video>
				</Col>
				<Col span={10}>
					<video ref={remoteVideo} autoPlay playsInline muted style={videoStyle} width={640} height={320}></video>
				</Col>
			</Row>
			<Divider />
			<Row justify="space-around">
				<div>
					<div>
						offer: <Input style={{ width: '300px' }} type="text" value={offerSdp} onChange={e => handleChange('offer', e.target.value)} />
					</div>
					<div>
						answer: <Input style={{ width: '300px' }} type="text" value={answerSdp} onChange={e => handleChange('answer', e.target.value)} />
					</div>
				</div>
				<Space>
					<Button type="primary" onClick={createOffer}>
						Create Offer
					</Button>
					<Button type="primary" onClick={createAnswer}>
						Create Answer
					</Button>
					<Button type="primary" onClick={addAnswer}>
						Add Answer
					</Button>
				</Space>
			</Row>
		</div>
	)
}
