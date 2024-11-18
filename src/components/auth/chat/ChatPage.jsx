import React, { useState } from "react";
import { useAuthStore } from "../../store/authStore.jsx";
import ChatMessage from "./ChatMessage.jsx";
import ThemeToggle from "../shared/ThemeToggle.jsx";

const ChatPage = () => {
  const { currentUser } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      content: newMessage,
      timestamp: new Date(),
      userId: currentUser?.id || "guest",
    };

    setMessages([...messages, message]);
    setNewMessage("");
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      <div className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold">QuadChat</h1>
        <ThemeToggle />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isOwn={message.userId === currentUser?.id}
          />
        ))}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 p-2 rounded border"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPage;
