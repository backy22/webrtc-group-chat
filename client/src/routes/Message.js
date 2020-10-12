
import React from "react";
import styled from "styled-components";
import Avatar from 'react-avatar';

const MyMsgContainer = styled.div`
    display: flex;
    justify-content: end;
    flex-direction: row-reverse;
    width: 100%;
    margin: 5px 0;
    .sb-avatar__text {
        border-radius: 50%;
    }
`

const MyMsg = styled.div`
    max-width: 100%;
    border-radius: 5px;
    background: #3B3FD2;
    color: white;
    margin-right: 5px;
    padding: 5px;
    word-break: break-all;
`

const PeerMsgContainer = styled.div`
    display: flex;
    width: 100%;
    .avatar-container {
        text-align: center;
        .peer-name {
            font-size: 12px;
        }
    }
    .sb-avatar__text {
        border-radius: 50%;
    }
`

const PeerMsg = styled.div`
    border-radius: 5px;
    padding: 5px;
    margin: 5px;
    max-width: 100%;
    word-break: break-all;
    background: #EBEDF9;
`

const Message = (props) => {
    const name = props.names.find(name => name.peerID === props.message.senderID)
    const peerName = name ? name.name : 'anonymous';

    if (props.myMsg){
        return (
            <MyMsgContainer>
                <Avatar name={peerName} size="30" />
                <MyMsg>{props.message.text}</MyMsg>
            </MyMsgContainer>
        )
    } else {
        return (
            <PeerMsgContainer>
                <div className="avatar-container">
                    <Avatar name={peerName} size="30" />
                    <div className="peer-name">{peerName}</div>
                </div>
                <PeerMsg>{props.message.text}</PeerMsg>
            </PeerMsgContainer>
        )
    }

}

export default Message;