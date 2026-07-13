import { useState } from "react";

export function useProductionConsole() {
  const [messages, setMessages] = useState<string[]>([]);

  function addMessage(message: string) {
    setMessages((prev) => [...prev, message]);
  }

  function clearMessages() {
    setMessages([]);
  }

  return { messages, addMessage, clearMessages };
}
