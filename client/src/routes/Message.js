
import React from "react";
import styled from "styled-components";

const MyMsgContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    width: 100%;
    margin: 5px 0;
`

const MyMsg = styled.div`
    max-width: 100%;
    border: 1px solid gray;
    border-radius: 10px;
    background: #A5DAF9;
    margin-right: 5px;
    padding: 5px;
    word-break: break-all;
`

const PeerMsgContainer = styled.div`
    display: flex;
    align-items: center;
    width: 100%;
`

const PeerMsg = styled.div`
    border: 1px solid gray;
    border-radius: 10px;
    padding: 5px;
    margin: 5px;
    max-width: 100%;
    word-break: break-all;
`

const Message = (props) => {
    const name = props.names.find(name => name.peerID === props.message.senderID)
    const peerName = name ? name.name : 'anonymous';
    console.log('props.myMsg', props.myMsg);

    if (props.myMsg){
        return (
            <MyMsgContainer>
                <MyMsg>{props.message.text}</MyMsg>
            </MyMsgContainer>
        )
    }else{
        return (
            <PeerMsgContainer>
                <div>{peerName}</div>
                <PeerMsg>{props.message.text}</PeerMsg>
            </PeerMsgContainer>
        )
    }

}

export default Message;