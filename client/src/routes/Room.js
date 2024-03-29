import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled, { keyframes } from "styled-components";
import RecordRTC from "recordrtc";
import download from "downloadjs";
import {Send, Mic, MicOff, Videocam, VideocamOff, CallEnd, FiberManualRecord, Stop} from '@styled-icons/material/';
import Message from "./Message";
import Avatar from 'react-avatar';

const Container = styled.div`
    display: flex;
`;

const Popup = styled.div`
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.3);
    position: absolute;
    display: ${props => props.displayPopup};
    .popup-content {
        position: absolute;
        border-radius: 10px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 5;
        width: 300px;
        background: white;
        padding: 10px;
    }
`;

const recordBlinking = keyframes`
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
`

const Recording = styled.div`
    position: absolute;
    left: 35px;
    top: 10px;
    .record-mark {
        height: 15px;
        width: 15px;
        border-radius: 50%;
        background: red;
        display: inline-block;
        margin-right: 5px;
    }
    span {
        vertical-align: middle;
    }
    animation-name: ${recordBlinking};
    animation-duration: 4s;
    animation-iteration-count: infinite;
`;

const VideoContainer = styled.div`
    padding: 35px;
    display: grid;
    grid-template-columns: repeat(auto-fill, 300px);
    grid-auto-rows: 300px;
    margin: 0;
    gap: 10px;
    width: 70%;
    .sb-avatar__text {
        border-radius: 20px;
    }
`;

const StyledVideo = styled.video`
    height: 100%;
    width: 100%;
    object-fit: cover;
    border-radius: 20px;
`;

const Video = styled.div`
    position: relative;
    .sb-avatar {
        position: absolute;
        top: 0;
        left: 0;
    }
    .mic {
        position: absolute;
        bottom: 5px;
        right: 5px;
        background: rgba(255,255,255,0.5);
        border-radius: 10px;
        padding: 4px;
    }
`;

const Controls = styled.div`
    position: absolute;
    bottom: 10px;
    left: 20%;
    & > svg {
        margin: 5px 10px;
    }
`;

const MessageContainer = styled.div`
    margin: 20px;
    border-radius: 20px;
    width: 30%;
    background: #ffffff;
    .messages {
        padding: 10px;
        overflow-y: scroll;
        height: calc(100vh - 95px);
    }
    .sendBox {
        display: flex;
        align-items: center;
        position: absolute;
        bottom: 5px;
        width: 28%;
    }
    
`;

const MessageBox = styled.textarea`
    height: 30%;
    width: 100%;
    border: none;
    border-radius: 10px;
    margin-right: 10px;
`;

const MyVideo = styled.div`
    height: 100%;
    width: 100%;
    position: relative;
    .sb-avatar__text {
        position: absolute;
        top: 0;
        left: 0;
    }
`;

const MyVideoContainer = (props) => {
    return (
        <MyVideo>
            <StyledVideo muted ref={props.userVideo} autoPlay playsInline />
            { props.isCameraOff && <Avatar name={props.myName} size="100%" /> }
        </MyVideo>
    );
}

const PeerMic = (props) => {
    if (props.mic){
        return <MicOff className='mic' size="30" />
    } else {
        return <Mic className='mic' size="30" />
    }
}

const PeerVideo = (props) => {
    const ref = useRef();
    const name = props.names.find(name => name.peerID === props.peer.peerID)
    const peerName = name ? name.name : 'anonymous';
    const camera = props.peerCameras[props.peer.peerID]
    const mic = props.peerMics[props.peer.peerID]

    useEffect(() => {
        props.peer.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
    }, []);

    return (
        <Video>
            <StyledVideo playsInline autoPlay ref={ref} />
            { camera && <Avatar name={peerName} size="100%" /> }
            <PeerMic mic={mic} />
            <div>{peerName}</div>
        </Video>
    );
}

const videoConstraints = {
    height: window.innerHeight,
    width: window.innerWidth
};

const Room = (props) => {
    const [peers, setPeers] = useState([]);
    //const [myName, setMyName] = useState("");
    const [names, setNames] = useState([]);
    const [isMute, setMute] = useState(false);
    const [isRecording, setRecording] = useState(false);
    const [isCameraOff, setCameraOff] = useState(false);
    const [recorder, setRecorder] = useState();
    const [text, setText] = useState("");
    const [messages, setMessages] = useState([]);
    const [peerCameras, setPeerCameras] = useState({});
    const [peerMics, setPeerMics] = useState({});
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const roomID = props.match.params.roomID;
    const Location = props.location.state
    const [myName, setMyName] = useState(Location.displayName)

    useEffect(() => {
        socketRef.current = io.connect("/");

        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true }).then(stream => {
            userVideo.current.srcObject = stream;
            socketRef.current.emit("join room", roomID);

            socketRef.current.emit("set myname", { senderID: socketRef.current.id, name: myName })

            socketRef.current.on("all users", users => {
                console.log('all users')
                const peers = [];
                users.forEach(userID => {
                    const peer = createPeer(userID, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    })
                    peers.push({
                        peerID: userID,
                        peer
                    });
                })
                console.log('peers', peers);
                setPeers(peers);
            })

            socketRef.current.once("user joined", payload => {
                console.log('user joined', payload)
                const samePeer = peersRef.current.find(p => p.peerID === payload.callerID)

                if (!samePeer){
                const peer = addPeer(payload.signal, payload.callerID, stream);
                    peersRef.current.push({
                        peerID: payload.callerID,
                        peer,
                    })

                    const peerObj = {
                        peer,
                        peerID: payload.callerID
                    }

                    let newArr = [...peers, peerObj]
                    setPeers(newArr);
                }
            });

            socketRef.current.on("receiving returned signal", payload => {
                console.log('receiving returned signal', payload)
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });

            socketRef.current.on("user left", id => {
                const peerObj = peersRef.current.find(p => p.peerID === id);
                if (peerObj) {
                    peerObj.peer.destroy();
                }
                const peers = peersRef.current.filter(p => p.peerID !== id);
                peersRef.current = peers;
                setPeers(peers);
            })

            socketRef.current.on('receiving msg', payload => {
                console.log('receiving msg', payload)
                setMessages(messages => [...messages, {senderID: payload.senderID, text: payload.text}])
            });

            socketRef.current.on('receiving names', payload => {
                console.log('receiving names', payload)
                setNames(payload)
            });

            socketRef.current.on('receiving camera off', payload => {
                console.log('receiving camera off', payload)
                setPeerCameras(payload)
            })

            socketRef.current.on('receiving mic mute', payload => {
                console.log('receiving mic mute', payload)
                setPeerMics(payload)
            })

            socketRef.current.on('receiving recording status', payload => {
                console.log('receiving recording status', payload)
                setRecording(payload.recording)
            })
        })

    }, []);


    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            console.log('sending signal', signal)
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
        })

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })

        peer.on("signal", signal => {
            console.log('returning signal', signal)
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        peer.signal(incomingSignal);

        return peer;
    }

    function muteToggle() {
        userVideo.current.srcObject.getAudioTracks()[0].enabled = isMute;
        setMute(!isMute)
        socketRef.current.emit("mic mute", { senderID: socketRef.current.id, micMute: !isMute });
    }

    const MicControl = (props) => {
        if(props.isMute) {
            return <MicOff size="24" onClick={muteToggle} />
        } else {
            return <Mic size="24" onClick={muteToggle} />
        }
    }

    function cameraToggle() {
        userVideo.current.srcObject.getVideoTracks()[0].enabled = isCameraOff;
        setCameraOff(!isCameraOff)
        socketRef.current.emit("camera off", { senderID: socketRef.current.id, cameraOff: !isCameraOff });
    }

    const CameraControl = (props) => {
        if(props.isCameraOff) {
            return <VideocamOff size="24" onClick={cameraToggle} />
        } else {
            return <Videocam size="24" onClick={cameraToggle} />
        }
    }

    function startRecording() {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then(stream => {
            let recorder = RecordRTC(stream, { type: 'video', mimeType: 'video/webm' })
            recorder.startRecording();
            setRecorder(recorder)
        });
        socketRef.current.emit("change recording status", { recording: !isRecording} );
    }

    function stopRecording() {
        recorder.stopRecording(()=>{
            let blob = recorder.getBlob();
            download(blob, `${roomID}.mp4`, 'video/webm')
        })
        socketRef.current.emit("change recording status", { recording: !isRecording} );
    }

    const RecordControl = (props) => {
        if (props.isRecording) {
            return <Stop size="24" onClick={stopRecording} /> 
        }else{
            return <FiberManualRecord size="24" color="red" onClick={startRecording} />
        }
    } 

    function hangup(){
        socketRef.current.emit("hangup", socketRef.current.id);
        props.history.push('/');
    }

    function handleChange(e) {
        setText(e.target.value);
    }

    function sendMessage() {
        socketRef.current.emit("sending msg", { senderID: socketRef.current.id, text });
        setText('');
    }

    function onKeyUpMsg(e) {
        if (e.charCode === 13) {
            socketRef.current.emit("sending msg", { senderID: socketRef.current.id, text });
            setText('');
        }
    }

    return (
        <Container>
            { isRecording &&
                <Recording>
                    <span className="record-mark"></span>
                    <span>Recording</span>
                </Recording>
            }
            <VideoContainer>
                <div>
                    <MyVideoContainer isCameraOff={isCameraOff} myName={myName} userVideo={userVideo}/>
                    <div>{myName}</div>
                </div>
                {peers.map((peer) => {
                    return <PeerVideo key={peer.peerID} peer={peer} names={names} peerCameras={peerCameras} peerMics={peerMics} />
                })}
                <Controls>
                    <MicControl isMute={isMute} />
                    <CameraControl isCameraOff={isCameraOff} />
                    <RecordControl isRecording={isRecording} />
                    <CallEnd size="24" onClick={hangup} />
                </Controls>
            </VideoContainer>
            <MessageContainer>
                <div className="messages">
                    {messages.map((message, index) => {
                        var myMsg = message.senderID === socketRef.current.id ? true : false
                        return  <Message key={index} message={message} names={names} myMsg={myMsg}/>
                    })}
                </div>
                <div className="sendBox">
                    <MessageBox value={text} onChange={handleChange} onKeyPress={onKeyUpMsg}/>
                    <Send size="24" onClick={sendMessage}/>
                </div>
            </MessageContainer>
        </Container>
    );
};

export default Room;