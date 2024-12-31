import React from 'react';
import Message from "./Message.jsx";

const MessageList = ({messages}) => {
    return (
        <div>
            {messages.map((message, index) => (msg, index) => (
                <Message key={index} message={message} />
            ))}
        </div>
    );
};

export default MessageList;