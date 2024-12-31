import react, {useState} from 'react';

const ChatInputField = ({ onSend }) => {
    const [value, setValue] = useState('');

    const handleSend = () => {
        if(value.trim()){
            onSend(value);
            setValue('');
        }
    };

    return (
        <div>
            <input type="text"
                   value={value}
                   onChange={(e) => setValue(e.target.value)}/>
            <button onClick={() => handleSend()}>
                send chat
            </button>
        </div>
    );
};

export default ChatInputField;