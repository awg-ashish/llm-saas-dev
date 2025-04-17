"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react"; // Add useCallback
import { useChat, Message, UseChatHelpers } from "@ai-sdk/react"; // Import Message type and UseChatHelpers
import { v4 as uuidv4 } from "uuid"; // Import uuid
import { FaUser, FaRobot, FaPaperPlane } from "react-icons/fa";
import { Square } from "lucide-react"; // Import Square icon for stop
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
import { AIMessage } from "./AIMessage"; // Import the new AIMessage component
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams
import { toast } from "sonner";
// Import ModelData type
import { ModelData } from "@/app/dashboard/actions"; // Adjust path if necessary
import { TypingIndicator } from "@/components/ui/typing-indicator";

interface ChatInterfaceProps {
  userName: string;
  onSignOut: () => Promise<void>;
  chatId?: string; // Changed to string for UUID
  initialMessages?: Message[];
  // Add models props
  availableModels: ModelData[];
  initialModelId?: number; // Keep as number, relates to models table
}

// Remove the hardcoded models array
// const models = [
//   { id: "openai:gpt-4o", name: "OpenAI GPT-4o" },
//   { id: "openai:gpt-4o-mini", name: "OpenAI GPT-4o mini" },
//   { id: "openai:gpt-3.5-turbo", name: "OpenAI GPT-3.5 Turbo" },
//   { id: "google:gemini-pro", name: "Google Gemini Pro" },
// ];
// Cleaned up the leftover array definition above

export function ChatInterface({
  userName,
  onSignOut,
  chatId,
  initialMessages,
  // Destructure new props
  availableModels,
  initialModelId,
}: ChatInterfaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams(); // Get search params
  const { state: sidebarState } = useSidebar();
  const isSidebarOpen = sidebarState === "expanded";

  // Use availableModels from props, no need for useMemo filtering here anymore
  // const availableModels = useMemo(() => { ... }, []);

  // Determine the initial model slug based on initialModelId or the first available model
  const initialModelSlug = useMemo(() => {
    if (initialModelId) {
      const foundModel = availableModels.find(
        (model) => model.id === initialModelId
      );
      return foundModel?.slug || availableModels[0]?.slug || "";
    }
    return availableModels[0]?.slug || "";
  }, [availableModels, initialModelId]);

  const [selectedModel, setSelectedModel] = useState(initialModelSlug);
  // Determine the initial model ID based on the initial slug
  const [selectedModelId, setSelectedModelId] = useState<number | null>(() => {
    const foundModel = availableModels.find(
      (model) => model.slug === initialModelSlug
    );
    return foundModel?.id || availableModels[0]?.id || null;
  });
  // State to track chats for which the initial AI response has been triggered
  // Use string for chatId
  const [autoTriggeredChats, setAutoTriggeredChats] = useState<Set<string>>(
    new Set()
  );
  // State to track if initial chat setup is done
  const [initialSetupDone, setInitialSetupDone] = useState(false);

  // Update the model ID when the slug changes
  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    // Find and set the corresponding model ID
    const foundModel = availableModels.find((model) => model.slug === value);
    setSelectedModelId(foundModel?.id || null);
  };

  // Save the user message for persistence - chatIdToUse is now string
  const saveUserMessage = async (chatIdToUse: string, content: string) => {
    try {
      const { saveMessage } = await import("@/app/dashboard/chatActions");
      await saveMessage(
        chatIdToUse, // Pass string UUID
        { role: "user", content: content, createdAt: new Date() },
        undefined // Model ID not needed for user message save here
      );
      console.log(`User message saved for chat ${chatIdToUse}`);
    } catch (error) {
      console.error("Failed to save user message:", error);
      // Optionally show toast error
    }
  };

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    reload,
    stop, // Import stop
    append, // Import append
  } = useChat({
    // Use a single consistent API endpoint
    api: "/api/chat",
    // Pass the selected model in the body
    body: {
      model: selectedModel,
    },
    id: chatId, // Pass string UUID directly
    initialMessages: initialMessages,
    sendExtraMessageFields: true, // Keep this if needed by API
    onFinish: async (message) => {
      console.log("AI response finished for chat:", chatId);
      if (chatId && message.role === "assistant") {
        // Ensure it's an assistant message
        try {
          const { saveMessage } = await import("@/app/dashboard/chatActions");
          await saveMessage(
            chatId, // Pass string UUID
            {
              role: "assistant",
              content: message.content,
              createdAt: new Date(),
            },
            selectedModelId ?? undefined // Pass model ID for AI message
          );
          console.log(`AI message saved for chat ${chatId}`);
        } catch (error) {
          console.error("Failed to save AI message:", error);
          // Optionally show toast error
        }
      }
    },
  });

  // Custom submit handler
  const customHandleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const userPrompt = input.trim();

    if (userPrompt) {
      if (!chatId) {
        // --- New Chat Flow ---
        const clientChatId = uuidv4(); // Generate UUID on client
        console.log(`Generated client-side chat ID: ${clientChatId}`);
        const toastId = toast.loading("Creating new chat...");

        try {
          // 1. Call and await the initialization action
          const { initializeChat } = await import(
            "@/app/dashboard/chatActions"
          );
          await initializeChat(
            clientChatId,
            userPrompt,
            selectedModelId ?? undefined
          );
          console.log(`Chat ${clientChatId} initialized successfully.`);

          // 2. Refresh server data (for sidebar)
          router.refresh();

          // 3. Navigate to the new chat page
          router.push(`/dashboard/chat/${clientChatId}`); // No query param needed

          // 4. Clear input and show success
          handleInputChange({ target: { value: "" } } as any); // Reset input field
          toast.success("Chat created successfully", { id: toastId });
        } catch (error) {
          console.error("Failed to initialize new chat:", error);
          toast.error(`Failed to create chat: ${(error as Error).message}`, {
            id: toastId,
          });
          // Optionally remove the locally appended message if init failed
          // This requires managing message IDs more carefully if needed
        }
      } else {
        // --- Existing Chat Flow ---
        // 1. Save user message to DB (async, don't wait)
        saveUserMessage(chatId, userPrompt).catch((err) =>
          console.error("Background user message save failed:", err)
        );

        // 2. Let useChat handle appending locally and sending API request
        handleSubmit(e);
      }
    } else {
      // Empty input, use default handler (which does nothing)
      handleSubmit(e);
    }
  };

  // Removed duplicate handleModelChange definition that was here

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      };
      if (status === "streaming") {
        requestAnimationFrame(scrollToBottom);
      } else {
        setTimeout(scrollToBottom, 0);
      }
    }
  }, [messages, status]); // Keep dependencies minimal

  // Removed the useEffect hook for Initial Chat Setup as it's no longer needed

  // Effect to auto-trigger AI response for the first message
  // This now relies on the messages loaded from the DB via initialMessages prop
  useEffect(() => {
    // Only run if:
    // - We have a chatId
    // - There's exactly one message loaded initially, and it's from the user
    // - We haven't already triggered for this chat
    const shouldTriggerAIResponse =
      chatId &&
      initialMessages?.length === 1 && // Check initialMessages specifically
      initialMessages[0].role === "user" &&
      messages.length === 1 && // Ensure local state also has only 1 message (the user one)
      !autoTriggeredChats.has(chatId);

    if (shouldTriggerAIResponse) {
      console.log(
        `[ChatInterface AI Trigger Effect] Auto-triggering AI response for first message in chat ${chatId}`
      );

      if (status === "ready") {
        setAutoTriggeredChats((prev) => new Set(prev).add(chatId));
        console.log(`Calling reload() for chat ${chatId}`);
        // Pass body directly to reload
        reload({
          body: { model: selectedModel }, // Pass current model
        });
      } else {
        console.log(
          `[ChatInterface AI Trigger Effect] AI status is '${status}', skipping auto-trigger.`
        );
      }
    }
    // Dependencies: chatId, initialMessages, messages, autoTriggeredChats, reload, status, selectedModel
  }, [
    chatId,
    initialMessages, // Add initialMessages dependency
    messages,
    autoTriggeredChats,
    reload,
    status,
    selectedModel,
  ]);

  return (
    <div
      className={`flex flex-col h-screen bg-background fixed top-0 right-0 transition-all duration-200 ${
        isSidebarOpen ? "left-[16rem]" : "left-0"
      }`}
    >
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
              {/* Map over availableModels from props */}
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.slug}>
                  {/* Use slug as value, display name */}
                  {model.model_name}
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
        <div className="w-3xl mx-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              <p>Start chatting by typing a message below.</p>
            </div>
          )}
          {messages.map(
            (
              m,
              index // Add index here
            ) => (
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
                  className={`rounded-lg p-3 max-w-[95%] ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                      : "prose prose-sm dark:prose-invert"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    // Pass required props to AIMessage
                    <AIMessage
                      message={m}
                      messageIndex={index}
                      messages={messages}
                      availableModels={availableModels}
                      append={append}
                      chatId={chatId} // Pass string UUID
                    />
                  )}
                </div>
                {m.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <FaUser />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )
          )}
          {status === "streaming" && (
            <div className="flex items-center gap-3">
              <div className="rounded-lg w-30 h-2">
                <TypingIndicator />
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} className="h-10" />
      </div>

      <footer
        className={`fixed bottom-0 border-t bg-card z-10 transition-all duration-200 ${
          isSidebarOpen ? "left-[16rem]" : "left-0"
        } right-0`}
      >
        <form
          onSubmit={customHandleSubmit}
          className="flex items-center gap-2 max-w-3xl mx-auto p-4"
        >
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const form = e.currentTarget.closest("form");
                if (form) {
                  const formEvent = new Event("submit", {
                    bubbles: true,
                    cancelable: true,
                  });
                  form.dispatchEvent(formEvent);
                }
              }
            }}
            placeholder="Type your message..."
            className="flex-1 resize-none"
            rows={1}
            disabled={status === "streaming"}
          />
          {status === "streaming" ? (
            <Button
              type="button"
              onClick={stop}
              variant="destructive" // Optional: Use a different variant for stop
            >
              <Square className="h-4 w-4" />
              <span className="sr-only">Stop</span>
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              <FaPaperPlane className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          )}
        </form>
      </footer>
    </div>
  );
}
