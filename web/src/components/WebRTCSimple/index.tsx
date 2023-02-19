import { CSSProperties, useEffect, useRef, useState } from 'react'
import { Input, Button, Row, Col, Space, Divider } from 'antd'

const log = (...msgs: any[]) => console.log('🚀', ...msgs)

// WebRTC
const peer = new RTCPeerConnection()

const videoStyle: CSSProperties = {
	background: '#eee',
}

export default function WbeRTCSimple() {
	const localVideo = useRef<HTMLVideoElement>(null)
	const remoteVideo = useRef<HTMLVideoElement>(null)
	// 创建本地/远程 SDP 描述, 用于描述本地/远程的媒体流
	const [offerSdp, setOfferSdp] = useState<string>('')
	const [answerSdp, setAnswerSdp] = useState<string>('')

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
