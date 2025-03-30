"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { FaUser, FaRobot, FaPaperPlane } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FaSignOutAlt } from "react-icons/fa";

// Define the props interface for ChatInterface.
interface ChatInterfaceProps {
  userName: string;
  onSignOut: () => Promise<void>;
}

// Define available chat models.
const models = [
  { id: "openai:chatgpt-4o-latest", name: "OpenAI GPT-4o" },
  { id: "openai:gpt-4o-mini-2024-07-18", name: "OpenAI GPT-4o Mini" },
  { id: "google:gemini-pro", name: "Google Gemini Pro" },
  // Add more models here if needed.
];

export function ChatInterface({ userName, onSignOut }: ChatInterfaceProps) {
  const [selectedModel, setSelectedModel] = useState(models[0].id);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      body: {
        model: selectedModel,
      },
    });

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between p-4 border-b bg-card text-card-foreground">
        <h1 className="text-xl font-semibold">LLM Chat</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Welcome, {userName}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              title="Sign Out"
            >
              <FaSignOutAlt className="h-4 w-4" />
              <span className="sr-only">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Message List */}
      <ScrollArea className="flex-1 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex justify-center items-center h-full text-muted-foreground">
            Start chatting by typing a message below.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.role === "user" ? "justify-end" : ""
            }`}
          >
            {m.role !== "user" && (
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <FaRobot />
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`rounded-lg p-3 max-w-[75%] ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
            {m.role === "user" && (
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <FaUser />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                <FaRobot />
              </AvatarFallback>
            </Avatar>
            <div className="rounded-lg p-3 bg-muted animate-pulse">
              <p className="text-sm">Thinking...</p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <footer className="p-4 border-t bg-card">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <FaPaperPlane className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </footer>
    </div>
  );
}
