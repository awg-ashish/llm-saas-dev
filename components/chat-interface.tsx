// components/chat-interface.tsx
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { FaUser, FaRobot, FaPaperPlane } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut } from "lucide-react";

interface ChatInterfaceProps {
  userName: string;
  onSignOut: () => Promise<void>;
}

const models = [
  { id: "openai:gpt-4o", name: "OpenAI GPT-4o" },
  { id: "openai:gpt-4o-mini", name: "OpenAI GPT-4o mini" },
  { id: "openai:gpt-3.5-turbo", name: "OpenAI GPT-3.5 Turbo" },
  { id: "google:gemini-pro", name: "Google Gemini Pro" },
  { id: "lmstudio:deepseek-coder-v2-lite-instruct", name: "LM Studio" },
];

const getApiEndpoint = (modelId: string): string => {
  const provider = modelId.split(":")[0];
  switch (provider) {
    case "openai":
      return "/api/chat/openai";
    case "google":
      return "/api/chat/google";
    case "lmstudio":
      return process.env.NODE_ENV === "development"
        ? "/api/chat/lmstudio"
        : "/api/chat/openai";
    default:
      console.warn(`Unknown provider: ${modelId}`);
      return "/api/chat/openai";
  }
};

export function ChatInterface({ userName, onSignOut }: ChatInterfaceProps) {
  const { state: sidebarState } = useSidebar();
  const isSidebarOpen = sidebarState === "expanded";

  const availableModels = useMemo(() => {
    if (process.env.NODE_ENV === "development") {
      return models;
    }
    return models.filter((model) => !model.id.startsWith("lmstudio:"));
  }, []);

  const initialModel = availableModels[0]?.id || "";
  const [selectedModel, setSelectedModel] = useState(initialModel);

  const apiEndpoint = useMemo(
    () => getApiEndpoint(selectedModel),
    [selectedModel]
  );

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: apiEndpoint,
    body: {
      model: selectedModel,
    },
  });

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      };
      if (status === "streaming") {
        requestAnimationFrame(scrollToBottom);
      } else {
        scrollToBottom();
      }
    }
  }, [messages, status]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header
        className={`flex items-center justify-between p-4 border-b bg-card text-card-foreground fixed top-0 right-0 z-10 transition-all duration-200 ${
          isSidebarOpen ? "left-[16rem]" : "left-0"
        }`}
      >
        <h1 className="text-xl font-semibold">LLM Chat</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer h-8 w-8">
                  <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSignOut} className="text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto pt-16 pb-24 px-4 mt-4 mx-auto no-scrollbar">
        <div className="w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              <p>Start chatting by typing a message below.</p>
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
          {status === "streaming" && (
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-3 bg-muted animate-pulse">
                <p className="text-sm">...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <footer
        className={`fixed bottom-0 border-t bg-card z-10 transition-all duration-200 ${
          isSidebarOpen ? "left-[16rem]" : "left-0"
        } right-0`}
      >
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 max-w-3xl mx-auto p-4"
        >
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 resize-none"
            rows={1}
            disabled={status === "streaming"}
          />
          <Button
            type="submit"
            disabled={status === "streaming" || !input.trim()}
          >
            <FaPaperPlane className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </footer>
    </div>
  );
}
