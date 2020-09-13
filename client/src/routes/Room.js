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

const Video = (props) => {
    const ref = useRef();

    useEffect(() => {
        props.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
    }, []);

    return (
        <StyledVideo playsInline autoPlay ref={ref} />
    );
}


const videoConstraints = {
    height: window.innerHeight,
    width: window.innerWidth
};

const Room = (props) => {
    const [peers, setPeers] = useState([]);
    const [isMute, setMute] = useState(false);
    const [isCameraOff, setCameraOff] = useState(false);
    const [recorder, setRecorder] = useState();
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
                setPeers(peers);
            })

            socketRef.current.on("user joined", payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })

                setPeers(users => [...users, peer]);
            });

            socketRef.current.on("receiving returned signal", payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });

            socketRef.current.on("user disconnected", payload => {
                console.log('disconnected', payload, peersRef, peers)
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
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        peer.signal(incomingSignal);

        return peer;
    }

    function muteToggle() {
        console.log(isMute)
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

    return (
        <div>
            <Container>
                <StyledVideo muted ref={userVideo} autoPlay playsInline />

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
        </div>
    );
};

export default Room;