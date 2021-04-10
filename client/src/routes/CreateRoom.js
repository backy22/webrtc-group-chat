import React, { useState } from "react";
import styled, { keyframes } from "styled-components";

const Form = styled.div`
    position: absolute;
    left: 50%;
    top: 20%;
    transform: translateX(-50%);
    border: 1px solid #5D4AB4;
    width: 500px;
    background: white;
    padding: 10px;
    text-align: center;
    border-radius: 10px;
`;

const FormGroup = styled.div`
    text-align: left;
    margin: 10px 0;
`;

const Label = styled.label`
    display: block;
    color: #5D4AB4;
`;

const Input = styled.input`
    background: #EBEDF9;
    width: 90%;
    padding: 10px;
    margin: 5px;
    border: none;
`;

const Message = styled.small`
    color: red;
    display: block;
`;

const Button = styled.button`
    background: transparent;
    border: 2px solid #5D4AB4;
    color: #5D4AB4;
    padding: 5px;
    font-size: 1.5rem;
    border-radius: 10px;
    width: 100px;
    margin-top: 10px;
    &:hover {
        background: #5D4AB4;
        color: white;
        cursor: pointer;
    }
`;

const CreateRoom = (props) => {
    const [name, setName] = useState('')
    const [room, setRoom] = useState('')
    const [nameValidate, setNameValidate] = useState(false)
    const [roomValidate, setRoomValidate] = useState(false)

    function create() {
        //const id = uuid();
        if (!name) {
            setNameValidate(true)
            return
        }
        if (!room) {
            setRoomValidate(true)
            return
        }
        const Room = room.trim().toLowerCase()
        props.history.push({
            pathname: `/room/${Room}`,
            state: {displayName: name}
        });
    }

    function onChangeName(e) {
        setName(e.target.value)
    }

    function onChangeRoom(e){
        setRoom(e.target.value)
    }

    return (
        <Form>
            <FormGroup>
                <Label>Display Name</Label>
                <Input onChange={onChangeName}/>
                {nameValidate && <Message>Display name can't be blank</Message>}
            </FormGroup>
            <FormGroup>
                <Label>Room name</Label>
                <Input onChange={onChangeRoom}/>
                {roomValidate && <Message>Room name can't be blank</Message>}
            </FormGroup>
            <Button onClick={create}>Join</Button>
        </Form>
    );
};

export default CreateRoom;