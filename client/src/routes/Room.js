import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import RecordRTC from "recordrtc";
import download from "downloadjs";

const Container = styled.div`
    padding: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fill, 300px);
    grid-auto-rows: 300px;
    margin: auto;
    gap: 10px;
`;

const StyledVideo = styled.video`
    height: 100%;
    width: 100%;
    object-fit: cover;
`;

const MessageBox = styled.textarea`
    width: 100%;
    height: 30%;
`;

const Button = styled.div`
    width: 50%;
    border: 1px solid black;
    margin-top: 15px;
    height: 5%;
    border-radius: 5px;
    cursor: pointer;
    background-color: black;
    color: white;
    font-size: 18px;
`;

const Video = (props) => {
    const ref = useRef();

    useEffect(() => {
        props.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
    }, []);

    return (
        <div>
            <StyledVideo playsInline autoPlay ref={ref} />
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
                    peers.push(peer);
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

                setPeers(users => [...users, peer]);
            });

            socketRef.current.on("receiving returned signal", payload => {
                console.log('receiving returned signal', payload)
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });

            socketRef.current.on("user disconnected", payload => {
                console.log('disconnected', payload, peersRef.current, peers)
                payload.forEach(userID => {
                    peersRef.current = peersRef.current.filter(p => p.peerID !== userID);
                })
            });

            socketRef.current.on('receiving msg', payload => {
                console.log('receiving msg', payload)
                setMessages(messages => [...messages, {senderID: payload.senderID, text: payload.text}])
            });

            socketRef.current.on('receiving name', payload => {
                console.log('receiving name', payload)
                setNames(names => [...names, {peerID: payload.senderID, name: payload.name}])
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
        userVideo.current.srcObject.getAudioTracks()[0].enabled = !isMute;
        setMute(!isMute)
    }

    function cameraToggle() {
        userVideo.current.srcObject.getVideoTracks()[0].enabled = !isCameraOff;
        setCameraOff(!isCameraOff)
    }

    function startRecording() {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then(stream => {
            let recorder = RecordRTC(stream, { type: 'video/webm' })
            recorder.startRecording();
            setRecorder(recorder)
        });
    }

    function stopRecording() {
        recorder.stopRecording(()=>{
            let blob = recorder.getBlob();
            download(blob, `${roomID}.mp4`, 'video/webm')
        })
    }

    function hangup(){
        peers.forEach((peer) => peer.destroy());
    }

    function onKeyUpMyName(e) {
        if (e.charCode === 13) {
            socketRef.current.emit("changing myname", { senderID: socketRef.current.id, name: e.target.value })
            setMyName(e.target.value);
        }
    }

    function handleChange(e) {
        setText(e.target.value);
    }

    function sendMessage() {
        socketRef.current.emit("sending msg", { senderID: socketRef.current.id, text });
    }

    return (
        <div>
            <Container>
                <div>
                    <StyledVideo muted ref={userVideo} autoPlay playsInline />
                    <input onKeyPress={onKeyUpMyName}></input>
                </div>
                {peers.map((peer, index) => {
                    return (
                        <Video key={index} peer={peer} />
                    );
                })}
            </Container>
            <button onClick={muteToggle}>mute</button>
            <button onClick={cameraToggle}>camera off</button>
            <button onClick={startRecording}>Start Recording</button>
            <button onClick={stopRecording}>Stop Recording</button>
            <button onClick={hangup}>Hang up</button>

            <div>
                {messages.map((message) => {
                    return (
                        <div>
                            <div>{message.senderID}</div>
                            <div>{message.text}</div>
                        </div>
                    )
                })}
                <MessageBox value={text} onChange={handleChange} />
                <Button onClick={sendMessage}>Send..</Button>
            </div>
        </div>
    );
};

export default Room;