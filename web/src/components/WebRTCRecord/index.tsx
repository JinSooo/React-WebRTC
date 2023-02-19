import { useEffect, useRef, useState } from 'react'
import { log } from '../../utils'

let mediaRecorder: MediaRecorder

export default function WebRTCRecord() {
	const videoRef = useRef<HTMLVideoElement>(null)
	const shareRef = useRef<HTMLVideoElement>(null)

	const [isFront, setIsFront] = useState(false)
	let constraints = { video: { facingMode: isFront ? 'user' : 'environment' } }

	const init = async () => {
		if (!navigator.mediaDevices) return alert('do not exist navigator.mediaDevices!!!')

		const stream = await navigator.mediaDevices.getUserMedia(constraints)
		videoRef.current!.srcObject = stream
	}

	// 改变摄像头时重新初始化
	useEffect(() => {
		init()
	}, [isFront])

	// 切换前后摄像头
	const toggleFront = () => setIsFront(!isFront)

	// 保存图片
	const savePic = () => {
		const canvas = document.createElement('canvas')
		canvas.width = videoRef.current!.clientWidth
		canvas.height = videoRef.current!.clientHeight
		const ctx = canvas.getContext('2d')
		ctx?.drawImage(videoRef.current as any, 0, 0, videoRef.current!.clientWidth, videoRef.current!.clientHeight)
		document.body.appendChild(canvas)
		log(canvas.toDataURL('base64'))
	}

	const startRecord = async () => {
		// 分享屏幕
		const shareStream = await navigator.mediaDevices.getDisplayMedia()
		shareRef.current!.srcObject = shareStream

		// 开始录制
		mediaRecorder = new MediaRecorder(shareStream, {
			audioBitsPerSecond: 128000,
			videoBitsPerSecond: 2500000,
			mimeType: 'video/webm; codecs="vp8,opus"',
		})
		mediaRecorder.start()

		mediaRecorder.ondataavailable = e => {
			log('end')
			const blob = new Blob([e.data], { type: 'video/mp4' })
			downloadRecord(blob)
		}

		mediaRecorder.onstop = e => {
			log('stop')
		}
	}

	// 停止录制
	const stopRecord = () => {
		if (mediaRecorder.state === 'recording') mediaRecorder.stop()
	}

	// 下载录制视频
	const downloadRecord = (blob: Blob) => {
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = Date.now() + ''
		a.click()
		URL.revokeObjectURL(url)
		a.remove()
	}

	return (
		<div>
			<video ref={videoRef} autoPlay muted></video>
			<button onClick={toggleFront}>toggle</button>
			<button onClick={savePic}>savePic</button>
			<button onClick={startRecord}>startRecord</button>
			<button onClick={stopRecord}>stopRecord</button>
			<video ref={shareRef} autoPlay muted></video>
		</div>
	)
}
