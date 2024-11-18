const ChatMessage = ({ message, isOwn }) => {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
        <div
          className={`max-w-[70%] p-3 rounded-lg ${
            isOwn
              ? "bg-blue-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
          }`}
        >
          <p className="text-sm">{message.content}</p>
          <span className="text-xs opacity-75">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    );
  };
  
  export default ChatMessage;
  