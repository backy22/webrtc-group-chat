import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import RecordRTC from "recordrtc";
import download from "downloadjs";
import {Send, Mic, MicOff, Videocam, VideocamOff, CallEnd, FiberManualRecord, Stop} from '@styled-icons/material/';
import Message from "./Message";

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
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 5;
        width: 300px;
        background: white;
        padding: 10px;
    }
`;


const VideoContainer = styled.div`
    padding: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fill, 300px);
    grid-auto-rows: 300px;
    margin: 0;
    gap: 10px;
    width: 70%;
`;

const StyledVideo = styled.video`
    height: 100%;
    width: 100%;
    object-fit: cover;
`;

const Controls = styled.div`
    position: absolute;
    bottom: 5px;
    left: 20%;
    & > svg {
        margin: 5px 10px;
    }
`;

const MessageContainer = styled.div`
    padding: 20px;
    width: 30%;
    .messages {
        overflow-y: scroll;
        height: calc(100vh - 60px);
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
    margin-left: 10px;
`;

const Video = (props) => {
    const ref = useRef();
    const name = props.names.find(name => name.peerID == props.peer.peerID)
    const peerName = name ? name.name : 'anonymous';

    useEffect(() => {
        props.peer.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
    }, []);

    return (
        <div>
            <StyledVideo playsInline autoPlay ref={ref} />
            <div>{peerName}</div>
        </div>
    );
}

const videoConstraints = {
    height: window.innerHeight,
    width: window.innerWidth
};

const Room = (props) => {
    const [peers, setPeers] = useState([]);
    const [myName, setMyName] = useState("");
    const [names, setNames] = useState([]);
    const [isMute, setMute] = useState(false);
    const [showPopup, setPopup] = useState(true);
    const [isRecording, setRecording] = useState(false);
    const [isCameraOff, setCameraOff] = useState(false);
    const [recorder, setRecorder] = useState();
    const [text, setText] = useState("");
    const [messages, setMessages] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const roomID = props.match.params.roomID;

    useEffect(() => {
        socketRef.current = io.connect("/");

        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true }).then(stream => {
            userVideo.current.srcObject = stream;
            socketRef.current.emit("join room", roomID);

            socketRef.current.on("all users", users => {
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
                console.log('peers--', peers);
                setPeers(peers);
            })

            socketRef.current.on("user joined", payload => {
                console.log('user joined', payload)
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })

                const peerObj = {
                    peer,
                    peerID: payload.callerID
                }

                setPeers(users => [...users, peerObj]);
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
    }

    const MicControl = (props) => {
        if(props.isMute) {
            return <MicOff size="24" onClick={muteToggle} />
        }else{
            return <Mic size="24" onClick={muteToggle} />
        }
    }

    function cameraToggle() {
        userVideo.current.srcObject.getVideoTracks()[0].enabled = isCameraOff;
        setCameraOff(!isCameraOff)
    }

    const CameraControl = (props) => {
        if(props.isCameraOff) {
            return <VideocamOff size="24" onClick={cameraToggle} />
        }else{
            return <Videocam size="24" onClick={cameraToggle} />
        }
    }

    function startRecording() {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then(stream => {
            let recorder = RecordRTC(stream, { type: 'video/webm' })
            recorder.startRecording();
            setRecorder(recorder)
        });
        setRecording(!isRecording)
    }

    function stopRecording() {
        recorder.stopRecording(()=>{
            let blob = recorder.getBlob();
            download(blob, `${roomID}.mp4`, 'video/webm')
        })
        setRecording(!isRecording)
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

    function onKeyUpMyName(e) {
        if (e.charCode === 13) {
            socketRef.current.emit("set myname", { senderID: socketRef.current.id, name: e.target.value })
            setMyName(e.target.value);
            setPopup(false)
        }
    }

    const PopupContainer = (props) => {
        let displayPopup = props.showPopup ? 'block' : 'none'
            return (
                <Popup displayPopup={displayPopup}>
                    <div className="popup-content">
                        <h4>Put your name</h4>
                        <input onKeyPress={onKeyUpMyName}></input>
                    </div>
                </Popup>
            )
    }

    function handleChange(e) {
        setText(e.target.value);
    }

    function sendMessage() {
        socketRef.current.emit("sending msg", { senderID: socketRef.current.id, text });
        setText('');
    }

    return (
        <Container>
            <PopupContainer showPopup={showPopup} />
            <VideoContainer>
                <div>
                    <StyledVideo muted ref={userVideo} autoPlay playsInline />
                    <div>{myName}</div>
                </div>
                {peers.map((peer) => {
                    return <Video key={peer.peerID} peer={peer} names={names} />
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
                    {messages.map((message) => {
                        var myMsg = message.senderID === socketRef.current.id ? true : false
                        return  <Message message={message} names={names} myMsg={myMsg}/>
                    })}
                </div>
                <div className="sendBox">
                    <MessageBox value={text} onChange={handleChange} />
                    <Send size="24" onClick={sendMessage}/>
                </div>
            </MessageContainer>
        </Container>
    );
};

export default Room;