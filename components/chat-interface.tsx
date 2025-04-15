"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useChat, Message } from "@ai-sdk/react"; // Import Message type
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
import { AIMessage } from "./AIMessage"; // Import the new AIMessage component
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// Import ModelData type
import { ModelData } from "@/app/dashboard/actions"; // Adjust path if necessary

interface ChatInterfaceProps {
  userName: string;
  onSignOut: () => Promise<void>;
  chatId?: number;
  initialMessages?: Message[];
  // Add models props
  availableModels: ModelData[];
  initialModelId?: number;
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
  const [autoTriggeredChats, setAutoTriggeredChats] = useState<Set<number>>(
    new Set()
  );

  // Update the model ID when the slug changes
  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    // Find and set the corresponding model ID
    const foundModel = availableModels.find((model) => model.slug === value);
    setSelectedModelId(foundModel?.id || null);
  };

  // Save the user message for persistence
  const saveUserMessage = async (chatIdToUse: number, content: string) => {
    // Removed the outer if(chatId) check as this function is now called with a specific ID
    try {
      const { saveMessage } = await import("@/app/dashboard/chatActions");
      await saveMessage(
        chatIdToUse,
        {
          role: "user",
          content: content,
          createdAt: new Date(),
        },
        undefined
      );
      console.log("User message saved successfully");
    } catch (error) {
      console.error("Failed to save user message:", error);
    }
    // Removed the extra closing brace here that was causing scope issues
  };

  const { messages, input, handleInputChange, handleSubmit, status, reload } =
    useChat({
      // Use a single consistent API endpoint
      api: "/api/chat",
      // Pass the selected model in the body
      body: {
        model: selectedModel,
      },
      id: chatId?.toString(),
      initialMessages: initialMessages,
      sendExtraMessageFields: true,
      onFinish: async (message) => {
        console.log("Chat finished with ID:", chatId);
        if (chatId) {
          try {
            const { saveMessage } = await import("@/app/dashboard/chatActions");
            // Use selectedModelId which is now tracked in state
            // const modelId = await getModelIdBySlug(selectedModel); // No longer needed
            await saveMessage(
              chatId,
              {
                // Added missing opening brace for the message object
                role: "assistant",
                content: message.content,
                createdAt: new Date(),
              },
              selectedModelId ?? undefined // Handle null case
            );
            console.log("AI message saved successfully");
          } catch (error) {
            console.error("Failed to save AI message:", error);
          }
        }
      },
    });

  // Custom submit handler that saves the user message before submitting
  const customHandleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (input.trim()) {
      if (!chatId) {
        // On dashboard route, create a new chat first
        const toastId = toast.loading("Creating new chat...");
        try {
          const userMessage = input.trim();
          // Import all needed actions
          const { createChat, saveMessage, generateChatTitle } = await import(
            "@/app/dashboard/chatActions"
          );

          // 1. Create a new chat with the selected model ID
          const result = await createChat(
            "New Chat",
            undefined,
            selectedModelId ?? undefined // Correctly pass number or undefined
          );
          const newChatId = result.id;

          // 2. Save the user message to the new chat, including the model ID
          await saveMessage(
            // Use saveMessage directly here
            newChatId,
            {
              role: "user",
              content: userMessage,
              createdAt: new Date(),
            },
            selectedModelId ?? undefined // Handle null case
          );

          // 3. Trigger title generation asynchronously (fire and forget)
          generateChatTitle(newChatId, userMessage).catch((err) =>
            console.error("Background title generation failed:", err)
          );

          // 4. Redirect to the new chat immediately
          // The chat page will load the saved user message
          toast.success("Chat created successfully", { id: toastId });
          router.push(`/dashboard/chat/${newChatId}`);
        } catch (error) {
          console.error("Failed to create new chat:", error);
          toast.error("Failed to create chat", { id: toastId });
        }
      } else {
        // Already on a chat page, save the message and use the normal submit flow
        await saveUserMessage(chatId, input.trim()); // Use the updated saveUserMessage
        handleSubmit(e); // Let useChat handle the API call
      }
    } else {
      // Empty input, use default handler (which does nothing if input is empty)
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
  }, [messages, status]);

  // Effect to auto-trigger AI response for the first message in a new chat
  useEffect(() => {
    // Only run this effect when:
    // - We have a valid chatId (meaning we're on a chat page, not dashboard)
    // - initialMessages contains at least one user message
    // - initialMessages doesn't already have an AI response
    // - We haven't already triggered a reload for this chat (NEW CONDITION)
    const shouldTriggerAIResponse =
      chatId &&
      initialMessages &&
      initialMessages.length > 0 &&
      initialMessages.filter((m) => m.role === "assistant").length === 0 &&
      !autoTriggeredChats.has(chatId); // Check if we've already triggered

    if (shouldTriggerAIResponse) {
      console.log(
        `[ChatInterface Effect] Auto-triggering AI response for first message in chat ${chatId}`
      );

      // Check if the AI is ready (status should be 'ready')
      // Only reload if the status is 'ready' to avoid duplicate requests
      if (status === "ready") {
        // Mark this chat as having been triggered BEFORE calling reload
        setAutoTriggeredChats((prev) => {
          const newSet = new Set(prev);
          newSet.add(chatId); // Add the current chatId to the set
          return newSet;
        });
        // Use the useChat hook's reload method, ensuring it uses the correct model
        reload({
          body: {
            model: selectedModel, // Pass the current selected model slug
          },
        });
      } else {
        console.log(
          `[ChatInterface Effect] AI status is '${status}', skipping auto-trigger.`
        );
      }
    }
    // Ensure autoTriggeredChats and selectedModel are included
  }, [
    chatId,
    initialMessages,
    autoTriggeredChats,
    reload,
    status,
    selectedModel, // Add selectedModel dependency
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
                className={`rounded-lg p-3 max-w-[95%] ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                    : "prose prose-sm dark:prose-invert"
                }`}
              >
                {m.role === "user" ? (
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <AIMessage content={m.content} />
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
          ))}
          {status === "streaming" && (
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-3 bg-muted animate-pulse">
                <p className="text-sm">...</p>
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
