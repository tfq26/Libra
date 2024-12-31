import React from 'react';

const Message = ({ content }) => {
    return (
        <div className="my-2 p-4 bg-message_color rounded-lg">
            {content}
        </div>
    );
};

export default Message;
